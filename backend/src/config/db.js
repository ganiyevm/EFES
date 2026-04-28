const mongoose = require('mongoose');

// Mavjud buyurtmalardan Counter ni boshlang'ich qiymat bilan to'ldiradi.
// Agar counter allaqachon bo'lsa — teginmaydi (idempotent).
async function seedOrderCounter() {
    try {
        const Counter = require('../models/Counter');
        const existing = await Counter.findById('order');
        if (existing) return; // allaqachon bor

        const Order = require('../models/Order');
        const last = await Order.findOne({}, { orderNumber: 1 }, { sort: { createdAt: -1 } });
        let seq = 0;
        if (last?.orderNumber) {
            const match = last.orderNumber.match(/EFES-(\d+)/);
            if (match) seq = parseInt(match[1]);
        }
        await Counter.create({ _id: 'order', seq });
        console.log(`✅ Order counter boshlandi: ${seq}`);
    } catch (e) {
        console.error('seedOrderCounter xatosi:', e.message);
    }
}

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB ulandi');
        await seedOrderCounter();
    } catch (err) {
        console.error('❌ MongoDB ulanish xatosi:', err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
