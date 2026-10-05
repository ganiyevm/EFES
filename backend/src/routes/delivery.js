const router = require('express').Router();
const Settings = require('../models/Settings');
const { authAdmin } = require('../middleware/auth');
const { getDeliveryConfig, setDeliveryConfig } = require('../utils/deliveryConfig');
const { availablePaymentMethods } = require('../services/paymentUrl.service');

const APP_CONTENT_DEFAULT = {
    phone: '+998 71 200-94-44',
    telegram: 'efes_kebab_bot',
    instagram: 'efeskebab',
    about_description: 'EFES Kebab — Toshkentdagi eng yaxshi Turk taomlari restoranidir. Biz 2018-yildan beri o\'z mijozlarimizga yuqori sifatli va mazali taomlar taqdim etib kelmoqdamiz.',
    about_address: 'Toshkent shahri, Yunusobod tumani',
    about_work_hours: 'Har kuni 10:00 – 23:00',
    jobs_positions: ['Oshpaz', 'Ofitsiant', 'Kassir', 'Yetkazib beruvchi', 'Tozalovchi'],
    reviews: [],
    delivery_time: '30–60 daqiqa ichida',
    delivery_cost_text: '15 000 so\'mdan',
    delivery_free_text: '150 000 so\'mdan yuqori buyurtmalarda',
    delivery_zone: 'Toshkent shahri bo\'ylab',
    delivery_work_hours: 'Har kuni 10:00 – 23:00',
    delivery_min_order: '50 000 so\'m',
};

async function getAppContent() {
    const doc = await Settings.findOne({ key: 'app_content' });
    return { ...APP_CONTENT_DEFAULT, ...(doc?.value || {}) };
}

// ─── Public app content (frontend uchun) ───
router.get('/app-content', async (req, res) => {
    try {
        const content = await getAppContent();
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Public config (Cart.jsx uchun) ───
router.get('/config', async (req, res) => {
    try {
        const cfg = await getDeliveryConfig();
        res.json({
            deliveryCost: cfg.deliveryCost,
            minOrderAmount: cfg.minOrderAmount,
            freeDeliveryThreshold: cfg.freeDeliveryThreshold,
            estimatedDeliveryTime: cfg.estimatedDeliveryTime,
            workHours: cfg.workHours,
            isOpen: cfg.isOpen,
            bonusPercent: cfg.bonusPercent,
            maxBonusPercent: cfg.maxBonusPercent,
            paymentMethods: availablePaymentMethods(),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Admin routes ───
router.use(authAdmin);

router.get('/settings', async (req, res) => {
    try {
        const cfg = await getDeliveryConfig();
        res.json(cfg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/settings', async (req, res) => {
    try {
        const value = await setDeliveryConfig(req.body || {});
        res.json(value);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

// ─── App content CRUD (admin) ───
router.get('/app-content/admin', async (req, res) => {
    try {
        res.json(await getAppContent());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/app-content', async (req, res) => {
    try {
        const current = await getAppContent();
        const patch = {};
        for (const k of Object.keys(APP_CONTENT_DEFAULT)) {
            if (req.body?.[k] !== undefined) patch[k] = req.body[k];
        }
        const value = { ...current, ...patch };
        await Settings.findOneAndUpdate(
            { key: 'app_content' },
            { $set: { value } },
            { upsert: true, new: true }
        );
        res.json(value);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
