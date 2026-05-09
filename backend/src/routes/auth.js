const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AdminAccount = require('../models/AdminAccount');
const RefreshToken = require('../models/RefreshToken');

const ACCESS_TOKEN_TTL = '15m';   // Qisqa — xavfsizroq
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 kun (ms)

function generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

async function generateRefreshToken(user, userAgent = '') {
    const token = crypto.randomBytes(40).toString('hex');
    await RefreshToken.create({
        token,
        user: user._id,
        telegramId: user.telegramId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        userAgent,
    });
    return token;
}

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

        // auth_date freshness — initData replay attack himoyasi
        const authDate = parseInt(params.get('auth_date'), 10);
        const MAX_AGE_SEC = 24 * 60 * 60; // 24 soat — Telegram WebApp uchun standart
        if (!authDate || (Math.floor(Date.now() / 1000) - authDate) > MAX_AGE_SEC) {
            return res.status(401).json({ error: 'initData muddati tugagan. Mini App ni qayta oching.' });
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
                isProfileComplete: true,
            });
        } else {
            user.firstName = first_name || user.firstName;
            user.lastName = last_name || user.lastName;
            user.username = username || user.username;
            user.lastActiveAt = new Date();
            user.isProfileComplete = true;
            await user.save();
        }

        const accessToken = generateAccessToken({ userId: user._id, telegramId });
        const refreshToken = await generateRefreshToken(user, req.headers['user-agent'] || '');

        res.json({ token: accessToken, refreshToken, user });
    } catch (err) {
        console.error('Auth error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── Token yangilash (Refresh) ───
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ error: 'refreshToken kerak' });

        const stored = await RefreshToken.findOne({ token: refreshToken, isRevoked: false });
        if (!stored) return res.status(401).json({ error: 'Yaroqsiz yoki eskirgan token' });
        if (stored.expiresAt < new Date()) {
            await RefreshToken.deleteOne({ _id: stored._id });
            return res.status(401).json({ error: 'Token muddati tugagan. Qayta kiring.' });
        }

        const user = await User.findById(stored.user);
        if (!user) return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });

        // Eski refresh tokenni o'chirib yangi chiqarish (rotation)
        await RefreshToken.deleteOne({ _id: stored._id });
        const newAccessToken = generateAccessToken({ userId: user._id, telegramId: user.telegramId });
        const newRefreshToken = await generateRefreshToken(user, req.headers['user-agent'] || '');

        res.json({ token: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        console.error('Refresh error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── Chiqish (Logout) — refresh tokenni bekor qilish ───
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await RefreshToken.updateOne({ token: refreshToken }, { isRevoked: true });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── Barcha qurilmalardan chiqish ───
router.post('/logout-all', async (req, res) => {
    try {
        const tokenHeader = req.headers.authorization?.split(' ')[1];
        if (!tokenHeader) return res.status(401).json({ error: 'Token kerak' });
        const decoded = jwt.verify(tokenHeader, process.env.JWT_SECRET);
        await RefreshToken.updateMany({ user: decoded.userId }, { isRevoked: true });
        res.json({ success: true, message: 'Barcha qurilmalardan chiqildi' });
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

module.exports = router;
