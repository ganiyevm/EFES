import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';
import api from '../api';
import BottomNav from '../components/BottomNav';

export default function Profile() {
    const { user, setUser } = useAuth();
    const { t, lang } = useT();
    const navigate = useNavigate();
    const [page, setPage] = useState(null);
    const [orders, setOrders] = useState(null);
    const [bonusTx, setBonusTx] = useState(null);
    const [addresses, setAddresses] = useState(user?.addresses || []);
    const [favorites, setFavorites] = useState([]);

    if (!user) return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <div style={{ color: 'var(--text-secondary)' }}>{t('loading')}</div>
            </div>
        </div>
    );

    const tierColors = { bronze: '#cd7f32', silver: '#C0C0C0', gold: '#F0C040' };
    const tierColor = tierColors[user.bonusTier] || '#cd7f32';
    const tierLabel = t(`tier${user.bonusTier?.charAt(0).toUpperCase() + user.bonusTier?.slice(1)}`) || user.bonusTier;

    const handleLang = async (l) => {
        try {
            await api.put('/user/profile', { language: l });
            setUser({ ...user, language: l });
            localStorage.setItem('efes_lang', l);
        } catch { }
    };

    // ── Bonus page ──
    if (page === 'bonus') {
        return (
            <SubPage title={`🎁 ${t('bonusPageTitle')}`} onBack={() => setPage(null)}>
                <div style={{
                    background: 'linear-gradient(135deg, #2D1F05, #1A1508)',
                    borderRadius: 18, padding: 24, marginBottom: 24, textAlign: 'center',
                    position: 'relative', overflow: 'hidden',
                    border: '1px solid rgba(212,160,23,0.2)',
                }}>
                    <div style={{
                        position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                        borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,160,23,0.15) 0%, transparent 70%)',
                    }} />
                    <div style={{
                        fontSize: 52, fontWeight: 900,
                        background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        position: 'relative',
                    }}>{user.bonusPoints || 0}</div>
                    <div style={{ color: 'rgba(245,240,232,0.6)', fontSize: 14, marginTop: 4, position: 'relative' }}>{t('bonusBallsLabel')}</div>
                    <div style={{
                        marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'rgba(212,160,23,0.15)', border: '1px solid rgba(212,160,23,0.25)',
                        borderRadius: 24, padding: '5px 16px', fontSize: 13, fontWeight: 700,
                        color: 'var(--primary-light)', position: 'relative',
                    }}>
                        🏅 {tierLabel}
                    </div>
                </div>
                <BonusTxList uid={user._id} t={t} />
            </SubPage>
        );
    }

    // ── Addresses ──
    if (page === 'addresses') {
        return (
            <SubPage title={`📍 ${t('addressesTitle')}`} onBack={() => setPage(null)}>
                <AddressManager addresses={addresses} setAddresses={setAddresses} t={t} />
            </SubPage>
        );
    }

    // ── Main Profile ──
    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 90 }}>
            {/* ── Profile Header with golden gradient ── */}
            <div style={{
                background: 'linear-gradient(160deg, #2D1F05 0%, #1A1508 50%, var(--bg) 100%)',
                padding: '24px 20px 28px',
                borderBottom: '1px solid var(--border)',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Decorative glow */}
                <div style={{
                    position: 'absolute', top: -40, left: -20, width: 150, height: 150, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(212,160,23,0.12) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
                    <div style={{
                        width: 68, height: 68, borderRadius: 22,
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, fontWeight: 900, color: '#1a1a24', flexShrink: 0,
                        boxShadow: '0 4px 20px rgba(212,160,23,0.3)',
                    }}>
                        {(user.firstName?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 20 }}>{user.firstName} {user.lastName}</div>
                        {user.phone && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>📞 {user.phone}</div>}
                        <div style={{
                            marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.2)',
                            borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700,
                            color: tierColor,
                        }}>
                            🏅 {tierLabel} · {user.bonusPoints || 0} ball
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18, position: 'relative' }}>
                    <StatCard value={user.totalOrders || 0} label={t('ordersCount')} icon="📋" />
                    <StatCard value={user.bonusPoints || 0} label={t('ballCount')} icon="🎁" />
                </div>
            </div>

            {/* ── Phone Verification Banner ── */}
            {!user.isProfileComplete && (
                <div style={{ padding: '12px 16px 0' }}>
                    <PhoneVerificationCard t={t} user={user} setUser={setUser} />
                </div>
            )}

            {/* ── Menu Items ── */}
            <div style={{ padding: '14px 16px' }}>
                <MenuItem icon="📋" label={t('myOrders')} onPress={() => navigate('/orders')} />
                <MenuItem icon="🎁" label={t('bonusLabel')} onPress={() => setPage('bonus')} badge={user.bonusPoints > 0 ? `${user.bonusPoints}` : null} />
                <MenuItem icon="📍" label={t('myAddresses')} onPress={() => setPage('addresses')} />
                <MenuItem icon="❤️" label={t('favorites')} onPress={() => navigate('/menu')} />

                <div style={{ marginTop: 20, marginBottom: 10, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>⚙️ {t('settings')}</div>

                {/* Language */}
                <div style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 16, padding: '14px 16px', marginBottom: 10,
                }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, fontWeight: 600 }}>🌐 {t('language')}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[{ key: 'uz', label: "O'zbek" }, { key: 'ru', label: 'Русский' }, { key: 'en', label: 'English' }].map(l => (
                            <button key={l.key} onClick={() => handleLang(l.key)} style={{
                                flex: 1, padding: '10px 4px', borderRadius: 12,
                                background: lang === l.key ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'var(--bg-secondary)',
                                border: `1px solid ${lang === l.key ? 'transparent' : 'var(--border)'}`,
                                color: lang === l.key ? '#1a1a24' : 'var(--text)',
                                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                boxShadow: lang === l.key ? '0 2px 8px rgba(212,160,23,0.2)' : 'none',
                                transition: 'all 0.25s',
                            }}>
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}

function SubPage({ title, onBack, children }) {
    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 30 }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 14px',
                borderBottom: '1px solid var(--border)', background: 'var(--bg)',
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                <button onClick={onBack} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 12, width: 38, height: 38, color: 'var(--text)',
                    fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>←</button>
                <span style={{ fontWeight: 800, fontSize: 18 }}>{title}</span>
            </div>
            <div style={{ padding: '16px 16px' }}>{children}</div>
        </div>
    );
}

