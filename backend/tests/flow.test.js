require('./setup');
const express = require('express');
const jwt = require('jsonwebtoken');
const Order = require('../src/models/Order');
const Product = require('../src/models/Product');
const Branch = require('../src/models/Branch');
const User = require('../src/models/User');
const Promotion = require('../src/models/Promotion');
const Settings = require('../src/models/Settings');
const OrderStatusService = require('../src/services/orderStatus.service');
const PaymeService = require('../src/services/payme.service');
const { setDeliveryConfig, isWithinWorkingHours, parseWorkHours } = require('../src/utils/deliveryConfig');
const { tashkentDayStart } = require('../src/utils/time');
const { escapeHtml } = require('../src/utils/html');

process.env.JWT_SECRET = 'test-secret';
process.env.PAYME_MERCHANT_ID = 'm'; process.env.PAYME_MERCHANT_KEY = 'k';
process.env.ADMIN_JWT_SECRET = 'test-admin-secret';
delete process.env.BOT_TOKEN; // Telegram'ga haqiqiy so'rov ketmasin

let server, base;

beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/orders', require('../src/routes/orders'));
    app.use('/api/promotions', require('../src/routes/promotions'));
    app.use('/api/admin', require('../src/routes/admin'));
    app.use('/api/branches', require('../src/routes/branches'));
    app.use('/api/products', require('../src/routes/products'));
    await new Promise(r => { server = app.listen(0, r); });
    base = `http://127.0.0.1:${server.address().port}/api`;
});
afterAll(() => new Promise(r => server.close(r)));

const call = async (method, path, body, token) => {
    const res = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json().catch(() => null) };
};

let user, token, kebab, cola, branch, adminToken;

beforeEach(async () => {
    // Ish vaqti testlarga ta'sir qilmasin — 24/7
    await setDeliveryConfig({ workHours: '00:00 — 24:00', isOpen: true, minOrderAmount: 30000, deliveryCost: 10000, freeDeliveryThreshold: 0, maxBonusPercent: 20, bonusPercent: 1 });
    user = await User.create({ telegramId: 111, firstName: 'Ali <b>', phone: '+998901112233', bonusPoints: 5000 });
    token = jwt.sign({ userId: user._id, telegramId: 111 }, process.env.JWT_SECRET);
    adminToken = jwt.sign({ adminId: 'x', username: 'admin', role: 'super_admin' }, process.env.ADMIN_JWT_SECRET);
    kebab = await Product.create({ name: 'Kebab', price: 40000, category: 'kebab' });
    cola = await Product.create({ name: 'Cola', price: 10000, category: 'drink' });
    branch = await Branch.create({ number: 1, name: 'Markaz', location: { lat: 41.3, lng: 69.24 }, deliveryRadius: 5, minOrderAmount: 0 });
});

const baseOrder = (over = {}) => ({
    items: [{ productId: String(kebab._id), qty: 2 }],
    deliveryType: 'delivery',
    address: 'Toshkent, Amir Temur 1',
    addressLat: 41.31, addressLng: 69.25,
    paymentMethod: 'cash',
    extraPhone: '+998901234567',
    ...over,
});

