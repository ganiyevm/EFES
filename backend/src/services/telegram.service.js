const https = require('https');
const { escapeHtml: h } = require('../utils/html');

const PAYMENT_LABELS = {
    uz: { click: 'Click 💳', payme: 'Payme 💳', cash: 'Naqd 💵' },
    ru: { click: 'Click 💳', payme: 'Payme 💳', cash: 'Наличные 💵' },
    en: { click: 'Click 💳', payme: 'Payme 💳', cash: 'Cash 💵' },
};

const STATUS_MESSAGES = {
    uz: {
        awaiting_payment: { icon: '⏳', title: "To'lov kutilmoqda", body: "Iltimos, to'lovni amalga oshiring. To'lov tasdiqlanganidan so'ng buyurtmangiz qabul qilinadi." },
        pending_operator: { icon: '🔄', title: 'Buyurtma qabul qilindi', body: 'Operator tez orada buyurtmangizni tasdiqlaydi.' },
        confirmed: { icon: '✅', title: 'Buyurtmangiz tasdiqlandi', body: 'Operator buyurtmangizni tasdiqladi. Tez orada tayyorlashni boshlaymiz.' },
        preparing: { icon: '🍳', title: 'Taomingiz tayyorlanmoqda', body: 'Oshpazlar buyurtmangiz ustida ishlamoqda.' },
        ready: { icon: '📦', title: 'Buyurtmangiz tayyor', body: "Olib ketish uchun tayyor yoki kurier yo'lga chiqmoqda." },
        on_the_way: { icon: '🚗', title: "Kurier yo'lda", body: 'Buyurtmangiz manzilingizga yetkazilmoqda.' },
        delivered: { icon: '🎉', title: 'Buyurtma yetkazildi', body: 'Yoqimli ishtaha! Bizni tanlaganingiz uchun rahmat.' },
        rejected: { icon: '❌', title: 'Buyurtma rad etildi', body: "Afsus, buyurtmangiz rad etildi. Batafsil ma'lumot uchun operator bilan bog'laning." },
        cancelled: { icon: '🚫', title: 'Buyurtma bekor qilindi', body: 'Buyurtmangiz bekor qilindi.' },
    },
    ru: {
        awaiting_payment: { icon: '⏳', title: 'Ожидает оплаты', body: 'Пожалуйста, оплатите заказ. После подтверждения оплаты заказ будет принят.' },
        pending_operator: { icon: '🔄', title: 'Заказ принят', body: 'Оператор скоро подтвердит ваш заказ.' },
        confirmed: { icon: '✅', title: 'Заказ подтверждён', body: 'Оператор подтвердил заказ. Скоро начнём готовить.' },
        preparing: { icon: '🍳', title: 'Заказ готовится', body: 'Повара уже работают над вашим заказом.' },
        ready: { icon: '📦', title: 'Заказ готов', body: 'Готов к выдаче или курьер выезжает.' },
        on_the_way: { icon: '🚗', title: 'Курьер в пути', body: 'Заказ едет к вам.' },
        delivered: { icon: '🎉', title: 'Заказ доставлен', body: 'Приятного аппетита! Спасибо, что выбрали нас.' },
        rejected: { icon: '❌', title: 'Заказ отклонён', body: 'К сожалению, заказ отклонён. Свяжитесь с оператором для подробностей.' },
        cancelled: { icon: '🚫', title: 'Заказ отменён', body: 'Ваш заказ отменён.' },
    },
    en: {
        awaiting_payment: { icon: '⏳', title: 'Awaiting payment', body: 'Please complete the payment. Your order will be accepted once payment is confirmed.' },
        pending_operator: { icon: '🔄', title: 'Order received', body: 'An operator will confirm your order shortly.' },
        confirmed: { icon: '✅', title: 'Order confirmed', body: 'Your order is confirmed. We will start cooking soon.' },
        preparing: { icon: '🍳', title: 'Your food is being prepared', body: 'Our chefs are working on your order.' },
        ready: { icon: '📦', title: 'Order ready', body: 'Ready for pickup or the courier is heading out.' },
        on_the_way: { icon: '🚗', title: 'Courier on the way', body: 'Your order is on its way to you.' },
        delivered: { icon: '🎉', title: 'Order delivered', body: 'Enjoy your meal! Thank you for choosing us.' },
        rejected: { icon: '❌', title: 'Order rejected', body: 'Sorry, your order was rejected. Please contact the operator for details.' },
        cancelled: { icon: '🚫', title: 'Order cancelled', body: 'Your order has been cancelled.' },
    },
};

