const User = require('../models/User');
const Courier = require('../models/Courier');
const BonusTransaction = require('../models/BonusTransaction');
const BonusService = require('./bonus.service');
const SseService = require('./sse.service');

// Buyurtma status o'zgarishining yon-ta'sirlarini markazlashtiradi
// (vaqtlar, to'lov statusi, mijoz/kurier bonusi, bekor qilishda qaytarishlar).
// Customer Telegram xabarnomasi chaqiruvchi tomonidan yuboriladi.

// Status o'tishlar jadvali — qaysi statusdan qaysi statusga o'tish mumkin.
// Oldinga bosqich tashlab o'tish mumkin (masalan operator "tayyorlanmoqda"ni
// bosmasa ham kurier "yo'lga chiqdim" bosa oladi), orqaga qaytish mumkin emas.
const ALLOWED_TRANSITIONS = {
    awaiting_payment: ['pending_operator', 'cancelled', 'rejected'],
    pending_operator: ['confirmed', 'rejected', 'cancelled'],
    confirmed: ['preparing', 'ready', 'on_the_way', 'delivered', 'cancelled', 'rejected'],
    preparing: ['ready', 'on_the_way', 'delivered', 'cancelled'],
    ready: ['on_the_way', 'delivered', 'cancelled'],
    on_the_way: ['delivered', 'cancelled'],
    delivered: [],   // Yakuniy holat
    cancelled: [],   // Yakuniy holat
    rejected: [],    // Yakuniy holat
};

const FAILED_STATUSES = ['cancelled', 'rejected'];
const ACTIVE_STATUSES = ['pending_operator', 'confirmed', 'preparing', 'ready', 'on_the_way'];

class OrderStatusService {
    static canTransition(fromStatus, toStatus) {
        if (fromStatus === toStatus) return true;
        const allowed = ALLOWED_TRANSITIONS[fromStatus];
        if (!allowed) return false;
        return allowed.includes(toStatus);
    }

    static async applyTransition(order, newStatus, { changedBy = 'system', note = '', force = false } = {}) {
        if (!ALLOWED_TRANSITIONS[newStatus]) {
            const err = new Error(`Noma'lum status: ${newStatus}`);
            err.code = 'INVALID_TRANSITION';
            throw err;
        }
        if (!force && !this.canTransition(order.status, newStatus)) {
            const err = new Error(`Status o'zgarishiga ruxsat yo'q: ${order.status} → ${newStatus}`);
            err.code = 'INVALID_TRANSITION';
            throw err;
        }
        const prevStatus = order.status;
        if (prevStatus === newStatus) return order;

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

        if (FAILED_STATUSES.includes(newStatus) && !FAILED_STATUSES.includes(prevStatus)) {
            await this._onOrderFailed(order);
        }

        // Real-vaqt yangilash: SSE orqali ulangan clientlarga yuborish
        SseService.emit(order._id, {
            status: order.status,
            paymentStatus: order.paymentStatus,
            deliveredAt: order.deliveredAt,
        });

        return order;
    }

    // Bekor qilish / rad etish yon-ta'sirlari — bir marta (faol → yakuniy o'tishda) ishlaydi:
    // sarflangan bonus qaytariladi, berilgan bonus olinadi, promo hisobi qaytariladi,
    // kurierlardagi broadcast o'chiriladi, biriktirilgan kurierga xabar beriladi.
    static async _onOrderFailed(order) {
        try {
            if (order.bonusDiscount > 0) {
                const user = await User.findById(order.user);
                if (user) await BonusService.refundBonus(user, order);
            }
        } catch (e) { console.error('[STATUS] Bonus refund:', e.message); }

        try { await BonusService.reverseEarned(order); }
        catch (e) { console.error('[STATUS] Bonus reverse:', e.message); }

        try {
            if (order.appliedPromo) {
                const Promotion = require('../models/Promotion');
                await Promotion.updateOne(
                    { _id: order.appliedPromo, usageCount: { $gt: 0 } },
                    { $inc: { usageCount: -1 } },
                );
            }
        } catch (e) { console.error('[STATUS] Promo:', e.message); }

        // Circular require oldini olish uchun lazy
        const CourierBotService = require('./courierBot.service');
        CourierBotService.clearBroadcasts(order._id).catch(() => {});
        if (order.courierId) {
            CourierBotService.notifyCourierCancelled(order).catch(() => {});
        }
    }
}

OrderStatusService.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;
OrderStatusService.ACTIVE_STATUSES = ACTIVE_STATUSES;
OrderStatusService.FAILED_STATUSES = FAILED_STATUSES;

module.exports = OrderStatusService;