function StatCard({ value, label, icon }) {
    return (
        <div style={{
            background: 'rgba(212,160,23,0.06)', border: '1px solid rgba(212,160,23,0.12)',
            borderRadius: 14, padding: '14px 16px', textAlign: 'center',
        }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
            <div style={{
                fontWeight: 900, fontSize: 22,
                background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 2 }}>{label}</div>
        </div>
    );
}

function MenuItem({ icon, label, onPress, badge }) {
    return (
        <div onClick={onPress} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '15px 16px', marginBottom: 10, cursor: 'pointer',
            transition: 'all 0.2s',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: 'rgba(212,160,23,0.08)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>{icon}</div>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {badge && <span style={{
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    color: '#1a1a24', borderRadius: 20, padding: '3px 10px',
                    fontSize: 12, fontWeight: 800,
                }}>{badge}</span>}
                <span style={{ color: 'var(--primary)', fontSize: 16, fontWeight: 600 }}>›</span>
            </div>
        </div>
    );
}

function BonusTxList({ uid, t }) {
    const [txs, setTxs] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api.get('/user/bonus-history').then(r => setTxs(r.data || [])).catch(() => { }).finally(() => setLoading(false));
    }, []);
    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><div className="spinner" /></div>;
    if (!txs.length) return <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 30 }}>📭 {t('noTransactions')}</div>;
    return (
        <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--primary-light)' }}>📊</span> {t('ballHistory')}
            </div>
            {txs.map((tx, i) => (
                <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px', background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: 14,
                    marginBottom: 8, fontSize: 13,
                }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>{tx.description || (tx.type === 'earn' ? '+ Ball' : '- Ball')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                            {new Date(tx.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                    <div style={{
                        fontWeight: 800, fontSize: 16,
                        color: tx.type === 'earn' ? '#2ecc71' : '#e74c3c',
                    }}>
                        {tx.type === 'earn' ? '+' : '−'}{tx.amount}
                    </div>
                </div>
            ))}
        </div>
    );
}

