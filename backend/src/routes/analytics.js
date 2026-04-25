const router = require('express').Router();
const Order = require('../models/Order');
const AnalyticsDaily = require('../models/AnalyticsDaily');
const { authAdmin } = require('../middleware/auth');
const AnalyticsService = require('../services/analytics.service');

router.use(authAdmin);

router.get('/overview', async (req, res, next) => {
    try { res.json(await AnalyticsService.getOverview()); } catch (e) { next(e); }
});

router.get('/period-chart', async (req, res, next) => {
    try {
        const { period = 'month' } = req.query;
        res.json(await AnalyticsService.getPeriodChartData(period));
    } catch (e) { next(e); }
});

router.get('/period-summary', async (req, res, next) => {
    try {
        const { period = 'month' } = req.query;
        res.json(await AnalyticsService.getPeriodSummary(period));
    } catch (e) { next(e); }
});

router.get('/products/top', async (req, res, next) => {
    try {
        const { limit = 10, period = '7' } = req.query;
        const days = parseInt(period) || 7;
        res.json(await AnalyticsService.getTopProducts(limit, days));
    } catch (e) { next(e); }
});

router.get('/branches/stats', async (req, res, next) => {
    try {
        const { period = 'today' } = req.query;
        res.json(await AnalyticsService.getBranchStats(period));
    } catch (e) { next(e); }
});

router.get('/payments/stats', async (req, res, next) => {
    try {
        const { period = 'month' } = req.query;
        res.json(await AnalyticsService.getPaymentStats(period));
    } catch (e) { next(e); }
});

router.get('/users/stats', async (req, res, next) => {
    try { res.json(await AnalyticsService.getUserStats()); } catch (e) { next(e); }
});

router.get('/orders/funnel', async (req, res, next) => {
    try {
        const { period = 'month' } = req.query;
        res.json(await AnalyticsService.getOrderFunnel(period));
    } catch (e) { next(e); }
});

// ─── Legacy: eski Dashboard.jsx talab qilgan format (zamonaviy Dashboard endi /overview va boshqalarni ishlatadi) ───
router.get('/dashboard', async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        const [ordersByStatus, revenueByDay, topProducts, paymentMethods] = await Promise.all([
            Order.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo }, paymentStatus: 'paid' } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            Order.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                { $unwind: '$items' },
                { $group: { _id: '$items.productName', count: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
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
