const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Telegram WebApp autentifikatsiya
const authTelegram = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Token topilmadi' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Yaroqsiz token' });
    }
};

// Admin panel autentifikatsiya
const authAdmin = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Admin token topilmadi' });

        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Yaroqsiz admin token' });
    }
};

module.exports = { authTelegram, authAdmin };
