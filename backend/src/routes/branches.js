const router = require('express').Router();
const Branch = require('../models/Branch');
const { authAdmin } = require('../middleware/auth');
const { getDeliveryConfig, isWithinWorkingHours } = require('../utils/deliveryConfig');

// Mijozlarga operator/kurier Telegram ID'lari ko'rsatilmaydi
const PUBLIC_FIELDS = 'number name address phone hours isOpen isActive location deliveryRadius minOrderAmount';

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
        const branches = await Branch.find({ isActive: true }).select(PUBLIC_FIELDS).sort({ number: 1 }).lean();
        res.json(branches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Bitta filial ───
router.get('/:id', async (req, res) => {
    try {
        if (!require('mongoose').isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Filial topilmadi' });
        const branch = await Branch.findById(req.params.id).select(PUBLIC_FIELDS).lean();
        if (!branch) return res.status(404).json({ error: 'Filial topilmadi' });
        res.json(branch);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function pickBranchFields(body) {
    const allowed = ['name', 'number', 'address', 'phone', 'hours', 'isOpen', 'isActive', 'location',
        'deliveryRadius', 'minOrderAmount', 'operatorChatId'];
    const data = {};
    for (const k of allowed) if (body[k] !== undefined) data[k] = body[k];
    for (const k of ['number', 'deliveryRadius', 'minOrderAmount']) {
        if (data[k] === undefined) continue;
        const n = Number(data[k]);
        if (!Number.isFinite(n) || n < 0) {
            const err = new Error(`${k} manfiy bo'lmagan son bo'lishi kerak`);
            err.status = 400;
            throw err;
        }
        data[k] = n;
    }
    if (data.location) {
        const lat = Number(data.location.lat) || 0;
        const lng = Number(data.location.lng) || 0;
        data.location = { lat, lng };
    }
    if (typeof data.name === 'string') data.name = data.name.trim();
    if (data.operatorChatId === '' ) data.operatorChatId = null;
    return data;
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
        const branch = await Branch.findByIdAndUpdate(req.params.id, pickBranchFields(req.body), { new: true, runValidators: true });
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
