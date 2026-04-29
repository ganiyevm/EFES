const mongoose = require('mongoose');
const Counter = require('./Counter');

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, default: '' },
    price: { type: Number, default: 0 },
    qty: { type: Number, default: 1 },
    note: { type: String, default: '' },   // Maxsus talablar: "achchiqlisiz", "ko'p sous"
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String, default: 'system' },
    note: { type: String, default: '' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    telegramId: Number,
    customerName: { type: String, default: '' },
    phone: { type: String, default: '' },
    extraPhone: { type: String, default: '' },

    items: [orderItemSchema],

    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    deliveryType: {
        type: String,
        enum: ['delivery', 'pickup'],
        default: 'delivery',
    },
    address: { type: String, default: '' },
    addressLat: { type: Number },
    addressLng: { type: Number },

    subtotal: { type: Number, default: 0 },
    deliveryCost: { type: Number, default: 0 },
    bonusDiscount: { type: Number, default: 0 },
    promoDiscount: { type: Number, default: 0 },
    appliedPromo: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion', default: null },
    total: { type: Number, default: 0 },
    bonusEarned: { type: Number, default: 0 },

    // To'lov
    paymentMethod: {
        type: String,
        enum: ['click', 'payme', 'cash'],
        default: 'cash',
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
    },
    paymentId: { type: String, default: '' },
    clickPrepareId: { type: String, default: '' },

    // Payme
    paymeTransId: { type: String, default: '' },
    paymeState: { type: Number, default: 0 },
    paymeCreateTime: { type: Number, default: 0 },
    paymePerformTime: { type: Number, default: 0 },
    paymeCancelTime: { type: Number, default: 0 },
    paymeReason: { type: Number },

    // Buyurtma holati
    status: {
        type: String,
        enum: [
            'awaiting_payment',
            'pending_operator',
            'confirmed',
            'preparing',       // Taom tayyorlanmoqda
            'ready',           // Tayyor, kurier kutilmoqda
            'on_the_way',
            'delivered',
            'rejected',
            'cancelled',
        ],
        default: 'awaiting_payment',
        index: true,
    },

    statusHistory: [statusHistorySchema],
    estimatedTime: { type: Number, default: 30 }, // taxminiy yetkazib berish (daqiqa)

    operatorId: Number,
    courierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Courier', default: null, index: true },

    // Kurier botiga broadcast qilingan xabarlar (qabul qilinganda boshqalarda o'chirish uchun)
    courierBroadcasts: [{
        courierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Courier' },
        chatId: Number,
        messageId: Number,         // buyurtma matni + "Qabul qilish" tugmasi
        locationMessageId: Number, // geolokatsiya pin (ixtiyoriy)
        _id: false,
    }],

    confirmedAt: Date,
    preparingAt: Date,
    readyAt: Date,
    dispatchedAt: Date,
    deliveredAt: Date,
    notes: { type: String, default: '' },
}, {
    timestamps: true,
});

// Auto-generate orderNumber: EFES-0001, EFES-0002, ...
// $inc atomic operation — parallel buyurtmalarda bir xil raqam chiqmaydi
orderSchema.pre('save', async function (next) {
    if (!this.orderNumber) {
        const seq = await Counter.nextSeq('order');
        this.orderNumber = 'EFES-' + String(seq).padStart(4, '0');
    }
    // Naqd to'lovda to'g'ridan-to'g'ri operatorga o'tadi
    if (this.paymentMethod === 'cash' && this.status === 'awaiting_payment') {
        this.status = 'pending_operator';
        this.paymentStatus = 'pending';
    }
    next();
});

orderSchema.index({ telegramId: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ branch: 1, status: 1 });
orderSchema.index({ courierId: 1, deliveredAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
