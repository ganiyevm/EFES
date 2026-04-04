const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const BonusService = require('./bonus.service');

class ClickService {
    static generateSign(params) {
        const str = `${params.click_trans_id}${params.service_id}${process.env.CLICK_SECRET_KEY}${params.merchant_trans_id}${params.amount}${params.action}${params.sign_time}`;
        return crypto.createHash('md5').update(str).digest('hex');
    }

    static async prepare(body) {
        const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string } = body;

        // Sign tekshirish
        const expectedSign = this.generateSign({ click_trans_id, service_id, merchant_trans_id, amount, action: 0, sign_time });
        if (sign_string !== expectedSign) {
            return { error: -1, error_note: 'SIGN CHECK FAILED' };
        }

        // Buyurtma tekshirish
        const order = await Order.findById(merchant_trans_id);
        if (!order) return { error: -5, error_note: 'Order not found' };
        if (order.paymentStatus === 'paid') return { error: -4, error_note: 'Already paid' };
        if (Math.abs(order.total - parseFloat(amount)) > 1) return { error: -2, error_note: 'Incorrect amount' };

        order.clickPrepareId = String(click_trans_id);
        await order.save();

        return {
            error: 0,
            error_note: 'Success',
            click_trans_id,
            merchant_trans_id,
            merchant_prepare_id: order._id.toString(),
        };
    }

    static async complete(body) {
        const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string, error: clickError } = body;

        const expectedSign = this.generateSign({ click_trans_id, service_id, merchant_trans_id, amount, action: 1, sign_time });
        if (sign_string !== expectedSign) {
            return { error: -1, error_note: 'SIGN CHECK FAILED' };
        }

        const order = await Order.findById(merchant_trans_id);
        if (!order) return { error: -5, error_note: 'Order not found' };

        if (parseInt(clickError) < 0) {
            order.paymentStatus = 'failed';
            order.status = 'cancelled';
            order.statusHistory.push({ status: 'cancelled', changedBy: 'system', note: 'Click to\'lov muvaffaqiyatsiz' });
            await order.save();
            return { error: -9, error_note: 'Transaction cancelled' };
        }

        if (order.paymentStatus === 'paid') {
            return { error: 0, error_note: 'Already paid', click_trans_id, merchant_trans_id, merchant_confirm_id: order._id.toString() };
        }

        order.paymentStatus = 'paid';
        order.paymentId = String(click_trans_id);
        order.status = 'pending_operator';
        order.statusHistory.push({ status: 'pending_operator', changedBy: 'system', note: 'Click orqali to\'lov qabul qilindi' });
        await order.save();

        // Bonus hisoblash
        const user = await User.findById(order.user);
        if (user) await BonusService.earnBonus(user, order);

        // Telegram xabar
        try {
            const TelegramService = require('./telegram.service');
            await TelegramService.notifyOperator(order);
        } catch (e) { console.error('Telegram notify error:', e.message); }

        return {
            error: 0,
            error_note: 'Success',
            click_trans_id,
            merchant_trans_id,
            merchant_confirm_id: order._id.toString(),
        };
    }
}

module.exports = ClickService;
