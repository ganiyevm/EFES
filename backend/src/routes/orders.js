const router = require('express').Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Promotion = require('../models/Promotion');
const BonusService = require('../services/bonus.service');
const TelegramService = require('../services/telegram.service');
const OrderStatusService = require('../services/orderStatus.service');
const SseService = require('../services/sse.service');
const { evaluatePromo } = require('../services/promo.service');
const { buildPaymentUrl, availablePaymentMethods } = require('../services/paymentUrl.service');
const { authTelegram } = require('../middleware/auth');
const { getDeliveryConfig, isWithinWorkingHours } = require('../utils/deliveryConfig');

const MAX_LINES = 50;      // savatdagi turli mahsulotlar soni
const MAX_QTY = 50;        // bitta mahsulotdan maksimal soni
const PAYMENT_METHODS = ['click', 'payme', 'cash'];
const DELIVERY_TYPES = ['delivery', 'pickup'];

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const hasLocation = (b) => !!(b.location?.lat && b.location?.lng);
const clip = (v, max) => String(v ?? '').trim().slice(0, max);
const badRequest = (res, error, extra = {}) => res.status(400).json({ error, ...extra });

// Mijozga ko'rsatiladigan buyurtma ko'rinishi — ichki maydonlarsiz
// (to'lov tizimi IDlari, operator Telegram ID'lari va h.k.).
function toCustomerView(order) {
    const o = order.toObject ? order.toObject() : order;
    return {
        _id: o._id,
        orderNumber: o.orderNumber,
        items: (o.items || []).map(i => ({ product: i.product, productName: i.productName, price: i.price, qty: i.qty, note: i.note })),
        branch: o.branch,
        deliveryType: o.deliveryType,
        address: o.address,
        subtotal: o.subtotal,
        deliveryCost: o.deliveryCost,
        bonusDiscount: o.bonusDiscount,
        promoDiscount: o.promoDiscount,
        total: o.total,
        bonusEarned: o.bonusEarned,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        status: o.status,
        statusHistory: (o.statusHistory || []).map(h => ({ status: h.status, changedAt: h.changedAt })),
        estimatedTime: o.estimatedTime,
        notes: o.notes,
        phone: o.phone,
        extraPhone: o.extraPhone,
        deliveryDate: o.deliveryDate,
        deliveryTime: o.deliveryTime,
        createdAt: o.createdAt,
        deliveredAt: o.deliveredAt,
    };
}

async function loadOwnOrder(req, res, select) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(404).json({ error: 'Buyurtma topilmadi' });
        return null;
    }
    let q = Order.findById(req.params.id);
    if (select) q = q.select(select);
    const order = await q;
    if (!order) {
        res.status(404).json({ error: 'Buyurtma topilmadi' });
        return null;
    }
    if (String(order.user) !== String(req.user.userId)) {
        res.status(403).json({ error: 'Ruxsat yo\'q' });
        return null;
    }
    return order;
}

