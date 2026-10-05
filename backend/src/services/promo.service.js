const Promotion = require('../models/Promotion');

// Promo kodni tekshirish va chegirmani hisoblash — /promotions/check va
// buyurtma yaratishda bir xil qoida ishlashi uchun yagona joy.
// items: [{ category, price, qty }] — applicableCategories bo'lsa faqat
// o'sha kategoriyadagi mahsulotlar summasiga chegirma qo'llanadi.
async function evaluatePromo(code, { subtotal, items = null } = {}) {
    const normalized = String(code || '').toUpperCase().trim();
    if (!normalized) return { ok: false, status: 400, error: 'Kod kiritilmadi' };

    const now = new Date();
    const promo = await Promotion.findOne({
        promoCode: normalized,
        isActive: true,
        startDate: { $lte: now },
        $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }],
    });
    if (!promo) return { ok: false, status: 404, error: "Promo kod topilmadi yoki muddati o'tgan" };

    if (promo.usageLimit > 0 && promo.usageCount >= promo.usageLimit) {
        return { ok: false, status: 400, error: 'Promo kod limiti tugagan' };
    }

    const amount = Number(subtotal) || 0;
    if (promo.minOrderAmount > 0 && amount < promo.minOrderAmount) {
        return {
            ok: false, status: 400,
            error: `Promo kod uchun minimal buyurtma: ${promo.minOrderAmount.toLocaleString('ru-RU')} so'm`,
        };
    }

    let base = amount;
    const cats = (promo.applicableCategories || []).filter(Boolean);
    if (cats.length > 0 && Array.isArray(items)) {
        base = items
            .filter(i => cats.includes(i.category))
            .reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
        if (base <= 0) {
            return { ok: false, status: 400, error: "Promo kod savatdagi mahsulotlarga tegishli emas" };
        }
    }

    let discount;
    if (promo.discountType === 'percent') {
        discount = Math.floor(base * (promo.discountValue || 0) / 100);
        if (promo.maxDiscount > 0) discount = Math.min(discount, promo.maxDiscount);
    } else {
        discount = promo.discountValue || 0;
    }
    discount = Math.max(0, Math.min(discount, base));

    return { ok: true, promo, discount };
}

module.exports = { evaluatePromo };
