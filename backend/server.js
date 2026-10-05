require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// ─── Javoblarni gzip qilish (trafik va yuklanish tezligi uchun) ───
// SSE (text/event-stream) ni SIQMAYMIZ — gzip buffer real-vaqt eventlarni
// ushlab qolib, buyurtma holati jonli yangilanishini buzadi.
app.use(compression({
    filter: (req, res) => {
        const type = String(res.getHeader('Content-Type') || '');
        if (type.includes('text/event-stream')) return false;
        return compression.filter(req, res);
    },
}));

// ─── Security ───
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));

app.use((req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy',
        "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://telegram.org"
    );
    next();
});

const DEFAULT_ORIGINS = [
    'https://efes-app-production.up.railway.app',
    'https://web.telegram.org',
    'https://telegram.org',
];
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
const EFFECTIVE_ORIGINS = ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : DEFAULT_ORIGINS;

app.use(cors({
    origin: (origin, cb) => {
        // Server-to-server (webhook, Payme, Click) — origin yo'q
        if (!origin) return cb(null, true);
        if (EFFECTIVE_ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error('CORS: ruxsat etilmagan origin'));
    },
    credentials: true,
}));

// ─── Rate Limiting ───
// Mobil operatorlarda ko'p mijoz bitta IP ortida (CGNAT) bo'ladi, to'lov sahifasi esa
// har necha soniyada holatni so'raydi — shuning uchun umumiy limit keng.
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    standardHeaders: true,
    legacyHeaders: false,
    // To'lov tizimlari webhooklari limitga tushmasin (o'z himoyasi: imzo/auth)
    skip: (req) => req.path.startsWith('/payment/payme') || req.path.startsWith('/payment/click/'),
    message: { error: 'Juda ko\'p so\'rov. 15 daqiqadan keyin qayta urinib ko\'ring.' },
});
app.use('/api/', limiter);

// Strict limiter for sensitive endpoints (emergency-reset, click webhooks)
const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: 'Juda ko\'p urinish. 1 soatdan keyin qayta urinib ko\'ring.' },
    skipSuccessfulRequests: false,
});
const clickLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Click rate limit' },
});

// Login uchun qat'iy limiter — brute-force oldini oladi.
// skipSuccessfulRequests: muvaffaqiyatli kirishlar limitga hisoblanmaydi.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Juda ko\'p urinish. 15 daqiqadan keyin qayta urinib ko\'ring.' },
    skipSuccessfulRequests: true,
});

// ─── Body Parser ───
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Request logger (faqat development) ───
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        if (req.path.includes('click') || req.path.includes('payme')) {
            console.log(`[REQ] ${req.method} ${req.path} | IP: ${req.ip}`);
        }
        next();
    });
}