// ─── Yangi buyurtma ───
router.post('/', authTelegram, async (req, res) => {
    try {
        const body = req.body || {};
        const { items, addressLat, addressLng, promoCode } = body;
        const deliveryType = body.deliveryType || 'delivery';
        const paymentMethod = body.paymentMethod || 'cash';

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
        if (user.isBlocked) return res.status(403).json({ error: 'Hisobingiz bloklangan. Admin bilan bog\'laning.' });

        // ── 1. Kiruvchi ma'lumotlarni tekshirish ──
        if (!DELIVERY_TYPES.includes(deliveryType)) return badRequest(res, 'Yetkazib berish turi noto\'g\'ri');
        if (!PAYMENT_METHODS.includes(paymentMethod)) return badRequest(res, 'To\'lov turi noto\'g\'ri');
        if (!availablePaymentMethods().includes(paymentMethod)) return badRequest(res, 'Bu to\'lov turi hozircha mavjud emas. Boshqa usulni tanlang.');
        if (!Array.isArray(items) || items.length === 0) return badRequest(res, 'Buyurtmada mahsulot yo\'q');
        if (items.length > MAX_LINES) return badRequest(res, `Bitta buyurtmada ${MAX_LINES} tadan ortiq mahsulot bo'lishi mumkin emas`);

        const address = clip(body.address, 500);
        const notes = clip(body.notes, 500);
        const extraPhoneDigits = String(body.extraPhone || '').replace(/\D/g, '');
        const extraPhone = extraPhoneDigits ? `+${extraPhoneDigits}` : '';
        if (extraPhone && !/^\+998\d{9}$/.test(extraPhone)) {
            return badRequest(res, 'Telefon raqam noto\'g\'ri. Format: +998 XX XXX XX XX');
        }
        const phone = user.phone || extraPhone;
        if (!phone) return badRequest(res, 'Telefon raqamingizni kiriting');

        const lat = addressLat !== undefined && addressLat !== null && addressLat !== '' ? Number(addressLat) : null;
        const lng = addressLng !== undefined && addressLng !== null && addressLng !== '' ? Number(addressLng) : null;
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
        if (deliveryType === 'delivery' && !address) return badRequest(res, 'Yetkazib berish manzilini kiriting');

        const deliveryDate = /^\d{4}-\d{2}-\d{2}$/.test(body.deliveryDate || '') ? body.deliveryDate : '';
        const deliveryTime = /^\d{2}:\d{2}$/.test(body.deliveryTime || '') ? body.deliveryTime : '';

        // ── 2. Ish vaqti (08:00 — 01:00 Toshkent vaqti) ──
        const cfg = await getDeliveryConfig();
        if (!isWithinWorkingHours(cfg)) {
            return res.status(400).json({
                error: `Hozir ish vaqti emas. Ish vaqti: ${cfg.workHours}`,
                code: 'OUT_OF_HOURS',
                workHours: cfg.workHours,
            });
        }

        // ── 3. Filial: faol va ochiq bo'lishi shart ──
        const branches = await Branch.find({ isActive: true, isOpen: { $ne: false } }).lean();
        if (branches.length === 0) {
            return badRequest(res, 'Hozir barcha filiallar yopiq. Keyinroq urinib ko\'ring.', { code: 'NO_BRANCH' });
        }
        const requested = mongoose.isValidObjectId(body.branch)
            ? branches.find(b => String(b._id) === String(body.branch))
            : null;

        let branchDoc = null;
        if (deliveryType === 'pickup') {
            if (!requested) return badRequest(res, 'Tanlangan filial hozir ishlamayapti. Boshqa filialni tanlang.', { code: 'BRANCH_CLOSED' });
            branchDoc = requested;
        } else if (hasCoords && branches.some(hasLocation)) {
            // Yetkazishda — manzilga eng yaqin, radiusi yetadigan filial tanlanadi
            const ranked = branches
                .filter(hasLocation)
                .map(b => ({ b, dist: haversineKm(lat, lng, b.location.lat, b.location.lng) }))
                .sort((a, z) => a.dist - z.dist);
            const covering = ranked.find(r => !(r.b.deliveryRadius > 0) || r.dist <= r.b.deliveryRadius);
            if (!covering) {
                const nearest = ranked[0];
                return res.status(400).json({
                    error: `Manzilingiz yetkazib berish zonasidan tashqarida. Eng yaqin filialdan ${nearest.dist.toFixed(1)} km uzoqda, maksimal radius ${nearest.b.deliveryRadius} km.`,
                    code: 'OUT_OF_ZONE',
                    distanceKm: parseFloat(nearest.dist.toFixed(1)),
                    radiusKm: nearest.b.deliveryRadius,
                });
            }
            branchDoc = covering.b;
        } else {
            branchDoc = requested || branches[0];
        }

        // ── 4. Mahsulot narxlari — faqat serverdagi narx ishlatiladi ──
        const productIds = items.map(i => i?.productId).filter(id => mongoose.isValidObjectId(id));
        const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
        const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));

        let subtotal = 0;
        const orderItems = [];
        const promoLines = [];
        const missing = [];
        for (const item of items) {
            const product = productMap[String(item?.productId)];
            if (!product) { missing.push(item?.name || item?.productId); continue; }
            const qty = Math.min(MAX_QTY, Math.max(1, parseInt(item.qty, 10) || 1));
            subtotal += product.price * qty;
            promoLines.push({ category: product.category, price: product.price, qty });
            orderItems.push({
                product: product._id,
                productName: product.name,
                price: product.price,
                qty,
                note: clip(item.note, 200),
                mxikCode: product.mxikCode || '',
                packageCode: product.packageCode || '',
                vatPercent: product.vatPercent ?? 12,
            });
        }

        if (orderItems.length === 0) {
            return res.status(400).json({ error: 'Savatdagi mahsulotlar endi mavjud emas. Savatni yangilang.', code: 'PRODUCTS_UNAVAILABLE' });
        }
        if (missing.length > 0) {
            return res.status(409).json({
                error: 'Savatdagi ayrim mahsulotlar endi sotuvda yo\'q. Savat yangilandi — qayta tekshirib buyurtma bering.',
                code: 'PRODUCTS_UNAVAILABLE',
            });
        }

        // ── 5. Minimal buyurtma (yetkazib berishda) ──
        const minOrder = deliveryType === 'delivery'
            ? Math.max(cfg.minOrderAmount || 0, branchDoc.minOrderAmount || 0)
            : 0;
        if (minOrder > 0 && subtotal < minOrder) {
            return res.status(400).json({
                error: `Yetkazib berish uchun minimal buyurtma: ${minOrder.toLocaleString('ru-RU')} so'm`,
                code: 'MIN_ORDER',
                minOrderAmount: minOrder,
            });
        }

        // ── 6. Promo kod ──
        let promoDiscount = 0;
        let appliedPromoId = null;
        if (promoCode) {
            const result = await evaluatePromo(promoCode, { subtotal, items: promoLines });
            if (!result.ok) return res.status(400).json({ error: result.error, code: 'PROMO_INVALID' });
            promoDiscount = result.discount;
            appliedPromoId = result.promo._id;
        }

        // ── 7. Bonus — admin sozlagan maxBonusPercent bo'yicha ──
        let actualBonusDiscount = 0;
        const requestedBonus = Math.floor(Number(body.bonusDiscount) || 0);
        if (requestedBonus > 0) {
            const maxBonus = Math.floor(subtotal * ((cfg.maxBonusPercent || 0) / 100));
            actualBonusDiscount = Math.max(0, Math.min(requestedBonus, user.bonusPoints || 0, maxBonus, subtotal - promoDiscount));
        }

        // ── 8. Yetkazish narxi ──
        let deliveryCost = 0;
        if (deliveryType === 'delivery') {
            deliveryCost = cfg.deliveryCost || 0;
            if (cfg.freeDeliveryThreshold > 0 && subtotal >= cfg.freeDeliveryThreshold) deliveryCost = 0;
        }
        const total = Math.max(0, subtotal - actualBonusDiscount - promoDiscount + deliveryCost);
        // 0 so'mni onlayn to'lab bo'lmaydi — bunday holatda naqd (to'lovsiz) sifatida qabul qilinadi
        const effectivePayment = total === 0 ? 'cash' : paymentMethod;

        const order = await Order.create({
            user: user._id,
            telegramId: user.telegramId,
            customerName: `${user.firstName} ${user.lastName}`.trim() || user.username || 'Mijoz',
            phone,
            extraPhone: extraPhone && extraPhone !== phone ? extraPhone : '',
            items: orderItems,
            branch: branchDoc._id,
            deliveryType,
            address: deliveryType === 'delivery' ? address : '',
            addressLat: deliveryType === 'delivery' && hasCoords ? lat : undefined,
            addressLng: deliveryType === 'delivery' && hasCoords ? lng : undefined,
            subtotal,
            deliveryCost,
            bonusDiscount: actualBonusDiscount,
            promoDiscount,
            appliedPromo: appliedPromoId,
            total,
            paymentMethod: effectivePayment,
            notes,
            deliveryDate,
            deliveryTime,
            estimatedTime: cfg.estimatedDeliveryTime || 30,
            // Naqd to'lovda to'g'ridan-to'g'ri operatorga o'tadi
            status: effectivePayment === 'cash' ? 'pending_operator' : 'awaiting_payment',
            paymentStatus: 'pending',
            statusHistory: [{
                status: effectivePayment === 'cash' ? 'pending_operator' : 'awaiting_payment',
                changedBy: 'user',
                note: 'Buyurtma yaratildi',
            }],
        });

        // Bonus sarflash (atomik). Parallel boshqa buyurtmada sarflanib ulgurgan bo'lsa — bekor.
        if (actualBonusDiscount > 0) {
            try {
                await BonusService.spendBonus(user, order, actualBonusDiscount);
            } catch {
                await Order.deleteOne({ _id: order._id });
                return res.status(409).json({ error: 'Bonus balansi o\'zgardi. Qayta urinib ko\'ring.', code: 'BONUS_CHANGED' });
            }
        }

        // Promo kod counter — order muvaffaqiyatli yaratilgandan keyin
        if (appliedPromoId) {
            await Promotion.findByIdAndUpdate(appliedPromoId, { $inc: { usageCount: 1 } });
        }

        const paymentUrl = buildPaymentUrl(order);

        // Mijozga tasdiq + (naqd to'lovda) operatorga xabar
        TelegramService.notifyCustomerOrderCreated(order).catch(() => {});
        if (order.paymentMethod === 'cash') {
            TelegramService.notifyOperator(order).catch(() => {});
        }

        res.status(201).json({
            _id: order._id,
            orderNumber: order.orderNumber,
            total: order.total,
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            estimatedTime: order.estimatedTime,
            paymentUrl,
        });
    } catch (err) {
        console.error('Order create error:', err);
        res.status(500).json({ error: 'Buyurtma yaratishda xatolik. Qayta urinib ko\'ring.' });
    }
});

