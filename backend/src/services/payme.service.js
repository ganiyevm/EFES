const Order = require('../models/Order');
const User = require('../models/User');
const BonusService = require('./bonus.service');

// Payme transaction timeout — 12 soat (ms)
const TRANSACTION_TIMEOUT = 12 * 60 * 60 * 1000;

class PaymeService {
    // ─── Basic Auth tekshirish ───
    static checkAuth(req) {
        const authHeader = req.headers?.authorization || '';
        if (!authHeader.startsWith('Basic ')) return false;
        const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString();
        const [, key] = decoded.split(':');
        return key === process.env.PAYME_MERCHANT_KEY;
    }

    // ─── JSON-RPC handler ───
    static async handleRequest(req) {
        const { method, params, id } = req.body;
        console.log(`[PAYME] method=${method} params=${JSON.stringify(params)}`);

        if (!PaymeService.checkAuth(req)) {
            console.error('[PAYME] AUTH FAILED');
            return { error: { code: -32504, message: { uz: 'Avtorizatsiya xatosi' } }, id };
        }

        try {
            switch (method) {
                case 'CheckPerformTransaction': return PaymeService.checkPerform(params, id);
                case 'CreateTransaction': return PaymeService.createTransaction(params, id);
                case 'PerformTransaction': return PaymeService.performTransaction(params, id);
                case 'CancelTransaction': return PaymeService.cancelTransaction(params, id);
                case 'CheckTransaction': return PaymeService.checkTransaction(params, id);
                case 'GetStatement': return PaymeService.getStatement(params, id);
                default: return { error: { code: -32601, message: 'Method not found' }, id };
            }
        } catch (err) {
            console.error(`[PAYME] ${method} exception:`, err.message);
            return { error: { code: -31008, message: 'Internal error' }, id };
        }
    }

    static async findOrder(orderId) {
        return Order.findOne({ orderNumber: orderId });
    }

    // ─── CheckPerformTransaction ───
    static async checkPerform(params, id) {
        const order = await PaymeService.findOrder(params.account?.order_id);
        if (!order) return { error: { code: -31050, message: { uz: 'Buyurtma topilmadi' } }, id };
        if (order.paymentStatus === 'paid') return { error: { code: -31051, message: { uz: "Allaqachon to'langan" } }, id };
        if (order.status === 'cancelled') return { error: { code: -31099, message: { uz: 'Bekor qilingan' } }, id };
        if (params.amount !== order.total * 100) return { error: { code: -31001, message: { uz: "Noto'g'ri summa" } }, id };
        return { result: { allow: true }, id };
    }

    // ─── CreateTransaction ───
    static async createTransaction(params, id) {
        const order = await PaymeService.findOrder(params.account?.order_id);
        if (!order) return { error: { code: -31050, message: { uz: 'Buyurtma topilmadi' } }, id };
        if (params.amount !== order.total * 100) {
            return { error: { code: -31001, message: { uz: "Noto'g'ri summa" } }, id };
        }

        // Idempotency: shu tranzaksiya allaqachon bo'lsa
        if (order.paymeTransId === params.id) {
            if (order.paymeState === 1) {
                if (Date.now() - order.paymeCreateTime > TRANSACTION_TIMEOUT) {
                    order.paymeState = -1;
                    order.paymeCancelTime = Date.now();
                    order.paymeReason = 4;
                    order.paymentStatus = 'failed';
                    await order.save();
                    return { error: { code: -31008, message: { uz: "Vaqt o'tgan" } }, id };
                }
                return { result: { create_time: order.paymeCreateTime, transaction: order._id.toString(), state: order.paymeState }, id };
            }
            return { error: { code: -31008, message: { uz: 'Invalid state' } }, id };
        }

        // Boshqa tranzaksiya bor — faqat eskisi timeout bo'lsa yangisi qabul qilinadi
        if (order.paymeTransId && order.paymeTransId !== params.id) {
            if (order.paymeState === 1 && Date.now() - order.paymeCreateTime > TRANSACTION_TIMEOUT) {
                order.paymeState = -1;
                order.paymeCancelTime = Date.now();
                order.paymeReason = 4;
                await order.save();
            } else if (order.paymeState === 1) {
                return { error: { code: -31050, message: { uz: 'Boshqa aktiv tranzaksiya' } }, id };
            }
        }

        if (order.paymentStatus === 'paid') {
            return { error: { code: -31051, message: { uz: "Allaqachon to'langan" } }, id };
        }
        if (order.status === 'cancelled') {
            return { error: { code: -31099, message: { uz: 'Bekor qilingan' } }, id };
        }

        const createTime = Date.now();
        order.paymeTransId = params.id;
        order.paymeState = 1;
        order.paymeCreateTime = createTime;
        order.paymePerformTime = 0;
        order.paymeCancelTime = 0;
        order.paymentId = params.id;
        await order.save();

        return { result: { create_time: createTime, transaction: order._id.toString(), state: 1 }, id };
    }

