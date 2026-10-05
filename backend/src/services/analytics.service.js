const Order = require('../models/Order');
const User = require('../models/User');
const { tashkentDayStart, DAY_MS } = require('../utils/time');

const TZ = 'Asia/Tashkent';
const ACTIVE = ['pending_operator', 'confirmed', 'preparing', 'ready', 'on_the_way'];

// Barcha kun chegaralari Toshkent vaqti bo'yicha (server UTC'da ishlaydi).
class AnalyticsService {

    static getPeriodDates(period = 'month') {
        const to = new Date();
        const days = { today: 0, week: 6, month: 29, quarter: 89, year: 364 }[period] ?? 29;
        const from = tashkentDayStart(to, -days);
        return { from, to };
    }

    // Bitta aggregate bilan davr statistikasi (avval barcha buyurtmalar xotiraga yuklanardi)
    static async aggregateRange(from, to) {
        const [agg, newUsers] = await Promise.all([
            Order.aggregate([
                { $match: { createdAt: { $gte: from, $lt: to } } },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                        cancelledOrders: { $sum: { $cond: [{ $in: ['$status', ['cancelled', 'rejected']] }, 1, 0] } },
                        activeOrders: { $sum: { $cond: [{ $in: ['$status', ACTIVE] }, 1, 0] } },
                        totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] } },
                    },
                },
            ]),
            User.countDocuments({ registeredAt: { $gte: from, $lt: to } }),
        ]);
        const r = agg[0] || { totalOrders: 0, completedOrders: 0, cancelledOrders: 0, activeOrders: 0, totalRevenue: 0 };
        return {
            totalOrders: r.totalOrders,
            completedOrders: r.completedOrders,
            cancelledOrders: r.cancelledOrders,
            activeOrders: r.activeOrders,
            totalRevenue: r.totalRevenue,
            avgOrderValue: r.completedOrders > 0 ? Math.round(r.totalRevenue / r.completedOrders) : 0,
            newUsers,
            conversionRate: r.totalOrders > 0 ? Math.round((r.completedOrders / r.totalOrders) * 100) : 0,
        };
    }

    static async getOverview() {
        const today = tashkentDayStart();
        const tomorrow = tashkentDayStart(new Date(), 1);
        const yesterday = tashkentDayStart(new Date(), -1);

        const [todayStats, yesterdayStats] = await Promise.all([
            this.getDayStats(today, tomorrow),
            this.getDayStats(yesterday, today),
        ]);

        const pct = (a, b) => b > 0 ? Math.round(((a - b) / b) * 100) : 0;
        return {
            today: todayStats,
            changes: {
                orderChange:   pct(todayStats.totalOrders,  yesterdayStats.totalOrders),
                revenueChange: pct(todayStats.totalRevenue, yesterdayStats.totalRevenue),
            },
        };
    }

    static async getDayStats(from, to) {
        return this.aggregateRange(from, to);
    }

    static async getPeriodChartData(period = 'month') {
        const { from, to } = this.getPeriodDates(period);
        const unit = period === 'year' ? 'month' : period === 'quarter' ? 'week' : 'day';

        const rows = await Order.aggregate([
            { $match: { createdAt: { $gte: from, $lte: to } } },
            {
                $group: {
                    _id: { $dateTrunc: { date: '$createdAt', unit, timezone: TZ, ...(unit === 'week' ? { startOfWeek: 'monday' } : {}) } },
                    totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] } },
                    totalOrders:  { $sum: 1 },
                },
            },
            { $project: { _id: 0, date: '$_id', totalRevenue: 1, totalOrders: 1 } },
            { $sort: { date: 1 } },
        ]);

        // Kunlik grafikda buyurtmasiz kunlar ham 0 bilan ko'rinsin (chiziq uzilmasin)
        if (unit !== 'day') return rows;
        const byDay = new Map(rows.map(r => [new Date(r.date).getTime(), r]));
        const filled = [];
        for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
            filled.push(byDay.get(t) || { date: new Date(t), totalRevenue: 0, totalOrders: 0 });
        }
        return filled;
    }

    static async getTopProducts(limit = 10, days = 7) {
        const from = tashkentDayStart(new Date(), -(Math.max(1, days) - 1));
        return Order.aggregate([
            { $match: { createdAt: { $gte: from }, status: 'delivered' } },
            { $unwind: '$items' },
            {
                $group: {
                    _id:          '$items.product',
                    name:         { $first: '$items.productName' },
                    totalQty:     { $sum: '$items.qty' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
                },
            },
            { $sort: { totalQty: -1 } },
            { $limit: Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50) },
        ]);
    }

    static async getBranchStats(period = 'today') {
        const { from } = this.getPeriodDates(period);

        return Order.aggregate([
            { $match: { createdAt: { $gte: from } } },
            {
                $group: {
                    _id: '$branch',
                    totalOrders:     { $sum: 1 },
                    completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                    totalRevenue:    { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] } },
                },
            },
            { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
            { $unwind: '$branch' },
            {
                $project: {
                    branchId: '$_id', name: '$branch.name', number: '$branch.number',
                    totalOrders: 1, completedOrders: 1, totalRevenue: 1,
                    completionRate: {
                        $cond: [
                            { $gt: ['$totalOrders', 0] },
                            { $round: [{ $multiply: [{ $divide: ['$completedOrders', '$totalOrders'] }, 100] }, 0] },
                            0,
                        ],
                    },
                },
            },
            { $sort: { totalOrders: -1 } },
        ]);
    }

    static async getPaymentStats(period = 'month') {
        const { from } = this.getPeriodDates(period);
        return Order.aggregate([
            { $match: { createdAt: { $gte: from }, paymentStatus: 'paid' } },
            { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } },
        ]);
    }

    static async getUserStats() {
        const today    = tashkentDayStart();
        const weekAgo  = tashkentDayStart(new Date(), -7);
        const monthAgo = tashkentDayStart(new Date(), -30);

        const [total, todayNew, weekNew, monthNew, active] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ registeredAt: { $gte: today } }),
            User.countDocuments({ registeredAt: { $gte: weekAgo } }),
            User.countDocuments({ registeredAt: { $gte: monthAgo } }),
            User.countDocuments({ lastActiveAt: { $gte: weekAgo } }),
        ]);
        return { total, todayNew, weekNew, monthNew, activeWeek: active };
    }

    static async getOrderFunnel(period = 'month') {
        const { from } = this.getPeriodDates(period);

        const result = await Order.aggregate([
            { $match: { createdAt: { $gte: from } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        const map = {};
        result.forEach(r => { map[r._id] = r.count; });

        const total      = Object.values(map).reduce((a, b) => a + b, 0);
        const paid       = (map.pending_operator || 0) + (map.confirmed || 0) + (map.preparing || 0) + (map.ready || 0) + (map.on_the_way || 0) + (map.delivered || 0);
        const confirmed  = (map.confirmed || 0) + (map.preparing || 0) + (map.ready || 0) + (map.on_the_way || 0) + (map.delivered || 0);
        const on_the_way = (map.on_the_way || 0) + (map.delivered || 0);
        const delivered  = map.delivered || 0;
        const cancelled  = (map.cancelled || 0) + (map.rejected || 0);

        return { total, paid, confirmed, on_the_way, delivered, cancelled, raw: map };
    }

    static async getPeriodSummary(period = 'month') {
        const { from, to } = this.getPeriodDates(period);

        const diff = to - from;
        const prevFrom = new Date(from - diff);
        const prevTo   = new Date(from);

        const [curr, prev] = await Promise.all([this.aggregateRange(from, to), this.aggregateRange(prevFrom, prevTo)]);
        const pct = (a, b) => b > 0 ? Math.round(((a - b) / b) * 100) : 0;

        return {
            current: curr,
            changes: {
                orderChange:   pct(curr.totalOrders,  prev.totalOrders),
                revenueChange: pct(curr.totalRevenue, prev.totalRevenue),
                userChange:    pct(curr.newUsers,     prev.newUsers),
            },
        };
    }
}

module.exports = AnalyticsService;
