const mongoose = require('mongoose');

const operatorSchema = new mongoose.Schema({
    telegramId: { type: Number, required: true },
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    username: { type: String, default: '' },
    phone: { type: String, default: '' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    isActive: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false },
    note: { type: String, default: '' },
    addedAt: { type: Date, default: Date.now },
}, { timestamps: true });

operatorSchema.index({ telegramId: 1, branch: 1 }, { unique: true });

module.exports = mongoose.model('Operator', operatorSchema);
