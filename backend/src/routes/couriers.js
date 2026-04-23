const router = require('express').Router();
const Courier = require('../models/Courier');
const Order = require('../models/Order');
const { authAdmin } = require('../middleware/auth');

const COURIER_BOT_USERNAME = process.env.COURIER_BOT_USERNAME || 'efes_kebab_dastafka_bot';

function buildInviteLink(token) {
    return `https://t.me/${COURIER_BOT_USERNAME}?start=courier_${token}`;
}

function serialize(courier, stats) {
    const c = courier.toObject ? courier.toObject() : courier;
    return {
        ...c,
        inviteLink: buildInviteLink(c.inviteToken),
        stats: stats || { today: 0, month: 0, year: 0 },
    };
}

// Bitta aggregate so'rov — har kurier uchun bugun/oy/yil statistikasini chiqaradi.
async function aggregateStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const rows = await Order.aggregate([
        {
            $match: {
                status: 'delivered',
                courierId: { $ne: null },
                deliveredAt: { $gte: startOfYear },
            },
        },
        {
            $group: {
                _id: '$courierId',
                year: { $sum: 1 },
                month: { $sum: { $cond: [{ $gte: ['$deliveredAt', startOfMonth] }, 1, 0] } },
                today: { $sum: { $cond: [{ $gte: ['$deliveredAt', startOfDay] }, 1, 0] } },
            },
        },
    ]);

    const byId = {};
    for (const r of rows) {
        byId[String(r._id)] = { today: r.today, month: r.month, year: r.year };
    }
    return byId;
}

router.use(authAdmin);

// ─── Ro'yxat ───
router.get('/', async (req, res) => {
    try {
        const [couriers, stats] = await Promise.all([
            Courier.find().sort({ createdAt: -1 }),
            aggregateStats(),
        ]);
        res.json(couriers.map(c => serialize(c, stats[String(c._id)])));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Bitta kurier ───
router.get('/:id', async (req, res) => {
    try {
        const courier = await Courier.findById(req.params.id);
        if (!courier) return res.status(404).json({ error: 'Kurier topilmadi' });
        const stats = await aggregateStats();
        res.json(serialize(courier, stats[String(courier._id)]));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Yangi kurier ───
router.post('/', async (req, res) => {
    try {
        const { name, phone, carPlate, bonusPerDelivery } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ error: 'Ism va telefon talab qilinadi' });
        }
        const courier = await Courier.create({
            name: String(name).trim(),
            phone: String(phone).trim(),
            carPlate: (carPlate || '').trim(),
            bonusPerDelivery: Number(bonusPerDelivery) || 5000,
        });
        res.status(201).json(serialize(courier));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── Tahrirlash / toggle ───
router.put('/:id', async (req, res) => {
    try {
        const fields = ['name', 'phone', 'carPlate', 'bonusPerDelivery', 'bonusEnabled', 'isActive'];
        const patch = {};
        for (const k of fields) {
            if (req.body[k] !== undefined) patch[k] = req.body[k];
        }
        const courier = await Courier.findByIdAndUpdate(req.params.id, patch, { new: true });
        if (!courier) return res.status(404).json({ error: 'Kurier topilmadi' });
        res.json(serialize(courier));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── Invite tokenni yangilash (eski link ishlamay qoladi) ───
router.post('/:id/regenerate-token', async (req, res) => {
    try {
        const crypto = require('crypto');
        const courier = await Courier.findByIdAndUpdate(
            req.params.id,
            { inviteToken: crypto.randomBytes(16).toString('hex'), telegramId: null },
            { new: true },
        );
        if (!courier) return res.status(404).json({ error: 'Kurier topilmadi' });
        res.json(serialize(courier));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── O'chirish (soft) ───
router.delete('/:id', async (req, res) => {
    try {
        await Courier.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
