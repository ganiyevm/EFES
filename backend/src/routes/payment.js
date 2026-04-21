const router = require('express').Router();
const crypto = require('crypto');
const https = require('https');
const ClickService = require('../services/click.service');
const PaymeService = require('../services/payme.service');
const Order = require('../models/Order');
const { authTelegram } = require('../middleware/auth');

// ─── Click API helper (server-side status check) ───
function clickApiGet(path) {
    return new Promise((resolve) => {
        const merchantId = process.env.CLICK_MERCHANT_USER_ID;
        const secretKey = process.env.CLICK_SECRET_KEY;
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const digest = crypto.createHash('sha1').update(timestamp + secretKey).digest('hex');

        const req = https.request({
            hostname: 'api.click.uz',
            path,
            method: 'GET',
            headers: {
                'Auth': `${merchantId}:${digest}:${timestamp}`,
                'Accept': 'application/json',
            },
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(5000, () => { req.destroy(); resolve(null); });
        req.end();
    });
}

// ─── Click webhook (POST) + URL validation (GET) ───
router.get('/click/prepare', (req, res) => res.json({ error: 0, error_note: 'OK' }));
router.get('/click/complete', (req, res) => res.json({ error: 0, error_note: 'OK' }));

router.post('/click/prepare', async (req, res) => {
    const result = await ClickService.prepare(req.body);
    res.json(result);
});

router.post('/click/complete', async (req, res) => {
    const result = await ClickService.complete(req.body);
    res.json(result);
});

// ─── Payme JSON-RPC ───
router.post('/payme', async (req, res) => {
    const result = await PaymeService.handleRequest(req);
    res.json(result);
});

// ─── Manual status check (Click) — Click API orqali to'lovni qayta tekshirish ───
router.get('/click/check/:orderId', authTelegram, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

        if (order.paymentStatus === 'paid') {
            return res.json({ paid: true, source: 'db' });
        }

        const serviceId = process.env.CLICK_SERVICE_ID;

        // click_trans_id orqali
        if (order.paymentId && process.env.CLICK_MERCHANT_USER_ID) {
            const byTransId = await clickApiGet(`/v2/merchant/payment/status/${serviceId}/${order.paymentId}`);
            console.log('[CLICK CHECK] by trans_id →', JSON.stringify(byTransId));
            if (byTransId?.error_code === 0 && byTransId.payment_status === 2) {
                await ClickService.confirmPayment(order);
                return res.json({ paid: true, source: 'click_api' });
            }
        }

        // orderNumber orqali
        if (process.env.CLICK_MERCHANT_USER_ID) {
            const byOrderNum = await clickApiGet(`/v2/merchant/payment/status/${serviceId}/${encodeURIComponent(order.orderNumber)}`);
            console.log('[CLICK CHECK] by orderNumber →', JSON.stringify(byOrderNum));
            if (byOrderNum?.error_code === 0 && byOrderNum.payment_status === 2) {
                await ClickService.confirmPayment(order);
                return res.json({ paid: true, source: 'click_api' });
            }
        }

        res.json({ paid: false, reason: 'not_paid', message: "Click tizimida to'lov topilmadi" });
    } catch (err) {
        console.error('[CLICK CHECK] error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── Manual status check (Payme) — local state check ───
router.get('/payme/check/:orderId', authTelegram, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

        if (order.paymentStatus === 'paid') return res.json({ paid: true, source: 'db' });
        if (order.paymeState === 2) return res.json({ paid: true, source: 'payme_state' });
        if (order.paymeState === -1 || order.paymeState === -2) {
            return res.json({ paid: false, reason: 'cancelled', message: "To'lov bekor qilingan" });
        }
        if (order.paymeState === 1) {
            return res.json({ paid: false, reason: 'pending', message: "To'lov kutilmoqda" });
        }
        res.json({ paid: false, reason: 'not_started', message: "Payme to'lov boshlanmagan" });
    } catch (err) {
        console.error('[PAYME CHECK] error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── Polling uchun — umumiy to'lov holati ───
router.get('/status/:orderId', authTelegram, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .select('orderNumber status paymentStatus paymentMethod total bonusEarned')
            .lean();
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

        res.json({
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            total: order.total,
            bonusEarned: order.bonusEarned || 0,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
