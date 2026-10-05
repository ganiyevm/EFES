// Click / Payme checkout havolasini yaratish (buyurtma yaratishda va
// "To'lash" tugmasi bilan keyinroq qayta ochishda ishlatiladi).
function buildPaymentUrl(order) {
    const returnUrl = process.env.WEBAPP_URL || process.env.FRONTEND_URL || '';
    if (order.paymentMethod === 'click') {
        const params = new URLSearchParams({
            service_id: process.env.CLICK_SERVICE_ID || '',
            merchant_id: process.env.CLICK_MERCHANT_ID || '',
            amount: String(order.total),
            transaction_param: order.orderNumber,
            merchant_order_id: order.orderNumber,
        });
        if (process.env.CLICK_MERCHANT_USER_ID) {
            params.set('merchant_user_id', process.env.CLICK_MERCHANT_USER_ID);
        }
        if (returnUrl) params.set('return_url', returnUrl);
        return `https://my.click.uz/services/pay?${params}`;
    }
    if (order.paymentMethod === 'payme') {
        const data = `m=${process.env.PAYME_MERCHANT_ID};ac.order_id=${order.orderNumber};a=${order.total * 100};l=uz`;
        const host = process.env.PAYME_TEST_MODE === 'true' ? 'checkout.test.paycom.uz' : 'checkout.paycom.uz';
        return `https://${host}/${Buffer.from(data).toString('base64')}`;
    }
    return '';
}

// Kalitlari sozlanmagan to'lov turi mijozga ko'rsatilmaydi (aks holda to'lov oxirida xato beradi)
function availablePaymentMethods() {
    const methods = ['cash'];
    if (process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID && process.env.CLICK_SECRET_KEY) methods.unshift('click');
    if (process.env.PAYME_MERCHANT_ID && (process.env.PAYME_MERCHANT_KEY || process.env.PAYME_SECRET_KEY)) methods.unshift('payme');
    return methods;
}

module.exports = { buildPaymentUrl, availablePaymentMethods };
