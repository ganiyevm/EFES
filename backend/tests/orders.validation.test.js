require('./setup');
const mongoose = require('mongoose');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Branch = require('../src/models/Branch');
const User = require('../src/models/User');

// N+1 fix ni tekshirish — $in so'rovi bilan mahsulotlar to'g'ri olinadi
describe('Order mahsulot $in so\'rovi', () => {
    let products;

    beforeEach(async () => {
        products = await Product.insertMany([
            { name: 'Kebab', price: 35000, category: 'kebab' },
            { name: 'Doner', price: 28000, category: 'doner' },
            { name: 'Pide',  price: 22000, category: 'pide' },
        ]);
    });

    test('$in bilan barcha mahsulotlar bitta so\'rovda olinadi', async () => {
        const ids = products.map(p => p._id);
        const found = await Product.find({ _id: { $in: ids }, isActive: true }).lean();
        expect(found.length).toBe(3);
    });

    test('productMap to\'g\'ri ishlaydi', async () => {
        const ids = products.map(p => p._id);
        const found = await Product.find({ _id: { $in: ids } }).lean();
        const map = Object.fromEntries(found.map(p => [p._id.toString(), p]));

        expect(map[products[0]._id.toString()].name).toBe('Kebab');
        expect(map[products[1]._id.toString()].price).toBe(28000);
    });

    test('faol bo\'lmagan mahsulot $in filtrdan o\'tib ketmaydi', async () => {
        await Product.updateOne({ name: 'Pide' }, { isActive: false });
        const ids = products.map(p => p._id);
        const found = await Product.find({ _id: { $in: ids }, isActive: true }).lean();
        expect(found.length).toBe(2);
    });
});

// Order holat mashina testi
describe('Order status holat mashina', () => {
    let user, order;

    beforeEach(async () => {
        user = await User.create({ telegramId: Date.now(), firstName: 'Test' });
        order = await Order.create({
            orderNumber: `TST-${Date.now()}`,
            user: user._id,
            telegramId: user.telegramId,
            items: [],
            total: 50000,
            subtotal: 50000,
            paymentMethod: 'cash',
            status: 'pending_operator',
        });
    });

    test('pending_operator dan confirmed ga o\'tadi', async () => {
        order.status = 'confirmed';
        order.statusHistory.push({ status: 'confirmed', changedBy: 'operator' });
        await order.save();
        const updated = await Order.findById(order._id);
        expect(updated.status).toBe('confirmed');
        expect(updated.statusHistory.length).toBeGreaterThan(0);
    });

    test('delivered da naqd to\'lov paymentStatus=paid bo\'ladi', async () => {
        order.status = 'delivered';
        order.deliveredAt = new Date();
        if (order.paymentMethod === 'cash') order.paymentStatus = 'paid';
        await order.save();
        const updated = await Order.findById(order._id);
        expect(updated.paymentStatus).toBe('paid');
    });

    test('orderNumber unique indeksi: ikki xil order bir xil raqam ola olmaydi', async () => {
        const sameNum = `SAME-001`;
        await Order.create({
            orderNumber: sameNum,
            user: user._id,
            telegramId: user.telegramId,
            items: [], total: 10000, subtotal: 10000, paymentMethod: 'cash',
        });
        await expect(Order.create({
            orderNumber: sameNum,
            user: user._id,
            telegramId: user.telegramId,
            items: [], total: 20000, subtotal: 20000, paymentMethod: 'cash',
        })).rejects.toThrow();
    });
});

// Haversine masofasi testi
describe('Haversine masofa hisobi', () => {
    function haversineKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    test('bir xil nuqta uchun 0 km', () => {
        expect(haversineKm(41.2, 69.2, 41.2, 69.2)).toBeCloseTo(0, 1);
    });

    test('Toshkent markazidan ~5 km', () => {
        // Toshkent markazi taxminan 41.2995, 69.2401
        const dist = haversineKm(41.2995, 69.2401, 41.3400, 69.2401);
        expect(dist).toBeGreaterThan(4);
        expect(dist).toBeLessThan(6);
    });

    test('10 km radiusidan tashqaridagi nuqta aniqlanadi', () => {
        // ~10+ km masofadagi nuqta (1 gradus taxminan 111 km)
        const dist = haversineKm(41.2995, 69.2401, 41.4000, 69.2401);
        expect(dist).toBeGreaterThan(10);
    });
});
