const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Promotion = require('../models/Promotion');
const BonusService = require('../services/bonus.service');
const TelegramService = require('../services/telegram.service');
const SseService = require('../services/sse.service');
const { authTelegram } = require('../middleware/auth');
const { getDeliveryConfig } = require('../utils/deliveryConfig');

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Yangi buyurtma ───
router.post('/', authTelegram, async (req, res) => {
    try {
        const { items, branch, deliveryType, address, addressLat, addressLng, paymentMethod, phone, extraPhone, bonusDiscount = 0, notes, promoCode } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

        // Yetkazib berish radiusi tekshiruvi
        if (deliveryType === 'delivery' && addressLat && addressLng) {
            const branchDoc = await Branch.findById(branch);
            if (branchDoc && branchDoc.deliveryRadius > 0 &&
                branchDoc.location?.lat && branchDoc.location?.lng) {
                const dist = haversineKm(
                    parseFloat(addressLat), parseFloat(addressLng),
                    branchDoc.location.lat, branchDoc.location.lng
                );
                if (dist > branchDoc.deliveryRadius) {
                    return res.status(400).json({
                        error: `Manzilingiz yetkazib berish zonasidan tashqarida. Filialdan ${dist.toFixed(1)} km uzoqda, maksimal radius ${branchDoc.deliveryRadius} km.`,
                        distanceKm: parseFloat(dist.toFixed(1)),
                        radiusKm: branchDoc.deliveryRadius,
                    });
                }
            }
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Buyurtmada mahsulot yo\'q' });
        }

        // Mahsulot narxlarini tekshirish — bitta $in so'rovi (N+1 oldini oladi)
        const productIds = items.map(i => i.productId).filter(Boolean);
        const products = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
        const productMap = Object.fromEntries(products.map(p => [p._id.toString(), p]));

        let subtotal = 0;
        const orderItems = [];
        for (const item of items) {
            const product = productMap[item.productId?.toString()];
            if (!product) continue;
            const qty = Math.max(1, parseInt(item.qty) || 1);
            subtotal += product.price * qty;
            orderItems.push({
                product: product._id,
                productName: product.name,
                price: product.price,
                qty,
                note: item.note || '',
            });
        }

        if (orderItems.length === 0) {
            return res.status(400).json({ error: 'Hech bir mahsulot topilmadi' });
        }

        // Delivery config (admin sozlamalari)
        const cfg = await getDeliveryConfig();

        // Bonus tekshirish — admin sozlagan maxBonusPercent bo'yicha
        let actualBonusDiscount = 0;
        if (bonusDiscount > 0) {
            const maxBonus = Math.floor(subtotal * (cfg.maxBonusPercent / 100));
            actualBonusDiscount = Math.min(bonusDiscount, user.bonusPoints, maxBonus);
        }

        // Promo kod tekshirish
        let promoDiscount = 0;
        let appliedPromoId = null;
        if (promoCode) {
            const now = new Date();
            const promo = await Promotion.findOne({
                promoCode: promoCode.toUpperCase().trim(),
                isActive: true,
                startDate: { $lte: now },
                $or: [{ endDate: null }, { endDate: { $gte: now } }],
            });
            if (promo && (promo.usageLimit === 0 || promo.usageCount < promo.usageLimit)) {
                if (subtotal >= (promo.minOrderAmount || 0)) {
                    if (promo.discountType === 'percent') {
                        promoDiscount = Math.floor(subtotal * promo.discountValue / 100);
                        if (promo.maxDiscount > 0) promoDiscount = Math.min(promoDiscount, promo.maxDiscount);
                    } else {
                        promoDiscount = promo.discountValue;
                    }
                    promoDiscount = Math.min(promoDiscount, subtotal);
                    appliedPromoId = promo._id;
                }
            }
        }

        // Delivery narxi — admin sozlagan qiymat. Agar freeDeliveryThreshold o'rnatilgan va subtotal undan katta bo'lsa — bepul
        let deliveryCost = 0;
        if (deliveryType === 'delivery') {
            deliveryCost = cfg.deliveryCost;
            if (cfg.freeDeliveryThreshold > 0 && subtotal >= cfg.freeDeliveryThreshold) {
                deliveryCost = 0;
            }
        }
        const total = subtotal - actualBonusDiscount - promoDiscount + deliveryCost;

        const order = await Order.create({
            user: user._id,
            telegramId: user.telegramId,
            customerName: `${user.firstName} ${user.lastName}`.trim(),
            phone: phone || user.phone,
            extraPhone: extraPhone || '',
            items: orderItems,
            branch,
            deliveryType,
            address,
            addressLat,
            addressLng,
            subtotal,
            deliveryCost,
            bonusDiscount: actualBonusDiscount,
            promoDiscount,
            appliedPromo: appliedPromoId,
            total,
            paymentMethod,
            notes,
            // Naqd to'lovda to'g'ridan-to'g'ri operatorga o'tadi
            status: paymentMethod === 'cash' ? 'pending_operator' : 'awaiting_payment',
            paymentStatus: paymentMethod === 'cash' ? 'pending' : 'pending',
        });

        // Promo kod counter — order muvaffaqiyatli yaratilgandan keyin
        if (appliedPromoId) {
            await Promotion.findByIdAndUpdate(appliedPromoId, { $inc: { usageCount: 1 } });
        }

        // Bonus sarflash
        if (actualBonusDiscount > 0) {
            await BonusService.spendBonus(user, order, actualBonusDiscount);
        }

        // To'lov URL yaratish
        let paymentUrl = '';
        const returnUrl = process.env.WEBAPP_URL || process.env.FRONTEND_URL || '';
        if (paymentMethod === 'click') {
            const params = new URLSearchParams({
                service_id: process.env.CLICK_SERVICE_ID || '',
                merchant_id: process.env.CLICK_MERCHANT_ID || '',
                amount: String(total),
                transaction_param: order.orderNumber,
                merchant_order_id: order.orderNumber,
            });
            if (process.env.CLICK_MERCHANT_USER_ID) {
                params.set('merchant_user_id', process.env.CLICK_MERCHANT_USER_ID);
            }
            if (returnUrl) params.set('return_url', returnUrl);
            paymentUrl = `https://my.click.uz/services/pay?${params}`;
            console.log('[CLICK URL]', paymentUrl);
        } else if (paymentMethod === 'payme') {
            const paymeData = Buffer.from(
                `m=${process.env.PAYME_MERCHANT_ID};ac.order_id=${order.orderNumber};a=${total * 100};l=uz`
            ).toString('base64');
            const checkoutHost = process.env.PAYME_TEST_MODE === 'true'
                ? 'checkout.test.paycom.uz'
                : 'checkout.paycom.uz';
            paymentUrl = `https://${checkoutHost}/${paymeData}`;
        }

        // Mijozga tasdiq + (naqd to'lovda) operatorga xabar
        TelegramService.notifyCustomerOrderCreated(order).catch(() => {});
        if (paymentMethod === 'cash') {
            TelegramService.notifyOperator(order).catch(() => {});
        }

        res.status(201).json({
            _id: order._id,
            orderNumber: order.orderNumber,
            total: order.total,
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            paymentUrl,
        });
    } catch (err) {
        console.error('Order create error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── Foydalanuvchi buyurtmalari ───
router.get('/', authTelegram, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.userId })
            .populate('branch', 'name address')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Bitta buyurtma ───
router.get('/:id', authTelegram, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('branch', 'name address phone');
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
        if (order.user.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Ruxsat yo\'q' });
        }
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Buyurtmani bekor qilish ───
router.patch('/:id/cancel', authTelegram, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
        if (order.user.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Ruxsat yo\'q' });
        }

        const cancellable = ['awaiting_payment', 'pending_operator'];
        if (!cancellable.includes(order.status)) {
            return res.status(400).json({ error: 'Bu buyurtmani bekor qilib bo\'lmaydi' });
        }

        order.status = 'cancelled';
        order.statusHistory.push({ status: 'cancelled', changedBy: 'user', note: 'Foydalanuvchi tomonidan bekor qilindi' });

        // Bonusni qaytarish
        if (order.bonusDiscount > 0) {
            const user = await User.findById(order.user);
            if (user) await BonusService.refundBonus(user, order);
        }

        await order.save();

        TelegramService.notifyCustomerStatus(order, { note: "Siz tomoningizdan bekor qilindi" }).catch(() => {});
        SseService.emit(order._id, { status: order.status, paymentStatus: order.paymentStatus });

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ─── SSE: Buyurtma real-vaqt holati ───
// Mijoz GET /api/orders/:id/stream ga ulanadi, holat o'zgarganda event oladi.
router.get('/:id/stream', authTelegram, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).select('user status paymentStatus').lean();
        if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
        if (order.user.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Ruxsat yo\'q' });
        }

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
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
