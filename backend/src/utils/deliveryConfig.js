const Settings = require('../models/Settings');

const DEFAULT = {
    deliveryCost: 10000,
    minOrderAmount: 30000,
    freeDeliveryThreshold: 0,
    estimatedDeliveryTime: 30,
    workHours: '10:00 — 23:00',
    bonusPercent: 1,
    maxBonusPercent: 20,
    isOpen: true,
};

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

module.exports = { DEFAULT, getDeliveryConfig, setDeliveryConfig };
