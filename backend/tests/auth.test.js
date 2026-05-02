require('./setup');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test_jwt_secret_key_1234';
process.env.ADMIN_JWT_SECRET = 'test_admin_jwt_secret_5678';
process.env.BOT_TOKEN = 'test_bot_token';

const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');

// ─── authTelegram middleware testi ───
describe('authTelegram middleware', () => {
    const { authTelegram } = require('../src/middleware/auth');

    function mockReqRes(token) {
        const req = { headers: { authorization: token ? `Bearer ${token}` : undefined } };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        const next = jest.fn();
        return { req, res, next };
    }

    test('token yo\'q bo\'lsa 401 qaytaradi', () => {
        const { req, res, next } = mockReqRes(null);
        authTelegram(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('noto\'g\'ri token bo\'lsa 401 qaytaradi', () => {
        const { req, res, next } = mockReqRes('invalid.token.here');
        authTelegram(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('muddati o\'tgan token bo\'lsa TOKEN_EXPIRED kodi qaytaradi', () => {
        const expired = jwt.sign(
            { userId: 'abc', telegramId: 123 },
            process.env.JWT_SECRET,
            { expiresIn: '-1s' },
        );
        const { req, res, next } = mockReqRes(expired);
        authTelegram(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
    });

    test('to\'g\'ri token bo\'lsa next() chaqiriladi va req.user to\'ldiriladi', () => {
        const valid = jwt.sign(
            { userId: 'test_id', telegramId: 999 },
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
        );
        const { req, res, next } = mockReqRes(valid);
        authTelegram(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user.userId).toBe('test_id');
    });
});

// ─── RefreshToken modeli testi ───
describe('RefreshToken model', () => {
    test('token yaratish va topish', async () => {
        const user = await User.create({ telegramId: 111111, firstName: 'Refresh Test' });
        const token = crypto.randomBytes(20).toString('hex');

        await RefreshToken.create({
            token,
            user: user._id,
            telegramId: user.telegramId,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        });

        const found = await RefreshToken.findOne({ token });
        expect(found).not.toBeNull();
        expect(found.isRevoked).toBe(false);
    });

    test('isRevoked false by default', async () => {
        const user = await User.create({ telegramId: 222222, firstName: 'Revoke Test' });
        const rt = await RefreshToken.create({
            token: 'sometoken123',
            user: user._id,
            telegramId: user.telegramId,
            expiresAt: new Date(Date.now() + 86400000),
        });
        expect(rt.isRevoked).toBe(false);
    });

    test('revoke qilish ishlaydi', async () => {
        const user = await User.create({ telegramId: 333333, firstName: 'Revoke2' });
        const t = 'revoketest456';
        await RefreshToken.create({
            token: t,
            user: user._id,
            telegramId: user.telegramId,
            expiresAt: new Date(Date.now() + 86400000),
        });

        await RefreshToken.updateOne({ token: t }, { isRevoked: true });
        const found = await RefreshToken.findOne({ token: t, isRevoked: false });
        expect(found).toBeNull();
    });
});
