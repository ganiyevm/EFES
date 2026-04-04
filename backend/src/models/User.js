const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: {
        type: Number,
        unique: true,
        required: true,
        index: true,
    },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    username: { type: String, default: '' },
    phone: { type: String, default: '' },
    language: {
        type: String,
        enum: ['uz', 'ru', 'en'],
        default: 'uz',
    },
    bonusPoints: { type: Number, default: 0 },
    bonusTier: {
        type: String,
        enum: ['bronze', 'silver', 'gold'],
        default: 'bronze',
    },
    addresses: [{
        title: { type: String, default: '' },
        address: { type: String, default: '' },
        lat: Number,
        lng: Number,
    }],
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    }],
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    registeredAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
});

userSchema.methods.updateBonusTier = function () {
    if (this.bonusPoints >= 5000) this.bonusTier = 'gold';
    else if (this.bonusPoints >= 2000) this.bonusTier = 'silver';
    else this.bonusTier = 'bronze';
};

userSchema.pre('save', function (next) {
    this.updateBonusTier();
    next();
});

module.exports = mongoose.model('User', userSchema);
