const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Promotion = require('../models/Promotion');
const BonusService = require('../services/bonus.service');
const TelegramService = require('../services/telegram.service');
const { authTelegram } = require('../middleware/auth');
const { getDeliveryConfig } = require('../utils/deliveryConfig');

// ─── Yangi buyurtma ───
router.post('/', authTelegram, async (req, res) => {
    try {
        const { items, branch, deliveryType, address, addressLat, addressLng, paymentMethod, phone, bonusDiscount = 0, notes, promoCode } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

        // Mahsulot narxlarini tekshirish
        let subtotal = 0;
        const orderItems = [];
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) continue;
            const itemTotal = product.price * (item.qty || 1);
            subtotal += itemTotal;
            orderItems.push({
                product: product._id,
                productName: product.name,
                price: product.price,
                qty: item.qty || 1,
                note: item.note || '',
            });
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
                    await Promotion.findByIdAndUpdate(promo._id, { $inc: { usageCount: 1 } });
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

        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