const CUSTOMER_TEXTS = {
    uz: {
        created: '🎉 <b>Buyurtmangiz qabul qilindi!</b>', order: 'Buyurtma', items: 'Taomlar', total: 'Jami',
        payment: "To'lov", delivery: 'Yetkazib berish', pickup: 'Olib ketish', status: 'Status',
        eta: 'Taxminiy vaqt', minutes: 'daqiqa', track: 'Holatni ilovadagi "Buyurtmalarim" bo\'limida kuzatishingiz mumkin.',
        courier: 'Kurier', refund: "To'langan summa qaytariladi — operator siz bilan bog'lanadi.", sum: "so'm",
        time: 'Yetkazish vaqti',
    },
    ru: {
        created: '🎉 <b>Ваш заказ принят!</b>', order: 'Заказ', items: 'Блюда', total: 'Итого',
        payment: 'Оплата', delivery: 'Доставка', pickup: 'Самовывоз', status: 'Статус',
        eta: 'Примерное время', minutes: 'мин', track: 'Следите за статусом в разделе «Мои заказы».',
        courier: 'Курьер', refund: 'Оплаченная сумма будет возвращена — оператор свяжется с вами.', sum: 'сум',
        time: 'Время доставки',
    },
    en: {
        created: '🎉 <b>Your order has been received!</b>', order: 'Order', items: 'Items', total: 'Total',
        payment: 'Payment', delivery: 'Delivery', pickup: 'Pickup', status: 'Status',
        eta: 'Estimated time', minutes: 'min', track: 'Track the status in "My orders" in the app.',
        courier: 'Courier', refund: 'The paid amount will be refunded — an operator will contact you.', sum: 'sum',
        time: 'Delivery time',
    },
};

const money = (n) => Number(n || 0).toLocaleString('ru-RU');

function scheduleLabel(order) {
    if (!order.deliveryDate && !order.deliveryTime) return '';
    return [order.deliveryDate, order.deliveryTime].filter(Boolean).join(' ');
}

async function customerLang(order) {
    try {
        const User = require('../models/User');
        const u = await User.findOne({ telegramId: order.telegramId }).select('language').lean();
        return CUSTOMER_TEXTS[u?.language] ? u.language : 'uz';
    } catch {
        return 'uz';
    }
}

