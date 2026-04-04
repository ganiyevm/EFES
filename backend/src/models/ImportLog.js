const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    totalRows: { type: Number, default: 0 },
    imported: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    importedBy: { type: String, default: 'admin' },
}, { timestamps: true });

module.exports = mongoose.model('ImportLog', importLogSchema);
