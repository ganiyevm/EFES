import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';
import api from '../api';

export default function Onboarding() {
    const { t } = useT();
    const { setUser } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(1); // 1=profile, 2=otp
    const [gender, setGender] = useState('');
    const [firstName, setFirstName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [phone, setPhone] = useState('+998');
    const [otp, setOtp] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    const validate = () => {
        const e = {};
        if (!gender) e.gender = "Jinsni tanlang";
        if (!firstName.trim() || firstName.trim().length < 2) e.firstName = "Ism kamida 2 belgi";
        if (!birthDate) e.birthDate = "Tug'ilgan kunni kiriting";
        const phoneClean = phone.replace(/\D/g, '');
        if (phoneClean.length < 12) e.phone = "Telefon raqamni to'liq kiriting";
        return e;
    };

    const handleSendOtp = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setErrors({});
        setLoading(true);
        try {
            await api.post('/auth/send-otp', { phone });
            setOtpSent(true);
            setStep(2);
        } catch (err) {
            setErrors({ phone: err.response?.data?.error || "Xato yuz berdi" });
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (otp.length < 4) { setErrors({ otp: "SMS kodni kiriting" }); return; }
        setErrors({});
        setLoading(true);
        try {
            const r = await api.post('/auth/verify-otp', {
                phone, code: otp, firstName, gender, birthDate,
            });
            setUser(r.data.user);
            navigate('/');
        } catch (err) {
            setErrors({ otp: err.response?.data?.error || "Kod noto'g'ri" });
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneInput = (val) => {
        if (!val.startsWith('+998')) val = '+998';
        const digits = val.replace(/\D/g, '');
        if (digits.length <= 12) setPhone('+' + digits);
    };

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--bg)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '24px 20px',
        }}>
            {/* Logo */}
            <div style={{ marginBottom: 32, textAlign: 'center' }}>
                <div style={{
                    width: 72, height: 72, borderRadius: 20,
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 36, margin: '0 auto 14px',
                    boxShadow: '0 8px 28px rgba(212,160,23,0.35)',
                }}>🍽</div>
                <div style={{ fontWeight: 900, fontSize: 22 }}>EFES Kebab</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                    {step === 1 ? "Ro'yxatdan o'ting" : "SMS tasdiqlash"}
                </div>
            </div>

            <div style={{
                width: '100%', maxWidth: 400,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 22, padding: 24,
                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            }}>
                {/* Step indicator */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{
                            flex: 1, height: 4, borderRadius: 4,
                            background: step >= s ? 'var(--primary)' : 'var(--border)',
                            transition: 'background 0.3s',
                        }} />
                    ))}
                </div>

                {step === 1 ? (
                    <>
                        {/* Gender */}
                        <FieldLabel label="Jins" error={errors.gender} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                            {[{ k: 'male', icon: '👨', l: 'Erkak' }, { k: 'female', icon: '👩', l: 'Ayol' }].map(g => (
                                <button key={g.k} onClick={() => setGender(g.k)} style={{
                                    padding: '13px 12px', borderRadius: 14, cursor: 'pointer',
                                    fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    background: gender === g.k
                                        ? 'linear-gradient(135deg, var(--primary), var(--primary-light))'
                                        : 'var(--bg-secondary)',
                                    border: `1.5px solid ${gender === g.k ? 'transparent' : 'var(--border)'}`,
                                    color: gender === g.k ? '#1a1a24' : 'var(--text)',
                                    boxShadow: gender === g.k ? '0 2px 12px rgba(212,160,23,0.25)' : 'none',
                                    transition: 'all 0.25s',
                                }}>
                                    <span style={{ fontSize: 20 }}>{g.icon}</span> {g.l}
                                </button>
                            ))}
                        </div>

                        {/* Name */}
                        <FieldLabel label="Ismingiz" error={errors.firstName} />
                        <input
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            placeholder="Masalan: Jasur"
                            style={inputStyle(!!errors.firstName)}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = errors.firstName ? '#e74c3c' : 'var(--border)'}
                        />

                        {/* Birth date */}
                        <FieldLabel label="Tug'ilgan kun" error={errors.birthDate} />
                        <input
                            type="date"
                            value={birthDate}
                            onChange={e => setBirthDate(e.target.value)}
                            max={new Date(Date.now() - 18 * 365.25 * 24 * 3600000).toISOString().split('T')[0]}
                            style={{ ...inputStyle(!!errors.birthDate), colorScheme: 'dark' }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = errors.birthDate ? '#e74c3c' : 'var(--border)'}
                        />

                        {/* Phone */}
                        <FieldLabel label="Telefon raqami" error={errors.phone} />
                        <input
                            value={phone}
                            onChange={e => handlePhoneInput(e.target.value)}
                            placeholder="+998 90 123 45 67"
                            type="tel"
                            style={inputStyle(!!errors.phone)}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = errors.phone ? '#e74c3c' : 'var(--border)'}
                        />

                        <button onClick={handleSendOtp} disabled={loading} style={primaryBtn(loading)}>
                            {loading ? '⏳ Yuborilmoqda...' : "📱 SMS kod olish →"}
                        </button>
                    </>
                ) : (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>SMS kod yuborildi</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                                <strong style={{ color: 'var(--text)' }}>{phone}</strong> raqamiga<br />4 xonali kod yuborildi
                            </div>
                        </div>

                        <FieldLabel label="SMS kod" error={errors.otp} />
                        <input
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="• • • •"
                            type="number"
                            maxLength={6}
                            style={{
                                ...inputStyle(!!errors.otp),
                                textAlign: 'center', fontSize: 26, fontWeight: 900,
                                letterSpacing: 12,
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = errors.otp ? '#e74c3c' : 'var(--border)'}
                        />

                        <button onClick={handleVerify} disabled={loading} style={primaryBtn(loading)}>
                            {loading ? '⏳ Tekshirilmoqda...' : "✅ Tasdiqlash"}
                        </button>

                        <button onClick={() => setStep(1)} style={{
                            width: '100%', padding: '12px', background: 'none',
                            border: 'none', color: 'var(--text-secondary)', fontSize: 13,
                            cursor: 'pointer', fontFamily: 'inherit', marginTop: 8,
                        }}>
                            ← Orqaga qaytish
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function FieldLabel({ label, error }) {
    return (
        <div style={{
            fontSize: 12, fontWeight: 700, marginBottom: 6,
            color: error ? '#e74c3c' : 'var(--text-secondary)',
            display: 'flex', justifyContent: 'space-between',
        }}>
            <span>{label}</span>
            {error && <span>{error}</span>}
        </div>
    );
}

const inputStyle = (hasError) => ({
    width: '100%', padding: '13px 14px', marginBottom: 16,
    background: 'var(--bg-secondary)',
    border: `1.5px solid ${hasError ? '#e74c3c' : 'var(--border)'}`,
    borderRadius: 14, color: 'var(--text)', fontSize: 15,
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.25s',
    display: 'block',
});

const primaryBtn = (disabled) => ({
    width: '100%', padding: '15px', marginTop: 8,
    background: disabled ? '#333' : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
    border: 'none', borderRadius: 15, color: disabled ? '#666' : '#1a1a24',
    fontSize: 16, fontWeight: 800, cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit',
    boxShadow: disabled ? 'none' : '0 4px 18px rgba(212,160,23,0.35)',
    transition: 'all 0.25s',
});
