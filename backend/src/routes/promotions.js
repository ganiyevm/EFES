const router = require('express').Router();
const Promotion = require('../models/Promotion');
const { authAdmin } = require('../middleware/auth');
const { upload, saveImage } = require('../services/upload.service');

// ─── Rasm yuklash (aksiyalar uchun) ───
router.post('/upload-image', authAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Rasm fayli kerak' });
        const imageUrl = await saveImage(req.file, 'efes/promotions');
        res.json({ imageUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Public: Faol aksiyalar ───
router.get('/', async (req, res) => {
    try {
        const now = new Date();
        const promos = await Promotion.find({
            isActive: true,
            startDate: { $lte: now },
            $or: [{ endDate: null }, { endDate: { $gte: now } }],
        }).sort({ sortOrder: -1, createdAt: -1 });
        res.json(promos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Public: Promo kodni tekshirish ───
router.post('/check', async (req, res) => {
    try {
        const { code, orderAmount } = req.body;
        if (!code) return res.status(400).json({ error: 'Kod kiritilmadi' });

        const now = new Date();
        const promo = await Promotion.findOne({
            promoCode: code.toUpperCase().trim(),
            isActive: true,
            startDate: { $lte: now },
            $or: [{ endDate: null }, { endDate: { $gte: now } }],
        });

        if (!promo) return res.status(404).json({ error: "Promo kod topilmadi yoki muddati o'tgan" });

        if (promo.minOrderAmount > 0 && orderAmount < promo.minOrderAmount) {
            return res.status(400).json({
                error: `Minimal buyurtma: ${promo.minOrderAmount.toLocaleString()} so'm`,
            });
        }

        if (promo.usageLimit > 0 && promo.usageCount >= promo.usageLimit) {
            return res.status(400).json({ error: "Promo kod limiti tugagan" });
        }

        // Chegirma hisoblash
        let discountAmount = 0;
        if (promo.discountType === 'percent') {
            discountAmount = Math.floor(orderAmount * promo.discountValue / 100);
            if (promo.maxDiscount > 0) discountAmount = Math.min(discountAmount, promo.maxDiscount);
        } else {
            discountAmount = promo.discountValue;
        }
        discountAmount = Math.min(discountAmount, orderAmount);

        res.json({
            promoId: promo._id,
            title: promo.title,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            discountAmount,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Admin: CRUD ───
router.use(authAdmin);

router.get('/admin/list', async (req, res) => {
    try {
        const promos = await Promotion.find().sort({ sortOrder: -1, createdAt: -1 });
        res.json(promos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function pickPromoFields(body) {
    const { title, description, imageUrl, discountType, discountValue, maxDiscount,
            minOrderAmount, promoCode, startDate, endDate, isActive, sortOrder, usageLimit } = body;
    return { title, description, imageUrl, discountType, discountValue, maxDiscount,
             minOrderAmount, promoCode, startDate, endDate, isActive, sortOrder, usageLimit };
}

router.post('/admin', async (req, res) => {
    try {
        const promo = await Promotion.create(pickPromoFields(req.body));
        res.status(201).json(promo);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.put('/admin/:id', async (req, res) => {
    try {
        const promo = await Promotion.findByIdAndUpdate(req.params.id, pickPromoFields(req.body), { new: true, runValidators: true });
        if (!promo) return res.status(404).json({ error: 'Topilmadi' });
        res.json(promo);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/admin/:id', async (req, res) => {
    try {
        await Promotion.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
