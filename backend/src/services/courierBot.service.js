const axios = require('axios');
const Courier = require('../models/Courier');
const Order = require('../models/Order');
const OrderStatusService = require('./orderStatus.service');
const TelegramService = require('./telegram.service');

// ─── Ikki-bot arxitektura ────────────────────────────────────────────────
// BROADCAST bot (all_bot): buyurtma barcha smena'dagi kurierlarga yuboriladi.
//   - "✅ Qabul qilish" tugmasi shu yerda.
//   - Kim Qabul qilsa — hamma kurierlarda shu botdagi xabar o'chadi.
// MISSION bot (dastafka bot): qabul qilgan kurierning shaxsiy ish joyi.
//   - "🚗 Yo'lga chiqdim" va "✅ Yetkazildi" tugmalari shu yerda.
// ─────────────────────────────────────────────────────────────────────────

const BROADCAST_TOKEN = process.env.COURIER_BOT_TOKEN;
const BROADCAST_USERNAME = process.env.COURIER_BOT_USERNAME || 'efes_kebab_dastafka_all_bot';
const MISSION_TOKEN = process.env.COURIER_MISSION_BOT_TOKEN;
const MISSION_USERNAME = process.env.COURIER_MISSION_BOT_USERNAME || 'efes_kebab_dastafka_bot';
const BASE_URL = process.env.BASE_URL || '';
const WEBHOOK_SECRET = process.env.COURIER_WEBHOOK_SECRET || 'efes_courier_webhook_secret';

// Qabul qilinmagan buyurtma uchun operator ogohlantirish vaqti (ms)
const UNACCEPTED_TIMEOUT_MS = 5 * 60 * 1000;

const BROADCAST_PATH = '/courier-webhook';
const MISSION_PATH = '/courier-mission-webhook';

const broadcastApi = BROADCAST_TOKEN
    ? axios.create({ baseURL: `https://api.telegram.org/bot${BROADCAST_TOKEN}` })
    : null;
const missionApi = MISSION_TOKEN
    ? axios.create({ baseURL: `https://api.telegram.org/bot${MISSION_TOKEN}` })
    : null;

const PAYMENT_LABELS = { click: 'Click 💳', payme: 'Payme 💳', cash: 'Naqd 💵' };

// ─── Past-darajali Telegram API yordamchilari ──────────────────────────
async function tgCall(api, method, payload) {
    if (!api) return null;
    try {
        const { data } = await api.post(method, payload);
        return data?.result || null;
    } catch (e) {
        const err = e.response?.data || { description: e.message };
        if (err.error_code !== 403) {
            console.error(`Telegram ${method}:`, err);
        }
        return null;
    }
}