describe('Buyurtma yaratish', () => {
    test('naqd buyurtma: server narxi, yetkazish narxi, operator holati', async () => {
        const r = await call('POST', '/orders', baseOrder({ items: [{ productId: String(kebab._id), qty: 2, price: 1 }] }), token);
        expect(r.status).toBe(201);
        expect(r.body.total).toBe(90000); // 2×40000 + 10000 yetkazish (klient narxi e'tiborsiz)
        expect(r.body.status).toBe('pending_operator');
        const o = await Order.findById(r.body._id);
        expect(String(o.branch)).toBe(String(branch._id));
        expect(o.phone).toBe('+998901112233');
        expect(o.extraPhone).toBe('+998901234567');
    });

    test('minimal summa tekshiriladi', async () => {
        const r = await call('POST', '/orders', baseOrder({ items: [{ productId: String(cola._id), qty: 1 }] }), token);
        expect(r.status).toBe(400);
        expect(r.body.code).toBe('MIN_ORDER');
    });

    test('olib ketishda minimal summa yo\'q, yetkazish narxi 0', async () => {
        const r = await call('POST', '/orders', baseOrder({ deliveryType: 'pickup', branch: String(branch._id), items: [{ productId: String(cola._id), qty: 1 }] }), token);
        expect(r.status).toBe(201);
        expect(r.body.total).toBe(10000);
    });

    test('zonadan tashqari manzil rad etiladi', async () => {
        const r = await call('POST', '/orders', baseOrder({ addressLat: 41.6, addressLng: 69.8 }), token);
        expect(r.status).toBe(400);
        expect(r.body.code).toBe('OUT_OF_ZONE');
    });

    test('yopiq filialdan olib ketib bo\'lmaydi', async () => {
        await Branch.updateOne({ _id: branch._id }, { isOpen: false });
        const r = await call('POST', '/orders', baseOrder({ deliveryType: 'pickup', branch: String(branch._id) }), token);
        expect(r.status).toBe(400);
    });

    test('nofaol mahsulot bo\'lsa 409 qaytadi', async () => {
        await Product.updateOne({ _id: cola._id }, { isActive: false });
        const r = await call('POST', '/orders', baseOrder({ items: [{ productId: String(kebab._id), qty: 1 }, { productId: String(cola._id), qty: 1 }] }), token);
        expect(r.status).toBe(409);
        expect(r.body.code).toBe('PRODUCTS_UNAVAILABLE');
    });

    test('yaroqsiz to\'lov turi va noto\'g\'ri ID 500 bermaydi', async () => {
        expect((await call('POST', '/orders', baseOrder({ paymentMethod: 'bitcoin' }), token)).status).toBe(400);
        expect((await call('POST', '/orders', baseOrder({ items: [{ productId: 'abc', qty: 1 }] }), token)).status).toBe(400);
        expect((await call('GET', '/orders/not-an-id', null, token)).status).toBe(404);
    });

    test('miqdor 50 bilan cheklanadi', async () => {
        const r = await call('POST', '/orders', baseOrder({ items: [{ productId: String(kebab._id), qty: 100000 }] }), token);
        expect(r.status).toBe(201);
        const o = await Order.findById(r.body._id);
        expect(o.items[0].qty).toBe(50);
    });

    test('ish vaqtidan tashqarida rad etiladi', async () => {
        await setDeliveryConfig({ isOpen: false });
        const r = await call('POST', '/orders', baseOrder(), token);
        expect(r.body.code).toBe('OUT_OF_HOURS');
    });
});

describe('Promo kod', () => {
    beforeEach(async () => {
        await Promotion.create({ promoCode: 'EFES10', discountType: 'percent', discountValue: 10, isActive: true, startDate: new Date(Date.now() - 1000) });
        await Promotion.create({ promoCode: 'DRINK50', discountType: 'percent', discountValue: 50, applicableCategories: ['drink'], isActive: true, startDate: new Date(Date.now() - 1000) });
    });

    test('frontend yuboradigan promoCode maydoni ham qabul qilinadi', async () => {
        const r = await call('POST', '/promotions/check', { promoCode: 'efes10', orderAmount: 80000 });
        expect(r.status).toBe(200);
        expect(r.body.discountAmount).toBe(8000);
    });

    test('kategoriyaga bog\'langan promo faqat o\'sha mahsulotlarga', async () => {
        const r = await call('POST', '/promotions/check', {
            code: 'DRINK50',
            items: [{ productId: String(kebab._id), qty: 1 }, { productId: String(cola._id), qty: 2 }],
        });
        expect(r.body.discountAmount).toBe(10000); // 50% × 20000 (faqat cola)
    });

    test('buyurtmada promo qo\'llanadi va hisoblagich oshadi, bekor qilinsa qaytadi', async () => {
        const r = await call('POST', '/orders', baseOrder({ promoCode: 'EFES10' }), token);
        expect(r.status).toBe(201);
        expect(r.body.total).toBe(80000 - 8000 + 10000);
        expect((await Promotion.findOne({ promoCode: 'EFES10' })).usageCount).toBe(1);

        const c = await call('PATCH', `/orders/${r.body._id}/cancel`, null, token);
        expect(c.status).toBe(200);
        expect((await Promotion.findOne({ promoCode: 'EFES10' })).usageCount).toBe(0);
    });

    test('noto\'g\'ri promo bilan buyurtma jim o\'tib ketmaydi', async () => {
        const r = await call('POST', '/orders', baseOrder({ promoCode: 'YOQ' }), token);
        expect(r.status).toBe(400);
        expect(r.body.code).toBe('PROMO_INVALID');
    });
});

