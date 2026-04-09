const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Branch = require('../models/Branch');
const User = require('../models/User');
const AdminAccount = require('../models/AdminAccount');
const Settings = require('../models/Settings');
const BonusService = require('../services/bonus.service');
const bcrypt = require('bcryptjs');
const { authAdmin } = require('../middleware/auth');

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
        res.json({ token, username: account.username, role: account.role });
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

// ─── Buyurtmalar (Admin) ───
router.get('/orders', async (req, res) => {
    try {
        const { status, page = 1, limit = 20, branch } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (branch) filter.branch = branch;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [orders, total] = await Promise.all([
            Order.find(filter).populate('branch', 'name number').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Order.countDocuments(filter),
        ]);

        res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
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

        order.status = status;
        order.statusHistory.push({ status, changedBy: 'admin', note: note || '' });

        if (status === 'confirmed') order.confirmedAt = new Date();
        if (status === 'preparing') order.preparingAt = new Date();
        if (status === 'ready') order.readyAt = new Date();
        if (status === 'on_the_way') order.dispatchedAt = new Date();
        if (status === 'delivered') {
            order.deliveredAt = new Date();
            if (order.paymentMethod === 'cash') order.paymentStatus = 'paid';
            // Bonus hisoblash
            const user = await User.findById(order.user);
            if (user) await BonusService.earnBonus(user, order);
        }

        await order.save();
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

// ─── Admin hisoblar ───
router.get('/accounts', async (req, res) => {
    try {
        const accounts = await AdminAccount.find().select('-password');
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/accounts', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        const account = await AdminAccount.create({ username, password: hashed, role });
        res.status(201).json({ id: account._id, username, role });
    } catch (err) {
        res.status(400).json({ error: err.message });
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