// ─── Routes ───
// Login endpointlariga qat'iy limiter (router mount'idan oldin)
app.use('/api/admin/login', authLimiter);
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/branches', require('./src/routes/branches'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/user', require('./src/routes/user'));
app.use('/api/payment', require('./src/routes/payment'));
app.use('/api/import', require('./src/routes/import'));
app.use('/api/analytics', require('./src/routes/analytics'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/delivery', require('./src/routes/delivery'));
app.use('/api/promotions', require('./src/routes/promotions'));
app.use('/api/couriers', require('./src/routes/couriers'));
app.use('/api/operators', require('./src/routes/operators'));

// ─── Emergency parol tiklash (ADMIN_RESET_SECRET orqali) ───
app.post('/api/emergency-reset', strictLimiter, async (req, res) => {
    try {
        const { secret, username, newPassword } = req.body || {};
        const RESET_SECRET = process.env.ADMIN_RESET_SECRET;
        if (!RESET_SECRET || secret !== RESET_SECRET) {
            return res.status(403).json({ error: 'Noto\'g\'ri maxfiy kalit' });
        }
        if (typeof username !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ error: 'username va newPassword (min 8 ta belgi) kerak' });
        }
        const bcrypt = require('bcryptjs');
        const AdminAccount = require('./src/models/AdminAccount');
        const hashed = await bcrypt.hash(newPassword, 10);
        const account = await AdminAccount.findOneAndUpdate(
            { username },
            { password: hashed },
            { new: true }
        );
        if (!account) return res.status(404).json({ error: 'Admin topilmadi' });
        console.log(`[EMERGENCY RESET] ${username} paroli tiklandi`);
        res.json({ success: true, username: account.username });
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── Kurier botlari webhook (broadcast + mission) ───
const CourierBotService = require('./src/services/courierBot.service');
app.post('/courier-webhook', (req, res) => {
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (!CourierBotService.webhookSecret || secret !== CourierBotService.webhookSecret) {
        return res.status(403).json({ ok: false });
    }
    res.json({ ok: true });
    CourierBotService.handleBroadcastUpdate(req.body).catch(e => console.error('Broadcast webhook:', e.message));
});
app.post('/courier-mission-webhook', (req, res) => {
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (!CourierBotService.webhookSecret || secret !== CourierBotService.webhookSecret) {
        return res.status(403).json({ ok: false });
    }
    res.json({ ok: true });
    CourierBotService.handleMissionUpdate(req.body).catch(e => console.error('Mission webhook:', e.message));
});

// ─── Telegram Bot Webhook Proxy ───
// Telegram secret_token'ni chekkada tekshiramiz — soxta (Telegram'dan kelmagan)
// so'rovlar botga umuman uzatilmaydi.
const http = require('http');
app.post('/bot-webhook', (req, res) => {
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
        return res.status(403).json({ ok: false });
    }
    const data = JSON.stringify(req.body);
    const proxyReq = http.request({
        hostname: 'localhost',
        port: 3001,
        path: '/bot-webhook',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            'x-telegram-bot-api-secret-token': req.headers['x-telegram-bot-api-secret-token'] || '',
        },
    }, () => res.json({ ok: true }));
    proxyReq.on('error', () => res.json({ ok: true }));
    proxyReq.write(data);
    proxyReq.end();
});

// ─── Click webhook aliases ───
const ClickService = require('./src/services/click.service');
app.post('/click/prepare', clickLimiter, async (req, res) => {
    const result = await ClickService.prepare(req.body);
    res.json(result);
});
app.post('/click/complete', clickLimiter, async (req, res) => {
    const result = await ClickService.complete(req.body);
    res.json(result);
});

// ─── Health Check ───
app.get('/api/health', (req, res) => {
    const mongoose = require('mongoose');
    const dbOk = mongoose.connection.readyState === 1;
    res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'OK' : 'DB_DOWN', service: 'EFES Delivery', timestamp: new Date().toISOString() });
});

// Noma'lum API yo'li — SPA index.html emas, JSON 404 qaytsin
app.use('/api', (req, res) => res.status(404).json({ error: 'Topilmadi' }));

// ─── Uploads (menu images) ───
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ─── Static files ───
// Admin
const adminDist = path.join(__dirname, '../admin/dist');
app.use('/admin', express.static(adminDist));
app.get('/admin/*', (req, res) => res.sendFile(path.join(adminDist, 'index.html')));

// Frontend (Mini App)
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist, {
    setHeaders: (res, filePath) => {
        res.removeHeader('X-Frame-Options');
        if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    },
}));
app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(frontendDist, 'index.html'));
});

// ─── Error Handler ───
app.use(errorHandler);

// ─── Start ───
const start = async () => {
    await connectDB();
    require('./src/jobs/dailyAnalytics');
    require('./src/jobs/expireUnpaidOrders');
    app.listen(PORT, () => {
        console.log(`🍽 EFES Delivery API ishga tushdi: http://localhost:${PORT}`);
        // Cluster rejimida faqat birinchi instance webhookni ro'yxatga oladi
        if (!process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0') {
            CourierBotService.registerWebhooks().catch(e => console.error('Kurier bot:', e.message));
        }
    });
};

start().catch(console.error);
module.exports = app;
