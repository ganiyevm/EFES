import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';
import api from '../api';
import BottomNav from '../components/BottomNav';

const PAY_METHODS = [
    { key: 'payme', icon: '💳', label: 'Payme' },
    { key: 'click', icon: '💳', label: 'Click' },
    { key: 'cash', icon: '💵', label: '' },
];

export default function Cart() {
    const { t } = useT();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { items, removeItem, updateQty, updateNote, clearCart, totalPrice, totalItems } = useCart();

    const [deliveryType, setDeliveryType] = useState('delivery');
    const [paymentMethod, setPaymentMethod] = useState('payme');
    const [name, setName] = useState(user ? `${user.firstName} ${user.lastName}`.trim() : '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [address, setAddress] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [comment, setComment] = useState('');
    const [branches, setBranches] = useState([]);
    const [useBonus, setUseBonus] = useState(false);
    const [bonusDiscount, setBonusDiscount] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [locating, setLocating] = useState(false);

    const deliveryCost = deliveryType === 'delivery' ? 10000 : 0;
    const maxBonus = Math.floor(totalPrice * 0.2);
    const actualBonus = useBonus ? Math.min(user?.bonusPoints || 0, maxBonus) : 0;
    const grandTotal = totalPrice - actualBonus + deliveryCost;

    useEffect(() => {
        api.get('/branches').then(r => {
            const active = (r.data || []).filter(b => b.isActive);
            setBranches(active);
            if (active.length === 1) setSelectedBranch(active[0]._id);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (useBonus) setBonusDiscount(actualBonus);
        else setBonusDiscount(0);
    }, [useBonus, totalPrice, user]);

    const handleGeo = () => {
        if (!navigator.geolocation) { alert(t('geoNotSupported')); return; }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
                    const data = await r.json();
                    setAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                } catch {
                    setAddress(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
                }
                setLocating(false);
            },
            () => { alert(t('geoError')); setLocating(false); },
            { timeout: 8000 }
        );
    };

    const handleOrder = async () => {
        if (!name.trim() || !phone.trim()) { alert(t('namePhoneRequired')); return; }
        if (deliveryType === 'delivery' && !address.trim()) { alert(t('addressRequired')); return; }
        if (deliveryType === 'pickup' && !selectedBranch) { alert(t('branchRequired')); return; }

        setSubmitting(true);
        try {
            const payload = {
                items: items.map(i => ({ productId: i.productId, qty: i.qty, note: i.note || '' })),
                deliveryType,
                address: deliveryType === 'delivery' ? address : '',
                branch: selectedBranch || branches[0]?._id,
                paymentMethod,
                phone,
                bonusDiscount: actualBonus,
                notes: comment,
            };
            const r = await api.post('/orders', payload);
            clearCart();

            if (paymentMethod === 'payme') {
                navigate(`/payment?orderId=${r.data._id}&method=payme&total=${grandTotal}`);
            } else if (paymentMethod === 'click') {
                navigate(`/payment?orderId=${r.data._id}&method=click&total=${grandTotal}`);
            } else {
                navigate(`/payment?orderId=${r.data._id}&method=cash`);
            }
        } catch (err) {
            alert(t('errorOccurred') + ': ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    if (totalItems === 0) {
        return (
            <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 90 }}>
                <div style={{ padding: '16px 16px 0' }}>
                    <div style={{ fontWeight: 800, fontSize: 20 }}>🛒 Savat</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
                    <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{t('cartEmpty')}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>{t('cartEmptyText')}</div>
                    <button
                        onClick={() => navigate('/menu')}
                        style={{ padding: '14px 28px', background: 'var(--primary)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        🍽 {t('goToMenu')}
                    </button>
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 120 }}>
            <div style={{ padding: '16px 16px 0', marginBottom: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 20 }}>🛒 Savat</div>
            </div>

            {/* Items */}
            <div style={{ padding: '0 16px 16px' }}>
                {items.map(item => (
                    <div key={item.productId} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{item.name}</div>
                                <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700 }}>
                                    {(item.price * item.qty).toLocaleString()} so'm
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                    onClick={() => updateQty(item.productId, item.qty - 1)}
                                    style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 16, cursor: 'pointer', fontWeight: 700 }}
                                >−</button>
                                <span style={{ fontWeight: 800, fontSize: 14, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                                <button
                                    onClick={() => updateQty(item.productId, item.qty + 1)}
                                    style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--primary)', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', fontWeight: 700 }}
                                >+</button>
                            </div>
                        </div>
                        <input
                            value={item.note || ''}
                            onChange={e => updateNote(item.productId, e.target.value)}
                            placeholder={t('itemNotePlaceholder')}
                            style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
                        />
                    </div>
                ))}
            </div>

            {/* Delivery type */}
            <Section title="🚗 Yetkazib berish usuli">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {['delivery', 'pickup'].map(dt => (
                        <button key={dt} onClick={() => setDeliveryType(dt)} style={{
                            padding: '12px 16px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                            background: deliveryType === dt ? 'var(--primary)' : 'var(--bg-card)',
                            border: `1px solid ${deliveryType === dt ? 'var(--primary)' : 'var(--border)'}`,
                            color: deliveryType === dt ? '#fff' : 'var(--text)', fontWeight: 600, fontSize: 14,
                        }}>
                            {dt === 'delivery' ? `🚗 ${t('delivery')}` : `🏃 ${t('pickup')}`}
                        </button>
                    ))}
                </div>
            </Section>

            {/* Address or Branch */}
            {deliveryType === 'delivery' ? (
                <Section title={`📍 ${t('yourAddress')}`}>
                    <div style={{ position: 'relative' }}>
                        <input
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            placeholder={t('addressPlaceholder')}
                            style={inputStyle}
                        />
                    </div>
                    <button onClick={handleGeo} disabled={locating} style={{ marginTop: 8, padding: '9px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', width: '100%', fontWeight: 500 }}>
                        {locating ? '⏳ ' + t('locating') : `📍 ${t('getLocation')}`}
                    </button>
                </Section>
            ) : (
                <Section title={`🏢 ${t('selectBranch')}`}>
                    <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                        <option value="">{t('selectBranch')}</option>
                        {branches.map(b => (
                            <option key={b._id} value={b._id}>#{b.number} — {b.name || b.address}</option>
                        ))}
                    </select>
                </Section>
            )}

            {/* Contact */}
            <Section title={`👤 ${t('yourName')}`}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={t('yourName')} style={{ ...inputStyle, marginBottom: 10 }} />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('yourPhone')} type="tel" style={inputStyle} />
            </Section>

            {/* Comment */}
            <Section title={`📝 ${t('comment')}`}>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={t('comment')} rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </Section>

            {/* Payment */}
            <Section title={`💳 ${t('paymentTitle')}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {PAY_METHODS.map(m => (
                        <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--bg-card)', border: `1px solid ${paymentMethod === m.key ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 12, cursor: 'pointer' }}>
                            <input type="radio" name="pay" value={m.key} checked={paymentMethod === m.key} onChange={() => setPaymentMethod(m.key)} style={{ accentColor: 'var(--primary)' }} />
                            <span style={{ fontSize: 18 }}>{m.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{m.label || t(`pay_${m.key}`)}</span>
                        </label>
                    ))}
                </div>
            </Section>

            {/* Bonus */}
            {(user?.bonusPoints || 0) > 0 && (
                <Section title="🎁 Bonus">
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer' }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{t('useBonus')}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{user.bonusPoints} {t('bonusAvailable')}</div>
                        </div>
                        <input type="checkbox" checked={useBonus} onChange={e => setUseBonus(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--primary)' }} />
                    </label>
                </Section>
            )}

            {/* Summary */}
            <div style={{ margin: '0 16px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
                <Row label={t('cartItemsLabel')} value={`${totalPrice.toLocaleString()} so'm`} />
                <Row label={t('deliveryCost')} value={deliveryCost === 0 ? t('free') : `${deliveryCost.toLocaleString()} so'm`} />
                {actualBonus > 0 && <Row label="Bonus chegirma" value={`−${actualBonus.toLocaleString()} so'm`} color="#27ae60" />}
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{t('grandTotal')}</span>
                    <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--primary)' }}>{grandTotal.toLocaleString()} so'm</span>
                </div>
            </div>

            {/* Order button */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-card)', borderTop: '1px solid var(--border)', padding: '12px 16px 28px' }}>
                <button
                    onClick={handleOrder}
                    disabled={submitting}
                    style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'block', padding: '16px', background: submitting ? '#666' : 'var(--primary)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 16, fontWeight: 800, cursor: submitting ? 'default' : 'pointer', fontFamily: 'inherit' }}
                >
                    {submitting ? `⏳ ${t('ordering')}` : `🍽 ${t('placeOrder')} • ${grandTotal.toLocaleString()} so'm`}
                </button>
            </div>

            <BottomNav />
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ padding: '0 16px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: 'var(--text-secondary)' }}>{title}</div>
            {children}
        </div>
    );
}

function Row({ label, value, color }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontWeight: 600, color: color || 'var(--text)' }}>{value}</span>
        </div>
    );
}

const inputStyle = {
    width: '100%', padding: '12px 14px',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 12, color: 'var(--text)', fontSize: 14,
    outline: 'none', fontFamily: 'inherit',
};
