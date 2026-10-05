import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, MAX_QTY } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useT, fmt } from '../i18n';
import api from '../api';
import BottomNav from '../components/BottomNav';
import MapModal from '../components/MapModal';
import { PaymentIcon } from '../components/BrandIcon';

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const hasLoc = (b) => !!(b.location?.lat && b.location?.lng);

// Toshkent vaqti bo'yicha bugungi sana (YYYY-MM-DD) va hozirgi soat (HH:mm)
function tashkentNow() {
    const d = new Date(Date.now() + 5 * 3600 * 1000);
    return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
}

function initialPhone(user) {
    const digits = String(user?.phone || '').replace(/\D/g, '');
    return /^998\d{9}$/.test(digits) ? `+${digits}` : '+998';
}

export default function Cart() {
    const { t } = useT();
    const navigate = useNavigate();
    const { user, setUser } = useAuth();
    const { items, updateQty, updateNote, removeItem, clearCart, syncWithServer, totalPrice, totalItems } = useCart();

    const [deliveryType, setDeliveryType] = useState(localStorage.getItem('efes_delivery_type') || 'delivery');
    const [paymentMethod, setPaymentMethod] = useState('payme');

    const [address, setAddress] = useState(localStorage.getItem('efes_address') || '');
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

    // Vaqt: bo'sh = imkon qadar tez
    const [scheduled, setScheduled] = useState(false);
    const [deliveryDate, setDeliveryDate] = useState(tashkentNow().date);
    const [deliveryTime, setDeliveryTime] = useState('');

    const [phone, setPhone] = useState(() => initialPhone(user));
    const [phoneError, setPhoneError] = useState('');

    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [deliveryConfig, setDeliveryConfig] = useState({
        deliveryCost: 10000, freeDeliveryThreshold: 0, maxBonusPercent: 20, minOrderAmount: 0, estimatedDeliveryTime: 30,
    });
    const [shopStatus, setShopStatus] = useState({ isOpen: true, workHours: '' });

    const [useBonus, setUseBonus] = useState(false);
    const [promoInput, setPromoInput] = useState('');
    const [promoData, setPromoData] = useState(null);
    const [promoError, setPromoError] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);

    const [notice, setNotice] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const syncedRef = useRef(false);

    const openBranches = useMemo(() => branches.filter(b => b.isOpen !== false), [branches]);

    // Yetkazishda — manzilga eng yaqin ochiq filial (server ham shu qoida bilan tanlaydi)
    const deliveryBranch = useMemo(() => {
        if (openBranches.length === 0) return null;
        if (!coords) return openBranches[0];
        const ranked = openBranches.filter(hasLoc)
            .map(b => ({ b, dist: haversineKm(coords.lat, coords.lng, b.location.lat, b.location.lng) }))
            .sort((a, z) => a.dist - z.dist);
        if (ranked.length === 0) return openBranches[0];
        return (ranked.find(r => !(r.b.deliveryRadius > 0) || r.dist <= r.b.deliveryRadius) || ranked[0]).b;
    }, [openBranches, coords]);

    const radiusStatus = useMemo(() => {
        if (deliveryType !== 'delivery' || !coords || !deliveryBranch || !hasLoc(deliveryBranch) || !deliveryBranch.deliveryRadius) return null;
        const dist = haversineKm(coords.lat, coords.lng, deliveryBranch.location.lat, deliveryBranch.location.lng);
        return { dist: parseFloat(dist.toFixed(1)), radius: deliveryBranch.deliveryRadius, ok: dist <= deliveryBranch.deliveryRadius };
    }, [coords, deliveryBranch, deliveryType]);

    const minOrder = deliveryType === 'delivery'
        ? Math.max(deliveryConfig.minOrderAmount || 0, deliveryBranch?.minOrderAmount || 0)
        : 0;
    const belowMin = minOrder > 0 && totalPrice < minOrder;

    const freeDelivery = deliveryConfig.freeDeliveryThreshold > 0 && totalPrice >= deliveryConfig.freeDeliveryThreshold;
    const deliveryCost = deliveryType === 'delivery' ? (freeDelivery ? 0 : deliveryConfig.deliveryCost) : 0;
    const promoDiscount = promoData?.discountAmount || 0;
    const maxBonus = Math.max(0, Math.min(Math.floor(totalPrice * ((deliveryConfig.maxBonusPercent || 0) / 100)), totalPrice - promoDiscount));
    const actualBonus = useBonus ? Math.min(user?.bonusPoints || 0, maxBonus) : 0;
    const grandTotal = Math.max(0, totalPrice - actualBonus - promoDiscount + deliveryCost);

    // ── Boshlang'ich ma'lumotlar ──
    useEffect(() => {
        api.get('/branches').then(r => setBranches((r.data || []).filter(b => b.isActive))).catch(() => { });
        api.get('/delivery/config').then(r => {
            setDeliveryConfig(prev => ({ ...prev, ...r.data }));
            const avail = r.data?.paymentMethods;
            if (avail?.length) setPaymentMethod(m => avail.includes(m) ? m : avail[0]);
        }).catch(() => { });
        api.get('/branches/status').then(r => setShopStatus(r.data || { isOpen: true })).catch(() => { });
        // Bonus balansi eskirgan bo'lmasligi uchun profilni yangilash
        api.get('/user/profile').then(r => { if (r.data) setUser(r.data); }).catch(() => { });
    }, []);

    // Savatni serverdagi narx/holat bilan sinxronlash (bir marta)
    useEffect(() => {
        if (syncedRef.current || items.length === 0) return;
        syncedRef.current = true;
        refreshCart();
    }, [items.length]);

    const refreshCart = async () => {
        try {
            const ids = items.map(i => i.productId).join(',');
            const r = await api.get(`/products?ids=${ids}&limit=100`);
            if (syncWithServer(r.data.products || [])) setNotice(t('cartUpdated'));
        } catch { /* tarmoq xatosi — server buyurtmada baribir tekshiradi */ }
    };

    useEffect(() => {
        if (deliveryType === 'pickup' && !selectedBranch && openBranches.length === 1) setSelectedBranch(openBranches[0]._id);
    }, [deliveryType, openBranches]);

    // Savat o'zgarsa qo'llangan promo chegirmasi qayta hisoblanadi
    useEffect(() => {
        if (promoData) checkPromo(promoData.code || promoInput, true);
    }, [totalPrice]);

    const checkPromo = async (code, silent = false) => {
        if (!String(code || '').trim()) return;
        setPromoLoading(true);
        if (!silent) setPromoError('');
        try {
            const r = await api.post('/promotions/check', {
                code: code.trim().toUpperCase(),
                orderAmount: totalPrice,
                items: items.map(i => ({ productId: i.productId, qty: i.qty })),
            });
            setPromoData(r.data);
            setPromoError('');
        } catch (err) {
            setPromoData(null);
            setPromoError(err.response?.data?.error || t('promoInvalid'));
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

    const chooseDeliveryType = (k) => {
        setDeliveryType(k);
        localStorage.setItem('efes_delivery_type', k);
    };

    const handleOrder = async () => {
        if (shopStatus && shopStatus.isOpen === false) {
            alert(t('shopClosed', { hours: shopStatus.workHours }));
            return;
        }
        if (deliveryType === 'delivery' && !address.trim()) { alert(t('addressRequired')); setShowMap(true); return; }
        if (deliveryType === 'pickup' && !selectedBranch) { alert(t('branchRequired')); return; }
        if (radiusStatus && !radiusStatus.ok) {
            alert(t('outOfZone', { dist: radiusStatus.dist, radius: radiusStatus.radius }));
            return;
        }
        if (belowMin) { alert(t('minOrderHint', { min: fmt(minOrder), left: fmt(minOrder - totalPrice) })); return; }
        if (!/^\+998\d{9}$/.test(phone)) {
            setPhoneError(t('phoneInvalid'));
            document.getElementById('extra-phone-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setPhoneError('');
        if (scheduled) {
            const now = tashkentNow();
            if (!deliveryTime || `${deliveryDate} ${deliveryTime}` < `${now.date} ${now.time}`) {
                alert(t('timeInPast'));
                return;
            }
        }

        setSubmitting(true);
        try {
            const fullAddress = deliveryType === 'delivery'
                ? [address,
                    house && `${t('house')} ${house}`,
                    entrance && `${t('entrance')}: ${entrance}`,
                    floor && `${t('floor')}: ${floor}`,
                    apartment && `${t('apartment')}: ${apartment}`].filter(Boolean).join(', ')
                : '';

            const payload = {
                items: items.map(i => ({ productId: i.productId, qty: i.qty, note: i.note || '' })),
                deliveryType,
                address: fullAddress,
                addressLat: deliveryType === 'delivery' ? coords?.lat : undefined,
                addressLng: deliveryType === 'delivery' ? coords?.lng : undefined,
                branch: deliveryType === 'pickup' ? selectedBranch : deliveryBranch?._id,
                paymentMethod,
                extraPhone: phone,
                bonusDiscount: actualBonus,
                promoCode: promoData ? (promoData.code || promoInput.trim().toUpperCase()) : undefined,
                notes: comment.trim(),
                deliveryDate: scheduled ? deliveryDate : undefined,
                deliveryTime: scheduled ? deliveryTime : undefined,
            };
            const r = await api.post('/orders', payload);
            clearCart();

            const q = new URLSearchParams({
                orderId: r.data._id,
                method: r.data.paymentMethod,
                total: String(r.data.total),
                orderNum: r.data.orderNumber,
                eta: String(r.data.estimatedTime || deliveryConfig.estimatedDeliveryTime || 30),
                type: deliveryType,
            });
            if (scheduled) q.set('when', `${deliveryDate} ${deliveryTime}`);
            if (r.data.paymentUrl) q.set('payUrl', r.data.paymentUrl);
            navigate(`/payment?${q}`, { replace: true });
        } catch (err) {
            const data = err.response?.data || {};
            if (data.code === 'PRODUCTS_UNAVAILABLE') await refreshCart();
            if (data.code === 'PROMO_INVALID') { setPromoData(null); setPromoError(data.error); }
            alert(data.error || t('serverConnectError'));
        } finally {
            setSubmitting(false);
        }
    };

    if (totalItems === 0) {
        return (
            <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 90 }}>
                <div style={{ padding: '16px 16px 0' }}>
                    <div style={{ fontWeight: 800, fontSize: 20 }}>🛒 {t('cartTitle')}</div>
                </div>
                {notice && <Notice text={notice} onClose={() => setNotice('')} />}
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
                    <button onClick={() => navigate('/menu')} style={goldBtn}>🍽 {t('goToMenu')}</button>
                </div>
                <BottomNav />
            </div>
        );
    }

    const PAY_METHODS = [
        { key: 'payme', label: 'Payme' },
        { key: 'click', label: 'Click' },
        { key: 'cash', label: t('cashLabel') },
    ].filter(m => !deliveryConfig.paymentMethods || deliveryConfig.paymentMethods.includes(m.key));

    return (
        <>
            {showMap && (
                <MapModal
                    onConfirm={handleMapConfirm}
                    onClose={() => setShowMap(false)}
                    initialAddress={address}
                />
            )}

            <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 160 }}>
                {shopStatus && shopStatus.isOpen === false && (
                    <div style={{ ...banner, background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', color: '#e74c3c', textAlign: 'center' }}>
                        🌙 {t('shopClosed', { hours: shopStatus.workHours })}
                    </div>
                )}
                {notice && <Notice text={notice} onClose={() => setNotice('')} />}

                <div style={{ padding: '16px 16px 8px' }}>
                    <div style={{ fontWeight: 800, fontSize: 20 }}>🛒 {t('cartTitle')}</div>
                </div>

                {/* ── Items ── */}
                <div style={{ padding: '0 16px 16px' }}>
                    {items.map(item => (
                        <div key={item.productId} style={{
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 16, padding: 14, marginBottom: 10,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{item.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmt(item.price)} {t('sum')}</div>
                                    <div style={goldText}>{fmt(item.price * item.qty)} {t('sum')}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <QtyBtn onClick={() => updateQty(item.productId, item.qty - 1)} label="−">{item.qty === 1 ? '🗑' : '−'}</QtyBtn>
                                    <span style={{ fontWeight: 800, fontSize: 15, minWidth: 22, textAlign: 'center' }}>{item.qty}</span>
                                    <QtyBtn primary disabled={item.qty >= MAX_QTY} onClick={() => updateQty(item.productId, item.qty + 1)} label="+">+</QtyBtn>
                                </div>
                            </div>
                            <input
                                value={item.note || ''}
                                onChange={e => updateNote(item.productId, e.target.value)}
                                placeholder={t('itemNotePlaceholder')}
                                maxLength={200}
                                style={IS}
                            />
                        </div>
                    ))}
                </div>

                {/* ── Delivery Type ── */}
                <Section title={`🚗 ${t('deliveryMethod')}`}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                            { k: 'delivery', label: `🚗 ${t('delivery')}` },
                            { k: 'pickup', label: `🏃 ${t('pickup')}` },
                        ].map(dt => (
                            <button key={dt.k} onClick={() => chooseDeliveryType(dt.k)} style={toggleBtn(deliveryType === dt.k)}>{dt.label}</button>
                        ))}
                    </div>
                </Section>

                {/* ── Address / Branch ── */}
                {deliveryType === 'delivery' ? (
                    <Section title={`📍 ${t('addressSection')}`}>
                        <button onClick={() => setShowMap(true)} style={{
                            width: '100%', padding: '13px 16px',
                            background: address ? 'var(--bg-card)' : 'var(--bg-secondary)',
                            border: `1.5px solid ${address ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: 14, color: address ? 'var(--text)' : 'var(--text-secondary)',
                            fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                            textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                            marginBottom: 10, fontWeight: address ? 600 : 400,
                        }}>
                            <span style={{ fontSize: 18 }}>📍</span>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {address || t('chooseOnMap')}
                            </span>
                            <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 700 }}>
                                {address ? t('change') : t('choose')}
                            </span>
                        </button>

                        {radiusStatus && (
                            <div style={{
                                ...hint,
                                background: radiusStatus.ok ? 'rgba(39,174,96,0.08)' : 'rgba(231,76,60,0.08)',
                                border: `1px solid ${radiusStatus.ok ? 'rgba(39,174,96,0.2)' : 'rgba(231,76,60,0.25)'}`,
                                color: radiusStatus.ok ? '#27ae60' : '#e74c3c',
                            }}>
                                <span>{radiusStatus.ok ? '✅' : '⚠️'}</span>
                                <span>{radiusStatus.ok
                                    ? t('inZone', { dist: radiusStatus.dist })
                                    : t('outOfZone', { dist: radiusStatus.dist, radius: radiusStatus.radius })}</span>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                            <MiniInput value={house} onChange={setHouse} placeholder={t('house')} />
                            <MiniInput value={entrance} onChange={setEntrance} placeholder={t('entrance')} />
                            <MiniInput value={floor} onChange={setFloor} placeholder={t('floor')} />
                            <MiniInput value={apartment} onChange={setApartment} placeholder={t('apartment')} />
                        </div>
                        <input value={comment} onChange={e => setComment(e.target.value)} placeholder={t('landmark')} maxLength={300} style={IS} />
                    </Section>
                ) : (
                    <Section title={`🏢 ${t('chooseBranch')}`}>
                        {branches.length === 0 ? (
                            <div style={{
                                padding: '16px 14px', background: 'var(--bg-card)',
                                border: '1px dashed var(--border)', borderRadius: 14,
                                color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center',
                            }}>{t('noActiveBranch')}</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {branches.map(b => {
                                    const closed = b.isOpen === false;
                                    return (
                                        <label key={b._id} style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '13px 16px', background: 'var(--bg-card)',
                                            border: `1.5px solid ${selectedBranch === b._id ? 'var(--primary)' : 'var(--border)'}`,
                                            borderRadius: 14, cursor: closed ? 'not-allowed' : 'pointer', opacity: closed ? 0.5 : 1,
                                        }}>
                                            <input type="radio" name="branch" value={b._id} disabled={closed}
                                                checked={selectedBranch === b._id}
                                                onChange={() => setSelectedBranch(b._id)}
                                                style={{ accentColor: 'var(--primary)', width: 18, height: 18 }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name || `#${b.number}`}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    {closed ? `🔒 ${t('branchClosedNow')}` : [b.address, b.hours].filter(Boolean).join(' · ')}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {deliveryType === 'pickup' && (
                            <input value={comment} onChange={e => setComment(e.target.value)} placeholder={t('landmark')} maxLength={300} style={{ ...IS, marginTop: 10 }} />
                        )}
                    </Section>
                )}

                {/* ── Time ── */}
                <Section title={`🕐 ${deliveryType === 'pickup' ? t('timeSectionPickup') : t('timeSection')}`}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: scheduled ? 10 : 0 }}>
                        <button onClick={() => setScheduled(false)} style={toggleBtn(!scheduled)}>
                            ⚡ {t('asap')}
                            <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, marginTop: 2 }}>
                                {t('asapHint', { min: deliveryConfig.estimatedDeliveryTime || 30 })}
                            </div>
                        </button>
                        <button onClick={() => setScheduled(true)} style={toggleBtn(scheduled)}>📅 {t('scheduled')}</button>
                    </div>
                    {scheduled && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <div style={label}>{t('date')}</div>
                                <input type="date" value={deliveryDate} min={tashkentNow().date}
                                    onChange={e => setDeliveryDate(e.target.value)} style={{ ...IS, fontSize: 13 }} />
                            </div>
                            <div>
                                <div style={label}>{t('time')}</div>
                                <input type="time" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} style={{ ...IS, fontSize: 13 }} />
                            </div>
                        </div>
                    )}
                </Section>

                {/* ── Phone ── */}
                <Section title={`📞 ${t('phoneSection')} *`}>
                    <input
                        id="extra-phone-input"
                        value={phone}
                        onChange={e => {
                            let digits = e.target.value.replace(/\D/g, '');
                            if (!digits.startsWith('998')) digits = '998' + digits.replace(/^9?9?8?/, '');
                            setPhone('+' + digits.slice(0, 12));
                            if (phoneError) setPhoneError('');
                        }}
                        placeholder="+998 90 123 45 67"
                        type="tel"
                        inputMode="tel"
                        style={{ ...IS, border: `1.5px solid ${phoneError ? '#e74c3c' : 'var(--border)'}` }}
                    />
                    {phoneError && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 6 }}>{phoneError}</div>}
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 6 }}>{t('courierWillCall')}</div>
                </Section>

                {/* ── Payment ── */}
                <Section title={`💳 ${t('paymentSection')}`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {PAY_METHODS.map(m => (
                            <label key={m.key} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '13px 16px', background: 'var(--bg-card)',
                                border: `1.5px solid ${paymentMethod === m.key ? 'var(--primary)' : 'var(--border)'}`,
                                borderRadius: 14, cursor: 'pointer', transition: 'all 0.25s',
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
                <Section title={`🎟 ${t('promoSection')}`}>
                    {promoData ? (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 16px', background: 'rgba(46,204,113,0.08)',
                            border: '1.5px solid rgba(46,204,113,0.3)', borderRadius: 14,
                        }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#2ecc71' }}>✅ {promoData.code || promoInput}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                    {t('promoDiscountMsg', { amount: fmt(promoData.discountAmount) })}
                                </div>
                            </div>
                            <button aria-label={t('promoRemove')} onClick={() => { setPromoData(null); setPromoInput(''); }} style={{
                                background: 'none', border: 'none', color: '#e74c3c',
                                fontSize: 18, cursor: 'pointer', padding: '4px 8px',
                            }}>✕</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                value={promoInput}
                                onChange={e => { setPromoInput(e.target.value.toUpperCase().replace(/\s/g, '')); setPromoError(''); }}
                                placeholder={t('promoExample')}
                                maxLength={30}
                                style={{ ...IS, flex: 1, textTransform: 'uppercase' }}
                                onKeyDown={e => e.key === 'Enter' && checkPromo(promoInput)}
                            />
                            <button onClick={() => checkPromo(promoInput)} disabled={promoLoading || !promoInput.trim()} style={{
                                padding: '0 18px', flexShrink: 0,
                                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                                border: 'none', borderRadius: 14, color: '#1a1a24',
                                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                opacity: (!promoInput.trim() || promoLoading) ? 0.5 : 1,
                            }}>
                                {promoLoading ? '...' : t('apply')}
                            </button>
                        </div>
                    )}
                    {promoError && <div style={{ fontSize: 12, color: '#e74c3c', marginTop: 6 }}>⚠ {promoError}</div>}
                </Section>

                {/* ── Bonus ── */}
                {(user?.bonusPoints || 0) > 0 && maxBonus > 0 && (
                    <Section title={`🎁 ${t('bonusSection')}`}>
                        <label style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '14px 16px', background: 'var(--bg-card)',
                            border: `1.5px solid ${useBonus ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: 14, cursor: 'pointer',
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{t('useBonus')}</div>
                                <div style={{ fontSize: 12, color: 'var(--primary-light)', marginTop: 2 }}>
                                    {fmt(user.bonusPoints)} {t('bonusAvailable')}
                                    {useBonus && actualBonus > 0 && ` → −${fmt(actualBonus)} ${t('sum')}`}
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
                    <SRow label={t('itemsCount', { n: totalItems })} value={`${fmt(totalPrice)} ${t('sum')}`} />
                    {deliveryType === 'delivery' && (
                        <SRow label={t('deliveryFee')} value={deliveryCost === 0 ? t('freeLabel') : `${fmt(deliveryCost)} ${t('sum')}`} color={deliveryCost === 0 ? '#2ecc71' : undefined} />
                    )}
                    {actualBonus > 0 && <SRow label={t('bonusDiscountRow')} value={`−${fmt(actualBonus)} ${t('sum')}`} color="#2ecc71" />}
                    {promoDiscount > 0 && <SRow label={t('promoDiscountRow')} value={`−${fmt(promoDiscount)} ${t('sum')}`} color="#2ecc71" />}
                    {deliveryType === 'delivery' && !freeDelivery && deliveryConfig.freeDeliveryThreshold > totalPrice && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                            🚚 {t('freeDeliveryHint', { left: fmt(deliveryConfig.freeDeliveryThreshold - totalPrice) })}
                        </div>
                    )}
                    <div style={{
                        borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ fontWeight: 800, fontSize: 16 }}>{t('totalLabel')}</span>
                        <span style={{ ...goldText, fontWeight: 900, fontSize: 22 }}>{fmt(grandTotal)} {t('sum')}</span>
                    </div>
                </div>

                {/* ── Order Button — BottomNav ustida ── */}
                <div style={{
                    position: 'fixed', bottom: 72, left: 0, right: 0,
                    background: 'var(--bg)', borderTop: '1px solid var(--border)',
                    padding: '10px 16px 12px', zIndex: 110,
                }}>
                    {belowMin && (
                        <div style={{ fontSize: 12, color: '#e67e22', textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>
                            {t('minOrderHint', { min: fmt(minOrder), left: fmt(minOrder - totalPrice) })}
                        </div>
                    )}
                    <button
                        onClick={handleOrder}
                        disabled={submitting || belowMin}
                        style={{
                            width: '100%', maxWidth: 480, margin: '0 auto', display: 'block',
                            padding: '16px',
                            background: (submitting || belowMin) ? '#555' : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                            border: 'none', borderRadius: 16,
                            color: (submitting || belowMin) ? '#bbb' : '#1a1a24',
                            fontSize: 16, fontWeight: 800, cursor: (submitting || belowMin) ? 'default' : 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        {submitting ? `⏳ ${t('ordering')}` : `🍽 ${t('orderBtn', { amount: fmt(grandTotal) })}`}
                    </button>
                </div>

                <BottomNav />
            </div>
        </>
    );
}

function Notice({ text, onClose }) {
    return (
        <div style={{ ...banner, background: 'rgba(230,126,34,0.1)', border: '1px solid rgba(230,126,34,0.3)', color: '#e67e22', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ flex: 1 }}>ℹ️ {text}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div style={{ padding: '0 16px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)' }}>{title}</div>
            {children}
        </div>
    );
}

function SRow({ label: l, value, color }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{l}</span>
            <span style={{ fontWeight: 600, color: color || 'var(--text)' }}>{value}</span>
        </div>
    );
}

function QtyBtn({ onClick, primary, disabled, label: aria, children }) {
    return (
        <button onClick={onClick} disabled={disabled} aria-label={aria} style={{
            width: 34, height: 34, borderRadius: 10,
            background: primary ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'var(--bg-secondary)',
            border: primary ? 'none' : '1px solid var(--border)',
            color: primary ? '#1a1a24' : 'var(--text)',
            fontSize: 15, cursor: disabled ? 'default' : 'pointer', fontWeight: 700, opacity: disabled ? 0.4 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{children}</button>
    );
}

function MiniInput({ value, onChange, placeholder }) {
    return (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={30}
            style={{ ...IS, padding: '11px 12px', fontSize: 13, borderRadius: 12 }} />
    );
}

const IS = {
    width: '100%', padding: '12px 14px', marginBottom: 0,
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 13, color: 'var(--text)', fontSize: 14,
    outline: 'none', fontFamily: 'inherit', display: 'block', boxSizing: 'border-box',
};
const label = { fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 };
const banner = { margin: '12px 16px 0', borderRadius: 12, padding: '12px 14px', fontSize: 13, fontWeight: 600 };
const hint = { padding: '10px 14px', borderRadius: 12, marginBottom: 10, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 };
const goldText = {
    fontSize: 14, fontWeight: 700,
    background: 'linear-gradient(135deg, #F0C040, #D4A017)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
};
const goldBtn = {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
    border: 'none', borderRadius: 14, color: '#1a1a24',
    fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};
const toggleBtn = (active) => ({
    padding: '13px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
    background: active ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'var(--bg-card)',
    border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
    color: active ? '#1a1a24' : 'var(--text)',
    fontWeight: 700, fontSize: 13, transition: 'all 0.25s',
});
