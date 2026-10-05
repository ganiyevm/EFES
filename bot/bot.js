require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');

const TOKEN = process.env.BOT_TOKEN;
const BASE_URL = process.env.BASE_URL || 'https://efes-app-production.up.railway.app';
const WEBAPP_URL = process.env.WEBAPP_URL || BASE_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

if (!WEBHOOK_SECRET) {
    console.error('❌ WEBHOOK_SECRET o\'rnatilmagan — webhook xavfsizligini ta\'minlab bo\'lmaydi.');
    process.exit(1);
}

mongoose.connect(MONGODB_URI, {
    maxPoolSize: 2,
    minPoolSize: 0,
    socketTimeoutMS: 30000,
})
    .then(() => console.log('🤖 Bot: MongoDB ulandi'))
    .catch(e => console.error('🤖 Bot: MongoDB xato:', e.message));

const User = require('./src/models/User');
const Order = require('./src/models/Order');
const Branch = require('./src/models/Branch');
const Operator = require('./src/models/Operator');
const OrderStatusService = require('./src/services/orderStatus.service');
const CourierBotService = require('./src/services/courierBot.service');
const TelegramService = require('./src/services/telegram.service');
const { escapeHtml: h } = require('./src/utils/html');

const api = axios.create({ baseURL: `https://api.telegram.org/bot${TOKEN}` });

// ─── Webhook ro'yxatdan o'tkazish ────────────────────────────────────────
async function registerWebhook() {
    try {
        await api.post('/setWebhook', {
            url: `${BASE_URL}/bot-webhook`,
            secret_token: WEBHOOK_SECRET,
            allowed_updates: ['message', 'callback_query'],
        });
        console.log('✅ Webhook ulandi:', `${BASE_URL}/bot-webhook`);
    } catch (e) {
        console.error('❌ Webhook xatosi:', e.message);
    }

    // Doimiy "Menyuni ochish" tugmasi — har doim input yonida ko'rinib turadi
    try {
        await api.post('/setMyMenuButton', {
            menu_button: {
                type: 'web_app',
                text: '🍽 Menyuni ochish',
                web_app: { url: WEBAPP_URL },
            },
        });
        console.log('✅ Menu button o\'rnatildi');
    } catch (e) {
        console.error('❌ Menu button xatosi:', e.message);
    }
}

// ─── i18n ────────────────────────────────────────────────────────────────

