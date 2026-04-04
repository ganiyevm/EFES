const router = require('express').Router();
const Branch = require('../models/Branch');
const { authAdmin } = require('../middleware/auth');

// ─── Barcha filiallar (public) ───
router.get('/', async (req, res) => {
    try {
        const branches = await Branch.find({ isActive: true }).sort({ number: 1 });
        res.json(branches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Bitta filial ───
router.get('/:id', async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.id);
        if (!branch) return res.status(404).json({ error: 'Filial topilmadi' });
        res.json(branch);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Yangi filial (Admin) ───
router.post('/', authAdmin, async (req, res) => {
    try {
        const branch = await Branch.create(req.body);
        res.status(201).json(branch);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── Tahrirlash (Admin) ───
router.put('/:id', authAdmin, async (req, res) => {
    try {
        const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!branch) return res.status(404).json({ error: 'Filial topilmadi' });
        res.json(branch);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── O'chirish (Admin) ───
router.delete('/:id', authAdmin, async (req, res) => {
    try {
        await Branch.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
