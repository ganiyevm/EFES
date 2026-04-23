const mongoose = require('mongoose');
const crypto = require('crypto');

const courierSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    carPlate: { type: String, default: '', trim: true },

    telegramId: { type: Number, default: null, sparse: true, index: true },

    inviteToken: { type: String, unique: true, required: true, index: true },

    isActive: { type: Boolean, default: true },
    bonusEnabled: { type: Boolean, default: true },
    bonusPerDelivery: { type: Number, default: 5000 },
    earnedBonus: { type: Number, default: 0 },
}, { timestamps: true });

courierSchema.pre('validate', function (next) {
    if (!this.inviteToken) {
        this.inviteToken = crypto.randomBytes(16).toString('hex');
    }
    next();
});

module.exports = mongoose.model('Courier', courierSchema);
