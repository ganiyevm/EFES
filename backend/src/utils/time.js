// Toshkent vaqti (UTC+5, yozgi vaqt yo'q) bo'yicha sana chegaralari.
// Server UTC'da ishlaydi — `setHours(0,0,0,0)` Toshkent yarim tunini emas,
// 05:00 ni beradi. Shu sababli barcha "bugun/kecha" hisoblari shu yerdan olinadi.
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// `date` qaysi Toshkent kunida bo'lsa, o'sha kunning 00:00 (UTC Date sifatida).
// offsetDays: -1 = kecha, 1 = ertaga.
function tashkentDayStart(date = new Date(), offsetDays = 0) {
    const shifted = new Date(date.getTime() + TASHKENT_OFFSET_MS);
    shifted.setUTCHours(0, 0, 0, 0);
    return new Date(shifted.getTime() - TASHKENT_OFFSET_MS + offsetDays * DAY_MS);
}

function tashkentMonthStart(date = new Date()) {
    const shifted = new Date(date.getTime() + TASHKENT_OFFSET_MS);
    return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - TASHKENT_OFFSET_MS);
}

function tashkentYearStart(date = new Date()) {
    const shifted = new Date(date.getTime() + TASHKENT_OFFSET_MS);
    return new Date(Date.UTC(shifted.getUTCFullYear(), 0, 1) - TASHKENT_OFFSET_MS);
}

module.exports = { TASHKENT_OFFSET_MS, DAY_MS, tashkentDayStart, tashkentMonthStart, tashkentYearStart };