function AddressManager({ addresses, setAddresses, t }) {
    const [name, setName] = useState('');
    const [addr, setAddr] = useState('');
    const [adding, setAdding] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!name.trim() || !addr.trim()) return;
        setSaving(true);
        try {
            const r = await api.post('/user/address', { title: name, address: addr });
            setAddresses(r.data);
            setName(''); setAddr(''); setAdding(false);
        } catch { } finally { setSaving(false); }
    };

    const handleDelete = async (idx) => {
        try {
            const r = await api.delete(`/user/address/${idx}`);
            setAddresses(r.data);
        } catch { }
    };

    return (
        <div>
            {addresses.map((a, i) => (
                <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{a.address}</div>
                    </div>
                    <button onClick={() => handleDelete(i)} style={{
                        background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.15)',
                        borderRadius: 10, width: 36, height: 36, color: '#e74c3c',
                        fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>🗑</button>
                </div>
            ))}

            {adding ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder={t('addrNamePlaceholder')} style={iStyle}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                    <input value={addr} onChange={e => setAddr(e.target.value)} placeholder={t('addrAddrPlaceholder')} style={{ ...iStyle, marginTop: 10 }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <button onClick={() => setAdding(false)} style={{
                            flex: 1, padding: '12px', background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)', borderRadius: 12,
                            color: 'var(--text)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                        }}>{t('cancel')}</button>
                        <button onClick={handleAdd} disabled={saving} style={{
                            flex: 1, padding: '12px',
                            background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                            border: 'none', borderRadius: 12, color: '#1a1a24',
                            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            boxShadow: '0 2px 8px rgba(212,160,23,0.2)',
                        }}>{saving ? '⏳' : t('save')}</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setAdding(true)} style={{
                    width: '100%', padding: '14px',
                    background: 'rgba(212,160,23,0.06)',
                    border: '1px dashed var(--primary)', borderRadius: 16,
                    color: 'var(--primary-light)', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.25s',
                }}>
                    + {t('addAddress')}
                </button>
            )}
        </div>
    );
}

const iStyle = {
    width: '100%', padding: '13px 14px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 12, color: 'var(--text)', fontSize: 14,
    outline: 'none', fontFamily: 'inherit', transition: 'all 0.25s',
};

