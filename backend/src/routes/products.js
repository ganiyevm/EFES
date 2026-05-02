const router = require('express').Router();
const Product = require('../models/Product');
const { authAdmin } = require('../middleware/auth');
const { upload, saveImage, deleteImage } = require('../services/upload.service');

// ─── Barcha mahsulotlar (public) ───
router.get('/', async (req, res) => {
    try {
        const { search, category, page = 1, limit = 50, popular } = req.query;
        const filter = { isActive: true };

        if (category) filter.category = category;
        if (popular === 'true') filter.isPopular = true;

        if (search) {
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ name: regex }, { ingredients: regex }];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [products, total] = await Promise.all([
            Product.find(filter).sort({ isPopular: -1, name: 1 }).skip(skip).limit(parseInt(limit)),
            Product.countDocuments(filter),
        ]);

        res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Bitta mahsulot ───
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
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
        const data = { ...req.body };
        if (req.file) {
            data.imageUrl = await saveImage(req.file, 'efes/products');
        }
        const product = await Product.create(data);
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── Tahrirlash (Admin) ───
router.put('/:id', authAdmin, upload.single('image'), async (req, res) => {
    try {
        const data = { ...req.body };

        if (req.file) {
            // Eski rasmni o'chirish (Cloudinary bo'lsa)
            const existing = await Product.findById(req.params.id).select('imageUrl').lean();
            if (existing?.imageUrl) await deleteImage(existing.imageUrl);

            data.imageUrl = await saveImage(req.file, 'efes/products');
        }

        const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true });
        if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── O'chirish (Admin) ───
router.delete('/:id', authAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).select('imageUrl').lean();
        if (product?.imageUrl) await deleteImage(product.imageUrl);
        await Product.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
