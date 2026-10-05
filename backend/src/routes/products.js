const router = require('express').Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { CATEGORY_KEYS } = require('../config/constants');
const { authAdmin } = require('../middleware/auth');
const { upload, saveImage, deleteImage } = require('../services/upload.service');

// Klient o'zgartira olmaydigan ichki maydonlar (mass-assignment himoyasi).
// Mongoose strict rejimi noma'lum maydonlarni tashlaydi; bu esa mavjud tizim
// maydonlarini (_id, timestamp) klient qiymati bilan yozib yuborishni to'sadi.
const IMMUTABLE_FIELDS = ['_id', '__v', 'createdAt', 'updatedAt'];
function cleanProductData(body) {
    const data = { ...body };
    for (const key of IMMUTABLE_FIELDS) delete data[key];
    if (typeof data.name === 'string') data.name = data.name.trim();
    if (data.price !== undefined) {
        const price = Math.round(Number(data.price));
        if (!Number.isFinite(price) || price <= 0) {
            const err = new Error('Narx musbat son bo\'lishi kerak');
            err.status = 400;
            throw err;
        }
        data.price = price;
    }
    if (data.category !== undefined && !CATEGORY_KEYS.includes(data.category)) data.category = 'other';
    // multipart/form-data dan kelgan "true"/"false" satrlarini boolean'ga aylantirish
    for (const k of ['isSpicy', 'isVegetarian', 'isPopular', 'isActive']) {
        if (data[k] === 'true') data[k] = true;
        if (data[k] === 'false') data[k] = false;
    }
    if (typeof data.description === 'string') {
        try { data.description = JSON.parse(data.description); } catch { delete data.description; }
    }
    return data;
}

// ─── Barcha mahsulotlar (public) ───
router.get('/', async (req, res) => {
    try {
        const { search, category, popular, ids } = req.query;
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
        const filter = { isActive: true };

        if (category) filter.category = String(category);
        if (popular === 'true') filter.isPopular = true;
        // Savatdagi mahsulotlarning joriy narxi/holatini yangilash uchun
        if (ids) {
            filter._id = { $in: String(ids).split(',').filter(id => mongoose.isValidObjectId(id)).slice(0, 100) };
        }

        if (search) {
            const regex = new RegExp(String(search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ name: regex }, { ingredients: regex }];
        }

        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            Product.find(filter).select('-mxikCode -packageCode -vatPercent').sort({ isPopular: -1, name: 1 }).skip(skip).limit(limit).lean(),
            Product.countDocuments(filter),
        ]);

        res.json({ products, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Bitta mahsulot ───
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Mahsulot topilmadi' });
        const product = await Product.findOne({ _id: req.params.id, isActive: true })
            .select('-mxikCode -packageCode -vatPercent').lean();
        if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Rasm yuklash (Admin) — Cloudinary yoki local ───
router.post('/upload-image', authAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Rasm fayli kerak' });
        const imageUrl = await saveImage(req.file, 'efes/products');
        res.json({ imageUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Yangi mahsulot (Admin) ───
router.post('/', authAdmin, upload.single('image'), async (req, res) => {
    try {
        const data = cleanProductData(req.body);
        if (req.file) {
            data.imageUrl = await saveImage(req.file, 'efes/products');
        }
        if (!data.name) return res.status(400).json({ error: 'Taom nomi kerak' });
        if (data.price === undefined) return res.status(400).json({ error: 'Narx kerak' });
        const product = await Product.create(data);
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── Tahrirlash (Admin) ───
router.put('/:id', authAdmin, upload.single('image'), async (req, res) => {
    try {
        const data = cleanProductData(req.body);

        if (req.file) {
            // Eski rasmni o'chirish (Cloudinary bo'lsa)
            const existing = await Product.findById(req.params.id).select('imageUrl').lean();
            if (existing?.imageUrl) await deleteImage(existing.imageUrl);

            data.imageUrl = await saveImage(req.file, 'efes/products');
        }

        const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
        if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── O'chirish (Admin) — butunlay. Eski buyurtmalarda nom va narx saqlanib qoladi.
// Vaqtincha yashirish uchun "Faol" belgisini o'chirish kifoya. ───
router.delete('/:id', authAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).select('imageUrl').lean();
        if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });
        await Product.deleteOne({ _id: req.params.id });
        if (product.imageUrl) await deleteImage(product.imageUrl);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
