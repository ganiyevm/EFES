const Order = require('../models/Order');
const User = require('../models/User');
const BonusService = require('./bonus.service');

const PAYME_TIMEOUT = 43200000; // 12 soat ms

class PaymeService {
    static async handleRequest(body) {
        const { id, method, params } = body;

        switch (method) {
            case 'CheckPerformTransaction': return this.checkPerform(id, params);
            case 'CreateTransaction': return this.create(id, params);
            case 'PerformTransaction': return this.perform(id, params);
            case 'CancelTransaction': return this.cancel(id, params);
            case 'CheckTransaction': return this.check(id, params);
            case 'GetStatement': return this.getStatement(id, params);
            default: return { error: { code: -32601, message: 'Method not found' }, id };
        }
    }

    static async checkPerform(id, params) {
        const orderId = params.account?.order_id;
        const order = await Order.findById(orderId);
        if (!order) return { error: { code: -31050, message: 'Order not found' }, id };
        if (order.paymentStatus === 'paid') return { error: { code: -31051, message: 'Already paid' }, id };
        if (order.total * 100 !== params.amount) return { error: { code: -31001, message: 'Wrong amount' }, id };
        return { result: { allow: true }, id };
    }

    static async create(id, params) {
        const orderId = params.account?.order_id;
        const order = await Order.findById(orderId);
        if (!order) return { error: { code: -31050, message: 'Order not found' }, id };

        if (order.paymeTransId && order.paymeTransId !== params.id) {
            return { error: { code: -31051, message: 'Transaction exists' }, id };
        }

        if (order.paymeState === 2) return { error: { code: -31051, message: 'Already performed' }, id };

        if (!order.paymeTransId) {
            order.paymeTransId = params.id;
            order.paymeState = 1;
            order.paymeCreateTime = params.time || Date.now();
            await order.save();
        }

        // Timeout tekshirish
        if (Date.now() - order.paymeCreateTime > PAYME_TIMEOUT) {
            order.paymeState = -1;
            order.paymeCancelTime = Date.now();
            order.paymeReason = 4;
            await order.save();
            return { error: { code: -31008, message: 'Transaction timeout' }, id };
        }

        return { result: { create_time: order.paymeCreateTime, transaction: order.paymeTransId, state: order.paymeState }, id };
    }

    static async perform(id, params) {
        const order = await Order.findOne({ paymeTransId: params.id });
        if (!order) return { error: { code: -31003, message: 'Transaction not found' }, id };

        if (order.paymeState === 2) {
            return { result: { transaction: order.paymeTransId, perform_time: order.paymePerformTime, state: 2 }, id };
        }

        if (order.paymeState !== 1) return { error: { code: -31008, message: 'Invalid state' }, id };

        // Timeout
        if (Date.now() - order.paymeCreateTime > PAYME_TIMEOUT) {
            order.paymeState = -1;
            order.paymeCancelTime = Date.now();
            order.paymeReason = 4;
            await order.save();
            return { error: { code: -31008, message: 'Transaction timeout' }, id };
        }

        order.paymeState = 2;
        order.paymePerformTime = Date.now();
        order.paymentStatus = 'paid';
        order.status = 'pending_operator';
        order.statusHistory.push({ status: 'pending_operator', changedBy: 'system', note: 'Payme orqali to\'lov qabul qilindi' });
        await order.save();

        // Bonus va xabarnoma
        try {
            const user = await User.findById(order.user);
            if (user) await BonusService.earnBonus(user, order);
            const TelegramService = require('./telegram.service');
            await TelegramService.notifyOperator(order);
        } catch (e) { console.error('Post-payment error:', e.message); }

        return { result: { transaction: order.paymeTransId, perform_time: order.paymePerformTime, state: 2 }, id };
    }

    static async cancel(id, params) {
        const order = await Order.findOne({ paymeTransId: params.id });
        if (!order) return { error: { code: -31003, message: 'Transaction not found' }, id };

        if (order.paymeState === 1) {
            order.paymeState = -1;
        } else if (order.paymeState === 2) {
            order.paymeState = -2;
            order.paymentStatus = 'refunded';
        } else if (order.paymeState < 0) {
            return { result: { transaction: order.paymeTransId, cancel_time: order.paymeCancelTime, state: order.paymeState }, id };
        }

        order.paymeCancelTime = Date.now();
        order.paymeReason = params.reason;
        order.status = 'cancelled';
        order.statusHistory.push({ status: 'cancelled', changedBy: 'system', note: `Payme bekor qildi: reason ${params.reason}` });
        await order.save();

        return { result: { transaction: order.paymeTransId, cancel_time: order.paymeCancelTime, state: order.paymeState }, id };
    }

    static async check(id, params) {
        const order = await Order.findOne({ paymeTransId: params.id });
        if (!order) return { error: { code: -31003, message: 'Transaction not found' }, id };
        return {
            result: {
                create_time: order.paymeCreateTime,
                perform_time: order.paymePerformTime,
                cancel_time: order.paymeCancelTime,
                transaction: order.paymeTransId,
                state: order.paymeState,
                reason: order.paymeReason || null,
            }, id,
        };
    }

    static async getStatement(id, params) {
        const orders = await Order.find({
            paymeTransId: { $ne: '' },
            paymeCreateTime: { $gte: params.from, $lte: params.to },
        });
        const transactions = orders.map(o => ({
            id: o.paymeTransId,
            time: o.paymeCreateTime,
            amount: o.total * 100,
            account: { order_id: o._id.toString() },
            create_time: o.paymeCreateTime,
            perform_time: o.paymePerformTime,
            cancel_time: o.paymeCancelTime,
            transaction: o.paymeTransId,
            state: o.paymeState,
            reason: o.paymeReason || null,
        }));
        return { result: { transactions }, id };
    }
}

module.exports = PaymeService;
