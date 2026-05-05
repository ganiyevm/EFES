const cron = require('node-cron');

// Kunlik analytics faqat bitta instance da ishlaydi
if (!process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0') {
    cron.schedule('55 23 * * *', async () => {
        try {
            const Order = require('../models/Order');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const [orders, revenue] = await Promise.all([
                Order.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
                Order.aggregate([
                    { $match: { paymentStatus: 'paid', createdAt: { $gte: today, $lt: tomorrow } } },
                    { $group: { _id: null, total: { $sum: '$total' } } },
                ]),
            ]);

            console.log(`📊 Kunlik: ${today.toDateString()} — ${orders} buyurtma, ${revenue[0]?.total || 0} so'm`);
        } catch (err) {
            console.error('📊 Daily analytics error:', err.message);
        }
    }, { timezone: 'Asia/Tashkent' });

    console.log('📊 Daily analytics job registered');
}
