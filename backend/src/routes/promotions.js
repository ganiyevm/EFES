const router = require('express').Router();
const Promotion = require('../models/Promotion');
const { authAdmin } = require('../middleware/auth');
const { upload, saveImage } = require('../services/upload.service');
const { evaluatePromo } = require('../services/promo.service');
const { CATEGORY_KEYS } = require('../config/constants');

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
            $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }],
        }).select('-usageCount -usageLimit').sort({ sortOrder: -1, createdAt: -1 }).lean();
        res.json(promos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Public: Promo kodni tekshirish ───
// items (ixtiyoriy): [{ productId, qty }] — kategoriyaga bog'langan promo uchun
router.post('/check', async (req, res) => {
    try {
        const { orderAmount, items } = req.body || {};
        const code = req.body?.code || req.body?.promoCode;

        let lines = null;
        let subtotal = Number(orderAmount) || 0;
        if (Array.isArray(items) && items.length > 0) {
            const Product = require('../models/Product');
            const mongoose = require('mongoose');
            const ids = items.map(i => i?.productId).filter(id => mongoose.isValidObjectId(id));
            const products = await Product.find({ _id: { $in: ids }, isActive: true }).select('price category').lean();
            const map = Object.fromEntries(products.map(p => [String(p._id), p]));
            lines = items
                .filter(i => map[String(i?.productId)])
                .map(i => ({ ...map[String(i.productId)], qty: Math.min(50, Math.max(1, parseInt(i.qty, 10) || 1)) }));
            subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
        }

        const result = await evaluatePromo(code, { subtotal, items: lines });
        if (!result.ok) return res.status(result.status).json({ error: result.error });

        const { promo, discount } = result;
        res.json({
            promoId: promo._id,
            code: promo.promoCode,
            title: promo.title,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            discountAmount: discount,
        });
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
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
    const allowed = ['title', 'description', 'imageUrl', 'discountType', 'discountValue', 'maxDiscount',
        'minOrderAmount', 'promoCode', 'startDate', 'endDate', 'isActive', 'sortOrder', 'usageLimit', 'applicableCategories'];
    const data = {};
    for (const k of allowed) if (body[k] !== undefined) data[k] = body[k];

    for (const k of ['discountValue', 'maxDiscount', 'minOrderAmount', 'usageLimit', 'sortOrder']) {
        if (data[k] === undefined || data[k] === '') continue;
        const n = Number(data[k]);
        if (!Number.isFinite(n) || n < 0) throw Object.assign(new Error(`${k} manfiy bo'lmagan son bo'lishi kerak`), { status: 400 });
        data[k] = n;
    }
    if (data.discountType === 'percent' && data.discountValue > 100) {
        throw Object.assign(new Error('Foiz chegirma 100% dan oshmasligi kerak'), { status: 400 });
    }
    if (data.endDate === '' || data.endDate === null) data.endDate = null;
    if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
        throw Object.assign(new Error('Tugash sanasi boshlanish sanasidan oldin bo\'lishi mumkin emas'), { status: 400 });
    }
    if (typeof data.promoCode === 'string') data.promoCode = data.promoCode.toUpperCase().trim().replace(/\s+/g, '');
    if (data.applicableCategories !== undefined) {
        data.applicableCategories = (Array.isArray(data.applicableCategories) ? data.applicableCategories : [])
            .filter(c => CATEGORY_KEYS.includes(c));
    }
    return data;
}

async function assertUniqueCode(code, exceptId) {
    if (!code) return;
    const clash = await Promotion.findOne({ promoCode: code, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).select('_id').lean();
    if (clash) throw Object.assign(new Error(`"${code}" promo kodi allaqachon mavjud`), { status: 400 });
}

router.post('/admin', async (req, res) => {
    try {
        const data = pickPromoFields(req.body);
        await assertUniqueCode(data.promoCode);
        const promo = await Promotion.create(data);
        res.status(201).json(promo);
    } catch (err) {
        res.status(err.status || 400).json({ error: err.message });
    }
});

router.put('/admin/:id', async (req, res) => {
    try {
        const data = pickPromoFields(req.body);
        await assertUniqueCode(data.promoCode, req.params.id);
        const promo = await Promotion.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
        if (!promo) return res.status(404).json({ error: 'Topilmadi' });
        res.json(promo);
    } catch (err) {
        res.status(err.status || 400).json({ error: err.message });
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
