const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const BonusService = require('./bonus.service');

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
        console.log('[CLICK PREPARE]', JSON.stringify(body));
        try {
            const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string } = body;

            const expectedSign = generateSign({
                click_trans_id, service_id,
                merchant_trans_id,
                merchant_prepare_id: '',
                amount, action, sign_time,
            });
            if (expectedSign !== sign_string) {
                console.error('[CLICK PREPARE] SIGN FAILED', { expected: expectedSign, got: sign_string });
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
            if (parseFloat(amount) !== order.total) {
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
        console.log('[CLICK COMPLETE]', JSON.stringify(body));
        try {
            const { click_trans_id, service_id, merchant_trans_id, merchant_prepare_id, amount, action, sign_time, sign_string, error } = body;

            const expectedSign = generateSign({
                click_trans_id, service_id,
                merchant_trans_id,
                merchant_prepare_id: merchant_prepare_id || '',
                amount, action, sign_time,
            });
            if (expectedSign !== sign_string) {
                console.error('[CLICK COMPLETE] SIGN FAILED', { expected: expectedSign, got: sign_string });
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
            if (parseFloat(amount) !== order.total) {
                return { error: -2, error_note: 'Incorrect amount', click_trans_id, merchant_trans_id };
            }

            // Foydalanuvchi bekor qildi yoki Click xatolik
            if (parseInt(error) < 0) {
                order.paymentStatus = 'failed';
                order.status = 'cancelled';
                order.statusHistory.push({ status: 'cancelled', changedBy: 'system', note: `Click xatolik: ${error}` });
                await order.save();
                return { error: -9, error_note: 'Payment failed', click_trans_id, merchant_trans_id };
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
        order.status = 'pending_operator';
        order.statusHistory.push({ status: 'pending_operator', changedBy: 'system', note: "Click orqali to'lov tasdiqlandi" });
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
    }
}

module.exports = ClickService;
