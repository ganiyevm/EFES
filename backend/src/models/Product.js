const mongoose = require('mongoose');
const { CATEGORY_KEYS } = require('../config/constants');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: 'text',
    },
    category: {
        type: String,
        enum: CATEGORY_KEYS,
        default: 'other',
        index: true,
    },
    description: {
        uz: { type: String, default: '' },
        ru: { type: String, default: '' },
    },
    price: { type: Number, required: true, default: 0 },
    weight: { type: String, default: '' },        // "350g", "500ml"
    calories: { type: Number, default: 0 },
    prepTime: { type: Number, default: 15 },       // daqiqada tayyorlash vaqti
    ingredients: { type: String, default: '' },     // tarkibi
    isSpicy: { type: Boolean, default: false },
    isVegetarian: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    imageUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
});

productSchema.index({ name: 'text', ingredients: 'text' });

module.exports = mongoose.model('Product', productSchema);
