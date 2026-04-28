import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n';
import api from '../api';
import BottomNav from '../components/BottomNav';
import MapModal from '../components/MapModal';
import { PaymentIcon } from '../components/BrandIcon';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'efes_kebab_bot';

const PAY_METHODS = [
    { key: 'payme', label: 'Payme' },
    { key: 'click', label: 'Click' },
    { key: 'cash', label: 'Naqd' },
];

export default function Cart() {
    const { t } = useT();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { items, updateQty, updateNote, clearCart, totalPrice } = useCart();

    const [deliveryType, setDeliveryType] = useState(
        localStorage.getItem('efes_delivery_type') || 'delivery'
    );
    const [paymentMethod, setPaymentMethod] = useState('payme');

    // Address fields
    const [address, setAddress] = useState(
        localStorage.getItem('efes_address') || ''
    );
    const [house, setHouse] = useState('');
    const [entrance, setEntrance] = useState('');
    const [floor, setFloor] = useState('');
    const [apartment, setApartment] = useState('');
    const [comment, setComment] = useState('');
    const [showMap, setShowMap] = useState(false);
    const [coords, setCoords] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('efes_coords') || 'null');
            return saved && typeof saved.lat === 'number' ? saved : null;
        } catch { return null; }
    });

    // Delivery time
    const [deliveryDate, setDeliveryDate] = useState(todayStr());
    const [deliveryTime, setDeliveryTime] = useState('');

    // Contact
    const [extraPhone, setExtraPhone] = useState('');

    // Branch
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');

    // Delivery config (admin sozlamalari)
    const [deliveryConfig, setDeliveryConfig] = useState({
        deliveryCost: 10000,
        freeDeliveryThreshold: 0,
        maxBonusPercent: 20,
    });

    // Bonus & promo
    const [useBonus, setUseBonus] = useState(false);
    const [promoInput, setPromoInput] = useState('');
    const [promoData, setPromoData] = useState(null);
    const [promoError, setPromoError] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [showPhoneModal, setShowPhoneModal] = useState(false);

    const totalItems = items.reduce((s, i) => s + i.qty, 0);
    const freeDelivery = deliveryConfig.freeDeliveryThreshold > 0 && totalPrice >= deliveryConfig.freeDeliveryThreshold;
    const deliveryCost = deliveryType === 'delivery' ? (freeDelivery ? 0 : deliveryConfig.deliveryCost) : 0;
    const maxBonus = Math.floor(totalPrice * (deliveryConfig.maxBonusPercent / 100));
    const actualBonus = useBonus ? Math.min(user?.bonusPoints || 0, maxBonus) : 0;
    const promoDiscount = promoData?.discountAmount || 0;
    const grandTotal = totalPrice - actualBonus - promoDiscount + deliveryCost;

    useEffect(() => {
        api.get('/branches').then(r => {
            const active = (r.data || []).filter(b => b.isActive);
            setBranches(active);
            if (active.length === 1) setSelectedBranch(active[0]._id);
        }).catch(() => { });
        api.get('/delivery/config').then(r => {
            setDeliveryConfig(prev => ({ ...prev, ...r.data }));
        }).catch(() => { });
    }, []);

    const handlePromoCheck = async () => {
        if (!promoInput.trim()) return;
        setPromoLoading(true);
        setPromoError('');
        setPromoData(null);
        try {
            const r = await api.post('/promotions/check', {
                promoCode: promoInput.trim().toUpperCase(),
                orderAmount: totalPrice,
            });
            setPromoData(r.data);
        } catch (err) {
            setPromoError(err.response?.data?.error || "Promo kod topilmadi");
        } finally {
            setPromoLoading(false);
        }
    };

    const handleMapConfirm = (addr, c) => {
        setAddress(addr);
        if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
            setCoords({ lat: c.lat, lng: c.lng });
            localStorage.setItem('efes_coords', JSON.stringify({ lat: c.lat, lng: c.lng }));
        }
        localStorage.setItem('efes_address', addr);
        setShowMap(false);
    };

    const handleOrder = async () => {
        // Telefon tasdiqlanmagan bo'lsa — avval kirish modal
        if (!user?.isProfileComplete) {
            setShowPhoneModal(true);
            return;
        }

        if (deliveryType === 'delivery' && !address.trim()) {
            alert(t('addressRequired')); return;
        }
        if (deliveryType === 'pickup' && !selectedBranch) {
            alert(t('branchRequired')); return;
        }

        setSubmitting(true);
        try {
            const fullAddress = deliveryType === 'delivery'
                ? [address, house && `Uy: ${house}`, entrance && `Kirish: ${entrance}`, floor && `Qavat: ${floor}`, apartment && `Kv: ${apartment}`].filter(Boolean).join(', ')
                : '';

            const payload = {
                items: items.map(i => ({ productId: i.productId, qty: i.qty, note: i.note || '' })),
                deliveryType,
                address: fullAddress,
                addressLat: deliveryType === 'delivery' ? coords?.lat : undefined,
                addressLng: deliveryType === 'delivery' ? coords?.lng : undefined,
                branch: selectedBranch || branches[0]?._id,
                paymentMethod,
                phone: user?.phone || '',
                extraPhone,
                bonusDiscount: actualBonus,
                promoCode: promoInput.trim().toUpperCase() || undefined,
                notes: comment,
                deliveryDate: deliveryDate || undefined,
                deliveryTime: deliveryTime || undefined,
            };
            const r = await api.post('/orders', payload);
            clearCart();

            const orderNum = r.data.orderNumber || r.data._id?.slice(-6).toUpperCase();
            const payUrl = encodeURIComponent(r.data.paymentUrl || '');
            if (paymentMethod === 'payme') {
                navigate(`/payment?orderId=${r.data._id}&method=payme&total=${grandTotal}&orderNum=${orderNum}&payUrl=${payUrl}`);
            } else if (paymentMethod === 'click') {
                navigate(`/payment?orderId=${r.data._id}&method=click&total=${grandTotal}&orderNum=${orderNum}&payUrl=${payUrl}`);
            } else {
                navigate(`/payment?orderId=${r.data._id}&method=cash&orderNum=${orderNum}`);
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
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '80px 20px', textAlign: 'center',
                }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: 24,
                        background: 'rgba(212,160,23,0.08)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 20,
                    }}>🛒</div>
                    <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{t('cartEmpty')}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>{t('cartEmptyText')}</div>
                    <button onClick={() => navigate('/menu')} style={{
                        padding: '14px 32px',
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                        border: 'none', borderRadius: 14, color: '#1a1a24',
                        fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>🍽 {t('goToMenu')}</button>
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <>
            {showMap && (
                <MapModal
                    onConfirm={handleMapConfirm}
                    onClose={() => setShowMap(false)}
                    initialAddress={address}
                />
            )}

            {showPhoneModal && (
                <PhoneAuthModal
                    onClose={() => setShowPhoneModal(false)}
                    onVerified={() => {
                        setShowPhoneModal(false);
                        // Tasdiqlangandan keyin buyurtmani davom ettirish
                        setTimeout(handleOrder, 100);
                    }}
                />
            )}

            <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 140 }}>
                <div style={{ padding: '16px 16px 8px' }}>
                    <div style={{ fontWeight: 800, fontSize: 20 }}>🛒 Savat</div>
                </div>

                {/* ── Items ── */}
                <div style={{ padding: '0 16px 16px' }}>
                    {items.map(item => (
                        <div key={item.productId} style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 16, padding: 14, marginBottom: 10,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{item.name}</div>
                                    <div style={{
                                        fontSize: 14, fontWeight: 700,
                                        background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    }}>{(item.price * item.qty).toLocaleString()} so'm</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <QtyBtn onClick={() => updateQty(item.productId, item.qty - 1)}>−</QtyBtn>
                                    <span style={{ fontWeight: 800, fontSize: 15, minWidth: 22, textAlign: 'center' }}>{item.qty}</span>
                                    <QtyBtn primary onClick={() => updateQty(item.productId, item.qty + 1)}>+</QtyBtn>
                                </div>
                            </div>
                            <input
                                value={item.note || ''}
                                onChange={e => updateNote(item.productId, e.target.value)}
                                placeholder={t('itemNotePlaceholder')}
                                style={IS}
                                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                    ))}
                </div>

                {/* ── Delivery Type ── */}
                <Section title="🚗 Yetkazib berish usuli">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                            { k: 'delivery', label: '🚗 Yetkazib berish' },
                            { k: 'pickup', label: '🏃 Olib ketish' },
                        ].map(dt => (
                            <button key={dt.k} onClick={() => setDeliveryType(dt.k)} style={{
                                padding: '13px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                                background: deliveryType === dt.k
                                    ? 'linear-gradient(135deg, var(--primary), var(--primary-light))'
                                    : 'var(--bg-card)',
                                border: `1px solid ${deliveryType === dt.k ? 'transparent' : 'var(--border)'}`,
                                color: deliveryType === dt.k ? '#1a1a24' : 'var(--text)',
                                fontWeight: 700, fontSize: 13, transition: 'all 0.25s',
                            }}>{dt.label}</button>
                        ))}
                    </div>
                </Section>

                {/* ── Address / Branch ── */}
                {deliveryType === 'delivery' ? (
                    <Section title="📍 Manzil">
                        <button onClick={() => setShowMap(true)} style={{
                            width: '100%', padding: '13px 16px',
                            background: address ? 'var(--bg-card)' : 'var(--bg-secondary)',
                            border: `1.5px solid ${address ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: 14, color: address ? 'var(--text)' : 'var(--text-secondary)',
                            fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                            textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                            marginBottom: 10, fontWeight: address ? 600 : 400,
                            boxShadow: address ? '0 0 0 3px rgba(212,160,23,0.1)' : 'none',
                        }}>
                            <span style={{ fontSize: 18 }}>📍</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {address || 'Xaritadan tanlang'}
                            </span>
                            <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 700 }}>
                                {address ? 'O\'zgartirish' : 'Tanlash'}
                            </span>
                        </button>

                        {/* Address details */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                            <MiniInput value={house} onChange={setHouse} placeholder="Uy №" />
                            <MiniInput value={entrance} onChange={setEntrance} placeholder="Kirish" />
                            <MiniInput value={floor} onChange={setFloor} placeholder="Qavat" />
                            <MiniInput value={apartment} onChange={setApartment} placeholder="Kvartira" />
                        </div>
                        <input
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Mo'ljal (ixtiyoriy)"
                            style={IS}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                    </Section>
                ) : (
                    <Section title="🏢 Filialni tanlang">
                        {branches.length === 0 ? (
                            <div style={{
                                padding: '16px 14px', background: 'var(--bg-card)',
                                border: '1px dashed var(--border)', borderRadius: 14,
                                color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center',
                            }}>
                                Hozircha faol filial yo'q. Iltimos, yetkazib berishni tanlang.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {branches.map(b => (
                                    <label key={b._id} style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '13px 16px', background: 'var(--bg-card)',
                                        border: `1.5px solid ${selectedBranch === b._id ? 'var(--primary)' : 'var(--border)'}`,
                                        borderRadius: 14, cursor: 'pointer',
                                        boxShadow: selectedBranch === b._id ? '0 0 0 3px rgba(212,160,23,0.08)' : 'none',
                                    }}>
                                        <input type="radio" name="branch" value={b._id}
                                            checked={selectedBranch === b._id}
                                            onChange={() => setSelectedBranch(b._id)}
                                            style={{ accentColor: 'var(--primary)', width: 18, height: 18 }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name || `Filial #${b.number}`}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{b.address}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </Section>
                )}

                {/* ── Delivery Time ── */}
                <Section title="🕐 Yetkazib berish vaqti">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Sana</div>
                            <input
                                type="date"
                                value={deliveryDate}
                                min={todayStr()}
                                onChange={e => setDeliveryDate(e.target.value)}
                                style={{ ...IS, marginBottom: 0, colorScheme: 'dark', fontSize: 13 }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>Vaqt (ixtiyoriy)</div>
                            <input
                                type="time"
                                value={deliveryTime}
                                onChange={e => setDeliveryTime(e.target.value)}
                                style={{ ...IS, marginBottom: 0, colorScheme: 'dark', fontSize: 13 }}
                            />
                        </div>
                    </div>
                </Section>

                {/* ── Extra phone ── */}
                <Section title="📞 Qo'shimcha telefon (ixtiyoriy)">
                    <input
                        value={extraPhone}
                        onChange={e => setExtraPhone(e.target.value)}
                        placeholder="+998 90 123 45 67"
                        type="tel"
                        style={IS}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                </Section>

                {/* ── Payment ── */}
                <Section title="💳 To'lov turi">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {PAY_METHODS.map(m => (
                            <label key={m.key} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '13px 16px', background: 'var(--bg-card)',
                                border: `1.5px solid ${paymentMethod === m.key ? 'var(--primary)' : 'var(--border)'}`,
                                borderRadius: 14, cursor: 'pointer',
                                boxShadow: paymentMethod === m.key ? '0 0 0 3px rgba(212,160,23,0.08)' : 'none',
                                transition: 'all 0.25s',
                            }}>
                                <input type="radio" name="pay" value={m.key}
                                    checked={paymentMethod === m.key}
                                    onChange={() => setPaymentMethod(m.key)}
                                    style={{ accentColor: 'var(--primary)', width: 18, height: 18 }}
                                />
                                <PaymentIcon method={m.key} size={24} />
                                <span style={{ fontWeight: 600, fontSize: 15 }}>{m.label}</span>
                            </label>
                        ))}
                    </div>
                </Section>

                {/* ── Promo code ── */}
                <Section title="🎟 Promo kod">
                    {promoData ? (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 16px', background: 'rgba(46,204,113,0.08)',
                            border: '1.5px solid rgba(46,204,113,0.3)', borderRadius: 14,
                        }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#2ecc71' }}>✅ {promoData.title || promoInput}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                    −{promoData.discountAmount.toLocaleString()} so'm chegirma
                                </div>
                            </div>
                            <button onClick={() => { setPromoData(null); setPromoInput(''); }} style={{
                                background: 'none', border: 'none', color: '#e74c3c',
                                fontSize: 18, cursor: 'pointer', padding: '4px 8px',
                            }}>✕</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                value={promoInput}
                                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                                placeholder="Masalan: EFES10"
                                style={{ ...IS, marginBottom: 0, flex: 1, textTransform: 'uppercase' }}
                                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                onBlur={e => e.target.style.borderColor = promoError ? '#e74c3c' : 'var(--border)'}
                                onKeyDown={e => e.key === 'Enter' && handlePromoCheck()}
                            />
                            <button onClick={handlePromoCheck} disabled={promoLoading || !promoInput.trim()} style={{
                                padding: '0 18px', flexShrink: 0,
                                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                                border: 'none', borderRadius: 14, color: '#1a1a24',
                                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                opacity: (!promoInput.trim() || promoLoading) ? 0.5 : 1,
                            }}>
                                {promoLoading ? '...' : "Qo'llash"}
                            </button>
                        </div>
                    )}
                    {promoError && (
                        <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 6 }}>⚠ {promoError}</div>
                    )}
                </Section>

                {/* ── Bonus ── */}
                {(user?.bonusPoints || 0) > 0 && (
                    <Section title="🎁 Bonus">
                        <label style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '14px 16px', background: 'var(--bg-card)',
                            border: `1.5px solid ${useBonus ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: 14, cursor: 'pointer',
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{t('useBonus')}</div>
                                <div style={{ fontSize: 12, color: 'var(--primary-light)', marginTop: 2 }}>
                                    {user.bonusPoints} {t('bonusAvailable')}
                                    {useBonus && actualBonus > 0 && ` → −${actualBonus.toLocaleString()} so'm`}
                                </div>
                            </div>
                            <input type="checkbox" checked={useBonus}
                                onChange={e => setUseBonus(e.target.checked)}
                                style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
                            />
                        </label>
                    </Section>
                )}

                {/* ── Summary ── */}
                <div style={{
                    margin: '0 16px 16px', background: 'var(--bg-card)',
                    border: '1px solid var(--border)', borderRadius: 18, padding: 18,
                }}>
                    <SRow label={`Mahsulotlar (${totalItems} ta)`} value={`${totalPrice.toLocaleString()} so'm`} />
                    <SRow label="Yetkazib berish" value={deliveryCost === 0 ? 'Bepul' : `${deliveryCost.toLocaleString()} so'm`} />
                    {actualBonus > 0 && <SRow label="Bonus chegirma" value={`−${actualBonus.toLocaleString()} so'm`} color="#2ecc71" />}
                    {promoDiscount > 0 && <SRow label="Promo chegirma" value={`−${promoDiscount.toLocaleString()} so'm`} color="#2ecc71" />}
                    <div style={{
                        borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ fontWeight: 800, fontSize: 16 }}>Jami</span>
                        <span style={{
                            fontWeight: 900, fontSize: 22,
                            background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>{grandTotal.toLocaleString()} so'm</span>
                    </div>
                </div>

                {/* ── Order Button — BottomNav ustida joylashtirilgan ── */}
                <div style={{
                    position: 'fixed', bottom: 72, left: 0, right: 0,
                    background: 'rgba(13,13,20,0.95)', borderTop: '1px solid var(--border)',
                    padding: '12px 16px 12px', backdropFilter: 'blur(20px)',
                    zIndex: 110,
                }}>
                    <button
                        onClick={handleOrder}
                        disabled={submitting}
                        style={{
                            width: '100%', maxWidth: 480, margin: '0 auto', display: 'block',
                            padding: '16px',
                            background: submitting ? '#444' : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                            border: 'none', borderRadius: 16,
                            color: submitting ? '#999' : '#1a1a24',
                            fontSize: 16, fontWeight: 800, cursor: submitting ? 'default' : 'pointer',
                            fontFamily: 'inherit',
                            boxShadow: submitting ? 'none' : '0 4px 20px rgba(212,160,23,0.35)',
                        }}
                    >
                        {submitting ? `⏳ ${t('ordering')}` : `🍽 Buyurtma berish • ${grandTotal.toLocaleString()} so'm`}
                    </button>
                </div>

                <BottomNav />
            </div>
        </>
    );
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

function Section({ title, children }) {
    return (
        <div style={{ padding: '0 16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)' }}>{title}</div>
            {children}
        </div>
    );
}

function SRow({ label, value, color }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontWeight: 600, color: color || 'var(--text)' }}>{value}</span>
        </div>
    );
}