class TelegramService {
    static async _call(method, payload) {
        if (!process.env.BOT_TOKEN) return { ok: false, error: 'BOT_TOKEN yo\'q' };
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
                    try {
                        const parsed = JSON.parse(body);
                        if (!parsed.ok && parsed.error_code !== 403) {
                            console.error(`Telegram ${method}:`, parsed.description);
                        }
                        resolve(parsed);
                    } catch { resolve({ ok: false, error: 'Invalid JSON' }); }
                });
            });
            req.on('error', (err) => {
                console.error(`Telegram ${method}:`, err.message);
                resolve({ ok: false, error: err.message });
            });
            req.setTimeout(10000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
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

    // Operator xabaridagi buyurtma tafsilotlari (operator boti ham shu matnni qayta ishlatadi)
    static formatOperatorDetail(order) {
        const L = PAYMENT_LABELS.uz;
        const items = order.items
            .map(i => `  • ${h(i.productName)} x${i.qty} — ${money(i.price * i.qty)} so'm${i.note ? ` <i>(${h(i.note)})</i>` : ''}`)
            .join('\n');
        const deliveryLine = order.deliveryType === 'delivery'
            ? `🚗 Yetkazib berish: ${h(order.address || '—')}`
            : '🏃 Olib ketish (filialdan)';
        const schedule = scheduleLabel(order);
        const discounts = [
            order.deliveryCost > 0 ? `🚚 Yetkazish: ${money(order.deliveryCost)} so'm` : '',
            order.promoDiscount > 0 ? `🎟 Promo: −${money(order.promoDiscount)} so'm` : '',
            order.bonusDiscount > 0 ? `🎁 Bonus: −${money(order.bonusDiscount)} so'm` : '',
        ].filter(Boolean).join('\n');

        return `📋 <b>${h(order.orderNumber)}</b>\n` +
            `👤 ${h(order.customerName || '—')}\n` +
            `📞 ${h(order.phone || '—')}` + (order.extraPhone ? ` · ${h(order.extraPhone)}` : '') + '\n\n' +
            `🍽 <b>Taomlar:</b>\n${items}\n\n` +
            (discounts ? `${discounts}\n` : '') +
            `💰 Jami: <b>${money(order.total)} so'm</b>\n` +
            `💳 To'lov: ${L[order.paymentMethod] || h(order.paymentMethod)}` +
            (order.paymentStatus === 'paid' ? ' ✅ to\'langan' : '') + '\n' +
            `${deliveryLine}` +
            (schedule ? `\n🕐 Vaqt: <b>${h(schedule)}</b>` : '\n🕐 Vaqt: imkon qadar tez') +
            (order.notes ? `\n📝 Izoh: ${h(order.notes)}` : '');
    }

    static async notifyOperator(order) {
        const Branch = require('../models/Branch');
        const Operator = require('../models/Operator');
        const branch = await Branch.findById(order.branch);
        if (!branch?.operatorChatId) {
            console.warn(`[OPERATOR] ${order.orderNumber}: filialga operator ulanmagan — xabar yuborilmadi`);
            return;
        }

        // Bloklangan yoki nofaol operatorlarga yubormaslik — bitta so'rov bilan.
        const ops = await Operator.find({ branch: order.branch }).select('telegramId isBlocked isActive').lean();
        const managed = ops.find(o => o.telegramId === branch.operatorChatId);
        if (managed && (managed.isBlocked || managed.isActive === false)) return;

        const hasGeo = order.deliveryType === 'delivery'
            && typeof order.addressLat === 'number'
            && typeof order.addressLng === 'number';

        const deliveryLine = order.deliveryType === 'delivery'
            ? `🚗 Yetkazib berish: ${h(order.address || '—')}`
            : '🏃 Olib ketish';

        // ── 1. Signal: diqqatni tortadigan qisqa xabar ──────────────────
        const signalText =
            `🔔🔔🔔 <b>YANGI BUYURTMA!</b> 🔔🔔🔔\n\n` +
            `📋 <b>${h(order.orderNumber)}</b>\n` +
            `💰 <b>${money(order.total)} so'm</b> · ` +
            `${PAYMENT_LABELS.uz[order.paymentMethod] || h(order.paymentMethod)}\n` +
            `${deliveryLine}\n\n` +
            `⬇️ Quyida batafsil ma'lumot ⬇️`;

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
            await this.sendMessage(branch.operatorChatId, signalText);
            await this.sendMessage(branch.operatorChatId, this.formatOperatorDetail(order), {
                reply_markup: { inline_keyboard: buttons },
            });
            if (hasGeo) {
                await this.sendLocation(branch.operatorChatId, order.addressLat, order.addressLng);
            }
        } catch (err) {
            console.error('Operator notify error:', err.message);
        }
    }

    // Mijoz buyurtmani o'zi bekor qilganda operatorni ogohlantirish
    static async notifyOperatorCancelled(order) {
        const Branch = require('../models/Branch');
        const branch = await Branch.findById(order.branch).select('operatorChatId').lean();
        if (!branch?.operatorChatId) return;
        await this.sendMessage(branch.operatorChatId,
            `🚫 <b>${h(order.orderNumber)}</b> — mijoz buyurtmani bekor qildi.\n` +
            `👤 ${h(order.customerName || '—')} · 📞 ${h(order.phone || '—')}\n\n` +
            `Tayyorlashni boshlamang.`);
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
        const lang = await customerLang(order);
        const T = CUSTOMER_TEXTS[lang];

        const items = order.items
            .map(i => `  • ${h(i.productName)} x${i.qty} — ${money(i.price * i.qty)} ${T.sum}`)
            .join('\n');

        const payLabel = PAYMENT_LABELS[lang][order.paymentMethod] || order.paymentMethod;
        const deliveryLine = order.deliveryType === 'delivery'
            ? `🚗 ${T.delivery}${order.address ? `: ${h(order.address)}` : ''}`
            : `🏃 ${T.pickup}`;
        const schedule = scheduleLabel(order);

        const statusInfo = STATUS_MESSAGES[lang][order.status] || STATUS_MESSAGES[lang].pending_operator;

        const text = `${T.created}\n\n` +
            `📋 <b>${h(order.orderNumber)}</b>\n\n` +
            `🍽 <b>${T.items}:</b>\n${items}\n\n` +
            `💰 ${T.total}: <b>${money(order.total)} ${T.sum}</b>\n` +
            `💳 ${T.payment}: ${payLabel}\n` +
            `${deliveryLine}\n` +
            (schedule ? `🕐 ${T.time}: ${h(schedule)}\n` : '') + '\n' +
            `${statusInfo.icon} <b>${T.status}:</b> ${statusInfo.title}\n` +
            `${statusInfo.body}\n\n` +
            (schedule ? '' : `⏱ ${T.eta}: ~${order.estimatedTime || 30} ${T.minutes}\n\n`) +
            T.track;

        try {
            await this.sendMessage(order.telegramId, text);
        } catch (err) {
            console.error('Customer order-created notify error:', err.message);
        }
    }

    // Buyurtma statusi o'zgarganda mijozga xabar
    static async notifyCustomerStatus(order, extra = {}) {
        if (!order.telegramId) return;
        const lang = await customerLang(order);
        const T = CUSTOMER_TEXTS[lang];
        const info = STATUS_MESSAGES[lang][order.status];
        if (!info) return;

        let text = `${info.icon} <b>${info.title}</b>\n\n` +
            `📋 ${T.order}: <b>${h(order.orderNumber)}</b>\n\n` +
            `${info.body}`;

        if (['cancelled', 'rejected'].includes(order.status) && order.paymentStatus === 'paid' && order.paymentMethod !== 'cash') {
            text += `\n\n💳 ${T.refund}`;
        }
        if (extra.note) text += `\n\n📝 ${h(extra.note)}`;
        if (extra.courier) {
            text += `\n\n🚗 <b>${T.courier}:</b> ${h(extra.courier.name)}` +
                (extra.courier.phone ? `\n📞 ${h(extra.courier.phone)}` : '') +
                (extra.courier.carPlate ? `\n🚙 ${h(extra.courier.carPlate)}` : '');
        }

        try {
            await this.sendMessage(order.telegramId, text);
        } catch (err) {
            console.error('Customer status notify error:', err.message);
        }
    }
}

module.exports = TelegramService;