const TEXTS = {
    uz: {
        welcome: (name) =>
            `Assalomu alaykum, <b>${name}</b>! 🍽\n\nEFES Delivery botga xush kelibsiz!\n\nKaboblar, burgerlar, turk taomlari — eshikgacha yetkaziladi.\n\nBuyurtma berish uchun menyuni oching:`,
        welcomeBack: (name) => `Xush ko'rdik, <b>${name}</b>! 👋`,
        menu: '🍽 Menyuni ochish',
        sharePhone: '📞 Telefon raqamni ulashish',
        askPhone: 'Iltimos, telefon raqamingizni ulashing — tezroq yetkazib beramiz:',
        phoneSaved: (phone) => `✅ Raqamingiz saqlandi: <b>${phone}</b>\n\nEndi buyurtma berishingiz mumkin!`,
        noOrders: "Siz hali buyurtma bermagansiz. Menyuni oching va birinchi buyurtmani bering! 🍽",
        myOrders: (list) => `📋 <b>So'nggi buyurtmalaringiz:</b>\n\n${list}`,
        chooseLanguage: 'Tilni tanlang / Выберите язык / Choose language:',
        langSet: 'Til o\'zgartirildi: O\'zbek 🇺🇿',
        helpText: `📱 <b>EFES Delivery Bot</b>\n\n` +
            `/start — Bosh menyu\n` +
            `/buyurtmalarim — So'nggi buyurtmalar\n` +
            `/til — Tilni o'zgartirish\n` +
            `/help — Yordam\n\n` +
            `📞 Operator: @efes_support`,
        blocked: 'Sizning hisobingiz bloklangan. Operator bilan bog\'laning.',
        orderDetail: (o) => {
            const statusLabels = {
                awaiting_payment: "⏳ To'lov kutilmoqda",
                pending_operator: '🔄 Operator kutmoqda',
                confirmed: '✅ Tasdiqlandi',
                preparing: '🍳 Tayyorlanmoqda',
                ready: '📦 Tayyor',
                on_the_way: "🚗 Yo'lda",
                delivered: '🎉 Yetkazildi',
                rejected: '❌ Rad etildi',
                cancelled: '🚫 Bekor qilindi',
            };
            const items = o.items.map(i => `  • ${h(i.productName)} x${i.qty}`).join('\n');
            return `📋 <b>${o.orderNumber}</b>\n` +
                `${statusLabels[o.status] || o.status}\n\n` +
                `🍽 ${items}\n\n` +
                `💰 Jami: <b>${o.total.toLocaleString()} so'm</b>\n` +
                `📅 ${new Date(o.createdAt).toLocaleString('uz-UZ')}`;
        },
    },
    ru: {
        welcome: (name) =>
            `Здравствуйте, <b>${name}</b>! 🍽\n\nДобро пожаловать в EFES Delivery!\n\nКебаб, бургеры, турецкая кухня — всё с доставкой до двери.\n\nОткройте меню для заказа:`,
        welcomeBack: (name) => `Рады видеть вас, <b>${name}</b>! 👋`,
        menu: '🍽 Открыть меню',
        sharePhone: '📞 Поделиться номером',
        askPhone: 'Пожалуйста, поделитесь номером телефона — доставим быстрее:',
        phoneSaved: (phone) => `✅ Номер сохранён: <b>${phone}</b>\n\nТеперь вы можете сделать заказ!`,
        noOrders: 'У вас пока нет заказов. Откройте меню и сделайте первый заказ! 🍽',
        myOrders: (list) => `📋 <b>Ваши последние заказы:</b>\n\n${list}`,
        chooseLanguage: 'Tilni tanlang / Выберите язык / Choose language:',
        langSet: 'Язык изменён: Русский 🇷🇺',
        helpText: `📱 <b>EFES Delivery Bot</b>\n\n` +
            `/start — Главное меню\n` +
            `/buyurtmalarim — Мои заказы\n` +
            `/til — Изменить язык\n` +
            `/help — Помощь\n\n` +
            `📞 Оператор: @efes_support`,
        blocked: 'Ваш аккаунт заблокирован. Свяжитесь с оператором.',
        orderDetail: (o) => {
            const statusLabels = {
                awaiting_payment: '⏳ Ожидает оплаты',
                pending_operator: '🔄 У оператора',
                confirmed: '✅ Подтверждён',
                preparing: '🍳 Готовится',
                ready: '📦 Готов',
                on_the_way: '🚗 В пути',
                delivered: '🎉 Доставлен',
                rejected: '❌ Отклонён',
                cancelled: '🚫 Отменён',
            };
            const items = o.items.map(i => `  • ${h(i.productName)} x${i.qty}`).join('\n');
            return `📋 <b>${o.orderNumber}</b>\n` +
                `${statusLabels[o.status] || o.status}\n\n` +
                `🍽 ${items}\n\n` +
                `💰 Итого: <b>${o.total.toLocaleString()} сум</b>\n` +
                `📅 ${new Date(o.createdAt).toLocaleString('ru-RU')}`;
        },
    },
    en: {
        welcome: (name) =>
            `Hello, <b>${name}</b>! 🍽\n\nWelcome to EFES Delivery!\n\nKebabs, burgers, Turkish cuisine — delivered to your door.\n\nOpen the menu to order:`,
        welcomeBack: (name) => `Welcome back, <b>${name}</b>! 👋`,
        menu: '🍽 Open Menu',
        sharePhone: '📞 Share Phone Number',
        askPhone: 'Please share your phone number for faster delivery:',
        phoneSaved: (phone) => `✅ Number saved: <b>${phone}</b>\n\nYou can now place an order!`,
        noOrders: "You haven't placed any orders yet. Open the menu and try us! 🍽",
        myOrders: (list) => `📋 <b>Your recent orders:</b>\n\n${list}`,
        chooseLanguage: 'Tilni tanlang / Выберите язык / Choose language:',
        langSet: 'Language changed: English 🇬🇧',
        helpText: `📱 <b>EFES Delivery Bot</b>\n\n` +
            `/start — Main menu\n` +
            `/buyurtmalarim — My orders\n` +
            `/til — Change language\n` +
            `/help — Help\n\n` +
            `📞 Support: @efes_support`,
        blocked: 'Your account is blocked. Please contact support.',
        orderDetail: (o) => {
            const statusLabels = {
                awaiting_payment: '⏳ Awaiting payment',
                pending_operator: '🔄 Awaiting operator',
                confirmed: '✅ Confirmed',
                preparing: '🍳 Preparing',
                ready: '📦 Ready',
                on_the_way: '🚗 On the way',
                delivered: '🎉 Delivered',
                rejected: '❌ Rejected',
                cancelled: '🚫 Cancelled',
            };
            const items = o.items.map(i => `  • ${h(i.productName)} x${i.qty}`).join('\n');
            return `📋 <b>${o.orderNumber}</b>\n` +
                `${statusLabels[o.status] || o.status}\n\n` +
                `🍽 ${items}\n\n` +
                `💰 Total: <b>${o.total.toLocaleString()} sum</b>\n` +
                `📅 ${new Date(o.createdAt).toLocaleString('en-US')}`;
        },
    },
};

