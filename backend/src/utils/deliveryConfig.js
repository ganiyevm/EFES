const Settings = require('../models/Settings');
const { TASHKENT_OFFSET_MS } = require('./time');

const DEFAULT = {
    deliveryCost: 10000,
    minOrderAmount: 30000,
    freeDeliveryThreshold: 0,
    estimatedDeliveryTime: 30,
    workHours: '08:00 — 01:00',
    workStartHour: 8,    // 08:00 dan
    workEndHour: 25,     // 01:00 keyingi kun (24 + 1 = 25)
    timezone: 'Asia/Tashkent',
    bonusPercent: 1,
    maxBonusPercent: 20,
    isOpen: true,
};

const NUMERIC_KEYS = ['deliveryCost', 'minOrderAmount', 'freeDeliveryThreshold', 'estimatedDeliveryTime', 'bonusPercent', 'maxBonusPercent'];

// "10:00 — 23:00", "08:00-01:00", "8:30 – 2:00" → { start: 10, end: 23 } (o'nlik soat).
// Tugash vaqti boshlanishdan kichik yoki teng bo'lsa — ertasi kunga o'tadi (+24).
function parseWorkHours(str) {
    const m = String(str || '').match(/(\d{1,2})(?:[:.](\d{2}))?\s*[-—–]+\s*(\d{1,2})(?:[:.](\d{2}))?/);
    if (!m) return null;
    const start = Number(m[1]) + Number(m[2] || 0) / 60;
    let end = Number(m[3]) + Number(m[4] || 0) / 60;
    if (start >= 24 || end > 24) return null;
    if (end <= start) end += 24;
    return { start, end };
}

// Hozir ish vaqti ichidami? (Toshkent vaqti, UTC+5)
// workEndHour 24 dan katta bo'lsa, kun ichida emas ertasi kun ertalabigacha.
function isWithinWorkingHours(config = DEFAULT, now = new Date()) {
    if (config.isOpen === false) return false;
    const start = config.workStartHour ?? DEFAULT.workStartHour;
    const end = config.workEndHour ?? DEFAULT.workEndHour;
    const local = new Date(now.getTime() + TASHKENT_OFFSET_MS);
    const decimalHour = local.getUTCHours() + local.getUTCMinutes() / 60;
    if (end - start >= 24) return true; // 24/7
    if (end > 24) {
        // Misol: 08:00 — 01:00 → decimal >= 8 yoki decimal < 1
        return decimalHour >= start || decimalHour < (end - 24);
    }
    return decimalHour >= start && decimalHour < end;
}

// Sozlama kam o'zgaradi, lekin har buyurtmada o'qiladi — 30s cache DB yukini kamaytiradi.
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 30_000;

async function getDeliveryConfig() {
    if (!_cache || (Date.now() - _cacheAt) >= CACHE_TTL) {
        const doc = await Settings.findOne({ key: 'delivery' }).lean();
        _cache = { ...DEFAULT, ...(doc?.value || {}) };
        _cacheAt = Date.now();
    }
    // Nusxa qaytaramiz — chaqiruvchi mutatsiya qilsa cache buzilmaydi.
    return { ..._cache };
}

async function setDeliveryConfig(patch) {
    const current = await getDeliveryConfig();
    const value = { ...current };
    for (const k of Object.keys(DEFAULT)) {
        if (patch[k] === undefined) continue;
        if (NUMERIC_KEYS.includes(k)) {
            const n = Number(patch[k]);
            if (!Number.isFinite(n) || n < 0) {
                const err = new Error(`${k} manfiy bo'lmagan son bo'lishi kerak`);
                err.status = 400;
                throw err;
            }
            value[k] = n;
        } else if (k === 'isOpen') {
            value[k] = patch[k] !== false && patch[k] !== 'false';
        } else {
            value[k] = patch[k];
        }
    }
    if (value.maxBonusPercent > 100) value.maxBonusPercent = 100;

    // Admin "Ish vaqti" matnini o'zgartirsa — haqiqiy tekshiruv soatlari ham yangilanadi.
    if (patch.workHours !== undefined) {
        const parsed = parseWorkHours(patch.workHours);
        if (!parsed) {
            const err = new Error('Ish vaqti formati noto\'g\'ri. Masalan: 08:00 — 01:00');
            err.status = 400;
            throw err;
        }
        value.workStartHour = parsed.start;
        value.workEndHour = parsed.end;
    }

    await Settings.findOneAndUpdate(
        { key: 'delivery' },
        { $set: { value } },
        { upsert: true, new: true },
    );
    // Cache'ni yangilash — o'zgarish darhol kuchga kiradi.
    _cache = { ...DEFAULT, ...value };
    _cacheAt = Date.now();
    return value;
}

module.exports = { DEFAULT, getDeliveryConfig, setDeliveryConfig, isWithinWorkingHours, parseWorkHours };
