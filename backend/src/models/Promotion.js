const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    title: {
        uz: { type: String, default: '' },
        ru: { type: String, default: '' },
        en: { type: String, default: '' },
    },
    description: {
        uz: { type: String, default: '' },
        ru: { type: String, default: '' },
        en: { type: String, default: '' },
    },
    imageUrl: { type: String, default: '' },
    discountType: {
        type: String,
        enum: ['percent', 'fixed'],
        default: 'percent',
    },
    discountValue: { type: Number, default: 0 },      // 10 => 10% yoki 10000 so'm
    minOrderAmount: { type: Number, default: 0 },      // Minimal buyurtma summasi
    maxDiscount: { type: Number, default: 0 },          // Maksimal chegirma (percent uchun), 0 = cheksiz
    promoCode: { type: String, default: '', uppercase: true, trim: true },
    applicableCategories: [{ type: String }],          // Bo'sh = barcha kategoriyalar
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    usageLimit: { type: Number, default: 0 },          // 0 = cheksiz
    usageCount: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

promotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
promotionSchema.index({ promoCode: 1 });

module.exports = mongoose.model('Promotion', promotionSchema);
