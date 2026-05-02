const router = require('express').Router();
const Operator = require('../models/Operator');
const Branch = require('../models/Branch');
const User = require('../models/User');
const { authAdmin } = require('../middleware/auth');

// ─── Barcha operatorlar ───
router.get('/', authAdmin, async (req, res) => {
    try {
        const operators = await Operator.find()
            .populate('branch', 'number name address')
            .sort({ addedAt: -1 });
        res.json(operators);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Telegram ID bo'yicha foydalanuvchi ma'lumotini olish ───
router.get('/lookup/:telegramId', authAdmin, async (req, res) => {
    try {
        const user = await User.findOne({ telegramId: parseInt(req.params.telegramId) })
            .select('telegramId firstName lastName username phone');
        if (!user) return res.json({ found: false });
        res.json({ found: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Yangi operator qo'shish ───
router.post('/', authAdmin, async (req, res) => {
    try {
        const { telegramId, branchId, firstName, lastName, username, phone, note } = req.body;
        if (!telegramId || !branchId) {
            return res.status(400).json({ error: 'telegramId va branchId kerak' });
        }

        const branch = await Branch.findById(branchId);
        if (!branch) return res.status(404).json({ error: 'Filial topilmadi' });

        const existing = await Operator.findOne({ telegramId: parseInt(telegramId), branch: branchId });
        if (existing) return res.status(400).json({ error: 'Bu operator bu filialda allaqachon mavjud' });

        const operator = await Operator.create({
            telegramId: parseInt(telegramId),
            firstName: firstName || '',
            lastName: lastName || '',
            username: username || '',
            phone: phone || '',
            branch: branchId,
            note: note || '',
        });

        // Filialga birlamchi operator sifatida ulash
        if (!branch.operatorChatId) {
            branch.operatorChatId = parseInt(telegramId);
        }
        if (!branch.operatorIds.includes(parseInt(telegramId))) {
            branch.operatorIds.push(parseInt(telegramId));
        }
        await branch.save();

        await operator.populate('branch', 'number name address');
        res.status(201).json(operator);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── Operator tahrirlash ───
router.put('/:id', authAdmin, async (req, res) => {
    try {
        const { branchId, firstName, lastName, username, phone, note, isBlocked, isActive } = req.body;

        const operator = await Operator.findById(req.params.id);
        if (!operator) return res.status(404).json({ error: 'Operator topilmadi' });

        const oldBranchId = operator.branch.toString();

        if (firstName !== undefined) operator.firstName = firstName;
        if (lastName !== undefined) operator.lastName = lastName;
        if (username !== undefined) operator.username = username;
        if (phone !== undefined) operator.phone = phone;
        if (note !== undefined) operator.note = note;
        if (isBlocked !== undefined) operator.isBlocked = isBlocked;
        if (isActive !== undefined) operator.isActive = isActive;

        // Filial o'zgarsa — eski filialdan olib yangi filialga qo'sh
        if (branchId && branchId !== oldBranchId) {
            const oldBranch = await Branch.findById(oldBranchId);
            if (oldBranch) {
                oldBranch.operatorIds = oldBranch.operatorIds.filter(id => id !== operator.telegramId);
                if (oldBranch.operatorChatId === operator.telegramId) oldBranch.operatorChatId = null;
                await oldBranch.save();
            }

            const newBranch = await Branch.findById(branchId);
            if (!newBranch) return res.status(404).json({ error: 'Yangi filial topilmadi' });
            if (!newBranch.operatorIds.includes(operator.telegramId)) newBranch.operatorIds.push(operator.telegramId);
            if (!newBranch.operatorChatId) newBranch.operatorChatId = operator.telegramId;
            await newBranch.save();

            operator.branch = branchId;
        }

        // Bloklangan bo'lsa — filialdan operatorChatId ni tozalash
        if (isBlocked === true) {
            const branch = await Branch.findById(operator.branch);
            if (branch && branch.operatorChatId === operator.telegramId) {
                branch.operatorChatId = null;
                await branch.save();
            }
        }
        // Blok olinsa — filialga qayta ulash
        if (isBlocked === false) {
            const branch = await Branch.findById(operator.branch);
            if (branch && !branch.operatorChatId) {
                branch.operatorChatId = operator.telegramId;
                await branch.save();
            }
        }

        await operator.save();
        await operator.populate('branch', 'number name address');
        res.json(operator);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ─── Operator o'chirish ───
router.delete('/:id', authAdmin, async (req, res) => {
    try {
        const operator = await Operator.findById(req.params.id);
        if (!operator) return res.status(404).json({ error: 'Operator topilmadi' });

        const branch = await Branch.findById(operator.branch);
        if (branch) {
            branch.operatorIds = branch.operatorIds.filter(id => id !== operator.telegramId);
            if (branch.operatorChatId === operator.telegramId) branch.operatorChatId = null;
            await branch.save();
        }

        await Operator.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