// ── Phone Verification via Telegram OTP ─────────────────────────────────
function PhoneVerificationCard({ t, user, setUser }) {
    const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'efes_kebab_bot';

    const [step, setStep] = useState('phone');   // 'phone' | 'otp' | 'done'
    const [phone, setPhone] = useState(user?.phone || '');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);

    // Qayta yuborish taymeri
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown(c => c - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleSend = async () => {
        if (!phone.trim()) return;
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/send-otp', { phone: phone.trim() });
            setStep('otp');
            setCooldown(60);
        } catch (e) {
            setError(e.response?.data?.error || t('otpError'));
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!code.trim()) return;
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/verify-otp', { phone: phone.trim(), code: code.trim() });
            if (data.token) localStorage.setItem('efes_token', data.token);
            setUser(data.user);
            setStep('done');
        } catch (e) {
            setError(e.response?.data?.error || t('otpError'));
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
            await api.post('/auth/send-otp', { phone: phone.trim() });
            setCooldown(60);
        } catch (e) {
            setError(e.response?.data?.error || t('otpError'));
        } finally {
            setLoading(false);
        }
    };

    if (step === 'done') {
        return (
            <div style={{
                background: 'linear-gradient(135deg, rgba(46,204,113,0.12), rgba(46,204,113,0.06))',
                border: '1px solid rgba(46,204,113,0.25)',
                borderRadius: 18, padding: '18px 20px',
                display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4,
            }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                    background: 'rgba(46,204,113,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>✅</div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{t('phoneVerified')}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{t('phoneVerifiedDesc')}</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(212,160,23,0.08), rgba(212,160,23,0.03))',
            border: '1px solid rgba(212,160,23,0.2)',
            borderRadius: 18, padding: '18px 20px', marginBottom: 4,
        }}>
            {/* Sarlavha */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                    background: 'rgba(212,160,23,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>📱</div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{t('verifyPhone')}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('verifyPhoneDesc')}</div>
                </div>
            </div>

            {/* 1-qadam: telefon */}
            {step === 'phone' && (
                <>
                    <input
                        type="tel"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setError(''); }}
                        placeholder={t('phonePlaceholder')}
                        style={{ ...iStyle, marginBottom: 10 }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                    {error && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 8 }}>{error}</div>}
                    <button
                        onClick={handleSend}
                        disabled={loading || !phone.trim()}
                        style={{
                            width: '100%', padding: '13px',
                            background: loading || !phone.trim()
                                ? 'var(--bg-secondary)'
                                : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                            border: 'none', borderRadius: 13,
                            color: loading || !phone.trim() ? 'var(--text-secondary)' : '#1a1a24',
                            fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                            fontFamily: 'inherit', transition: 'all 0.25s',
                            boxShadow: !loading && phone.trim() ? '0 2px 12px rgba(212,160,23,0.25)' : 'none',
                        }}
                    >
                        {loading ? t('sendingCode') : t('sendCodeTelegram')}
                    </button>
                </>
            )}

            {/* 2-qadam: OTP */}
            {step === 'otp' && (
                <>
                    <div style={{
                        fontSize: 13, color: 'var(--text-secondary)',
                        marginBottom: 12, lineHeight: 1.5,
                    }}>
                        {t('codeSentDesc')}
                    </div>

                    {/* Telegram botni ochish tugmasi */}
                    <a
                        href={`https://t.me/${BOT_USERNAME}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '11px', marginBottom: 12,
                            background: 'rgba(0,136,204,0.1)', border: '1px solid rgba(0,136,204,0.2)',
                            borderRadius: 12, color: '#0088cc', fontSize: 13, fontWeight: 700,
                            textDecoration: 'none',
                        }}
                    >
                        <span style={{ fontSize: 18 }}>✈️</span> {t('openBot')}
                    </a>

                    <input
                        type="number"
                        inputMode="numeric"
                        value={code}
                        onChange={e => { setCode(e.target.value.slice(0, 6)); setError(''); }}
                        placeholder={t('otpPlaceholder')}
                        style={{ ...iStyle, marginBottom: 10, letterSpacing: 6, fontSize: 20, textAlign: 'center' }}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                    {error && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 8 }}>{error}</div>}

                    <button
                        onClick={handleVerify}
                        disabled={loading || code.length < 6}
                        style={{
                            width: '100%', padding: '13px', marginBottom: 10,
                            background: loading || code.length < 6
                                ? 'var(--bg-secondary)'
                                : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                            border: 'none', borderRadius: 13,
                            color: loading || code.length < 6 ? 'var(--text-secondary)' : '#1a1a24',
                            fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                            fontFamily: 'inherit', transition: 'all 0.25s',
                            boxShadow: !loading && code.length >= 6 ? '0 2px 12px rgba(212,160,23,0.25)' : 'none',
                        }}
                    >
                        {loading ? t('verifying') : t('verifyCode')}
                    </button>

                    {/* Qayta yuborish */}
                    <div style={{ textAlign: 'center' }}>
                        <button
                            onClick={cooldown > 0 ? undefined : handleResend}
                            disabled={cooldown > 0 || loading}
                            style={{
                                background: 'none', border: 'none', padding: '4px 8px',
                                fontSize: 13, cursor: cooldown > 0 ? 'default' : 'pointer',
                                color: cooldown > 0 ? 'var(--text-secondary)' : 'var(--primary-light)',
                                fontFamily: 'inherit', fontWeight: 600,
                            }}
                        >
                            {cooldown > 0 ? `${t('resendCode')} (${cooldown}s)` : t('resendCode')}
                        </button>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginLeft: 8, cursor: 'pointer' }}
                            onClick={() => { setStep('phone'); setCode(''); setError(''); }}>
                            ← {t('back')}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
