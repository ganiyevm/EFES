const mongoose = require('mongoose');

const analyticsDailySchema = new mongoose.Schema({
    date: { type: Date, required: true, unique: true },
    ordersCount: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    avgOrderValue: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    cancelledCount: { type: Number, default: 0 },
    avgDeliveryTime: { type: Number, default: 0 },
    topProducts: [{ product: String, count: Number }],
    paymentMethods: {
        click: { type: Number, default: 0 },
        payme: { type: Number, default: 0 },
        cash: { type: Number, default: 0 },
    },
}, { timestamps: true });

module.exports = mongoose.model('AnalyticsDaily', analyticsDailySchema);
