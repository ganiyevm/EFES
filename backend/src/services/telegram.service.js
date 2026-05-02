const https = require('https');

const PAYMENT_LABELS = { click: 'Click 💳', payme: 'Payme 💳', cash: 'Naqd 💵' };

const STATUS_MESSAGES = {
    awaiting_payment: {
        icon: '⏳',
        title: "To'lov kutilmoqda",
        body: "Iltimos, to'lovni amalga oshiring. To'lov tasdiqlanganidan so'ng buyurtmangiz qabul qilinadi.",
    },
    pending_operator: {
        icon: '🔄',
        title: 'Buyurtma qabul qilindi',
        body: 'Operator tez orada buyurtmangizni tasdiqlaydi.',
    },
    confirmed: {
        icon: '✅',
        title: 'Buyurtmangiz tasdiqlandi',
        body: 'Operator buyurtmangizni tasdiqladi. Tez orada tayyorlashni boshlaymiz.',
    },
    preparing: {
        icon: '🍳',
        title: 'Taomingiz tayyorlanmoqda',
        body: 'Oshpazlar buyurtmangiz ustida ishlamoqda.',
    },
    ready: {
        icon: '📦',
        title: 'Buyurtmangiz tayyor',
        body: 'Olib ketish uchun tayyor yoki kurier yo\'lga chiqmoqda.',
    },
    on_the_way: {
        icon: '🚗',
        title: "Kurier yo'lda",
        body: 'Buyurtmangiz manzilingizga yetkazilmoqda.',
    },
    delivered: {
        icon: '🎉',
        title: 'Buyurtma yetkazildi',
        body: "Yoqimli ishtaha! Fikr-mulohazangizni bildirishni unutmang.",
    },
    rejected: {
        icon: '❌',
        title: 'Buyurtma rad etildi',
        body: "Afsus, buyurtmangiz rad etildi. Batafsil ma'lumot uchun operator bilan bog'laning.",
    },
    cancelled: {
        icon: '🚫',
        title: 'Buyurtma bekor qilindi',
        body: 'Buyurtmangiz bekor qilindi.',
    },
};

