const router = require('express').Router();
const Order = require('../models/Order');
const Courier = require('../models/Courier');
const { authAdmin } = require('../middleware/auth');
const { getDeliveryConfig, setDeliveryConfig } = require('../utils/deliveryConfig');

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
