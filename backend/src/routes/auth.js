const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AdminAccount = require('../models/AdminAccount');

// ─── Telegram WebApp Auth ───
router.post('/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) return res.status(400).json({ error: 'initData kerak' });

        // initData ni tekshirish
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        params.delete('hash');

        const dataCheckString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(process.env.BOT_TOKEN)
            .digest();

        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        if (calculatedHash !== hash) {
            return res.status(401).json({ error: 'Yaroqsiz initData' });
        }

        // User ma'lumotlarini olish
        const userData = JSON.parse(params.get('user'));
        const { id: telegramId, first_name, last_name, username } = userData;

        // User yaratish yoki yangilash
        let user = await User.findOne({ telegramId });
        if (!user) {
            user = await User.create({
                telegramId,
                firstName: first_name || '',
                lastName: last_name || '',
                username: username || '',
            });
        } else {
            user.firstName = first_name || user.firstName;
            user.lastName = last_name || user.lastName;
            user.username = username || user.username;
            user.lastActiveAt = new Date();
            await user.save();
        }

        const token = jwt.sign(
            { userId: user._id, telegramId },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ token, user });
    } catch (err) {
        console.error('Auth error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── Send OTP via Telegram bot ───
// Foydalanuvchi allaqachon JWT bilan autentifikatsiya qilingan (initData orqali).
// Telefon raqamini tekshirish uchun Telegram bot orqali 6 xonali kod yuboriladi.
router.post('/send-otp', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Token kerak' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Telefon raqami kerak' });

        // Telefon formatini normallashtirish
        const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

        // Rate limit: 60 soniyada bir marotaba yuborish mumkin
        if (user.otpExpiry && user.otpExpiry > new Date(Date.now() - 4 * 60 * 1000)) {
            const waitSec = Math.ceil((user.otpExpiry - (Date.now() - 4 * 60 * 1000)) / 1000);
            return res.status(429).json({ error: `Iltimos, ${waitSec} soniya kuting` });
        }

        // 6 xonali OTP
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 daqiqa

        user.otpCode = code;
        user.otpExpiry = expiry;
        await user.save();

        // Telegram bot orqali yuborish
        const TelegramService = require('../services/telegram.service');
        const text =
            `🔐 <b>EFES Delivery — Tasdiqlash kodi</b>\n\n` +
            `Telefon raqam: <b>${normalizedPhone}</b>\n\n` +
            `Kod: <b>${code}</b>\n\n` +
            `⏱ Kod 5 daqiqa davomida amal qiladi.\n` +
            `Agar siz bu so'rovni yubormagan bo'lsangiz, e'tibor bermang.`;

        const result = await TelegramService.sendMessage(user.telegramId, text);
        if (!result?.ok) {
            console.error('OTP Telegram xatosi:', result);
            return res.status(500).json({ error: 'Telegram orqali yuborib bo\'lmadi. Bot bilan suhbatni boshlang.' });
        }

        res.json({ success: true, message: "Kod Telegram botga yuborildi" });
    } catch (err) {
        if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Yaroqsiz token' });
        console.error('OTP send error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── Verify OTP ───
router.post('/verify-otp', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Token kerak' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { phone, code } = req.body;
        if (!phone || !code) return res.status(400).json({ error: 'Telefon va kod kerak' });

        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

        if (!user.otpCode || user.otpCode !== String(code).trim()) {
            return res.status(400).json({ error: "Kod noto'g'ri" });
        }
        if (!user.otpExpiry || new Date() > user.otpExpiry) {
            return res.status(400).json({ error: 'Kod muddati tugagan. Qayta yuboring.' });
        }

        const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;

        user.phone = normalizedPhone;
        user.isProfileComplete = true;
        user.otpCode = '';
        user.otpExpiry = null;
        await user.save();

        // Yangilangan token (user ma'lumotlari o'zgarsa ham)
        const newToken = jwt.sign(
            { userId: user._id, telegramId: user.telegramId },
            process.env.JWT_SECRET,
            { expiresIn: '30d' },
        );

        res.json({ success: true, token: newToken, user });
    } catch (err) {
        if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Yaroqsiz token' });
        console.error('OTP verify error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── Admin Login ───
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        let admin = await AdminAccount.findOne({ username });

        // Birinchi marta — default admin yaratish
        if (!admin && username === 'admin' && password === 'efes2026') {
            const hashed = await bcrypt.hash('efes2026', 10);
            admin = await AdminAccount.create({ username: 'admin', password: hashed, role: 'admin' });
        }

        if (!admin) return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });

        const token = jwt.sign(
            { adminId: admin._id, role: admin.role },
            process.env.ADMIN_JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, admin: { id: admin._id, username: admin.username, role: admin.role } });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

module.exports = router;
