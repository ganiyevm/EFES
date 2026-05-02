const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Branch = require('../models/Branch');
const User = require('../models/User');
const AdminAccount = require('../models/AdminAccount');
const Settings = require('../models/Settings');
const TelegramService = require('../services/telegram.service');
const CourierBotService = require('../services/courierBot.service');
const OrderStatusService = require('../services/orderStatus.service');
const bcrypt = require('bcryptjs');
const { authAdmin, authSuperAdmin } = require('../middleware/auth');

// ─── Login (ochiq route — authAdmin dan oldin) ───
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const account = await AdminAccount.findOne({ username });
        if (!account) return res.status(401).json({ error: 'Login yoki parol xato' });

        const valid = await bcrypt.compare(password, account.password);
        if (!valid) return res.status(401).json({ error: 'Login yoki parol xato' });

        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { adminId: account._id, username: account.username, role: account.role },
            process.env.ADMIN_JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({ token, id: account._id, username: account.username, role: account.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.use(authAdmin);

// ─── Dashboard stats ───
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalOrders, todayOrders, totalRevenue, todayRevenue, totalUsers, totalProducts, activeOrders] = await Promise.all([
            Order.countDocuments(),
            Order.countDocuments({ createdAt: { $gte: today } }),
            Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
            Order.aggregate([{ $match: { paymentStatus: 'paid', createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
            User.countDocuments(),
            Product.countDocuments({ isActive: true }),
            Order.countDocuments({ status: { $in: ['pending_operator', 'confirmed', 'preparing', 'ready', 'on_the_way'] } }),
        ]);

        res.json({
            totalOrders,
            todayOrders,
            totalRevenue: totalRevenue[0]?.total || 0,
            todayRevenue: todayRevenue[0]?.total || 0,
            totalUsers,
            totalProducts,
            activeOrders,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Payme to'lovini Payme Merchant API orqali tasdiqlash ───
router.post('/orders/:id/payme-verify', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

        const PaymeService = require('../services/payme.service');
        const result = await PaymeService.verifyByOrder(order);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Qo'lda rekonsilatsiya (Payme kabinetidan olingan tranzaksiya ID bilan) ───
// Audit jurnali bilan saqlanadi. Faqat admin kabinetida PAID ko'rgan bo'lsa ishlatiladi.
router.post('/orders/:id/payme-reconcile', async (req, res) => {
    try {
        const { paymeTransId, paymeReceiptId, payTimeMs, amountSum, note } = req.body;
        if (!paymeTransId) return res.status(400).json({ error: 'paymeTransId kerak' });

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
        if (order.paymentMethod !== 'payme') {
            return res.status(400).json({ error: "Buyurtma Payme bilan to'lanmagan" });
        }
        if (order.paymentStatus === 'paid') {
            return res.json({ alreadyPaid: true, message: "Allaqachon to'langan" });
        }

        // Summa tekshiruvi (ixtiyoriy, lekin xavfsizlik uchun)
        if (amountSum !== undefined && Number(amountSum) !== order.total) {
            return res.status(400).json({
                error: `Summa mos kelmaydi: order.total=${order.total}, payme=${amountSum}`,
            });
        }

        const now = Date.now();
        const payTime = payTimeMs ? Number(payTimeMs) : now;
        const wasPaid = order.paymentStatus === 'paid';

        order.paymentStatus = 'paid';
        order.paymeState = 2;
        order.paymeTransId = order.paymeTransId || paymeTransId;
        order.paymeCreateTime = order.paymeCreateTime || payTime;
        order.paymePerformTime = order.paymePerformTime || payTime;
        order.paymentId = order.paymentId || (paymeReceiptId || paymeTransId);
        if (order.status === 'awaiting_payment') {
            order.status = 'pending_operator';
        }

        const auditNote = `Payme kabinetidan rekonsilatsiya: txid=${paymeTransId}` +
            (paymeReceiptId ? `, receipt=${paymeReceiptId}` : '') +
            (req.admin?.username ? ` (admin=${req.admin.username})` : '') +
            (note ? `. ${note}` : '');

        order.statusHistory.push({
            status: order.status,
            changedBy: 'admin',
            note: auditNote,
        });
        await order.save();

        // Bonus + xabarlar (faqat birinchi tasdiqlashda)
        if (!wasPaid) {
            try {
                const User = require('../models/User');
                const BonusService = require('../services/bonus.service');
                const user = await User.findById(order.user);
                if (user) await BonusService.earnBonus(user, order);
            } catch (e) { console.error('[RECONCILE] Bonus:', e.message); }
            try {
                const TelegramService = require('../services/telegram.service');
                await TelegramService.notifyOperator(order);
                await TelegramService.notifyCustomerStatus(order, { note: "Payme to'lovi tasdiqlandi" });
            } catch (e) { console.error('[RECONCILE] Telegram:', e.message); }
        }

        res.json({ ok: true, synced: true, order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── So'nggi buyurtmalar (Dashboard uchun) ───
router.get('/recent-orders', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('branch', 'number name')
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Buyurtmalar (Admin) ───
router.get('/orders', async (req, res) => {
    try {
        const { status, page = 1, limit = 20, branch } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (branch) filter.branch = branch;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('branch', 'name number')
                .populate('courierId', 'name phone carPlate')
                .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Order.countDocuments(filter),
        ]);

        res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Bitta buyurtma (Admin) ───
router.get('/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('branch', 'name number')
            .populate('courierId', 'name phone carPlate');
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Buyurtmaga kurier tayinlash ───
router.patch('/orders/:id/assign-courier', async (req, res) => {
    try {
        const Courier = require('../models/Courier');
        const { courierId } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

        if (!courierId) {
            order.courierId = null;
            order.statusHistory.push({ status: order.status, changedBy: 'admin', note: 'Kurier olib tashlandi' });
        } else {
            const courier = await Courier.findById(courierId);
            if (!courier) return res.status(404).json({ error: 'Kurier topilmadi' });
            if (!courier.isActive) return res.status(400).json({ error: 'Kurier nofaol' });
            order.courierId = courier._id;
            order.statusHistory.push({
                status: order.status,
                changedBy: 'admin',
                note: `Kurier tayinlandi: ${courier.name} (${courier.phone})`,
            });
        }
        await order.save();
        const populated = await Order.findById(order._id)
            .populate('branch', 'name number')
            .populate('courierId', 'name phone carPlate');

        if (populated.courierId) {
            TelegramService.notifyCustomerStatus(populated, {
                note: 'Buyurtmangizga kurier tayinlandi',
                courier: {
                    name: populated.courierId.name,
                    phone: populated.courierId.phone,
                    carPlate: populated.courierId.carPlate,
                },
            }).catch(() => {});
        }

        res.json(populated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Buyurtma statusini o'zgartirish ───
router.patch('/orders/:id/status', async (req, res) => {
    try {
        const { status, note } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

        const prevStatus = order.status;
        await OrderStatusService.applyTransition(order, status, { changedBy: 'admin', note: note || '' });

        TelegramService.notifyCustomerStatus(order, { note: note || '' }).catch(() => {});

        // Tasdiqlanganda kurierlar botiga broadcast (faqat tayinlanmagan bo'lsa)
        if (status === 'confirmed' && prevStatus !== 'confirmed' && !order.courierId) {
            CourierBotService.broadcastNewOrder(order).catch(e => console.error('Courier broadcast:', e.message));
        }
        // Bekor qilinsa — broadcast xabarlarini tozalash
        if ((status === 'cancelled' || status === 'rejected') && order.courierBroadcasts?.length) {
            CourierBotService.clearBroadcasts(order._id).catch(() => {});
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Mahsulotlar (Admin) ───
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ category: 1, name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Filiallar (Admin) ───
router.get('/branches', async (req, res) => {
    try {
        const branches = await Branch.find().sort({ number: 1 });
        res.json(branches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Foydalanuvchilar (Admin) ───
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const filter = {};
        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [{ firstName: regex }, { lastName: regex }, { phone: regex }, { username: regex }];
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [users, total] = await Promise.all([
            User.find(filter).sort({ lastActiveAt: -1 }).skip(skip).limit(parseInt(limit)),
            User.countDocuments(filter),
        ]);
        res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Foydalanuvchini bloklash / ochish ───
router.patch('/users/:id/block', async (req, res) => {
    try {
        const { isBlocked } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { isBlocked }, { new: true });
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Foydalanuvchini o'chirish (faqat super_admin) ───
router.delete('/users/:id', authSuperAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
        const Order = require('../models/Order');
        const activeOrders = await Order.countDocuments({
            user: user._id,
            status: { $in: ['pending_operator', 'confirmed', 'preparing', 'ready', 'on_the_way'] },
        });
        if (activeOrders > 0) {
            return res.status(400).json({ error: `Foydalanuvchida ${activeOrders} ta aktiv buyurtma bor. Avval yakunlang.` });
        }
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Admin hisoblar ───
router.get('/accounts', async (req, res) => {
    try {
        const accounts = await AdminAccount.find().select('-password');
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/accounts', authSuperAdmin, async (req, res) => {
    try {
        const { username, password, role } = req.body;
        // faqat super_admin boshqa super_admin yarata oladi
        if (role === 'super_admin' && req.admin.role !== 'super_admin') {
            return res.status(403).json({ error: 'Super admin faqat super admin tomonidan yaratilishi mumkin' });
        }
        const hashed = await bcrypt.hash(password, 10);
        const account = await AdminAccount.create({ username, password: hashed, role });
        res.status(201).json({ id: account._id, username, role });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── Rol o'zgartirish ───
// Agar super_admin mavjud bo'lmasa — istalgan admin o'zini promote qila oladi
// Agar super_admin mavjud bo'lsa — faqat super_admin boshqasini o'zgartira oladi
router.put('/accounts/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!['super_admin', 'admin', 'manager'].includes(role)) {
            return res.status(400).json({ error: 'Noto\'g\'ri rol' });
        }

        const superAdminExists = await AdminAccount.findOne({ role: 'super_admin' });
        const requesterId = req.admin?.adminId;

        if (superAdminExists) {
            if (req.admin?.role !== 'super_admin') {
                return res.status(403).json({ error: 'Faqat super admin rol o\'zgartira oladi' });
            }
        }
        // super_admin yo'q bo'lsa — istalgan admin o'zini promote qila oladi (bootstrap)

        const account = await AdminAccount.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password');
        if (!account) return res.status(404).json({ error: 'Admin topilmadi' });

        res.json(account);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Parol o'zgartirish (super admin istalgan adminni, oddiy admin o'zini) ───
router.put('/accounts/:id/password', async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 4) {
            return res.status(400).json({ error: 'Parol kamida 4 ta belgi bo\'lishi kerak' });
        }

        const targetId = req.params.id;
        const requesterId = req.admin?.adminId;

        // super_admin istalgan akkaunt parolini o'zgartira oladi
        // oddiy admin faqat o'z parolini o'zgartira oladi
        if (req.admin?.role !== 'super_admin' && String(requesterId) !== String(targetId)) {
            return res.status(403).json({ error: 'Faqat o\'z parolingizni o\'zgartira olasiz' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        const account = await AdminAccount.findByIdAndUpdate(
            targetId,
            { password: hashed },
            { new: true }
        ).select('-password');
        if (!account) return res.status(404).json({ error: 'Admin topilmadi' });

        res.json({ success: true, username: account.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/accounts/:id', authSuperAdmin, async (req, res) => {
    try {
        const account = await AdminAccount.findById(req.params.id);
        if (!account) return res.status(404).json({ error: 'Admin topilmadi' });
        if (String(account._id) === String(req.admin.adminId)) {
            return res.status(400).json({ error: "O'z akkauntingizni o'chirib bo'lmaydi" });
        }
        await AdminAccount.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Sozlamalar ───
router.get('/settings', async (req, res) => {
    try {
        const settings = await Settings.find();
        const obj = {};
        settings.forEach(s => obj[s.key] = s.value);
        res.json(obj);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/settings', async (req, res) => {
    try {
        const updates = req.body;
        for (const [key, value] of Object.entries(updates)) {
            await Settings.findOneAndUpdate({ key }, { key, value }, { upsert: true });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
