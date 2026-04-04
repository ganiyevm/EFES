const router = require('express').Router();
const { CATEGORY_KEYS, CATEGORY_NAMES } = require('../config/constants');
const Product = require('../models/Product');

// ─── Barcha kategoriyalar ───
router.get('/', async (req, res) => {
    try {
        const lang = req.query.lang || 'uz';

        // Har bir kategoriyada nechta mahsulot borligini hisoblash
        const counts = await Product.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]);

        const countMap = {};
        counts.forEach(c => countMap[c._id] = c.count);

        const categories = CATEGORY_KEYS
            .filter(key => countMap[key] > 0) // Bo'sh kategoriyalarni ko'rsatmaslik
            .map(key => ({
                key,
                name: CATEGORY_NAMES[key]?.[lang] || CATEGORY_NAMES[key]?.uz || key,
                count: countMap[key] || 0,
            }));

        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
