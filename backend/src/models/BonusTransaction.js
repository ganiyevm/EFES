const mongoose = require('mongoose');

const bonusTransactionSchema = new mongoose.Schema({
    // Mijoz bonuslari
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    telegramId: Number,
    // Kurier bonuslari
    courier: { type: mongoose.Schema.Types.ObjectId, ref: 'Courier', default: null },
    courierTelegramId: { type: Number, default: null },

    entityType: { type: String, enum: ['user', 'courier'], default: 'user' },
    type: { type: String, enum: ['earned', 'spent'], required: true },
    amount: { type: Number, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('BonusTransaction', bonusTransactionSchema);
