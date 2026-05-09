const cron = require('node-cron');

async function aggregateDay(targetDate) {
    const Order = require('../models/Order');
    const User = require('../models/User');
    const AnalyticsDaily = require('../models/AnalyticsDaily');

    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const range = { createdAt: { $gte: dayStart, $lt: dayEnd } };

    const [
        ordersCount,
        deliveredCount,
        cancelledCount,
        revenueAgg,
        newUsers,
        paymentAgg,
        topProductsAgg,
        deliveryTimeAgg,
    ] = await Promise.all([
        Order.countDocuments(range),
        Order.countDocuments({ ...range, status: 'delivered' }),
        Order.countDocuments({ ...range, status: { $in: ['cancelled', 'rejected'] } }),
        Order.aggregate([
            { $match: { ...range, paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
        ]),
        User.countDocuments(range),
        Order.aggregate([
            { $match: { ...range, paymentStatus: 'paid' } },
            { $group: { _id: '$paymentMethod', count: { $sum: 1 } } },
        ]),
        Order.aggregate([
            { $match: range },
            { $unwind: '$items' },
            { $group: { _id: '$items.productName', count: { $sum: '$items.qty' } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
        ]),
        Order.aggregate([
            { $match: { ...range, status: 'delivered', deliveredAt: { $exists: true }, dispatchedAt: { $exists: true } } },
            { $project: { diff: { $subtract: ['$deliveredAt', '$dispatchedAt'] } } },
            { $group: { _id: null, avg: { $avg: '$diff' } } },
        ]),
    ]);

    const revenue = revenueAgg[0]?.total || 0;
    const paidCount = revenueAgg[0]?.count || 0;
    const avgOrderValue = paidCount > 0 ? Math.round(revenue / paidCount) : 0;
    const avgDeliveryTime = deliveryTimeAgg[0]?.avg ? Math.round(deliveryTimeAgg[0].avg / 60000) : 0; // minutes

    const paymentMethods = { click: 0, payme: 0, cash: 0 };
    for (const p of paymentAgg) {
        if (p._id && paymentMethods[p._id] !== undefined) paymentMethods[p._id] = p.count;
    }
    const topProducts = topProductsAgg.map(t => ({ product: t._id, count: t.count }));

    await AnalyticsDaily.findOneAndUpdate(
        { date: dayStart },
        {
            date: dayStart,
            ordersCount,
            revenue,
            avgOrderValue,
            newUsers,
            deliveredCount,
            cancelledCount,
            avgDeliveryTime,
            topProducts,
            paymentMethods,
        },
        { upsert: true, new: true }
    );

    return { date: dayStart, ordersCount, revenue, deliveredCount };
}

// Faqat birinchi PM2 instance ishlatadi
if (!process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0') {
    cron.schedule('55 23 * * *', async () => {
        try {
            const result = await aggregateDay(new Date());
            console.log(`📊 Kunlik analytics: ${result.date.toDateString()} — ${result.ordersCount} buyurtma, ${result.revenue.toLocaleString()} so'm`);
        } catch (err) {
            console.error('📊 Daily analytics error:', err.message);
        }
    }, { timezone: 'Asia/Tashkent' });

    console.log('📊 Daily analytics job registered');
}

module.exports = { aggregateDay };