function QtyBtn({ onClick, primary, children }) {
    return (
        <button onClick={onClick} style={{
            width: 32, height: 32, borderRadius: 10,
            background: primary
                ? 'linear-gradient(135deg, var(--primary), var(--primary-light))'
                : 'var(--bg-secondary)',
            border: primary ? 'none' : '1px solid var(--border)',
            color: primary ? '#1a1a24' : 'var(--text)',
            fontSize: 16, cursor: 'pointer', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{children}</button>
    );
}

function MiniInput({ value, onChange, placeholder }) {
    return (
        <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
                width: '100%', padding: '11px 12px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, color: 'var(--text)', fontSize: 13,
                outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
    );
}

const IS = {
    width: '100%', padding: '12px 14px', marginBottom: 0,
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 13, color: 'var(--text)', fontSize: 14,
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.25s',
    display: 'block',
};

// ── Telefon orqali kirish modal (checkout da) ─────────────────────────────
function PhoneAuthModal({ onClose, onVerified }) {
    const { setUser } = useAuth();
    const [step, setStep] = useState('phone'); // 'phone' | 'otp'
    const [phone, setPhone] = useState('+998');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown(c => c - 1), 1000);
        return () => clearInterval(timer);
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
            onVerified();
        } catch (e) {
            setError(e.response?.data?.error || "Kod noto'g'ri");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        setError(''); setCode(''); setLoading(true);
        try {
            await api.post('/auth/send-otp', { phone });
            setCooldown(60);
        } catch (e) {
            setError(e.response?.data?.error || 'Xato');
        } finally {
            setLoading(false);
        }
    };

    return (
        // Backdrop
        <div
            onClick={e => e.target === e.currentTarget && onClose()}
            style={{
                position: 'fixed', inset: 0, zIndex: 300,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'flex-end',
            }}
        >
            {/* Bottom sheet */}
            <div style={{
                width: '100%', background: 'var(--bg-card)',
                borderRadius: '22px 22px 0 0',
                padding: '24px 20px 40px',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
                animation: 'slideUp 0.25s ease',
            }}>
                {/* Handle */}
                <div style={{
                    width: 40, height: 4, borderRadius: 2,
                    background: 'var(--border)', margin: '0 auto 20px',
                }} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: 20 }}>Kirish</div>
                    <button onClick={onClose} style={{
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 10, width: 32, height: 32,
                        color: 'var(--text-secondary)', fontSize: 16,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                </div>

                {step === 'phone' && (
                    <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                            Telefon raqami *
                        </div>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => { handlePhoneInput(e.target.value); setError(''); }}
                            placeholder="+998 90 123 45 67"
                            autoFocus
                            style={{
                                ...IS, marginBottom: 8,
                                fontSize: 16, padding: '14px',
                                border: `1.5px solid ${error ? '#e74c3c' : 'var(--border)'}`,
                                borderRadius: 14,
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = error ? '#e74c3c' : 'var(--border)'}
                        />
                        {error && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 8 }}>{error}</div>}

                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                            Kod <b>@{BOT_USERNAME}</b> Telegram botiga yuboriladi.
                            Avval botni ochib qo'ying.
                        </div>

                        <a href={`https://t.me/${BOT_USERNAME}`} target="_blank" rel="noreferrer" style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '11px 14px', marginBottom: 14,
                            background: 'rgba(0,136,204,0.08)', border: '1px solid rgba(0,136,204,0.18)',
                            borderRadius: 13, color: '#0088cc', fontSize: 13,
                            fontWeight: 600, textDecoration: 'none',
                        }}>
                            <span style={{ fontSize: 18 }}>✈️</span>
                            <span>Botni ochish: <b>@{BOT_USERNAME}</b></span>
                        </a>

                        <button
                            onClick={handleSend}
                            disabled={loading || !isPhoneValid}
                            style={{
                                width: '100%', padding: '16px',
                                background: loading || !isPhoneValid
                                    ? 'var(--bg-secondary)'
                                    : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                                border: 'none', borderRadius: 15,
                                color: loading || !isPhoneValid ? 'var(--text-secondary)' : '#1a1a24',
                                fontSize: 16, fontWeight: 800, cursor: loading ? 'wait' : 'pointer',
                                fontFamily: 'inherit',
                                boxShadow: !loading && isPhoneValid ? '0 4px 18px rgba(212,160,23,0.35)' : 'none',
                            }}
                        >
                            {loading ? '⏳ Yuborilmoqda...' : 'Davom etish'}
                        </button>
                    </>
                )}

                {step === 'otp' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ fontSize: 40, marginBottom: 10 }}>✈️</div>
                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Kod yuborildi</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                <b>@{BOT_USERNAME}</b> botini oching va<br />
                                u yerdan 6 xonali kodni kiriting
                            </div>
                        </div>

                        <a href={`https://t.me/${BOT_USERNAME}`} target="_blank" rel="noreferrer" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '12px', marginBottom: 14,
                            background: 'rgba(0,136,204,0.1)', border: '1px solid rgba(0,136,204,0.2)',
                            borderRadius: 13, color: '#0088cc', fontSize: 14,
                            fontWeight: 700, textDecoration: 'none',
                        }}>
                            ✈️ Botni ochish
                        </a>

                        <input
                            type="number"
                            inputMode="numeric"
                            value={code}
                            onChange={e => { setCode(e.target.value.slice(0, 6)); setError(''); }}
                            placeholder="• • • • • •"
                            autoFocus
                            style={{
                                ...IS, marginBottom: 8,
                                textAlign: 'center', fontSize: 24,
                                fontWeight: 900, letterSpacing: 8,
                                padding: '14px', borderRadius: 14,
                                border: `1.5px solid ${error ? '#e74c3c' : 'var(--border)'}`,
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.target.style.borderColor = error ? '#e74c3c' : 'var(--border)'}
                        />
                        {error && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 8 }}>{error}</div>}

                        <button
                            onClick={handleVerify}
                            disabled={loading || code.length < 6}
                            style={{
                                width: '100%', padding: '16px', marginBottom: 12,
                                background: loading || code.length < 6
                                    ? 'var(--bg-secondary)'
                                    : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                                border: 'none', borderRadius: 15,
                                color: loading || code.length < 6 ? 'var(--text-secondary)' : '#1a1a24',
                                fontSize: 16, fontWeight: 800, cursor: loading ? 'wait' : 'pointer',
                                fontFamily: 'inherit',
                                boxShadow: !loading && code.length >= 6 ? '0 4px 18px rgba(212,160,23,0.35)' : 'none',
                            }}
                        >
                            {loading ? '⏳ Tekshirilmoqda...' : '✅ Tasdiqlash'}
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <button onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                                ← Orqaga
                            </button>
                            <button
                                onClick={cooldown > 0 ? undefined : handleResend}
                                disabled={cooldown > 0 || loading}
                                style={{
                                    background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13,
                                    cursor: cooldown > 0 ? 'default' : 'pointer',
                                    color: cooldown > 0 ? 'var(--text-secondary)' : 'var(--primary-light)',
                                    fontWeight: 600,
                                }}
                            >
                                {cooldown > 0 ? `Qayta yuborish (${cooldown}s)` : 'Qayta yuborish'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to   { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
