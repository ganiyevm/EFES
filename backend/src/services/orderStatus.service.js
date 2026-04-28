const User = require('../models/User');
const Courier = require('../models/Courier');
const BonusTransaction = require('../models/BonusTransaction');
const BonusService = require('./bonus.service');

// Buyurtma status o'zgarishining yon-ta'sirlarini markazlashtiradi
// (vaqtlar, to'lov statusi, mijoz/kurier bonusi). Customer Telegram
// xabarnomasi chaqiruvchi tomonidan yuboriladi — shu servisni toza saqlash uchun.
class OrderStatusService {
    static async applyTransition(order, newStatus, { changedBy = 'system', note = '' } = {}) {
        order.status = newStatus;
        order.statusHistory.push({ status: newStatus, changedBy, note });

        if (newStatus === 'confirmed') order.confirmedAt = new Date();
        if (newStatus === 'preparing') order.preparingAt = new Date();
        if (newStatus === 'ready') order.readyAt = new Date();
        if (newStatus === 'on_the_way') order.dispatchedAt = new Date();

        if (newStatus === 'delivered') {
            const wasDelivered = order.deliveredAt != null;
            order.deliveredAt = order.deliveredAt || new Date();
            if (order.paymentMethod === 'cash') order.paymentStatus = 'paid';

            const user = await User.findById(order.user);
            if (user) await BonusService.earnBonus(user, order);

            if (!wasDelivered && order.courierId) {
                const courier = await Courier.findById(order.courierId);
                if (courier?.bonusEnabled && courier.bonusPerDelivery > 0) {
                    await Courier.updateOne(
                        { _id: courier._id },
                        { $inc: { earnedBonus: courier.bonusPerDelivery } },
                    );
                    await BonusTransaction.create({
                        courier: courier._id,
                        courierTelegramId: courier.telegramId,
                        entityType: 'courier',
                        type: 'earned',
                        amount: courier.bonusPerDelivery,
                        order: order._id,
                        description: `${order.orderNumber} yetkazib berildi — ${courier.bonusPerDelivery.toLocaleString()} so'm bonus`,
                    });
                }
            }
        }

        await order.save();
        return order;
    }
}

module.exports = OrderStatusService;
