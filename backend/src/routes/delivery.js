const router = require('express').Router();
const Order = require('../models/Order');
const { authAdmin } = require('../middleware/auth');

router.use(authAdmin);

// ─── Kurier tayinlash ───
router.patch('/orders/:id/assign', async (req, res) => {
    try {
        const { courierId } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

        order.courierId = courierId;
        order.status = 'on_the_way';
        order.dispatchedAt = new Date();
        order.statusHistory.push({ status: 'on_the_way', changedBy: 'admin', note: `Kurier #${courierId} tayinlandi` });
        await order.save();

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Yetkazildi deb belgilash ───
router.patch('/orders/:id/deliver', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

        order.status = 'delivered';
        order.deliveredAt = new Date();
        if (order.paymentMethod === 'cash') order.paymentStatus = 'paid';
        order.statusHistory.push({ status: 'delivered', changedBy: 'courier' });
        await order.save();

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
