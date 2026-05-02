const jwt = require('jsonwebtoken');

// Telegram WebApp autentifikatsiya
const authTelegram = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Token topilmadi' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        // TokenExpiredError — frontend refresh qilishi uchun maxsus kod
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token muddati tugagan', code: 'TOKEN_EXPIRED' });
        }
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

const authSuperAdmin = (req, res, next) => {
    if (req.admin?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Faqat super admin uchun ruxsat' });
    }
    next();
};

module.exports = { authTelegram, authAdmin, authSuperAdmin };
