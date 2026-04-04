const http = require('http');

class TelegramService {
    static async sendMessage(chatId, text, options = {}) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                ...options,
            });

            const req = http.request({
                hostname: 'api.telegram.org',
                port: 443,
                path: `/bot${process.env.BOT_TOKEN}/sendMessage`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve(JSON.parse(body)));
            });

            req.on('error', (err) => {
                console.error('Telegram send error:', err.message);
                resolve({ ok: false, error: err.message });
            });
            req.write(data);
            req.end();
        });
    }

    static async notifyOperator(order) {
        const Branch = require('../models/Branch');
        const branch = await Branch.findById(order.branch);
        if (!branch?.operatorChatId) return;

        const paymentLabels = { click: 'Click 💳', payme: 'Payme 💳', cash: 'Naqd 💵' };

        const items = order.items.map(i => `  • ${i.productName} x${i.qty} — ${i.price.toLocaleString()} so'm${i.note ? ` (${i.note})` : ''}`).join('\n');

        const text = `🍽 <b>Yangi buyurtma!</b>\n\n` +
            `📋 <b>${order.orderNumber}</b>\n` +
            `👤 ${order.customerName}\n` +
            `📞 ${order.phone}\n\n` +
            `🍽 <b>Taomlar:</b>\n${items}\n\n` +
            `💰 Jami: <b>${order.total.toLocaleString()} so'm</b>\n` +
            `💳 To'lov: ${paymentLabels[order.paymentMethod] || order.paymentMethod}\n` +
            `🚗 ${order.deliveryType === 'delivery' ? `Yetkazib berish: ${order.address}` : 'Olib ketish'}\n` +
            `${order.notes ? `📝 Izoh: ${order.notes}` : ''}`;

        try {
            await this.sendMessage(branch.operatorChatId, text, {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '✅ Tasdiqlash', callback_data: `confirm_${order._id}` },
                            { text: '❌ Rad etish', callback_data: `reject_${order._id}` },
                        ],
                    ],
                },
            });
        } catch (err) {
            console.error('Operator notify error:', err.message);
        }
    }

    static async notifyCustomer(order, message) {
        if (!order.telegramId) return;
        try {
            await this.sendMessage(order.telegramId, message);
        } catch (err) {
            console.error('Customer notify error:', err.message);
        }
    }
}

module.exports = TelegramService;
