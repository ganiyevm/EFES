const User = require('../models/User');
const BonusTransaction = require('../models/BonusTransaction');

class BonusService {
    // Har 10,000 so'mga 100 ball
    static calculatePoints(amount) {
        if (!amount || amount <= 0) return 0;
        return Math.floor(amount / 10000) * 100;
    }

    static async earnBonus(user, order) {
        const points = this.calculatePoints(order.total);
        if (points <= 0) return;

        user.bonusPoints += points;
        user.totalOrders += 1;
        user.totalSpent += order.total;
        await user.save();

        order.bonusEarned = points;
        await order.save();

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