// ─── Foydalanuvchi buyurtmalari ───
router.get('/', authTelegram, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.userId })
            .populate('branch', 'name address phone')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        res.json(orders.map(toCustomerView));
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── Bitta buyurtma ───
router.get('/:id', authTelegram, async (req, res) => {
    try {
        const order = await loadOwnOrder(req, res);
        if (!order) return;
        await order.populate('branch', 'name address phone');
        res.json(toCustomerView(order));
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── To'lov havolasi (to'lanmagan buyurtmani keyinroq to'lash uchun) ───
router.get('/:id/pay', authTelegram, async (req, res) => {
    try {
        const order = await loadOwnOrder(req, res);
        if (!order) return;
        if (order.status !== 'awaiting_payment' || order.paymentStatus === 'paid') {
            return res.status(400).json({ error: 'Bu buyurtma uchun to\'lov talab qilinmaydi' });
        }
        res.json({ paymentUrl: buildPaymentUrl(order), paymentMethod: order.paymentMethod, total: order.total, orderNumber: order.orderNumber });
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── Buyurtmani bekor qilish ───
router.patch('/:id/cancel', authTelegram, async (req, res) => {
    try {
        const order = await loadOwnOrder(req, res);
        if (!order) return;

        const cancellable = ['awaiting_payment', 'pending_operator'];
        if (!cancellable.includes(order.status)) {
            return res.status(400).json({ error: 'Buyurtma tasdiqlangan — bekor qilish uchun operator bilan bog\'laning' });
        }
        if (order.paymentStatus === 'paid') {
            return res.status(400).json({ error: 'To\'langan buyurtmani bekor qilish va pulni qaytarish uchun operator bilan bog\'laning' });
        }

        const prevStatus = order.status;
        await OrderStatusService.applyTransition(order, 'cancelled', {
            changedBy: 'user',
            note: 'Foydalanuvchi tomonidan bekor qilindi',
        });

        TelegramService.notifyCustomerStatus(order, { note: 'Siz tomoningizdan bekor qilindi' }).catch(() => {});
        if (prevStatus === 'pending_operator') {
            TelegramService.notifyOperatorCancelled(order).catch(() => {});
        }

        await order.populate('branch', 'name address phone');
        res.json(toCustomerView(order));
    } catch (err) {
        console.error('Order cancel error:', err);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// ─── SSE: Buyurtma real-vaqt holati ───
// Mijoz GET /api/orders/:id/stream ga ulanadi, holat o'zgarganda event oladi.
router.get('/:id/stream', authTelegram, async (req, res) => {
    try {
        const order = await loadOwnOrder(req, res, 'user status paymentStatus');
        if (!order) return;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Nginx proxy buffering o'chirish
        res.flushHeaders();

        // Hozirgi holat darhol yuboriladi
        res.write(`data: ${JSON.stringify({ status: order.status, paymentStatus: order.paymentStatus })}\n\n`);

        // Ping har 25 soniyada — proxy timeout oldini oladi
        const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch { clearInterval(ping); } }, 25000);

        SseService.subscribe(req.params.id, res);

        req.on('close', () => {
            clearInterval(ping);
            SseService.unsubscribe(req.params.id, res);
        });
    } catch (err) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

module.exports = router;
module.exports.toCustomerView = toCustomerView;
