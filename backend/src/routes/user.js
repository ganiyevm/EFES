const router = require('express').Router();
const User = require('../models/User');
const BonusTransaction = require('../models/BonusTransaction');
const { authTelegram } = require('../middleware/auth');

// ─── Profil ───
router.get('/profile', authTelegram, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-__v');
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Profilni yangilash ───
router.put('/profile', authTelegram, async (req, res) => {
    try {
        const { phone, language } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

        if (phone) user.phone = phone;
        if (language) user.language = language;
        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Manzil qo'shish ───
router.post('/address', authTelegram, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
        user.addresses.push(req.body);
        await user.save();
        res.json(user.addresses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Manzil o'chirish ───
router.delete('/address/:index', authTelegram, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
        user.addresses.splice(parseInt(req.params.index), 1);
        await user.save();
        res.json(user.addresses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Sevimlilar ───
router.post('/favorites/:productId', authTelegram, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const pid = req.params.productId;
        const idx = user.favorites.indexOf(pid);
        if (idx === -1) user.favorites.push(pid);
        else user.favorites.splice(idx, 1);
        await user.save();
        res.json(user.favorites);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Bonus tarixi ───
router.get('/bonus-history', authTelegram, async (req, res) => {
    try {
        const txs = await BonusTransaction.find({ user: req.user.userId }).sort({ createdAt: -1 }).limit(50);
        res.json(txs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
