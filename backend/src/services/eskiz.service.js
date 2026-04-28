const https = require('https');

const BASE_HOST = 'notify.eskiz.uz';
const FROM = () => process.env.SMS_FROM || '4546';

// In-memory token cache
let _token = null;
let _tokenExpiry = 0;

// ─── Low-level HTTPS helper ───
function httpsRequest(method, path, headers, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_HOST,
            port: 443,
            path,
            method,
            headers,
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
        if (body) req.write(body);
        req.end();
    });
}

// ─── Multipart/form-data builder ───
function buildFormData(fields) {
    const boundary = '----EskizBoundary' + Date.now();
    let body = '';
    for (const [key, value] of Object.entries(fields)) {
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
        body += `${value}\r\n`;
    }
    body += `--${boundary}--\r\n`;
    return { boundary, body };
}

// ─── Auth: email+password → JWT ───
async function login() {
    const email = process.env.SMS_EMAIL;
    const password = process.env.SMS_PASSWORD;
    if (!email || !password) throw new Error('SMS_EMAIL va SMS_PASSWORD kerak');

    const payload = JSON.stringify({ email, password });
    const result = await httpsRequest('POST', '/api/auth/login', {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
    }, payload);

    if (result.status !== 200 || !result.body?.data?.token) {
        throw new Error(`Eskiz login xatosi: ${JSON.stringify(result.body)}`);
    }

    _token = result.body.data.token;
    // JWT amal qilish vaqti — odatda 30 kun, xavfsiz 25 kunga o'rnatamiz
    _tokenExpiry = Date.now() + 25 * 24 * 60 * 60 * 1000;
    return _token;
}

// ─── Token refresh ───
async function refreshToken() {
    if (!_token) return login();
    const result = await httpsRequest('PATCH', '/api/auth/refresh', {
        Authorization: `Bearer ${_token}`,
    }, null);

    if (result.status === 200 && result.body?.data?.token) {
        _token = result.body.data.token;
        _tokenExpiry = Date.now() + 25 * 24 * 60 * 60 * 1000;
        return _token;
    }
    // Refresh ishlamasa qayta login
    return login();
}

// ─── Token olish (cache + auto-refresh) ───
async function getToken() {
    if (_token && Date.now() < _tokenExpiry) return _token;
    return refreshToken();
}

// ─── SMS yuborish ───
async function sendSms(phone, message, retry = true) {
    const token = await getToken();
    const mobile_phone = phone.replace(/^\+/, '');

    const { boundary, body } = buildFormData({
        mobile_phone,
        message,
        from: FROM(),
        callback_url: '',
    });

    const result = await httpsRequest('POST', '/api/message/sms/send', {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body),
    }, body);

    // Token muddati tugagan — bir marta refresh qilib qayta urinish
    if (result.status === 401 && retry) {
        _token = null;
        return sendSms(phone, message, false);
    }

    if (result.status !== 200) {
        throw new Error(`Eskiz SMS xatosi (${result.status}): ${JSON.stringify(result.body)}`);
    }

    return result.body;
}

// ─── OTP SMS ───
async function sendOtp(phone, code) {
    const message = `EFES Delivery tasdiqlash kodi: ${code}\nKod 5 daqiqa amal qiladi.`;
    return sendSms(phone, message);
}

// ─── Balance ───
async function getBalance() {
    const token = await getToken();
    const result = await httpsRequest('GET', '/api/user/get-limit', {
        Authorization: `Bearer ${token}`,
    }, null);
    if (result.status !== 200) throw new Error(`Balance xatosi: ${JSON.stringify(result.body)}`);
    return result.body?.data?.balance ?? 0;
}

module.exports = { sendSms, sendOtp, getBalance, login };
