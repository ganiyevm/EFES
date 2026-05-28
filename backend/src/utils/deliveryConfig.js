const Settings = require('../models/Settings');

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

// Hozir ish vaqti ichidami? (Toshkent vaqti, UTC+5)
// workEndHour 24 dan katta bo'lsa, kun ichida emas ertasi kun ertalabigacha.
function isWithinWorkingHours(config = DEFAULT) {
    if (config.isOpen === false) return false;
    const start = config.workStartHour ?? DEFAULT.workStartHour;
    const end = config.workEndHour ?? DEFAULT.workEndHour;
    const now = new Date();
    // Toshkent vaqti (UTC+5)
    const tashkentHour = (now.getUTCHours() + 5) % 24;
    const decimalHour = tashkentHour + now.getUTCMinutes() / 60;
    if (end > 24) {
        // Misol: 08:00 — 01:00 → decimal >= 8 yoki decimal < 1
        return decimalHour >= start || decimalHour < (end - 24);
    }
    return decimalHour >= start && decimalHour < end;
}

async function getDeliveryConfig() {
    const doc = await Settings.findOne({ key: 'delivery' });
    return { ...DEFAULT, ...(doc?.value || {}) };
}

async function setDeliveryConfig(patch) {
    const current = await getDeliveryConfig();
    const value = { ...current };
    for (const k of Object.keys(DEFAULT)) {
        if (patch[k] !== undefined) value[k] = patch[k];
    }
    await Settings.findOneAndUpdate(
        { key: 'delivery' },
        { $set: { value } },
        { upsert: true, new: true },
    );
    return value;
}

module.exports = { DEFAULT, getDeliveryConfig, setDeliveryConfig, isWithinWorkingHours };
