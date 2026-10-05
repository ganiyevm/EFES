// Telegram parse_mode=HTML uchun matnni xavfsiz qilish.
// Mijoz kiritgan ism/manzil/izohdagi `<`, `>`, `&` belgilar escape qilinmasa,
// Telegram butun xabarni rad etadi (operator buyurtmani umuman ko'rmaydi).
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

module.exports = { escapeHtml };
