import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'efes_kebab_bot';

export default function Onboarding() {
    const { setUser } = useAuth();

    const [step, setStep] = useState('phone'); // 'phone' | 'otp'
    const [phone, setPhone] = useState('+998');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setInterval(() => setCooldown(c => c - 1), 1000);
        return () => clearInterval(t);
    }, [cooldown]);

    const handlePhoneInput = (val) => {
        if (!val.startsWith('+998')) val = '+998';
        const digits = val.replace(/\D/g, '');
        if (digits.length <= 12) setPhone('+' + digits);
    };

    const isPhoneValid = phone.replace(/\D/g, '').length >= 12;

    const handleSend = async () => {
        if (!isPhoneValid) { setError("Telefon raqamni to'liq kiriting"); return; }
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/send-otp', { phone });
            setStep('otp');
            setCooldown(60);
        } catch (e) {
            setError(e.response?.data?.error || 'Xato yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (code.length < 6) { setError('6 xonali kodni kiriting'); return; }
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/verify-otp', { phone, code });
            if (data.token) localStorage.setItem('efes_token', data.token);
            setUser(data.user);
            // isProfileComplete = true bo'lgandan keyin App.jsx asosiy routega o'tadi
        } catch (e) {
            setError(e.response?.data?.error || "Kod noto'g'ri");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        setError('');
        setCode('');
        setLoading(true);
        try {
            await api.post('/auth/send-otp', { phone });
            setCooldown(60);
        } catch (e) {
            setError(e.response?.data?.error || 'Xato yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--bg)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '24px 20px',
        }}>
            {/* Logo */}
            <div style={{ marginBottom: 28, textAlign: 'center' }}>
                <div style={{
                    width: 72, height: 72, borderRadius: 22,
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36, margin: '0 auto 14px',
                    boxShadow: '0 8px 28px rgba(212,160,23,0.35)',
                }}>🍽</div>
                <div style={{ fontWeight: 900, fontSize: 22 }}>EFES Kebab</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                    {step === 'phone' ? 'Telefon raqamingizni tasdiqlang' : 'Telegram botdagi kodni kiriting'}
                </div>
            </div>

            <div style={{
                width: '100%', maxWidth: 400,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 22, padding: 24,
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}>
                {/* Progress bar */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                    {['phone', 'otp'].map((s, i) => (
                        <div key={s} style={{
                            flex: 1, height: 4, borderRadius: 4,
                            background: (step === 'otp' ? i <= 1 : i === 0)
                                ? 'var(--primary)' : 'var(--border)',
                            transition: 'background 0.3s',
                        }} />
                    ))}
                </div>

                {step === 'phone' && (
                    <>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                            Telegram bot orqali tasdiqlash kodi yuboriladi.
                            Bot bilan suhbat ochiq bo'lishi kerak.
                        </div>

                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                            Telefon raqami
                        </div>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => { handlePhoneInput(e.target.value); setError(''); }}
                            placeholder="+998 90 123 45 67"
                            style={iStyle}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />

                        {error && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 10 }}>{error}</div>}

                        {/* Bot ochish eslatmasi */}
                        <a
                            href={`https://t.me/${BOT_USERNAME}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '11px 14px', marginBottom: 14,
                                background: 'rgba(0,136,204,0.08)',
                                border: '1px solid rgba(0,136,204,0.18)',
                                borderRadius: 13, color: '#0088cc',
                                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                            }}
                        >
                            <span style={{ fontSize: 18 }}>✈️</span>
                            <span>Avval botni oching: <b>@{BOT_USERNAME}</b></span>
                        </a>

                        <button
                            onClick={handleSend}
                            disabled={loading || !isPhoneValid}
                            style={primaryBtn(loading || !isPhoneValid)}
                        >
                            {loading ? '⏳ Yuborilmoqda...' : '📨 Telegram orqali kod olish'}
                        </button>
                    </>
                )}

                {step === 'otp' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ fontSize: 44, marginBottom: 12 }}>✈️</div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                                Kod Telegramga yuborildi
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                                <b style={{ color: 'var(--text)' }}>@{BOT_USERNAME}</b> botini oching,<br />
                                u yerdan 6 xonali kodni kiriting
                            </div>
                        </div>

                        {/* Bot ochish tugmasi */}
                        <a
                            href={`https://t.me/${BOT_USERNAME}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '12px', marginBottom: 16,
                                background: 'rgba(0,136,204,0.1)',
                                border: '1px solid rgba(0,136,204,0.22)',
                                borderRadius: 13, color: '#0088cc',
                                fontSize: 14, fontWeight: 700, textDecoration: 'none',
                            }}
                        >
                            ✈️ Botni ochish
                        </a>

                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                            6 xonali kod
                        </div>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={code}
                            onChange={e => { setCode(e.target.value.slice(0, 6)); setError(''); }}
                            placeholder="• • • • • •"
                            style={{
                                ...iStyle,
                                textAlign: 'center', fontSize: 24,
                                fontWeight: 900, letterSpacing: 8,
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />

                        {error && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 10 }}>{error}</div>}

                        <button
                            onClick={handleVerify}
                            disabled={loading || code.length < 6}
                            style={primaryBtn(loading || code.length < 6)}
                        >
                            {loading ? '⏳ Tekshirilmoqda...' : '✅ Tasdiqlash'}
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                            <button
                                onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                                style={ghostBtn}
                            >
                                ← Orqaga
                            </button>
                            <button
                                onClick={cooldown > 0 ? undefined : handleResend}
                                disabled={cooldown > 0 || loading}
                                style={{ ...ghostBtn, color: cooldown > 0 ? 'var(--text-secondary)' : 'var(--primary-light)' }}
                            >
                                {cooldown > 0 ? `Qayta yuborish (${cooldown}s)` : 'Qayta yuborish'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const iStyle = {
    width: '100%', padding: '13px 14px', marginBottom: 12,
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 14, color: 'var(--text)', fontSize: 15,
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.25s',
    display: 'block', boxSizing: 'border-box',
};

const primaryBtn = (disabled) => ({
    width: '100%', padding: '15px', marginTop: 4,
    background: disabled
        ? 'var(--bg-secondary)'
        : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
    border: 'none', borderRadius: 15,
    color: disabled ? 'var(--text-secondary)' : '#1a1a24',
    fontSize: 15, fontWeight: 800, cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', transition: 'all 0.25s',
    boxShadow: disabled ? 'none' : '0 4px 18px rgba(212,160,23,0.35)',
});

const ghostBtn = {
    background: 'none', border: 'none',
    color: 'var(--text-secondary)', fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0',
};
