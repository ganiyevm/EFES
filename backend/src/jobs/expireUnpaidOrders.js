const cron = require('node-cron');

// To'lanmay qolgan onlayn buyurtmalar (mijoz Click/Payme oynasini yopib ketgan)
// abadiy "To'lov kutilmoqda"da qolmasligi uchun 30 daqiqadan keyin bekor qilinadi.
// Bu sarflangan bonus va promo limitini qaytaradi.
// Payme tranzaksiyasi ochiq bo'lsa (paymeState=1) — tegmaymiz, Payme o'zi yakunlaydi.
const UNPAID_TTL_MS = 30 * 60 * 1000;

async function expireUnpaidOrders() {
    const Order = require('../models/Order');
    const OrderStatusService = require('../services/orderStatus.service');
    const TelegramService = require('../services/telegram.service');

    const cutoff = new Date(Date.now() - UNPAID_TTL_MS);
    const stale = await Order.find({
        status: 'awaiting_payment',
        paymentStatus: { $ne: 'paid' },
        createdAt: { $lt: cutoff },
        paymeState: { $ne: 1 },
    }).limit(100);

    for (const order of stale) {
        try {
            await OrderStatusService.applyTransition(order, 'cancelled', {
                changedBy: 'system',
                note: "30 daqiqa ichida to'lanmagani uchun avtomatik bekor qilindi",
            });
            TelegramService.notifyCustomerStatus(order, { note: "To'lov 30 daqiqa ichida amalga oshirilmadi" }).catch(() => {});
        } catch (e) {
            console.error('[EXPIRE]', order.orderNumber, e.message);
        }
    }
    if (stale.length) console.log(`⌛ ${stale.length} ta to'lanmagan buyurtma bekor qilindi`);
    return stale.length;
}

if (!process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0') {
    cron.schedule('*/5 * * * *', () => {
        expireUnpaidOrders().catch(e => console.error('[EXPIRE] job:', e.message));
    });
}

module.exports = { expireUnpaidOrders, UNPAID_TTL_MS };
