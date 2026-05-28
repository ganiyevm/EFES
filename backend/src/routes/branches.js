const router = require('express').Router();
const Branch = require('../models/Branch');
const { authAdmin } = require('../middleware/auth');
const { getDeliveryConfig, isWithinWorkingHours } = require('../utils/deliveryConfig');

// ─── Ish vaqti statusi (public) ───
router.get('/status', async (req, res) => {
    try {
        const cfg = await getDeliveryConfig();
        const open = isWithinWorkingHours(cfg);
        res.json({
            isOpen: open,
            workHours: cfg.workHours,
            workStartHour: cfg.workStartHour,
            workEndHour: cfg.workEndHour,
            timezone: cfg.timezone || 'Asia/Tashkent',
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

function pickBranchFields(body) {
    const { name, number, address, phone, isActive, location, deliveryRadius,
            operatorChatId, operatorIds, workingHours } = body;
    return { name, number, address, phone, isActive, location, deliveryRadius,
             operatorChatId, operatorIds, workingHours };
}

// ─── Yangi filial (Admin) ───
router.post('/', authAdmin, async (req, res) => {
    try {
        const branch = await Branch.create(pickBranchFields(req.body));
        res.status(201).json(branch);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── Tahrirlash (Admin) ───
router.put('/:id', authAdmin, async (req, res) => {
    try {
        const branch = await Branch.findByIdAndUpdate(req.params.id, pickBranchFields(req.body), { new: true });
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
