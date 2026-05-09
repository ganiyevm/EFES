const User = require('../models/User');
const Courier = require('../models/Courier');
const BonusTransaction = require('../models/BonusTransaction');
const BonusService = require('./bonus.service');
const SseService = require('./sse.service');

// Buyurtma status o'zgarishining yon-ta'sirlarini markazlashtiradi
// (vaqtlar, to'lov statusi, mijoz/kurier bonusi). Customer Telegram
// xabarnomasi chaqiruvchi tomonidan yuboriladi — shu servisni toza saqlash uchun.

// Status o'tishlar jadvali — qaysi statusdan qaysi statusga o'tish mumkin
const ALLOWED_TRANSITIONS = {
    awaiting_payment: ['pending_operator', 'cancelled', 'rejected'],
    pending_operator: ['confirmed', 'rejected', 'cancelled'],
    confirmed: ['preparing', 'cancelled', 'rejected'],
    preparing: ['ready', 'cancelled'],
    ready: ['on_the_way', 'delivered', 'cancelled'],
    on_the_way: ['delivered', 'cancelled'],
    delivered: [],   // Yakuniy holat
    cancelled: [],   // Yakuniy holat
    rejected: [],    // Yakuniy holat
};

class OrderStatusService {
    static canTransition(fromStatus, toStatus) {
        if (fromStatus === toStatus) return true;
        const allowed = ALLOWED_TRANSITIONS[fromStatus];
        if (!allowed) return false;
        return allowed.includes(toStatus);
    }

    static async applyTransition(order, newStatus, { changedBy = 'system', note = '', force = false } = {}) {
        if (!force && !this.canTransition(order.status, newStatus)) {
            const err = new Error(`Status o'zgarishiga ruxsat yo'q: ${order.status} → ${newStatus}`);
            err.code = 'INVALID_TRANSITION';
            throw err;
        }
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

            // Bonus faqat bir marta qo'shiladi
            if (!order.bonusEarned || order.bonusEarned === 0) {
                const user = await User.findById(order.user);
                if (user) await BonusService.earnBonus(user, order);
            }

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

        // Real-vaqt yangilash: SSE orqali ulangan clientlarga yuborish
        SseService.emit(order._id, {
            status: order.status,
            paymentStatus: order.paymentStatus,
            deliveredAt: order.deliveredAt,
        });

        return order;
    }
}

module.exports = OrderStatusService;