function t(lang, key, ...args) {
    const l = TEXTS[lang] || TEXTS['uz'];
    const v = l[key] || TEXTS['uz'][key];
    return typeof v === 'function' ? v(...args) : v;
}

function detectLang(telegramLangCode) {
    if (telegramLangCode === 'ru') return 'ru';
    if (telegramLangCode === 'en') return 'en';
    return 'uz';
}

// ─── Telegram API yordamchilari ──────────────────────────────────────────
async function sendMessage(chatId, text, extra = {}) {
    try {
        const { data } = await api.post('/sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            ...extra,
        });
        return data?.result || null;
    } catch (e) {
        console.error('sendMessage xatosi:', e.response?.data || e.message);
        return null;
    }
}

async function editMessage(chatId, messageId, text, extra = {}) {
    try {
        await api.post('/editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: 'HTML',
            ...extra,
        });
    } catch (e) {
        // xabar o'zgartirilmagan bo'lsa — ignore
    }
}

async function answerCb(callbackQueryId, text = '', showAlert = false) {
    try {
        await api.post('/answerCallbackQuery', {
            callback_query_id: callbackQueryId,
            text,
            show_alert: showAlert,
        });
    } catch (e) { /* ignore */ }
}

// ─── Foydalanuvchini olish/yaratish ──────────────────────────────────────
async function upsertUser(from) {
    const lang = detectLang(from.language_code);
    return User.findOneAndUpdate(
        { telegramId: from.id },
        {
            $set: {
                firstName: from.first_name || '',
                lastName: from.last_name || '',
                username: from.username || '',
                lastActiveAt: new Date(),
            },
            $setOnInsert: { language: lang },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );
}

// ─── /start handler ──────────────────────────────────────────────────────
async function handleStart(msg) {
    const chatId = msg.chat.id;
    const from = msg.from;
    const payload = (msg.text?.split(' ')[1] || '').trim();

    let user;
    try {
        user = await upsertUser(from);
    } catch (e) {
        console.error('upsertUser xatosi:', e.message);
        return;
    }

    if (user.isBlocked) {
        await sendMessage(chatId, t(user.language, 'blocked'));
        return;
    }

    // Deep link: /start order_EFES-0012
    if (payload.startsWith('order_')) {
        const orderNumber = payload.replace('order_', '');
        const order = await Order.findOne({ orderNumber, user: user._id });
        if (order) {
            await sendMessage(chatId, t(user.language, 'orderDetail', order));
            return;
        }
    }

    // Deep link: /start op_BRANCHID — operator registration
    // Faqat admin oldindan Operator collection'ga qo'shgan telegramId lar ulana oladi
    if (payload.startsWith('op_')) {
        const branchId = payload.replace('op_', '');
        try {
            // Mongoose ObjectId formatini tekshirish
            if (!mongoose.Types.ObjectId.isValid(branchId)) {
                await sendMessage(chatId, '❌ Yaroqsiz havola.');
                return;
            }
            const operator = await Operator.findOne({
                telegramId: from.id,
                branch: branchId,
                isBlocked: { $ne: true },
                isActive: { $ne: false },
            });
            if (!operator) {
                await sendMessage(chatId, '❌ Sizga ruxsat berilmagan. Admin bilan bog\'laning.');
                return;
            }
            const branch = await Branch.findById(branchId);
            if (!branch) {
                await sendMessage(chatId, '❌ Filial topilmadi.');
                return;
            }
            branch.operatorChatId = from.id;
            if (!branch.operatorIds) branch.operatorIds = [];
            if (!branch.operatorIds.includes(from.id)) branch.operatorIds.push(from.id);
            await branch.save();
            await sendMessage(chatId,
                `✅ Siz <b>${h(branch.name || `Filial #${branch.number}`)}</b> filiali operatori sifatida ulandi!\n\n` +
                `Endi yangi buyurtmalar sizga yuboriladi. 🔔`
            );
        } catch (e) {
            console.error('Operator registration error:', e.message);
            await sendMessage(chatId, '❌ Xatolik yuz berdi.');
        }
        return;
    }

    const isNew = !user.phone;
    const name = h(user.firstName || from.first_name || 'Mehmon');
    const welcomeText = isNew ? t(user.language, 'welcome', name) : t(user.language, 'welcomeBack', name);

    const keyboard = {
        inline_keyboard: [[
            { text: t(user.language, 'menu'), web_app: { url: WEBAPP_URL } },
        ]],
    };

    await sendMessage(chatId, welcomeText, { reply_markup: keyboard });

    // Yangi foydalanuvchi uchun telefon so'rash
    if (isNew) {
        await sendMessage(chatId, t(user.language, 'askPhone'), {
            reply_markup: {
                keyboard: [[{ text: t(user.language, 'sharePhone'), request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        });
    }
}

// ─── Telefon raqam handler ────────────────────────────────────────────────
async function handleContact(msg) {
    const chatId = msg.chat.id;
    const contact = msg.contact;
    if (!contact) return;

    // Faqat o'z raqamini ulashgan bo'lsa qabul qilinadi
    if (contact.user_id && contact.user_id !== msg.from.id) return;

    const phone = contact.phone_number.startsWith('+') ? contact.phone_number : `+${contact.phone_number}`;

    const user = await User.findOneAndUpdate(
        { telegramId: msg.from.id },
        { phone, isProfileComplete: true },
        { new: true },
    );

    if (!user) return;

    await sendMessage(chatId, t(user.language, 'phoneSaved', phone), {
        reply_markup: { remove_keyboard: true },
    });
}

// ─── /buyurtmalarim handler ───────────────────────────────────────────────
async function handleMyOrders(msg) {
    const chatId = msg.chat.id;

    const user = await User.findOne({ telegramId: msg.from.id });
    if (!user) { await handleStart(msg); return; }
    if (user.isBlocked) { await sendMessage(chatId, t(user.language, 'blocked')); return; }

    const orders = await Order.find({ user: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('branch', 'name');

    if (orders.length === 0) {
        await sendMessage(chatId, t(user.language, 'noOrders'), {
            reply_markup: {
                inline_keyboard: [[{ text: t(user.language, 'menu'), web_app: { url: WEBAPP_URL } }]],
            },
        });
        return;
    }

    const list = orders.map(o => t(user.language, 'orderDetail', o)).join('\n\n─────────────\n\n');
    await sendMessage(chatId, t(user.language, 'myOrders', list), {
        reply_markup: {
            inline_keyboard: [[{ text: t(user.language, 'menu'), web_app: { url: WEBAPP_URL } }]],
        },
    });
}

// ─── /til handler ─────────────────────────────────────────────────────────
async function handleLang(msg) {
    const chatId = msg.chat.id;
    const user = await User.findOne({ telegramId: msg.from.id });
    if (!user) { await handleStart(msg); return; }

    await sendMessage(chatId, t(user.language, 'chooseLanguage'), {
        reply_markup: {
            inline_keyboard: [[
                { text: "🇺🇿 O'zbek", callback_data: 'lang_uz' },
                { text: '🇷🇺 Русский', callback_data: 'lang_ru' },
                { text: '🇬🇧 English', callback_data: 'lang_en' },
            ]],
        },
    });
}

// ─── /help handler ───────────────────────────────────────────────────────
async function handleHelp(msg) {
    const user = await User.findOne({ telegramId: msg.from.id });
    const lang = user?.language || detectLang(msg.from.language_code);
    await sendMessage(msg.chat.id, t(lang, 'helpText'));
}


// ─── Operator: buyurtma bosqichlari ──────────────────────────────────────
// Har bosqichdan keyin xabar yangilanadi va keyingi bosqich tugmasi chiqadi,
// shuning uchun operator buyurtmani to'liq Telegram'dan boshqara oladi.
const OP_ACTIONS = {
    confirm: { to: 'confirmed', from: ['pending_operator'], done: '✅ Tasdiqlandi' },
    reject: { to: 'rejected', from: ['pending_operator', 'confirmed'], done: '❌ Rad etildi' },
    prep: { to: 'preparing', from: ['confirmed'], done: '🍳 Tayyorlanmoqda' },
    ready: { to: 'ready', from: ['confirmed', 'preparing'], done: '📦 Tayyor' },
    done: { to: 'delivered', from: ['confirmed', 'preparing', 'ready'], done: '🎉 Mijozga berildi' },
};

function operatorKeyboard(order) {
    const id = order._id;
    const rows = [];
    if (order.status === 'confirmed') {
        rows.push([{ text: '🍳 Tayyorlanmoqda', callback_data: `prep_${id}` }, { text: '📦 Tayyor', callback_data: `ready_${id}` }]);
    } else if (order.status === 'preparing') {
        rows.push([{ text: '📦 Tayyor', callback_data: `ready_${id}` }]);
    }
    // Olib ketishda kurier yo'q — operator mijozga topshirganini o'zi belgilaydi
    if (order.deliveryType === 'pickup' && ['confirmed', 'preparing', 'ready'].includes(order.status)) {
        rows.push([{ text: '🎉 Mijozga berildi', callback_data: `done_${id}` }]);
    }
    if (order.deliveryType === 'delivery' && typeof order.addressLat === 'number' && typeof order.addressLng === 'number') {
        rows.push([{ text: "🗺 Yandex Xaritada ko'rish", url: `https://yandex.com/maps/?pt=${order.addressLng},${order.addressLat}&z=17&l=map` }]);
    }
    return { inline_keyboard: rows };
}

async function handleOperatorAction(callback, action, orderId) {
    const { id, from, message } = callback;
    const chatId = message?.chat?.id;
    const messageId = message?.message_id;
    const spec = OP_ACTIONS[action];

    const order = await Order.findById(orderId);
    if (!order) { await answerCb(id, 'Buyurtma topilmadi', true); return; }

    // Operator tekshiruvi: chat ID yoki operatorIds ro'yxatida bo'lishi kerak
    const branch = await Branch.findById(order.branch).select('operatorChatId operatorIds').lean();
    const isOperator = branch &&
        (branch.operatorChatId === from.id || (branch.operatorIds || []).includes(from.id));
    if (!isOperator) {
        await answerCb(id, 'Sizda bu amalni bajarish huquqi yo\'q.', true);
        return;
    }

    if (action === 'done' && order.deliveryType !== 'pickup') {
        await answerCb(id, 'Yetkazib berishni kurier belgilaydi.', true);
        return;
    }
    if (!spec.from.includes(order.status)) {
        const label = { delivered: 'yetkazilgan', cancelled: 'bekor qilingan', rejected: 'rad etilgan' }[order.status] || order.status;
        await answerCb(id, `Buyurtma holati: ${label}`, true);
        return;
    }

    const prevStatus = order.status;
    try {
        await OrderStatusService.applyTransition(order, spec.to, {
            changedBy: 'operator',
            note: `Operator: ${from.first_name || ''} (tg: ${from.id})`,
        });
    } catch (e) {
        await answerCb(id, e.message, true);
        return;
    }

    await answerCb(id, `${spec.done}: ${order.orderNumber}`, action === 'confirm' || action === 'reject');

    if (chatId && messageId) {
        const text = TelegramService.formatOperatorDetail(order) +
            `\n\n<b>${spec.done}</b> — ${h(from.first_name || '')}`;
        await editMessage(chatId, messageId, text, { reply_markup: operatorKeyboard(order) });
    }

    TelegramService.notifyCustomerStatus(order, action === 'reject' ? { note: 'Savollar bo\'lsa operator bilan bog\'laning.' } : {}).catch(() => {});

    if (action === 'confirm' && prevStatus !== 'confirmed') {
        CourierBotService.broadcastNewOrder(order).catch(e => console.error('Courier broadcast:', e.message));
    }
}

// ─── Callback query handler ───────────────────────────────────────────────
async function handleCallback(callback) {
    const { id, data, from, message } = callback;
    const chatId = message?.chat?.id;
    const messageId = message?.message_id;

    // ─── Til tanlash ──────────────────────────────────────────────────
    if (data.startsWith('lang_')) {
        const lang = data.replace('lang_', '');
        if (!['uz', 'ru', 'en'].includes(lang)) { await answerCb(id); return; }

        await User.updateOne({ telegramId: from.id }, { language: lang });
        await answerCb(id, TEXTS[lang]?.langSet || 'OK');

        if (chatId && messageId) {
            await editMessage(chatId, messageId, TEXTS[lang]?.langSet || 'OK');
        }
        return;
    }

    // ─── Operator amallari: tasdiqlash / rad etish / tayyorlash bosqichlari ───
    const opMatch = data.match(/^(confirm|reject|prep|ready|done)_([a-f0-9]{24})$/);
    if (opMatch) {
        await handleOperatorAction(callback, opMatch[1], opMatch[2]);
        return;
    }

    await answerCb(id);
}

// ─── Update yo'naltiruvchisi ──────────────────────────────────────────────
async function processUpdate(update) {
    try {
        if (update.message) {
            const msg = update.message;
            const text = msg.text || '';

            if (msg.contact) {
                await handleContact(msg);
                return;
            }

            if (text.startsWith('/start')) { await handleStart(msg); return; }
            if (text === '/buyurtmalarim' || text.startsWith('/buyurtmalarim@')) { await handleMyOrders(msg); return; }
            if (text === '/til' || text.startsWith('/til@')) { await handleLang(msg); return; }
            if (text === '/help' || text.startsWith('/help@')) { await handleHelp(msg); return; }
        }

        if (update.callback_query) {
            await handleCallback(update.callback_query);
        }
    } catch (e) {
        console.error('processUpdate xatosi:', e.message);
    }
}

// ─── Express webhook server ───────────────────────────────────────────────
const app = express();
app.use(express.json());

app.post('/bot-webhook', (req, res) => {
    // Ikkinchi bosqich himoya: to'g'ridan-to'g'ri 3001-portga urinishlarni ham rad etadi.
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (secret !== WEBHOOK_SECRET) {
        return res.status(403).json({ ok: false });
    }
    res.json({ ok: true });
    processUpdate(req.body).catch(e => console.error('Webhook handler:', e.message));
});

app.get('/health', (req, res) => res.json({ ok: true, service: 'EFES Bot', ts: new Date() }));

const PORT = 3001;
app.listen(PORT, async () => {
    console.log(`🤖 EFES Bot ${PORT}-portda ishga tushdi`);
    await registerWebhook();
});
