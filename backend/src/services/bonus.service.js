const User = require('../models/User');
const Order = require('../models/Order');
const BonusTransaction = require('../models/BonusTransaction');

function tierFor(points) {
    if (points >= 5000) return 'gold';
    if (points >= 2000) return 'silver';
    return 'bronze';
}

// Atomik $inc dan keyin darajani (bronze/silver/gold) qayta hisoblash
async function syncTier(userId) {
    const u = await User.findById(userId).select('bonusPoints bonusTier').lean();
    if (!u) return;
    const tier = tierFor(u.bonusPoints || 0);
    if (tier !== u.bonusTier) await User.updateOne({ _id: userId }, { bonusTier: tier });
}

class BonusService {
    // Har 10,000 so'mga 100 ball × bonusPercent (admin sozlamasi, standart 1%)
    static calculatePoints(amount, bonusPercent = 1) {
        if (!amount || amount <= 0) return 0;
        const pct = Number(bonusPercent);
        if (!Number.isFinite(pct) || pct <= 0) return 0;
        return Math.floor(Math.floor(amount / 10000) * 100 * pct);
    }

    // Idempotent: bir buyurtma uchun faqat bir marta bonus beriladi.
    // MongoDB atomik update bilan race condition oldini oladi.
    static async earnBonus(user, order) {
        let bonusPercent = 1;
        try {
            const { getDeliveryConfig } = require('../utils/deliveryConfig');
            bonusPercent = (await getDeliveryConfig()).bonusPercent;
        } catch { /* standart 1% */ }

        const points = this.calculatePoints(order.total, bonusPercent);
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
        await syncTier(user._id);
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

    // Bekor qilingan/rad etilgan buyurtma uchun berilgan bonusni qaytarib olish.
    // Idempotent: bonusEarned > 0 bo'lgandagina bir marta ishlaydi.
    static async reverseEarned(order) {
        const points = order.bonusEarned || 0;
        if (points <= 0) return;
        const claim = await Order.updateOne(
            { _id: order._id, bonusEarned: points },
            { $set: { bonusEarned: 0 } },
        );
        if (claim.modifiedCount === 0) return;
        order.bonusEarned = 0;

        const user = await User.findById(order.user).select('bonusPoints telegramId');
        if (!user) return;
        // Balans manfiyga tushmasligi uchun — mavjud balansdan ortiq olinmaydi
        const deduct = Math.min(points, Math.max(user.bonusPoints || 0, 0));
        await User.updateOne(
            { _id: user._id },
            { $inc: { bonusPoints: -deduct, totalOrders: -1, totalSpent: -(order.total || 0) } },
        );
        await syncTier(user._id);
        if (deduct > 0) {
            await BonusTransaction.create({
                user: user._id,
                telegramId: user.telegramId,
                type: 'spent',
                amount: deduct,
                order: order._id,
                description: `${order.orderNumber} bekor qilindi — berilgan bonus qaytarib olindi`,
            });
        }
    }

    static async spendBonus(user, order, amount) {
        if (amount > user.bonusPoints) throw new Error('Yetarli bonus mavjud emas');

        // Atomik: parallel ikki buyurtmada bir xil ballni ikki marta sarflab bo'lmaydi
        const updated = await User.findOneAndUpdate(
            { _id: user._id, bonusPoints: { $gte: amount } },
            { $inc: { bonusPoints: -amount } },
            { new: true },
        );
        if (!updated) throw new Error('Yetarli bonus mavjud emas');
        user.bonusPoints = updated.bonusPoints;
        await syncTier(user._id);

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
            await User.updateOne({ _id: user._id }, { $inc: { bonusPoints: order.bonusDiscount } });
            await syncTier(user._id);
            user.bonusPoints = (user.bonusPoints || 0) + order.bonusDiscount;
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
