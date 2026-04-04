const mongoose = require('mongoose');

const adminAccountSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager'], default: 'admin' },
}, { timestamps: true });

module.exports = mongoose.model('AdminAccount', adminAccountSchema);