describe('Bonus va bekor qilish', () => {
    test('bonus sarflanadi, bekor qilinganda qaytariladi', async () => {
        const r = await call('POST', '/orders', baseOrder({ bonusDiscount: 999999 }), token);
        expect(r.status).toBe(201);
        // maks 20% × 80000 = 16000, lekin balans 5000 → 5000 sarflanadi
        expect(r.body.total).toBe(80000 - 5000 + 10000);
        expect((await User.findById(user._id)).bonusPoints).toBe(0);
        await call('PATCH', `/orders/${r.body._id}/cancel`, null, token);
        expect((await User.findById(user._id)).bonusPoints).toBe(5000);
    });

    test('rad etilganda sarflangan bonus qaytariladi va berilgan bonus olinadi', async () => {
        await User.updateOne({ _id: user._id }, { bonusPoints: 1000 });
        const r = await call('POST', '/orders', baseOrder({ bonusDiscount: 1000 }), token);
        const order = await Order.findById(r.body._id);
        expect((await User.findById(user._id)).bonusPoints).toBe(0);

        await OrderStatusService.applyTransition(order, 'confirmed');
        await OrderStatusService.applyTransition(order, 'delivered');
        const afterDeliver = (await User.findById(user._id)).bonusPoints;
        expect(afterDeliver).toBeGreaterThan(0);

        // yetkazilgandan keyin (super admin force) bekor qilish → hammasi qaytadi
        await OrderStatusService.applyTransition(order, 'cancelled', { force: true });
        expect((await User.findById(user._id)).bonusPoints).toBe(1000);
    });

    test('mijoz tasdiqlangan buyurtmani bekor qila olmaydi', async () => {
        const r = await call('POST', '/orders', baseOrder(), token);
        const order = await Order.findById(r.body._id);
        await OrderStatusService.applyTransition(order, 'confirmed');
        const c = await call('PATCH', `/orders/${r.body._id}/cancel`, null, token);
        expect(c.status).toBe(400);
    });

    test('boshqa mijoz buyurtmasiga kira olmaydi', async () => {
        const r = await call('POST', '/orders', baseOrder(), token);
        const other = await User.create({ telegramId: 222 });
        const t2 = jwt.sign({ userId: other._id, telegramId: 222 }, process.env.JWT_SECRET);
        expect((await call('GET', `/orders/${r.body._id}`, null, t2)).status).toBe(403);
        expect((await call('PATCH', `/orders/${r.body._id}/cancel`, null, t2)).status).toBe(403);
    });

    test('mijoz ko\'rinishida ichki maydonlar yo\'q', async () => {
        const r = await call('POST', '/orders', baseOrder(), token);
        const g = await call('GET', `/orders/${r.body._id}`, null, token);
        expect(g.body.paymeTransId).toBeUndefined();
        expect(g.body.statusHistory[0].note).toBeUndefined();
    });
});