function sendMessage(api, chatId, text, replyMarkup) {
    return tgCall(api, '/sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
}

function sendLocation(api, chatId, lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') return Promise.resolve(null);
    return tgCall(api, '/sendLocation', { chat_id: chatId, latitude: lat, longitude: lng });
}

function deleteMessage(api, chatId, messageId) {
    if (!messageId) return Promise.resolve(null);
    return tgCall(api, '/deleteMessage', { chat_id: chatId, message_id: messageId });
}

function editMessageText(api, chatId, messageId, text, replyMarkup) {
    return tgCall(api, '/editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
}

function answerCallbackQuery(api, id, text = '', showAlert = false) {
    return tgCall(api, '/answerCallbackQuery', {
        callback_query_id: id,
        text,
        show_alert: showAlert,
    });
}

// ─── Formatlash ───────────────────────────────────────────────────────
function hasGeo(order) {
    return order.deliveryType === 'delivery'
        && typeof order.addressLat === 'number'
        && typeof order.addressLng === 'number';
}

function yandexMapsButton(order) {
    if (!hasGeo(order)) return null;
    return {
        text: "🗺 Yandex Xaritada ko'rish",
        url: `https://yandex.com/maps/?pt=${order.addressLng},${order.addressLat}&z=17&l=map`,
    };
}

function formatBroadcast(order) {
    const items = order.items
        .map(i => `  • ${i.productName} x${i.qty}${i.note ? ` (${i.note})` : ''}`)
        .join('\n');
    const addrLine = order.deliveryType === 'delivery'
        ? `🚗 <b>Manzil:</b> ${order.address || '—'}`
        : '🏃 <b>Olib ketish</b>';
    const payLabel = PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod;

    return `📦 <b>Yangi buyurtma!</b>\n\n` +
        `📋 <b>${order.orderNumber}</b>\n` +
        `👤 ${order.customerName}\n` +
        `📞 ${order.phone}\n\n` +
        `🍽 <b>Taomlar:</b>\n${items}\n\n` +
        `💰 Jami: <b>${order.total.toLocaleString()} so'm</b>\n` +
        `💳 To'lov: ${payLabel}\n` +
        `${addrLine}` +
        (order.notes ? `\n📝 Izoh: ${order.notes}` : '');
}

function formatMission(order, statusLabel) {
    const addrLine = order.deliveryType === 'delivery'
        ? `🚗 <b>Manzil:</b> ${order.address || '—'}`
        : '🏃 <b>Olib ketish</b>';
    const payLabel = PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod;
    return `✅ <b>Buyurtma sizda</b>\n\n` +
        `📋 <b>${order.orderNumber}</b>\n` +
        `👤 ${order.customerName}\n` +
        `📞 ${order.phone}\n` +
        `${addrLine}\n` +
        `💰 <b>${order.total.toLocaleString()} so'm</b> · ${payLabel}\n\n` +
        `📍 <b>Holat:</b> ${statusLabel}`;
}

function missionKeyboard(order) {
    const rows = [];
    if (order.status === 'on_the_way') {
        rows.push([{ text: '✅ Yetkazildi', callback_data: `delivered_${order._id}` }]);
    } else {
        rows.push([{ text: "🚗 Yo'lga chiqdim", callback_data: `ontheway_${order._id}` }]);
        rows.push([{ text: '✅ Yetkazildi', callback_data: `delivered_${order._id}` }]);
    }
    const mapBtn = yandexMapsButton(order);
    if (mapBtn) rows.push([mapBtn]);
    return { inline_keyboard: rows };
}

// ─── Smena matni ──────────────────────────────────────────────────────────
function formatShiftStatus(courier) {
    if (courier.onShift) {
        const since = courier.shiftStartedAt
            ? `(${Math.floor((Date.now() - courier.shiftStartedAt) / 60000)} daq.)`
            : '';
        return `✅ Smena davom etmoqda ${since}\n\n` +
            `Tugatish uchun: /smena_yakunlash`;
    }
    return `⏸ Smena to'xtatilgan.\n\nBoshlash uchun: /smena_boshlash`;
}

// ─── Asosiy servis ─────────────────────────────────────────────────────────
class CourierBotService {
    static isEnabled() { return !!broadcastApi; }
    static get webhookSecret() { return WEBHOOK_SECRET; }

    static async registerWebhooks() {
        if (!BASE_URL) {
            console.warn('⚠️  Kurier bot: BASE_URL yo\'q, webhook o\'tkazib yuborildi');
            return;
        }
        if (broadcastApi) {
            const r = await tgCall(broadcastApi, '/setWebhook', {
                url: `${BASE_URL}${BROADCAST_PATH}`,
                secret_token: WEBHOOK_SECRET,
                allowed_updates: ['message', 'callback_query'],
            });
            console.log('✅ Broadcast bot webhook:', r !== null ? `${BASE_URL}${BROADCAST_PATH}` : 'XATO');
        }
        if (missionApi) {
            const r = await tgCall(missionApi, '/setWebhook', {
                url: `${BASE_URL}${MISSION_PATH}`,
                secret_token: WEBHOOK_SECRET,
                allowed_updates: ['message', 'callback_query'],
            });
            console.log('✅ Mission bot webhook:', r !== null ? `${BASE_URL}${MISSION_PATH}` : 'XATO');
        }
    }

    // ─── Yangi buyurtma broadcast (faqat smena'dagi kurierlarga) ────────
    static async broadcastNewOrder(order) {
        if (!broadcastApi) return;

        const couriers = await Courier.find({
            isActive: true,
            onShift: true,
            telegramId: { $ne: null },
        });

        if (couriers.length === 0) {
            // Smena'da hech kim yo'q — operatorga xabar
            await this._notifyNoActiveCouriers(order);
            return;
        }

        const text = formatBroadcast(order);
        const rows = [[{ text: '✅ Qabul qilish', callback_data: `accept_${order._id}` }]];
        const mapBtn = yandexMapsButton(order);
        if (mapBtn) rows.push([mapBtn]);
        const replyMarkup = { inline_keyboard: rows };

        const broadcasts = [];
        for (const c of couriers) {
            const sent = await sendMessage(broadcastApi, c.telegramId, text, replyMarkup);
            if (sent?.message_id) {
                const entry = { courierId: c._id, chatId: c.telegramId, messageId: sent.message_id };
                if (hasGeo(order)) {
                    const loc = await sendLocation(broadcastApi, c.telegramId, order.addressLat, order.addressLng);
                    if (loc?.message_id) entry.locationMessageId = loc.message_id;
                }
                broadcasts.push(entry);
            }
        }

        if (broadcasts.length > 0) {
            await Order.updateOne({ _id: order._id }, { $set: { courierBroadcasts: broadcasts } });
        }

        // 5 daqiqa o'tsa va hech kim qabul qilmasa — operator ogohlantirish
        setTimeout(() => this._checkUnacceptedOrder(order._id), UNACCEPTED_TIMEOUT_MS);
    }

    // ─── Qabul qilinmagan buyurtmani tekshirish ───────────────────────
    static async _checkUnacceptedOrder(orderId) {
        try {
            const order = await Order.findById(orderId).populate('branch', 'operatorChatId');
            if (!order) return;
            if (order.courierId) return; // allaqachon qabul qilingan
            if (!['confirmed', 'preparing', 'ready'].includes(order.status)) return;

            const text = `⚠️ <b>Buyurtma ${UNACCEPTED_TIMEOUT_MS / 60000} daqiqa davomida qabul qilinmadi!</b>\n\n` +
                `📋 <b>${order.orderNumber}</b>\n` +
                `👤 ${order.customerName} | 📞 ${order.phone}\n` +
                `💰 ${order.total.toLocaleString()} so'm\n\n` +
                `Hech bir kurier smena'da yo'q yoki buyurtmani qabul qilmayapti.\n` +
                `Admin paneldan qo'lda kurier tayinlang.`;

            if (order.branch?.operatorChatId) {
                await TelegramService.sendMessage(order.branch.operatorChatId, text);
            }
        } catch (e) {
            console.error('_checkUnacceptedOrder:', e.message);
        }
    }

    // ─── Smena'da hech kim yo'q — operator ogohlantirish ─────────────
    static async _notifyNoActiveCouriers(order) {
        try {
            const branch = order.branch
                ? await require('../models/Branch').findById(order.branch).select('operatorChatId')
                : null;
            if (!branch?.operatorChatId) return;

            const text = `⚠️ <b>Smena'da faol kurier yo'q!</b>\n\n` +
                `📋 <b>${order.orderNumber}</b> — ${order.customerName}\n` +
                `💰 ${order.total.toLocaleString()} so'm\n\n` +
                `Kurierlarni smena'ga undang yoki qo'lda tayinlang.`;

            await TelegramService.sendMessage(branch.operatorChatId, text);
        } catch (e) {
            console.error('_notifyNoActiveCouriers:', e.message);
        }
    }

    static async clearBroadcasts(orderId) {
        if (!broadcastApi) return;
        const order = await Order.findById(orderId).select('courierBroadcasts');
        if (!order?.courierBroadcasts?.length) return;
        for (const b of order.courierBroadcasts) {
            await deleteMessage(broadcastApi, b.chatId, b.messageId);
            if (b.locationMessageId) await deleteMessage(broadcastApi, b.chatId, b.locationMessageId);
        }
        await Order.updateOne({ _id: orderId }, { $unset: { courierBroadcasts: '' } });
    }

    // ─── Qabul qilish (broadcast botdan) ─────────────────────────────
    static async handleAccept(callback) {
        const orderId = callback.data.replace('accept_', '');
        const tgId = callback.from.id;

        const courier = await Courier.findOne({ telegramId: tgId, isActive: true });
        if (!courier) {
            await answerCallbackQuery(broadcastApi, callback.id, "Siz ro'yxatda yo'qsiz yoki hisobingiz nofaol.", true);
            return;
        }
        if (!courier.onShift) {
            await answerCallbackQuery(broadcastApi, callback.id, "Smena'da emassiz. /smena_boshlash yozing.", true);
            return;
        }

        const order = await Order.findOneAndUpdate(
            { _id: orderId, courierId: null, status: { $in: ['confirmed', 'preparing', 'ready'] } },
            { $set: { courierId: courier._id } },
            { new: true },
        );

        if (!order) {
            await answerCallbackQuery(broadcastApi, callback.id, 'Bu buyurtma allaqachon qabul qilingan yoki mavjud emas.', true);
            if (callback.message) {
                await deleteMessage(broadcastApi, callback.message.chat.id, callback.message.message_id);
            }
            return;
        }

        order.statusHistory.push({
            status: order.status,
            changedBy: 'courier',
            note: `Kurier qabul qildi: ${courier.name} (${courier.phone})`,
        });
        await order.save();

        await answerCallbackQuery(broadcastApi, callback.id, '✅ Buyurtma sizga biriktirildi');

        // Barcha broadcast xabarlarini o'chirish
        const broadcasts = order.courierBroadcasts || [];
        for (const b of broadcasts) {
            await deleteMessage(broadcastApi, b.chatId, b.messageId);
            if (b.locationMessageId) await deleteMessage(broadcastApi, b.chatId, b.locationMessageId);
        }
        await Order.updateOne({ _id: order._id }, { $unset: { courierBroadcasts: '' } });

        // Mission botda shaxsiy vazifa xabari
        const missionSent = await sendMessage(
            missionApi,
            tgId,
            formatMission(order, 'Tayyorlanmoqda'),
            missionKeyboard(order),
        );
        if (missionSent && hasGeo(order)) {
            await sendLocation(missionApi, tgId, order.addressLat, order.addressLng);
        }

        if (!missionSent) {
            await sendMessage(
                broadcastApi,
                tgId,
                `⚠️ Yetkazib berishni boshqarish uchun <a href="https://t.me/${MISSION_USERNAME}">@${MISSION_USERNAME}</a> ni oching va /start bosing.`,
            );
        }
    }

    // ─── Yo'lga chiqdim (mission botdan) ─────────────────────────────
    static async handleOnTheWay(callback) {
        const orderId = callback.data.replace('ontheway_', '');
        const tgId = callback.from.id;
        const chatId = callback.message?.chat?.id;
        const messageId = callback.message?.message_id;

        const courier = await Courier.findOne({ telegramId: tgId, isActive: true });
        if (!courier) {
            await answerCallbackQuery(missionApi, callback.id, 'Sizning hisobingiz nofaol.', true);
            return;
        }

        const order = await Order.findOne({ _id: orderId, courierId: courier._id });
        if (!order) {
            await answerCallbackQuery(missionApi, callback.id, 'Bu buyurtma sizga tegishli emas.', true);
            return;
        }
        if (!['confirmed', 'preparing', 'ready'].includes(order.status)) {
            await answerCallbackQuery(missionApi, callback.id, 'Bu amal endi mumkin emas.', true);
            return;
        }

        await OrderStatusService.applyTransition(order, 'on_the_way', {
            changedBy: 'courier',
            note: `Kurier yo'lga chiqdi: ${courier.name}`,
        });

        await answerCallbackQuery(missionApi, callback.id, "🚗 Yo'lga chiqdingiz");
        if (chatId && messageId) {
            await editMessageText(missionApi, chatId, messageId, formatMission(order, "Yo'lda"), missionKeyboard(order));
        }

        TelegramService.notifyCustomerStatus(order, {
            courier: { name: courier.name, phone: courier.phone, carPlate: courier.carPlate },
        }).catch(() => {});
    }

    // ─── Yetkazildi (mission botdan) ─────────────────────────────────
    static async handleDelivered(callback) {
        const orderId = callback.data.replace('delivered_', '');
        const tgId = callback.from.id;
        const chatId = callback.message?.chat?.id;
        const messageId = callback.message?.message_id;

        const courier = await Courier.findOne({ telegramId: tgId, isActive: true });
        if (!courier) {
            await answerCallbackQuery(missionApi, callback.id, 'Sizning hisobingiz nofaol.', true);
            return;
        }

        const order = await Order.findOne({ _id: orderId, courierId: courier._id });
        if (!order) {
            await answerCallbackQuery(missionApi, callback.id, 'Bu buyurtma sizga tegishli emas.', true);
            return;
        }
        if (order.status === 'delivered') {
            await answerCallbackQuery(missionApi, callback.id, 'Allaqachon yetkazilgan.', true);
            return;
        }
        if (!['confirmed', 'preparing', 'ready', 'on_the_way'].includes(order.status)) {
            await answerCallbackQuery(missionApi, callback.id, 'Bu amal endi mumkin emas.', true);
            return;
        }

        await OrderStatusService.applyTransition(order, 'delivered', {
            changedBy: 'courier',
            note: `Kurier yetkazib berdi: ${courier.name}`,
        });

        await answerCallbackQuery(missionApi, callback.id, '🎉 Yetkazib berildi!');

        const bonusLine = courier.bonusEnabled && courier.bonusPerDelivery > 0
            ? `\n\n🎁 +${courier.bonusPerDelivery.toLocaleString()} so'm bonus hisoblandi`
            : '';
        const finalText = `🎉 <b>Yetkazib berildi</b>\n\n` +
            `📋 <b>${order.orderNumber}</b>\n` +
            `👤 ${order.customerName}\n` +
            `💰 ${order.total.toLocaleString()} so'm` +
            bonusLine;

        if (chatId && messageId) {
            await editMessageText(missionApi, chatId, messageId, finalText);
        }

        TelegramService.notifyCustomerStatus(order).catch(() => {});
    }

    // ─── Smena boshlash ───────────────────────────────────────────────
    static async handleShiftStart(msg) {
        const chatId = msg.chat.id;
        const tgId = msg.from.id;

        const courier = await Courier.findOne({ telegramId: tgId, isActive: true });
        if (!courier) {
            await sendMessage(broadcastApi, chatId, "❌ Siz ro'yxatda yo'qsiz. Admindan taklif linkini so'rang.");
            return;
        }
        if (courier.onShift) {
            await sendMessage(broadcastApi, chatId, `✅ Smena allaqachon boshlangan.\n\nTugatish: /smena_yakunlash`);
            return;
        }

        await Courier.updateOne({ _id: courier._id }, { onShift: true, shiftStartedAt: new Date() });
        await sendMessage(broadcastApi, chatId,
            `✅ <b>Smena boshlandi!</b>\n\nEndi yangi buyurtmalar sizga keladi.\n\nTugatish uchun: /smena_yakunlash`
        );
    }

    // ─── Smena yakunlash ──────────────────────────────────────────────
    static async handleShiftEnd(msg) {
        const chatId = msg.chat.id;
        const tgId = msg.from.id;

        const courier = await Courier.findOne({ telegramId: tgId, isActive: true });
        if (!courier) {
            await sendMessage(broadcastApi, chatId, "❌ Siz ro'yxatda yo'qsiz.");
            return;
        }
        if (!courier.onShift) {
            await sendMessage(broadcastApi, chatId, `⏸ Smena allaqachon to'xtatilgan.\n\nBoshlash: /smena_boshlash`);
            return;
        }

        // Aktiv buyurtmani tekshirish
        const activeOrder = await Order.findOne({
            courierId: courier._id,
            status: { $in: ['confirmed', 'preparing', 'ready', 'on_the_way'] },
        });
        if (activeOrder) {
            await sendMessage(broadcastApi, chatId,
                `⚠️ Sizda hali tugallanmagan buyurtma bor: <b>${activeOrder.orderNumber}</b>\n\n` +
                `Avval uni yetkazib bering, keyin smenani tugatishingiz mumkin.`
            );
            return;
        }

        const started = courier.shiftStartedAt;
        const durationMin = started ? Math.floor((Date.now() - started) / 60000) : 0;
        await Courier.updateOne({ _id: courier._id }, { onShift: false, shiftStartedAt: null });

        const todayDeliveries = await Order.countDocuments({
            courierId: courier._id,
            status: 'delivered',
            deliveredAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        });

        await sendMessage(broadcastApi, chatId,
            `⏸ <b>Smena yakunlandi.</b>\n\n` +
            `⏱ Davomiyligi: ${durationMin} daqiqa\n` +
            `📦 Bugun yetkazildi: ${todayDeliveries} ta buyurtma\n` +
            `💰 Bonus: ${(todayDeliveries * courier.bonusPerDelivery).toLocaleString()} so'm\n\n` +
            `Qaytib kelishingizni kutamiz! 👋`
        );
    }

    // ─── /smena — holat ko'rish ───────────────────────────────────────
    static async handleShiftStatus(msg) {
        const chatId = msg.chat.id;
        const courier = await Courier.findOne({ telegramId: msg.from.id, isActive: true });
        if (!courier) {
            await sendMessage(broadcastApi, chatId, "❌ Siz ro'yxatda yo'qsiz.");
            return;
        }
        await sendMessage(broadcastApi, chatId, formatShiftStatus(courier));
    }

    // ─── /start — broadcast botda ─────────────────────────────────────
    static async handleBroadcastStart(msg) {
        const chatId = msg.chat.id;
        const from = msg.from;
        const payload = (msg.text.split(' ')[1] || '').trim();

        if (payload.startsWith('courier_')) {
            const token = payload.replace('courier_', '');
            const courier = await Courier.findOneAndUpdate(
                { inviteToken: token },
                { telegramId: from.id },
                { new: true },
            );
            if (courier) {
                await sendMessage(broadcastApi, chatId,
                    `✅ <b>${courier.name}</b>, xush kelibsiz!\n\n` +
                    `Yangi buyurtmalar shu yerda ko'rinadi.\n\n` +
                    `Smena boshlash: /smena_boshlash\n\n` +
                    `⚠️ <b>Muhim:</b> yetkazib berishni boshqarish uchun ` +
                    `<a href="https://t.me/${MISSION_USERNAME}">@${MISSION_USERNAME}</a> ` +
                    `ni ham oching va /start bosing.`,
                );
                return;
            }
            await sendMessage(broadcastApi, chatId, '❌ Taklif linki noto\'g\'ri yoki eskirgan. Admindan yangi link oling.');
            return;
        }

        const existing = await Courier.findOne({ telegramId: from.id, isActive: true });
        if (existing) {
            await sendMessage(broadcastApi, chatId,
                `Salom, <b>${existing.name}</b>!\n\n` +
                formatShiftStatus(existing) + '\n\n' +
                `Yetkazib berishni boshqarish: <a href="https://t.me/${MISSION_USERNAME}">@${MISSION_USERNAME}</a>`,
            );
        } else {
            await sendMessage(broadcastApi, chatId,
                'Bu EFES kurierlari uchun bot.\nKirish uchun admindan taklif linkini so\'rang.',
            );
        }
    }

    // ─── /start — mission botda ───────────────────────────────────────
    static async handleMissionStart(msg) {
        const chatId = msg.chat.id;
        const from = msg.from;

        const existing = await Courier.findOne({ telegramId: from.id, isActive: true });
        if (!existing) {
            await sendMessage(missionApi, chatId,
                `❌ Siz ro'yxatda yo'qsiz.\n\n` +
                `Avval <a href="https://t.me/${BROADCAST_USERNAME}">@${BROADCAST_USERNAME}</a> ` +
                `da taklif linki orqali ro'yxatdan o'ting.`,
            );
            return;
        }

        // Aktiv buyurtmalarni ko'rsatish
        const activeOrders = await Order.find({
            courierId: existing._id,
            status: { $in: ['confirmed', 'preparing', 'ready', 'on_the_way'] },
        }).sort({ createdAt: -1 });

        if (activeOrders.length === 0) {
            await sendMessage(missionApi, chatId,
                `✅ Salom, <b>${existing.name}</b>!\n\n` +
                `Hozircha aktiv buyurtma yo'q.\n` +
                `Yangi buyurtmalar @${BROADCAST_USERNAME} botida ko'rinadi.`,
            );
            return;
        }

        await sendMessage(missionApi, chatId,
            `✅ Salom, <b>${existing.name}</b>! Sizda <b>${activeOrders.length}</b> ta aktiv buyurtma bor:`,
        );

        for (const order of activeOrders) {
            const statusLabel = {
                confirmed: 'Tasdiqlangan',
                preparing: 'Tayyorlanmoqda',
                ready: 'Tayyor',
                on_the_way: "Yo'lda",
            }[order.status] || order.status;

            await sendMessage(missionApi, chatId, formatMission(order, statusLabel), missionKeyboard(order));
            if (hasGeo(order)) {
                await sendLocation(missionApi, chatId, order.addressLat, order.addressLng);
            }
        }
    }

    // ─── Update yo'naltiruvchilari ────────────────────────────────────
    static async handleBroadcastUpdate(update) {
        try {
            const text = update.message?.text || '';

            if (text.startsWith('/start')) {
                await this.handleBroadcastStart(update.message);
                return;
            }
            if (text === '/smena_boshlash') {
                await this.handleShiftStart(update.message);
                return;
            }
            if (text === '/smena_yakunlash') {
                await this.handleShiftEnd(update.message);
                return;
            }
            if (text === '/smena') {
                await this.handleShiftStatus(update.message);
                return;
            }

            if (update.callback_query) {
                const cb = update.callback_query;
                if (cb.data?.startsWith('accept_')) {
                    await this.handleAccept(cb);
                } else {
                    await answerCallbackQuery(broadcastApi, cb.id);
                }
            }
        } catch (e) {
            console.error('Broadcast bot update xatosi:', e.message);
        }
    }

    static async handleMissionUpdate(update) {
        try {
            if (update.message?.text?.startsWith('/start')) {
                await this.handleMissionStart(update.message);
                return;
            }

            if (update.callback_query) {
                const cb = update.callback_query;
                if (cb.data?.startsWith('ontheway_')) {
                    await this.handleOnTheWay(cb);
                } else if (cb.data?.startsWith('delivered_')) {
                    await this.handleDelivered(cb);
                } else {
                    await answerCallbackQuery(missionApi, cb.id);
                }
            }
        } catch (e) {
            console.error('Mission bot update xatosi:', e.message);
        }
    }
}

module.exports = CourierBotService;
