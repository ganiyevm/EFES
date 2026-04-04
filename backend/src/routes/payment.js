const router = require('express').Router();
const ClickService = require('../services/click.service');
const PaymeService = require('../services/payme.service');
const Order = require('../models/Order');
const { authTelegram } = require('../middleware/auth');

// ─── Click Prepare ───
router.post('/click/prepare', async (req, res) => {
    try {
        console.log('[CLICK] prepare:', JSON.stringify(req.body));
        const result = await ClickService.prepare(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: -1, error_note: err.message });
    }
});

// ─── Click Complete ───
router.post('/click/complete', async (req, res) => {
    try {
        console.log('[CLICK] complete:', JSON.stringify(req.body));
        const result = await ClickService.complete(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: -1, error_note: err.message });
    }
});

// ─── Payme JSON-RPC ───
router.post('/payme', async (req, res) => {
    try {
        console.log('[PAYME] request:', JSON.stringify(req.body));

        // Basic Auth tekshirish
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Basic ')) {
            return res.json({ error: { code: -32504, message: 'Auth required' } });
        }
        const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
        const [, merchantKey] = decoded.split(':');
        if (merchantKey !== process.env.PAYME_MERCHANT_KEY) {
            return res.json({ error: { code: -32504, message: 'Invalid credentials' } });
        }

        const result = await PaymeService.handleRequest(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: { code: -32400, message: err.message } });
    }
});

// ─── To'lov holati tekshirish ───
router.get('/status/:orderId', authTelegram, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId).select('paymentStatus paymentMethod status total');
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
        res.json({
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            orderStatus: order.status,
            total: order.total,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