describe('Status mashinasi', () => {
    test('kurier tasdiqlangan buyurtmani to\'g\'ridan-to\'g\'ri yo\'lga chiqara oladi', () => {
        expect(OrderStatusService.canTransition('confirmed', 'on_the_way')).toBe(true);
        expect(OrderStatusService.canTransition('preparing', 'delivered')).toBe(true);
        expect(OrderStatusService.canTransition('delivered', 'confirmed')).toBe(false);
        expect(OrderStatusService.canTransition('on_the_way', 'preparing')).toBe(false);
    });

    test('admin buyurtmani raqam/telefon bo\'yicha qidira oladi', async () => {
        const r = await call('POST', '/orders', baseOrder(), token);
        const byNum = await call('GET', `/admin/orders?q=${r.body.orderNumber}`, null, adminToken);
        expect(byNum.body.total).toBe(1);
        const byPhone = await call('GET', '/admin/orders?q=901112233', null, adminToken);
        expect(byPhone.body.total).toBe(1);
        const none = await call('GET', '/admin/orders?q=EFES-9999', null, adminToken);
        expect(none.body.total).toBe(0);
    });

    test('admin nofaol mahsulotni ham ko\'radi, mijoz ko\'rmaydi', async () => {
        await Product.updateOne({ _id: cola._id }, { isActive: false });
        const adm = await call('GET', '/admin/products', null, adminToken);
        expect(adm.body.total).toBe(2);
        const pub = await call('GET', '/products', null);
        expect(pub.body.total).toBe(1);
        expect((await call('GET', `/products/${cola._id}`)).status).toBe(404);
    });

    test('filial ish vaqti, ochiq/yopiq va minimal summa saqlanadi', async () => {
        const r = await call('PUT', `/branches/${branch._id}`, { hours: '09:00 — 22:00', isOpen: false, minOrderAmount: 50000 }, adminToken);
        expect(r.status).toBe(200);
        const b = await Branch.findById(branch._id);
        expect(b.hours).toBe('09:00 — 22:00');
        expect(b.isOpen).toBe(false);
        expect(b.minOrderAmount).toBe(50000);
        expect(b.name).toBe('Markaz'); // boshqa maydonlar o'chib ketmadi
    });
});

describe('Payme', () => {
    test('chegirmali buyurtmada chek summasi to\'lov summasiga teng', async () => {
        await Promotion.create({ promoCode: 'P7', discountType: 'fixed', discountValue: 7001, isActive: true, startDate: new Date(Date.now() - 1000) });
        const r = await call('POST', '/orders', baseOrder({
            paymentMethod: 'payme', promoCode: 'P7',
            items: [{ productId: String(kebab._id), qty: 1 }, { productId: String(cola._id), qty: 3 }],
        }), token);
        const order = await Order.findById(r.body._id);
        const res = await PaymeService.checkPerform({ amount: order.total * 100, account: { order_id: order.orderNumber } }, 1);
        const d = res.result.detail;
        const sum = d.items.reduce((s, i) => s + i.price * i.count - (i.discount || 0), 0) + (d.shipping?.price || 0);
        expect(sum).toBe(order.total * 100);
    });

    test('bekor qilingan buyurtmani Payme to\'lay olmaydi', async () => {
        const r = await call('POST', '/orders', baseOrder({ paymentMethod: 'payme' }), token);
        const order = await Order.findById(r.body._id);
        await PaymeService.createTransaction({ id: 'tx1', amount: order.total * 100, account: { order_id: order.orderNumber } }, 1);
        await call('PATCH', `/orders/${order._id}/cancel`, null, token);
        const perf = await PaymeService.performTransaction({ id: 'tx1' }, 2);
        expect(perf.error.code).toBe(-31008);
        expect((await Order.findById(order._id)).paymentStatus).not.toBe('paid');
    });
});

describe('Yordamchilar', () => {
    test('Toshkent kun boshlanishi', () => {
        // 2026-10-05 20:30 UTC = 2026-10-06 01:30 Toshkent → kun boshi 2026-10-05 19:00 UTC
        expect(tashkentDayStart(new Date('2026-10-05T20:30:00Z')).toISOString()).toBe('2026-10-05T19:00:00.000Z');
    });

    test('ish vaqti matni soatlarga aylanadi', () => {
        expect(parseWorkHours('10:00 — 23:00')).toEqual({ start: 10, end: 23 });
        expect(parseWorkHours('08:00-01:00')).toEqual({ start: 8, end: 25 });
        expect(parseWorkHours('salom')).toBeNull();
        // 08:00—01:00: Toshkent 00:30 da ochiq, 02:00 da yopiq
        const cfg = { workStartHour: 8, workEndHour: 25 };
        expect(isWithinWorkingHours(cfg, new Date('2026-10-05T19:30:00Z'))).toBe(true);
        expect(isWithinWorkingHours(cfg, new Date('2026-10-05T21:00:00Z'))).toBe(false);
    });

    test('HTML escape', () => {
        expect(escapeHtml('A<b>&')).toBe('A&lt;b&gt;&amp;');
    });
});
