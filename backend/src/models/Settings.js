const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    value: mongoose.Schema.Types.Mixed,
    description: { type: String, default: '' },
}, { timestamps: true });

// Default sozlamalar
// delivery_cost: 10000 (so'm)
// min_order: 30000 (so'm)
// bonus_rate: 100 (har 10,000 so'mga 100 ball)
// max_bonus_percent: 20 (max 20% chegirma)
// working_hours: "10:00-23:00"
// estimated_delivery: 30 (daqiqa)

module.exports = mongoose.model('Settings', settingsSchema);
