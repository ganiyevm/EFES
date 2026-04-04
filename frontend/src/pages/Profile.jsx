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
    const [page, setPage] = useState(null); // null | 'bonus' | 'addresses' | 'orders' | 'favorites'
    const [orders, setOrders] = useState(null);
    const [bonusTx, setBonusTx] = useState(null);
    const [addresses, setAddresses] = useState(user?.addresses || []);
    const [favorites, setFavorites] = useState([]);

    if (!user) return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
                <div style={{ color: 'var(--text-secondary)' }}>{t('loading')}</div>
            </div>
        </div>
    );

    const tierColors = { bronze: '#cd7f32', silver: '#aaa', gold: '#f39c12' };
    const tierColor = tierColors[user.bonusTier] || '#cd7f32';
    const tierLabel = t(`tier${user.bonusTier?.charAt(0).toUpperCase() + user.bonusTier?.slice(1)}`) || user.bonusTier;

    const handleLang = async (l) => {
        try {
            await api.put('/user/profile', { language: l });
            setUser({ ...user, language: l });
            localStorage.setItem('efes_lang', l);
        } catch {}
    };

    // ── Bonus page ──
    if (page === 'bonus') {
        return (
            <SubPage title={`🎁 ${t('bonusPageTitle')}`} onBack={() => setPage(null)}>
                <div style={{ background: 'linear-gradient(135deg, var(--primary), #c0392b)', borderRadius: 16, padding: 20, marginBottom: 20, textAlign: 'center' }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: '#fff' }}>{user.bonusPoints || 0}</div>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{t('bonusBallsLabel')}</div>
                    <div style={{ marginTop: 12, display: 'inline-block', background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700, color: '#fff' }}>
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

    // ── Main profile ──
    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 90 }}>
            {/* Header card */}
            <div style={{ background: 'linear-gradient(135deg, #1c1c28, var(--bg-card))', padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 50, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                        {(user.firstName?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 18 }}>{user.firstName} {user.lastName}</div>
                        {user.phone && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>📞 {user.phone}</div>}
                        <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: tierColor }}>
                            🏅 {tierLabel} · {user.bonusPoints || 0} ball
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                    <StatCard value={user.totalOrders || 0} label={t('ordersCount')} icon="📋" />
                    <StatCard value={user.bonusPoints || 0} label={t('ballCount')} icon="🎁" />
                </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: '12px 16px' }}>
                <MenuItem icon="📋" label={t('myOrders')} onPress={() => navigate('/orders')} />
                <MenuItem icon="🎁" label={t('bonusLabel')} onPress={() => setPage('bonus')} badge={user.bonusPoints > 0 ? `${user.bonusPoints}` : null} />
                <MenuItem icon="📍" label={t('myAddresses')} onPress={() => setPage('addresses')} />
                <MenuItem icon="❤️" label={t('favorites')} onPress={() => navigate('/menu')} />

                <div style={{ marginTop: 16, marginBottom: 8, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>⚙️ {t('settings')}</div>

                {/* Language */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 16px', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, fontWeight: 600 }}>🌐 {t('language')}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[{ key: 'uz', label: "O'zbek" }, { key: 'ru', label: 'Русский' }, { key: 'en', label: 'English' }].map(l => (
                            <button key={l.key} onClick={() => handleLang(l.key)} style={{ flex: 1, padding: '9px 4px', borderRadius: 10, background: lang === l.key ? 'var(--primary)' : 'var(--bg-secondary)', border: `1px solid ${lang === l.key ? 'var(--primary)' : 'var(--border)'}`, color: lang === l.key ? '#fff' : 'var(--text)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 22, cursor: 'pointer' }}>←</button>
                <span style={{ fontWeight: 800, fontSize: 18 }}>{title}</span>
            </div>
            <div style={{ padding: '16px 16px' }}>{children}</div>
        </div>
    );
}

function StatCard({ value, label, icon }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
        </div>
    );
}

function MenuItem({ icon, label, onPress, badge }) {
    return (
        <div onClick={onPress} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {badge && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 700 }}>{badge}</span>}
                <span style={{ color: 'var(--text-secondary)', fontSize: 18 }}>›</span>
            </div>
        </div>
    );
}

function BonusTxList({ uid, t }) {
    const [txs, setTxs] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        api.get('/user/bonus-history').then(r => setTxs(r.data || [])).catch(() => {}).finally(() => setLoading(false));
    }, []);
    if (loading) return <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{t('loading')}</div>;
    if (!txs.length) return <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 30 }}>📭 {t('noTransactions')}</div>;
    return (
        <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📊 {t('ballHistory')}</div>
            {txs.map((tx, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 8, fontSize: 13 }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>{tx.description || (tx.type === 'earn' ? '+ Ball' : '- Ball')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {new Date(tx.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: tx.type === 'earn' ? '#27ae60' : '#e74c3c' }}>
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
        } catch {} finally { setSaving(false); }
    };

    const handleDelete = async (idx) => {
        try {
            const r = await api.delete(`/user/address/${idx}`);
            setAddresses(r.data);
        } catch {}
    };

    return (
        <div>
            {addresses.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{a.address}</div>
                    </div>
                    <button onClick={() => handleDelete(i)} style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: 18, cursor: 'pointer' }}>🗑</button>
                </div>
            ))}

            {adding ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder={t('addrNamePlaceholder')} style={iStyle} />
                    <input value={addr} onChange={e => setAddr(e.target.value)} placeholder={t('addrAddrPlaceholder')} style={{ ...iStyle, marginTop: 10 }} />
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <button onClick={() => setAdding(false)} style={{ flex: 1, padding: '11px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>{t('cancel')}</button>
                        <button onClick={handleAdd} disabled={saving} style={{ flex: 1, padding: '11px', background: 'var(--primary)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{saving ? '⏳' : t('save')}</button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setAdding(true)} style={{ width: '100%', padding: '14px', background: 'var(--bg-card)', border: '1px dashed var(--primary)', borderRadius: 14, color: 'var(--primary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    + {t('addAddress')}
                </button>
            )}
        </div>
    );
}

const iStyle = { width: '100%', padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'inherit' };
