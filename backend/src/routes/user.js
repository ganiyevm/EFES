const router = require('express').Router();
const User = require('../models/User');
const BonusTransaction = require('../models/BonusTransaction');
const { authTelegram } = require('../middleware/auth');

// ─── Profil ───
router.get('/profile', authTelegram, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-__v -otpCode -otpExpiry -otpSentAt');
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

        if (phone !== undefined) {
            const digits = String(phone).replace(/\D/g, '');
            if (!/^998\d{9}$/.test(digits)) return res.status(400).json({ error: 'Telefon raqam noto\'g\'ri' });
            user.phone = `+${digits}`;
        }
        if (language !== undefined) {
            if (!['uz', 'ru', 'en'].includes(language)) return res.status(400).json({ error: 'Til noto\'g\'ri' });
            user.language = language;
        }
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

        const { title, address, lat, lng } = req.body;
        if (!title || !address) {
            return res.status(400).json({ error: 'title va address kerak' });
        }
        if (String(title).length > 100 || String(address).length > 500) {
            return res.status(400).json({ error: 'Juda uzun matn' });
        }
        if (user.addresses.length >= 20) {
            return res.status(400).json({ error: 'Maksimal 20 ta manzil saqlash mumkin' });
        }
        user.addresses.push({
            title: String(title).trim(),
            address: String(address).trim(),
            lat: lat !== undefined ? Number(lat) : undefined,
            lng: lng !== undefined ? Number(lng) : undefined,
        });
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

        const idx = parseInt(req.params.index, 10);
        if (isNaN(idx) || idx < 0 || idx >= user.addresses.length) {
            return res.status(400).json({ error: 'Yaroqsiz manzil indeksi' });
        }
        user.addresses.splice(idx, 1);
        await user.save();
        res.json(user.addresses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Sevimlilar ───
router.get('/favorites', authTelegram, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate({
            path: 'favorites',
            match: { isActive: true },
            select: 'name price imageUrl category weight isSpicy isPopular',
        }).lean();
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
        res.json((user.favorites || []).filter(Boolean));
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

router.post('/favorites/:productId', authTelegram, async (req, res) => {
    try {
        const pid = req.params.productId;
        if (!require('mongoose').isValidObjectId(pid)) return res.status(400).json({ error: 'Noto\'g\'ri mahsulot' });
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
        const idx = user.favorites.findIndex(f => String(f) === pid);
        if (idx === -1) {
            if (user.favorites.length >= 200) return res.status(400).json({ error: 'Sevimlilar ro\'yxati to\'ldi' });
            user.favorites.push(pid);
        } else {
            user.favorites.splice(idx, 1);
        }
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
