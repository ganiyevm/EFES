require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');

const TOKEN = process.env.BOT_TOKEN;
const BASE_URL = process.env.BASE_URL || 'https://efes-app-production.up.railway.app';
const WEBAPP_URL = process.env.WEBAPP_URL || BASE_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'efes_webhook_secret_prod';
const MONGODB_URI = process.env.MONGODB_URI;

// ─── MongoDB ───
mongoose.connect(MONGODB_URI).then(() => console.log('🤖 Bot: MongoDB ulandi')).catch(e => console.error('🤖 Bot: MongoDB xato:', e.message));

const User = require('./src/models/User');

const api = axios.create({ baseURL: `https://api.telegram.org/bot${TOKEN}` });

// ─── Webhook registration ───
async function registerWebhook() {
    try {
        const { data } = await api.post('/setWebhook', {
            url: `${BASE_URL}/bot-webhook`,
            secret_token: WEBHOOK_SECRET,
            allowed_updates: ['message', 'callback_query'],
        });
        console.log('✅ Webhook ulandi:', `${BASE_URL}/bot-webhook`);
    } catch (e) {
        console.error('❌ Webhook xatosi:', e.message);
    }
}

// ─── Texts ───
const texts = {
    uz: {
        welcome: (name) => `Assalomu alaykum, ${name}! 🍽\n\nEFES Delivery botga xush kelibsiz!\n\nTez-tez taomlar, kaboblar va ko'p narsalar — barchasi eshikgacha yetkaziladi.\n\nBuyurtma berish uchun menyuni oching:`,
        menu: '🍽 Menyuni ochish',
        phone: '📞 Telefon raqamni ulashing',
    },
    ru: {
        welcome: (name) => `Здравствуйте, ${name}! 🍽\n\nДобро пожаловать в EFES Delivery!\n\nБыстрая еда, шашлык и многое другое — всё с доставкой до двери.\n\nОткройте меню для заказа:`,
        menu: '🍽 Открыть меню',
        phone: '📞 Поделиться номером',
    },
};

function t(lang, key, ...args) {
    const l = texts[lang] || texts['uz'];
    const v = l[key];
    return typeof v === 'function' ? v(...args) : v;
}

// ─── Telegram API helpers ───
async function sendMessage(chatId, text, replyMarkup) {
    try {
        await api.post('/sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        });
    } catch (e) {
        console.error('sendMessage xatosi:', e.response?.data || e.message);
    }
}

// ─── /start handler ───
async function handleStart(msg) {
    const chatId = msg.chat.id;
    const from = msg.from;
    const lang = from.language_code === 'ru' ? 'ru' : 'uz';
    const name = from.first_name || 'Mehmon';

    try {
        await User.findOneAndUpdate(
            { telegramId: from.id },
            {
                telegramId: from.id,
                firstName: from.first_name || '',
                lastName: from.last_name || '',
                username: from.username || '',
                language: lang,
                lastActiveAt: new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    } catch (e) {
        console.error('User saqlash xatosi:', e.message);
    }

    await sendMessage(chatId, t(lang, 'welcome', name), {
        inline_keyboard: [[
            { text: t(lang, 'menu'), web_app: { url: WEBAPP_URL } },
        ]],
    });
}

// ─── Express webhook server ───
const app = express();
app.use(express.json());

app.post('/bot-webhook', async (req, res) => {
    res.json({ ok: true });

    try {
        const update = req.body;

        if (update.message) {
            const msg = update.message;
            if (msg.text && msg.text.startsWith('/start')) {
                await handleStart(msg);
            }
        }
    } catch (e) {
        console.error('Update xatosi:', e.message);
    }
});

app.get('/health', (req, res) => res.json({ ok: true, service: 'EFES Bot', ts: new Date() }));

const PORT = 3001;
app.listen(PORT, async () => {
    console.log(`🤖 EFES Bot ${PORT}-portda ishga tushdi`);
    await registerWebhook();
});
