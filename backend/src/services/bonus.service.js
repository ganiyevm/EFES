const User = require('../models/User');
const Order = require('../models/Order');
const BonusTransaction = require('../models/BonusTransaction');

class BonusService {
    // Har 10,000 so'mga 100 ball
    static calculatePoints(amount) {
        if (!amount || amount <= 0) return 0;
        return Math.floor(amount / 10000) * 100;
    }

    // Idempotent: bir buyurtma uchun faqat bir marta bonus beriladi.
    // MongoDB atomik update bilan race condition oldini oladi.
    static async earnBonus(user, order) {
        const points = this.calculatePoints(order.total);
        if (points <= 0) return;

        // Atomik claim — bonusEarned 0 yoki yo'q bo'lsa, points'ga belgilaymiz.
        // Bir vaqtning o'zida 2 ta call kelsa, faqat 1 tasi muvaffaqiyatli bo'ladi.
        const claim = await Order.updateOne(
            { _id: order._id, $or: [{ bonusEarned: { $exists: false } }, { bonusEarned: 0 }, { bonusEarned: null }] },
            { $set: { bonusEarned: points } }
        );
        if (claim.modifiedCount === 0) {
            return; // Allaqachon hisoblangan
        }
        order.bonusEarned = points;

        await User.updateOne(
            { _id: user._id },
            { $inc: { bonusPoints: points, totalOrders: 1, totalSpent: order.total } }
        );
        // user obyektini ham yangilab qo'yamiz
        user.bonusPoints = (user.bonusPoints || 0) + points;
        user.totalOrders = (user.totalOrders || 0) + 1;
        user.totalSpent = (user.totalSpent || 0) + order.total;

        await BonusTransaction.create({
            user: user._id,
            telegramId: user.telegramId,
            type: 'earned',
            amount: points,
            order: order._id,
            description: `${order.orderNumber} buyurtmasidan ${points} ball`,
        });
    }

    static async spendBonus(user, order, amount) {
        if (amount > user.bonusPoints) throw new Error('Yetarli bonus mavjud emas');

        user.bonusPoints -= amount;
        await user.save();

        await BonusTransaction.create({
            user: user._id,
            telegramId: user.telegramId,
            type: 'spent',
            amount,
            order: order._id,
            description: `${amount} ball chegirma sifatida ishlatildi`,
        });
    }

    static async refundBonus(user, order) {
        if (order.bonusDiscount > 0) {
            user.bonusPoints += order.bonusDiscount;
            await user.save();
            await BonusTransaction.create({
                user: user._id,
                telegramId: user.telegramId,
                type: 'earned',
                amount: order.bonusDiscount,
                order: order._id,
                description: 'Bekor qilingan buyurtmadan bonus qaytarildi',
            });
        }
    }
}

module.exports = BonusService;
