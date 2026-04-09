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

// ─── Send OTP (phone registration) ───
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Telefon raqami kerak' });

        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min

        // Save OTP to temp storage (or existing user)
        let user = await User.findOne({ phone });
        if (!user) {
            // Store OTP in a temporary field — will create user on verify
            // Use a simple in-memory map keyed by phone for demo purposes
            // In production, use Redis or a separate OTP model
            global._otpStore = global._otpStore || {};
            global._otpStore[phone] = { code, expiry };
        } else {
            user.otpCode = code;
            user.otpExpiry = expiry;
            await user.save();
        }

        // In production: send via SMS gateway (Eskiz, Play Mobile, etc.)
        // For now: log to console (dev mode)
        console.log(`📱 OTP for ${phone}: ${code}`);

        res.json({ success: true, message: 'SMS kod yuborildi' });
    } catch (err) {
        console.error('OTP send error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── Verify OTP & complete registration ───
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code, firstName, gender, birthDate } = req.body;
        if (!phone || !code) return res.status(400).json({ error: 'Telefon va kod kerak' });

        let storedCode, storedExpiry;

        let user = await User.findOne({ phone });
        if (user) {
            storedCode = user.otpCode;
            storedExpiry = user.otpExpiry;
        } else {
            const temp = global._otpStore?.[phone];
            if (!temp) return res.status(400).json({ error: 'Kod topilmadi. Qayta yuboring' });
            storedCode = temp.code;
            storedExpiry = temp.expiry;
        }

        if (storedCode !== code) return res.status(400).json({ error: 'Kod noto\'g\'ri' });
        if (new Date() > new Date(storedExpiry)) return res.status(400).json({ error: 'Kod muddati tugagan' });

        if (!user) {
            // Create new user
            user = await User.create({
                telegramId: Date.now(), // placeholder for phone-registered users
                phone,
                firstName: firstName || '',
                gender: gender || '',
                birthDate: birthDate ? new Date(birthDate) : null,
                isProfileComplete: true,
            });
            if (global._otpStore) delete global._otpStore[phone];
        } else {
            user.firstName = firstName || user.firstName;
            user.gender = gender || user.gender;
            user.birthDate = birthDate ? new Date(birthDate) : user.birthDate;
            user.isProfileComplete = true;
            user.otpCode = '';
            user.otpExpiry = null;
            await user.save();
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({ token, user });
    } catch (err) {
        console.error('OTP verify error:', err);
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
