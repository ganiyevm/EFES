const router = require('express').Router();
const Order = require('../models/Order');
const AnalyticsDaily = require('../models/AnalyticsDaily');
const { authAdmin } = require('../middleware/auth');

router.use(authAdmin);

// ─── Dashboard analitika ───
router.get('/dashboard', async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        const [ordersByStatus, revenueByDay, topProducts, paymentMethods] = await Promise.all([
            // Status bo'yicha buyurtmalar
            Order.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            // Kunlik daromad
            Order.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo }, paymentStatus: 'paid' } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            // Top mahsulotlar
            Order.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                { $unwind: '$items' },
                { $group: { _id: '$items.productName', count: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            // To'lov usullari
            Order.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } },
            ]),
        ]);

        res.json({ ordersByStatus, revenueByDay, topProducts, paymentMethods });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Kunlik statistika ───
router.get('/daily', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
        const data = await AnalyticsDaily.find({ date: { $gte: startDate } }).sort({ date: 1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
