const router = require('express').Router();
const Order = require('../models/Order');
const Courier = require('../models/Courier');
const Settings = require('../models/Settings');
const { authAdmin } = require('../middleware/auth');
const { getDeliveryConfig, setDeliveryConfig } = require('../utils/deliveryConfig');

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
        const value = await setDeliveryConfig(req.body);
        res.json(value);
    } catch (err) {
        res.status(500).json({ error: err.message });
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
        const value = { ...current, ...req.body };
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

// ─── Kurier tayinlash ───
router.patch('/orders/:id/assign', async (req, res) => {
    try {
        const { courierId } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

        const courier = await Courier.findById(courierId);
        if (!courier) return res.status(404).json({ error: 'Kurier topilmadi' });
        if (!courier.isActive) return res.status(400).json({ error: 'Kurier nofaol' });

        order.courierId = courier._id;
        order.status = 'on_the_way';
        order.dispatchedAt = new Date();
        order.statusHistory.push({
            status: 'on_the_way',
            changedBy: 'admin',
            note: `Kurier: ${courier.name} (${courier.phone})`,
        });
        await order.save();

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Yetkazildi deb belgilash + kurier bonusi ───
router.patch('/orders/:id/deliver', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

        const wasDelivered = order.status === 'delivered';

        order.status = 'delivered';
        order.deliveredAt = order.deliveredAt || new Date();
        if (order.paymentMethod === 'cash') order.paymentStatus = 'paid';
        order.statusHistory.push({ status: 'delivered', changedBy: 'courier' });
        await order.save();

        // Kurier bonusini oshirish (faqat birinchi marta delivered bo'lganda)
        if (!wasDelivered && order.courierId) {
            const courier = await Courier.findById(order.courierId);
            if (courier?.bonusEnabled && courier.bonusPerDelivery > 0) {
                await Courier.updateOne(
                    { _id: courier._id },
                    { $inc: { earnedBonus: courier.bonusPerDelivery } },
                );
            }
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
