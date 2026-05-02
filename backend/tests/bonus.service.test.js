require('./setup');
const mongoose = require('mongoose');
const BonusService = require('../src/services/bonus.service');
const User = require('../src/models/User');
const Order = require('../src/models/Order');
const BonusTransaction = require('../src/models/BonusTransaction');

async function makeUser(overrides = {}) {
    return User.create({
        telegramId: Math.floor(Math.random() * 1e9),
        firstName: 'Test',
        bonusPoints: 0,
        ...overrides,
    });
}

async function makeOrder(user, overrides = {}) {
    // To'g'ridan-to'g'ri MongoDB ga yozish (orderNumber counter ni chetlab o'tish uchun)
    return Order.create({
        orderNumber: `TEST-${Date.now()}`,
        user: user._id,
        telegramId: user.telegramId,
        items: [],
        total: 50000,
        subtotal: 50000,
        paymentMethod: 'cash',
        status: 'delivered',
        ...overrides,
    });
}

describe('BonusService.calculatePoints', () => {
    test('har 10 000 so\'mga 100 ball', () => {
        expect(BonusService.calculatePoints(10000)).toBe(100);
        expect(BonusService.calculatePoints(50000)).toBe(500);
        expect(BonusService.calculatePoints(9999)).toBe(0);   // yetarli emas
        expect(BonusService.calculatePoints(25000)).toBe(200); // 2 × 10 000
    });

    test('nol va manfiy qiymatlar', () => {
        expect(BonusService.calculatePoints(0)).toBe(0);
        expect(BonusService.calculatePoints(-5000)).toBe(0);
    });
});

describe('BonusService.earnBonus', () => {
    test('foydalanuvchi bonusPointsiga ball qo\'shiladi', async () => {
        const user = await makeUser();
        const order = await makeOrder(user, { total: 50000 }); // 500 ball

        await BonusService.earnBonus(user, order);

        const updated = await User.findById(user._id);
        expect(updated.bonusPoints).toBe(500);
    });

    test('BonusTransaction yozuvi yaratiladi', async () => {
        const user = await makeUser();
        const order = await makeOrder(user, { total: 30000 }); // 300 ball

        await BonusService.earnBonus(user, order);

        const txn = await BonusTransaction.findOne({ order: order._id, type: 'earned' });
        expect(txn).not.toBeNull();
        expect(txn.amount).toBe(300);
    });

    test('0 ball bo\'lsa transaction yaratilmaydi', async () => {
        const user = await makeUser();
        const order = await makeOrder(user, { total: 5000 }); // < 10 000

        await BonusService.earnBonus(user, order);

        const txn = await BonusTransaction.findOne({ order: order._id, type: 'earned' });
        expect(txn).toBeNull();
        const updated = await User.findById(user._id);
        expect(updated.bonusPoints).toBe(0);
    });

    test('order.bonusEarned yangilanadi', async () => {
        const user = await makeUser();
        const order = await makeOrder(user, { total: 20000 }); // 200 ball

        await BonusService.earnBonus(user, order);

        const updated = await Order.findById(order._id);
        expect(updated.bonusEarned).toBe(200);
    });
});

describe('BonusService.spendBonus', () => {
    test('yetarli bonus bo\'lsa sarflanadi', async () => {
        const user = await makeUser({ bonusPoints: 1000 });
        const order = await makeOrder(user);

        await BonusService.spendBonus(user, order, 500);

        const updated = await User.findById(user._id);
        expect(updated.bonusPoints).toBe(500);
    });

    test('spent BonusTransaction yaratiladi', async () => {
        const user = await makeUser({ bonusPoints: 1000 });
        const order = await makeOrder(user);

        await BonusService.spendBonus(user, order, 300);

        const txn = await BonusTransaction.findOne({ order: order._id, type: 'spent' });
        expect(txn.amount).toBe(300);
    });

    test('yetarli bonus yo\'q bo\'lsa xato tashlaydi', async () => {
        const user = await makeUser({ bonusPoints: 100 });
        const order = await makeOrder(user);

        await expect(BonusService.spendBonus(user, order, 500)).rejects.toThrow('Yetarli bonus mavjud emas');
    });
});

describe('BonusService.refundBonus', () => {
    test('bekor qilinganda bonusDiscount qaytariladi', async () => {
        const user = await makeUser({ bonusPoints: 200 });
        const order = await makeOrder(user, { bonusDiscount: 300 });

        await BonusService.refundBonus(user, order);

        const updated = await User.findById(user._id);
        expect(updated.bonusPoints).toBe(500); // 200 + 300
    });

    test('bonusDiscount 0 bo\'lsa hech narsa o\'zgarmaydi', async () => {
        const user = await makeUser({ bonusPoints: 100 });
        const order = await makeOrder(user, { bonusDiscount: 0 });

        await BonusService.refundBonus(user, order);

        const updated = await User.findById(user._id);
        expect(updated.bonusPoints).toBe(100);
    });
});
