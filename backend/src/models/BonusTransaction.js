const mongoose = require('mongoose');

const bonusTransactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    telegramId: Number,
    type: { type: String, enum: ['earned', 'spent'], required: true },
    amount: { type: Number, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('BonusTransaction', bonusTransactionSchema);
