const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AdminAccount = require('../models/AdminAccount');

// ─── Telegram WebApp Auth ───
router.post('/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) return res.status(400).json({ error: 'initData kerak' });

        // initData ni tekshirish
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        params.delete('hash');

        const dataCheckString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(process.env.BOT_TOKEN)
            .digest();

        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        if (calculatedHash !== hash) {
            return res.status(401).json({ error: 'Yaroqsiz initData' });
        }

        // User ma'lumotlarini olish
        const userData = JSON.parse(params.get('user'));
        const { id: telegramId, first_name, last_name, username } = userData;

        // User yaratish yoki yangilash
        let user = await User.findOne({ telegramId });
        if (!user) {
            user = await User.create({
                telegramId,
                firstName: first_name || '',
                lastName: last_name || '',
                username: username || '',
            });
        } else {
            user.firstName = first_name || user.firstName;
            user.lastName = last_name || user.lastName;
            user.username = username || user.username;
            user.lastActiveAt = new Date();
            await user.save();
        }

        const token = jwt.sign(
            { userId: user._id, telegramId },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ token, user });
    } catch (err) {
        console.error('Auth error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── Admin Login ───
router.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        let admin = await AdminAccount.findOne({ username });

        // Birinchi marta — default admin yaratish
        if (!admin && username === 'admin' && password === 'efes2026') {
            const hashed = await bcrypt.hash('efes2026', 10);
            admin = await AdminAccount.create({ username: 'admin', password: hashed, role: 'admin' });
        }

        if (!admin) return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });

        const token = jwt.sign(
            { adminId: admin._id, role: admin.role },
            process.env.ADMIN_JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, admin: { id: admin._id, username: admin.username, role: admin.role } });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

module.exports = router;