class TelegramService {
    static async _call(method, payload) {
        return new Promise((resolve) => {
            const data = JSON.stringify(payload);
            const req = https.request({
                hostname: 'api.telegram.org',
                port: 443,
                path: `/bot${process.env.BOT_TOKEN}/${method}`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(body)); }
                    catch { resolve({ ok: false, error: 'Invalid JSON' }); }
                });
            });
            req.on('error', (err) => {
                console.error(`Telegram ${method}:`, err.message);
                resolve({ ok: false, error: err.message });
            });
            req.write(data);
            req.end();
        });
    }

    static async sendMessage(chatId, text, options = {}) {
        return this._call('sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            ...options,
        });
    }

    static async sendLocation(chatId, lat, lng) {
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        return this._call('sendLocation', {
            chat_id: chatId,
            latitude: lat,
            longitude: lng,
        });
    }

    static async notifyOperator(order) {
        const Branch = require('../models/Branch');
        const Operator = require('../models/Operator');
        const branch = await Branch.findById(order.branch);
        if (!branch?.operatorChatId) return;

        // Bloklangan yoki nofaol operatorlarga yubormaslik
        const activeOps = await Operator.find({
            branch: order.branch,
            isBlocked: false,
            isActive: true,
        }).select('telegramId');
        const activeIds = activeOps.map(o => o.telegramId);
        // Agar operator bazada mavjud va bloklangan bo'lsa — o'tkazib yubor
        const allOps = await Operator.find({ branch: order.branch }).select('telegramId');
        const managedIds = allOps.map(o => o.telegramId);
        if (managedIds.includes(branch.operatorChatId) && !activeIds.includes(branch.operatorChatId)) return;

        const items = order.items.map(i => `  • ${i.productName} x${i.qty} — ${i.price.toLocaleString()} so'm${i.note ? ` (${i.note})` : ''}`).join('\n');

        const hasGeo = order.deliveryType === 'delivery'
            && typeof order.addressLat === 'number'
            && typeof order.addressLng === 'number';

        const deliveryLine = order.deliveryType === 'delivery'
            ? `🚗 Yetkazib berish: ${order.address || '—'}`
            : '🏃 Olib ketish';

        // ── 1. Signal: diqqatni tortadigan qisqa xabar ──────────────────
        const signalText =
            `🔔🔔🔔 <b>YANGI BUYURTMA!</b> 🔔🔔🔔\n\n` +
            `📋 <b>${order.orderNumber}</b>\n` +
            `💰 <b>${order.total.toLocaleString()} so'm</b> · ` +
            `${PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}\n` +
            `${deliveryLine}\n\n` +
            `⬇️ Quyida batafsil ma'lumot ⬇️`;

        // ── 2. To'liq buyurtma xabari ────────────────────────────────────
        const detailText =
            `📋 <b>${order.orderNumber}</b>\n` +
            `👤 ${order.customerName}\n` +
            `📞 ${order.phone}\n\n` +
            `🍽 <b>Taomlar:</b>\n${items}\n\n` +
            `💰 Jami: <b>${order.total.toLocaleString()} so'm</b>\n` +
            `💳 To'lov: ${PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}\n` +
            `${deliveryLine}\n` +
            `${order.notes ? `📝 Izoh: ${order.notes}` : ''}`;

        const buttons = [[
            { text: '✅ Tasdiqlash', callback_data: `confirm_${order._id}` },
            { text: '❌ Rad etish', callback_data: `reject_${order._id}` },
        ]];
        if (hasGeo) {
            buttons.push([{
                text: "🗺 Yandex Xaritada ko'rish",
                url: `https://yandex.com/maps/?pt=${order.addressLng},${order.addressLat}&z=17&l=map`,
            }]);
        }

        try {
            // Signal xabari (ovozli notification uchun alohida)
            await this.sendMessage(branch.operatorChatId, signalText);

            // To'liq buyurtma xabari + tugmalar
            await this.sendMessage(branch.operatorChatId, detailText, {
                reply_markup: { inline_keyboard: buttons },
            });

            if (hasGeo) {
                await this.sendLocation(branch.operatorChatId, order.addressLat, order.addressLng);
            }
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

    // Buyurtma yaratilganda mijozga tasdiqlash xabari
    static async notifyCustomerOrderCreated(order) {
        if (!order.telegramId) return;

        const items = order.items
            .map(i => `  • ${i.productName} x${i.qty} — ${(i.price * i.qty).toLocaleString()} so'm`)
            .join('\n');

        const payLabel = PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod;
        const deliveryLine = order.deliveryType === 'delivery'
            ? `🚗 Yetkazib berish${order.address ? `: ${order.address}` : ''}`
            : '🏃 Olib ketish';

        const statusInfo = STATUS_MESSAGES[order.status] || STATUS_MESSAGES.pending_operator;

        const text = `🎉 <b>Buyurtmangiz qabul qilindi!</b>\n\n` +
            `📋 <b>${order.orderNumber}</b>\n\n` +
            `🍽 <b>Taomlar:</b>\n${items}\n\n` +
            `💰 Jami: <b>${order.total.toLocaleString()} so'm</b>\n` +
            `💳 To'lov: ${payLabel}\n` +
            `${deliveryLine}\n\n` +
            `${statusInfo.icon} <b>Status:</b> ${statusInfo.title}\n` +
            `${statusInfo.body}\n\n` +
            `⏱ Taxminiy vaqt: ~${order.estimatedTime || 30} daqiqa\n\n` +
            `Holatni kuzatib borish uchun ilovadagi "Buyurtmalarim" bo'limiga kiring.`;

        try {
            await this.sendMessage(order.telegramId, text);
        } catch (err) {
            console.error('Customer order-created notify error:', err.message);
        }
    }

    // Buyurtma statusi o'zgarganda mijozga xabar
    static async notifyCustomerStatus(order, extra = {}) {
        if (!order.telegramId) return;
        const info = STATUS_MESSAGES[order.status];
        if (!info) return;

        let text = `${info.icon} <b>${info.title}</b>\n\n` +
            `📋 Buyurtma: <b>${order.orderNumber}</b>\n\n` +
            `${info.body}`;

        if (extra.note) text += `\n\n📝 ${extra.note}`;
        if (extra.courier) {
            text += `\n\n🚗 <b>Kurier:</b> ${extra.courier.name}` +
                (extra.courier.phone ? `\n📞 ${extra.courier.phone}` : '') +
                (extra.courier.carPlate ? `\n🚙 ${extra.courier.carPlate}` : '');
        }

        try {
            await this.sendMessage(order.telegramId, text);
        } catch (err) {
            console.error('Customer status notify error:', err.message);
        }
    }
}

module.exports = TelegramService;
