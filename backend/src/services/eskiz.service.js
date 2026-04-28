const https = require('https');

const BASE_HOST = 'notify.eskiz.uz';
const FROM = process.env.SMS_FROM || 'EFES';

function apiCall(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: BASE_HOST,
            port: 443,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                Authorization: `Bearer ${process.env.SMS_TOKEN}`,
            },
        };

        const req = https.request(options, (res) => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// phone: +998901234567 yoki 998901234567 → 998901234567
function normalizePhone(phone) {
    return phone.replace(/^\+/, '');
}

async function sendSms(phone, message) {
    const mobile_phone = normalizePhone(phone);
    const result = await apiCall('/api/message/sms/send', {
        mobile_phone,
        message,
        from: FROM,
        callback_url: '',
    });

    if (result.status !== 200 || result.body?.status !== 'waiting') {
        throw new Error(`Eskiz xatosi: ${JSON.stringify(result.body)}`);
    }
    return result.body;
}

async function sendOtp(phone, code) {
    const message = `EFES Delivery tasdiqlash kodi: ${code}\nKod 5 daqiqa amal qiladi.`;
    return sendSms(phone, message);
}

module.exports = { sendSms, sendOtp };
