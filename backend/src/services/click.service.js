const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const BonusService = require('./bonus.service');
const SseService = require('./sse.service');
const OrderStatusService = require('./orderStatus.service');

// Maxfiy ma'lumot (sign_string, trans_id) faqat production'dan tashqarida loglanadi.
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Click sign formula (rasmiy):
 *   prepare  (action=0): md5(click_trans_id + service_id + SECRET + merchant_trans_id + ""                   + amount + action + sign_time)
 *   complete (action=1): md5(click_trans_id + service_id + SECRET + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
 */
function generateSign({ click_trans_id, service_id, merchant_trans_id, merchant_prepare_id = '', amount, action, sign_time }) {
    const str = `${click_trans_id}${service_id}${process.env.CLICK_SECRET_KEY}${merchant_trans_id}${merchant_prepare_id}${amount}${action}${sign_time}`;
    return crypto.createHash('md5').update(str).digest('hex');
}

class ClickService {
    // ─── Prepare (action=0) ───
    static async prepare(body) {
        if (isDev) console.log('[CLICK PREPARE]', JSON.stringify(body));
        try {
            const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string } = body;

            const expectedSign = generateSign({
                click_trans_id, service_id,
                merchant_trans_id,
                merchant_prepare_id: '',
                amount, action, sign_time,
            });
            if (expectedSign !== sign_string) {
                console.error('[CLICK PREPARE] SIGN CHECK FAILED', isDev ? { expected: expectedSign, got: sign_string } : '');
                return { error: -1, error_note: 'SIGN CHECK FAILED', click_trans_id, merchant_trans_id };
            }
            if (parseInt(action) !== 0) {
                return { error: -3, error_note: 'Action not found', click_trans_id, merchant_trans_id };
            }

            const order = await Order.findOne({ orderNumber: merchant_trans_id });
            if (!order) return { error: -5, error_note: 'Order not found', click_trans_id, merchant_trans_id };
            if (order.paymentStatus === 'paid') {
                return { error: -4, error_note: 'Already paid', click_trans_id, merchant_trans_id };
            }
            if (order.paymentMethod !== 'click' || ['cancelled', 'rejected'].includes(order.status)) {
                return { error: -9, error_note: 'Transaction cancelled', click_trans_id, merchant_trans_id };
            }
            if (Math.abs(parseFloat(amount) - order.total) > 0.01) {
                return { error: -2, error_note: 'Incorrect amount', click_trans_id, merchant_trans_id };
            }

            const prepareId = String(Date.now());
            order.paymentId = String(click_trans_id);
            order.clickPrepareId = prepareId;
            await order.save();

            return {
                error: 0, error_note: 'Success',
                click_trans_id, merchant_trans_id,
                merchant_prepare_id: prepareId,
            };
        } catch (err) {
            console.error('[CLICK PREPARE] Exception:', err.message);
            return { error: -9, error_note: 'Internal error' };
        }
    }

    // ─── Complete (action=1) ───
    static async complete(body) {
        if (isDev) console.log('[CLICK COMPLETE]', JSON.stringify(body));
        try {
            const { click_trans_id, service_id, merchant_trans_id, merchant_prepare_id, amount, action, sign_time, sign_string, error } = body;

            const expectedSign = generateSign({
                click_trans_id, service_id,
                merchant_trans_id,
                merchant_prepare_id: merchant_prepare_id || '',
                amount, action, sign_time,
            });
            if (expectedSign !== sign_string) {
                console.error('[CLICK COMPLETE] SIGN CHECK FAILED', isDev ? { expected: expectedSign, got: sign_string } : '');
                return { error: -1, error_note: 'SIGN CHECK FAILED', click_trans_id, merchant_trans_id };
            }
            if (parseInt(action) !== 1) {
                return { error: -3, error_note: 'Action not found', click_trans_id, merchant_trans_id };
            }

            const order = await Order.findOne({ orderNumber: merchant_trans_id });
            if (!order) return { error: -5, error_note: 'Order not found', click_trans_id, merchant_trans_id };
            if (order.paymentStatus === 'paid') {
                return { error: -4, error_note: 'Already paid', click_trans_id, merchant_trans_id };
            }
            if (order.clickPrepareId && order.clickPrepareId !== String(merchant_prepare_id)) {
                return { error: -6, error_note: 'Transaction not found (prepare_id mismatch)', click_trans_id, merchant_trans_id };
            }
            if (Math.abs(parseFloat(amount) - order.total) > 0.01) {
                return { error: -2, error_note: 'Incorrect amount', click_trans_id, merchant_trans_id };
            }

            // Foydalanuvchi bekor qildi yoki Click xatolik
            if (parseInt(error) < 0) {
                order.paymentStatus = 'failed';
                if (order.status === 'awaiting_payment') {
                    // Markaziy servis: bonus/promo qaytariladi, SSE yuboriladi
                    await OrderStatusService.applyTransition(order, 'cancelled', {
                        changedBy: 'system',
                        note: `Click to'lovi amalga oshmadi (kod: ${error})`,
                    });
                } else {
                    await order.save();
                }
                return { error: -9, error_note: 'Payment failed', click_trans_id, merchant_trans_id };
            }
            if (['cancelled', 'rejected'].includes(order.status)) {
                return { error: -9, error_note: 'Transaction cancelled', click_trans_id, merchant_trans_id };
            }

            await ClickService.confirmPayment(order);

            return {
                error: 0, error_note: 'Success',
                click_trans_id, merchant_trans_id,
                merchant_confirm_id: order._id.toString(),
            };
        } catch (err) {
            console.error('[CLICK COMPLETE] Exception:', err.message);
            return { error: -9, error_note: 'Internal error' };
        }
    }

    // ─── To'lov tasdiqlash (webhook yoki manual check dan chaqiriladi) ───
    static async confirmPayment(order) {
        if (order.paymentStatus === 'paid') return;
        order.paymentStatus = 'paid';
        if (order.status === 'awaiting_payment') {
            order.status = 'pending_operator';
            order.statusHistory.push({ status: 'pending_operator', changedBy: 'system', note: "Click orqali to'lov tasdiqlandi" });
        } else {
            // Bekor qilingan buyurtma keyin to'langan bo'lsa — qayta tiklamaymiz, admin pulni qaytaradi
            order.statusHistory.push({ status: order.status, changedBy: 'system', note: "Click to'lovi keldi — buyurtma faol emas, pulni qaytarish kerak" });
            await order.save();
            return;
        }
        await order.save();

        // Bonus
        try {
            const user = await User.findById(order.user);
            if (user) await BonusService.earnBonus(user, order);
        } catch (e) { console.error('[CLICK] Bonus error:', e.message); }

        // Operator + mijoz xabarnomasi
        try {
            const TelegramService = require('./telegram.service');
            await TelegramService.notifyOperator(order);
            await TelegramService.notifyCustomerStatus(order, { note: "Click orqali to'lov tasdiqlandi" });
        } catch (e) { console.error('[CLICK] Telegram error:', e.message); }

        // SSE real-vaqt yangilash
        SseService.emit(order._id, { status: order.status, paymentStatus: order.paymentStatus });
    }
}

module.exports = ClickService;
