const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const BonusService = require('../services/bonus.service');
const { authTelegram } = require('../middleware/auth');

// ─── Yangi buyurtma ───
router.post('/', authTelegram, async (req, res) => {
    try {
        const { items, branch, deliveryType, address, addressLat, addressLng, paymentMethod, phone, bonusDiscount = 0, notes } = req.body;
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

        // Bonus tekshirish
        let actualBonusDiscount = 0;
        if (bonusDiscount > 0) {
            const maxBonus = Math.floor(subtotal * 0.2); // max 20%
            actualBonusDiscount = Math.min(bonusDiscount, user.bonusPoints, maxBonus);
        }

        const deliveryCost = deliveryType === 'delivery' ? 10000 : 0;
        const total = subtotal - actualBonusDiscount + deliveryCost;

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

        res.status(201).json(order);
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
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