    // ─── PerformTransaction ───
    static async performTransaction(params, id) {
        const order = await Order.findOne({ paymeTransId: params.id });
        if (!order) return { error: { code: -31003, message: { uz: 'Tranzaksiya topilmadi' } }, id };

        if (order.paymeState === 2) {
            return { result: { perform_time: order.paymePerformTime, transaction: order._id.toString(), state: 2 }, id };
        }
        if (order.paymeState !== 1) {
            return { error: { code: -31008, message: { uz: 'Invalid state' } }, id };
        }
        if (Date.now() - order.paymeCreateTime > TRANSACTION_TIMEOUT) {
            order.paymeState = -1;
            order.paymeCancelTime = Date.now();
            order.paymeReason = 4;
            order.paymentStatus = 'failed';
            await order.save();
            return { error: { code: -31008, message: { uz: "Vaqt o'tgan" } }, id };
        }

        const performTime = Date.now();
        order.paymeState = 2;
        order.paymePerformTime = performTime;
        order.paymentStatus = 'paid';
        order.status = 'pending_operator';
        order.statusHistory.push({ status: 'pending_operator', changedBy: 'system', note: "Payme orqali to'lov tasdiqlandi" });
        await order.save();

        // Bonus + xabarnoma
        try {
            const user = await User.findById(order.user);
            if (user) await BonusService.earnBonus(user, order);
        } catch (e) { console.error('[PAYME] Bonus error:', e.message); }
        try {
            const TelegramService = require('./telegram.service');
            await TelegramService.notifyOperator(order);
            await TelegramService.notifyCustomerStatus(order, { note: "Payme orqali to'lov tasdiqlandi" });
        } catch (e) { console.error('[PAYME] Telegram error:', e.message); }

        return { result: { perform_time: performTime, transaction: order._id.toString(), state: 2 }, id };
    }

    // ─── CancelTransaction ───
    static async cancelTransaction(params, id) {
        const order = await Order.findOne({ paymeTransId: params.id });
        if (!order) return { error: { code: -31003, message: { uz: 'Tranzaksiya topilmadi' } }, id };

        if (order.paymeState === -1 || order.paymeState === -2) {
            return { result: { cancel_time: order.paymeCancelTime, transaction: order._id.toString(), state: order.paymeState }, id };
        }

        const cancelTime = Date.now();

        if (order.paymeState === 1) {
            order.paymeState = -1;
            order.paymentStatus = 'failed';
            order.status = 'cancelled';
        } else if (order.paymeState === 2) {
            order.paymeState = -2;
            order.paymentStatus = 'refunded';
            order.status = 'cancelled';
            // Bonusni qaytarish
            if (order.bonusDiscount > 0) {
                try {
                    const user = await User.findById(order.user);
                    if (user) await BonusService.refundBonus(user, order);
                } catch (e) { console.error('[PAYME] Bonus refund error:', e.message); }
            }
        } else {
            return { error: { code: -31007, message: { uz: "Bekor qilib bo'lmaydi" } }, id };
        }

        order.paymeCancelTime = cancelTime;
        order.paymeReason = params.reason;
        order.statusHistory.push({ status: 'cancelled', changedBy: 'system', note: `Payme CancelTransaction: reason=${params.reason || ''}` });
        await order.save();

        return { result: { cancel_time: cancelTime, transaction: order._id.toString(), state: order.paymeState }, id };
    }

    // ─── CheckTransaction ───
    static async checkTransaction(params, id) {
        const order = await Order.findOne({ paymeTransId: params.id });
        if (!order) return { error: { code: -31003, message: { uz: 'Tranzaksiya topilmadi' } }, id };
        return {
            result: {
                create_time: order.paymeCreateTime,
                perform_time: order.paymePerformTime,
                cancel_time: order.paymeCancelTime,
                transaction: order._id.toString(),
                state: order.paymeState,
                reason: order.paymeReason ?? null,
            },
            id,
        };
    }

    // ─── GetStatement ───
    static async getStatement(params, id) {
        const orders = await Order.find({
            paymentMethod: 'payme',
            paymeCreateTime: { $gte: params.from, $lte: params.to },
            paymeTransId: { $exists: true, $ne: '' },
        }).lean();

        const transactions = orders.map(o => ({
            id: o.paymeTransId,
            time: o.paymeCreateTime,
            amount: o.total * 100,
            account: { order_id: o.orderNumber },
            create_time: o.paymeCreateTime,
            perform_time: o.paymePerformTime || 0,
            cancel_time: o.paymeCancelTime || 0,
            transaction: o._id.toString(),
            state: o.paymeState,
            reason: o.paymeReason ?? null,
        }));

        return { result: { transactions }, id };
    }
}

module.exports = PaymeService;
