import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
import { PaymentBadge, YandexIcon } from '../../components/BrandIcon';

const STATUSES = [
    { key: '', label: 'Barchasi' },
    { key: 'active', label: 'Faol' },
    { key: 'awaiting_payment', label: "To'lov kutilmoqda" },
    { key: 'pending_operator', label: 'Operator' },
    { key: 'confirmed', label: 'Tasdiqlandi' },
    { key: 'preparing', label: 'Tayyorlanmoqda' },
    { key: 'ready', label: 'Tayyor' },
    { key: 'on_the_way', label: "Yo'lda" },
    { key: 'delivered', label: 'Yetkazildi' },
    { key: 'rejected', label: 'Rad etildi' },
    { key: 'cancelled', label: 'Bekor' },
];

const STATUS_BADGE_MAP = {
    awaiting_payment: 'badge-warning', pending_operator: 'badge-info',
    confirmed: 'badge-success', preparing: 'badge-purple', ready: 'badge-teal',
    on_the_way: 'badge-warning', delivered: 'badge-success',
    rejected: 'badge-danger', cancelled: 'badge-danger',
};
const STATUS_ICONS = {
    awaiting_payment: '⏳', pending_operator: '🔄', confirmed: '✅',
    preparing: '🍳', ready: '✅', on_the_way: '🚗',
    delivered: '🎉', rejected: '❌', cancelled: '❌',
};
const STATUS_LABELS = {
    awaiting_payment: "To'lov kutilmoqda", pending_operator: 'Operator kutilmoqda',
    confirmed: 'Tasdiqlandi', preparing: 'Tayyorlanmoqda 🍳', ready: 'Tayyor ✅',
    on_the_way: "Yo'lda 🚗", delivered: 'Yetkazildi', rejected: 'Rad etildi', cancelled: 'Bekor qilindi',
};

const NEXT_STATUSES = {
    awaiting_payment: [],
    pending_operator: ['confirmed', 'rejected'],
    confirmed: ['preparing'],
    preparing: ['ready'],
    ready: ['on_the_way'],
    on_the_way: ['delivered'],
    delivered: [],
    rejected: [],
    cancelled: [],
};
// Olib ketishda kurier bosqichi yo'q: tayyor → mijozga berildi
const PICKUP_NEXT = { ...NEXT_STATUSES, ready: ['delivered'] };
const nextStatuses = (o) => (o.deliveryType === 'pickup' ? PICKUP_NEXT : NEXT_STATUSES)[o.status] || [];
const CANCELLABLE = ['awaiting_payment', 'pending_operator', 'confirmed', 'preparing', 'ready', 'on_the_way'];
const fmt = (n) => Number(n || 0).toLocaleString('ru-RU');

// Yangi buyurtma signali (fayl kerak emas — WebAudio)
function playBeep() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        [0, 0.25, 0.5].forEach((delay) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.frequency.value = 880;
            g.gain.setValueAtTime(0.25, ctx.currentTime + delay);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
            o.connect(g); g.connect(ctx.destination);
            o.start(ctx.currentTime + delay);
            o.stop(ctx.currentTime + delay + 0.2);
        });
        setTimeout(() => ctx.close(), 1500);
    } catch { /* brauzer ruxsat bermagan */ }
}

export default function OrdersList() {
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [soundOn, setSoundOn] = useState(() => localStorage.getItem('efes_admin_sound') !== 'off');
    const seenPending = useRef(null);
    const [updating, setUpdating] = useState(false);
    const [couriers, setCouriers] = useState([]);
    const limit = 20;

    // silent=true — fon yangilanishida jadval "Yuklanmoqda"ga almashib, miltillamaydi
    const fetchOrders = useCallback((silent = false) => {
        if (!silent) setLoading(true);
        const params = new URLSearchParams({ page, limit });
        if (status) params.set('status', status);
        if (search) params.set('q', search);
        api.get(`/admin/orders?${params}`)
            .then(r => {
                setOrders(r.data.orders || []);
                setTotal(r.data.total || 0);
                setSelected(sel => sel ? (r.data.orders || []).find(o => o._id === sel._id) || sel : sel);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [page, status, search]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useEffect(() => { const id = setInterval(() => fetchOrders(true), 15000); return () => clearInterval(id); }, [fetchOrders]);
    useEffect(() => { const id = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 400); return () => clearTimeout(id); }, [query]);

    // Yangi "operator kutmoqda" buyurtma kelsa — ovozli signal (har qanday sahifa/filtrda)
    useEffect(() => {
        const check = () => api.get('/admin/orders?status=pending_operator&limit=50').then(r => {
            const ids = new Set((r.data.orders || []).map(o => o._id));
            if (seenPending.current) {
                const fresh = [...ids].filter(id => !seenPending.current.has(id));
                if (fresh.length > 0) {
                    if (soundOn) playBeep();
                    document.title = `🔔 (${fresh.length}) Yangi buyurtma — EFES`;
                    fetchOrders(true);
                }
            }
            seenPending.current = ids;
        }).catch(() => { });
        check();
        const id = setInterval(check, 15000);
        const onFocus = () => { document.title = 'EFES Admin'; };
        window.addEventListener('focus', onFocus);
        return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
    }, [soundOn]);
    useEffect(() => {
        api.get('/couriers')
            .then(r => setCouriers((r.data || []).filter(c => c.isActive)))
            .catch(() => { });
    }, []);

    const handleAssignCourier = async (orderId, courierId) => {
        setUpdating(true);
        try {
            const r = await api.patch(`/admin/orders/${orderId}/assign-courier`, { courierId: courierId || null });
            if (selected?._id === orderId) setSelected(r.data);
            fetchOrders();
        } catch (err) {
            alert('Xatolik: ' + (err.response?.data?.error || err.message));
        } finally {
            setUpdating(false);
        }
    };

    const handleStatusChange = async (orderId, newStatus, note = '') => {
        setUpdating(true);
        try {
            if ((newStatus === 'cancelled' || newStatus === 'rejected') &&
                !confirm(newStatus === 'cancelled' ? 'Buyurtmani bekor qilasizmi? Mijozga xabar boradi.' : 'Buyurtmani rad etasizmi? Mijozga xabar boradi.')) {
                return;
            }
            const r = await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus, note });
            fetchOrders(true);
            if (selected?._id === orderId) setSelected(r.data);
        } catch (err) {
            alert('Xatolik: ' + (err.response?.data?.error || err.message));
        } finally {
            setUpdating(false);
        }
    };

    const pages = Math.ceil(total / limit);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">📋 Buyurtmalar</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Jami: {total}</span>
                    <button className="btn btn-outline btn-sm" title="Yangi buyurtma ovozi"
                        onClick={() => { const v = !soundOn; setSoundOn(v); localStorage.setItem('efes_admin_sound', v ? 'on' : 'off'); if (v) playBeep(); }}>
                        {soundOn ? '🔔' : '🔕'}
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={() => fetchOrders()}>🔄 Yangilash</button>
                </div>
            </div>

            <div className="filter-row">
                <div className="search-bar" style={{ flex: 1, maxWidth: 340 }}>
                    <span className="search-icon">🔍</span>
                    <input className="form-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Raqam, mijoz ismi yoki telefon..." />
                </div>
            </div>

            {/* Status filter */}
            <div className="filter-row">
                {STATUSES.map(s => (
                    <button
                        key={s.key}
                        onClick={() => { setStatus(s.key); setPage(1); }}
                        className="btn btn-sm"
                        style={{ background: status === s.key ? 'linear-gradient(135deg, var(--primary), var(--primary-strong))' : 'var(--card)', color: status === s.key ? '#1a1a24' : 'var(--text)', border: `1px solid ${status === s.key ? 'transparent' : 'var(--border)'}`, boxShadow: status === s.key ? '0 2px 8px rgba(212,160,23,0.25)' : 'none' }}
                    >
                        {s.key && STATUS_ICONS[s.key]} {s.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>⏳ Yuklanmoqda...</div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Raqam</th>
                                    <th>Mijoz</th>
                                    <th>Taomlar</th>
                                    <th>Jami</th>
                                    <th>To'lov</th>
                                    <th>Status</th>
                                    <th>Filial</th>
                                    <th>Vaqt</th>
                                    <th>Amal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(o => (
                                    <tr key={o._id} style={{ cursor: 'pointer' }} onClick={() => setSelected(o)}>
                                        <td><strong>#{o.orderNumber}</strong></td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{o.customerName || '—'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{o.phone}</div>
                                        </td>
                                        <td>
                                            {o.items?.slice(0, 2).map((item, i) => (
                                                <div key={i} style={{ fontSize: 12, color: 'var(--text)' }}>• {item.productName} ×{item.qty}</div>
                                            ))}
                                            {o.items?.length > 2 && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>+{o.items.length - 2} ta</div>}
                                        </td>
                                        <td><strong>{fmt(o.total)} so'm</strong>
                                            {o.paymentStatus === 'paid' && <div style={{ fontSize: 10, color: 'var(--success)' }}>✓ to'langan</div>}
                                        </td>
                                        <td>
                                            <PaymentBadge method={o.paymentMethod} size={16} />
                                        </td>
                                        <td>
                                            <span className={`badge ${STATUS_BADGE_MAP[o.status] || 'badge-gray'}`}>
                                                {STATUS_ICONS[o.status]} {STATUS_LABELS[o.status] || o.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12 }}>
                                            <div>#{o.branch?.number} {o.branch?.name}</div>
                                            {o.addressLat && o.addressLng && (
                                                <a
                                                    href={mapsLink(o.addressLat, o.addressLng)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                ><YandexIcon size={14} /> Xaritada</a>
                                            )}
                                            {o.courierId?.name && (
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    🏍 {o.courierId.name}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                            {new Date(o.createdAt).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            {nextStatuses(o).length > 0 && (
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    {nextStatuses(o).map(ns => (
                                                        <button
                                                            key={ns}
                                                            className="btn btn-sm"
                                                            disabled={updating}
                                                            onClick={() => handleStatusChange(o._id, ns)}
                                                            style={{ background: ns === 'rejected' || ns === 'cancelled' ? 'linear-gradient(135deg, #c0392b, #e74c3c)' : 'linear-gradient(135deg, var(--primary), var(--primary-strong))', color: ns === 'rejected' || ns === 'cancelled' ? '#fff' : '#1a1a24', fontSize: 11, padding: '4px 8px' }}
                                                        >
                                                            {STATUS_ICONS[ns]} {ns === 'delivered' && o.deliveryType === 'pickup' ? 'Berildi' : STATUS_LABELS[ns]?.split(' ')[0]}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pages > 1 && (
                        <div className="pagination" style={{ padding: '12px 0' }}>
                            <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
                            {(() => {
                                const start = Math.max(1, Math.min(page - 2, pages - 4));
                                return Array.from({ length: Math.min(pages, 5) }, (_, i) => start + i).map(n => (
                                    <button key={n} className={`page-btn ${page === n ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                                ));
                            })()}
                            <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === pages}>›</button>
                        </div>
                    )}
                </div>
            )}

            {/* Detail modal */}
            {selected && (
                <OrderDetailModal
                    order={selected}
                    onClose={() => setSelected(null)}
                    onStatusChange={handleStatusChange}
                    onAssignCourier={handleAssignCourier}
                    onUpdate={() => { fetchOrders(true); setSelected(null); }}
                    couriers={couriers}
                    updating={updating}
                />
            )}
        </div>
    );
}

function mapsLink(lat, lng) {
    if (!lat || !lng) return null;
    return `https://yandex.com/maps/?pt=${lng},${lat}&z=17&l=map`;
}

function PaymeVerifyButton({ order, onSuccess }) {
    const [busy, setBusy] = useState(false);
    const handleAutoVerify = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const r = await api.post(`/admin/orders/${order._id}/payme-verify`);
            if (r.data?.ok && r.data?.synced) {
                alert(`✅ Payme tasdiqladi — buyurtma "to'langan" deb belgilandi.`);
                onSuccess && onSuccess();
                return;
            }
            if (r.data?.alreadyPaid) {
                alert("✅ Bu buyurtma allaqachon to'langan.");
                onSuccess && onSuccess();
                return;
            }
            // Avtomatik topilmadi → qo'lda rekonsilatsiya taklifi
            if (r.data?.reason === 'no-receipt') {
                const wantManual = confirm(
                    "Payme Merchant API'da chek avtomatik topilmadi.\n\n" +
                    "Agar siz Payme kabinetida (merchant.payme.uz) shu buyurtma " +
                    "uchun PAID tranzaksiyani ko'rgan bo'lsangiz, qo'lda rekonsilatsiya " +
                    "qilish mumkin (audit jurnali bilan).\n\n" +
                    "Davom etamizmi?"
                );
                if (wantManual) await runManualReconcile();
                return;
            }
            const reasons = {
                'not-paid-on-payme': "Payme'da to'lov hali tasdiqlanmagan.",
                'payme-error': `Payme bilan bog'lanishda xato: ${r.data?.payme || ''}`,
                'not-payme': "Buyurtma Payme bilan to'lanmagan.",
            };
            alert(`⚠️ ${reasons[r.data?.reason] || r.data?.message || "Tekshirib bo'lmadi"}`);
        } catch (err) {
            alert(`Xato: ${err.response?.data?.error || err.message}`);
        } finally {
            setBusy(false);
        }
    };

    const runManualReconcile = async () => {
        const txid = prompt(
            "Payme tranzaksiya ID (ID платёжа, masalan 69ec54d9ce4c0cdaac3ff05f):"
        );
        if (!txid?.trim()) return;
        const receiptId = prompt(
            "Chek ID (Номер чека, ixtiyoriy — bo'sh qoldirsangiz ham bo'ladi):"
        ) || '';
        const note = prompt(
            "Izoh (ixtiyoriy, masalan: 'Payme kabinetida 25.04.2026 da PAID'):"
        ) || '';
        try {
            const r = await api.post(`/admin/orders/${order._id}/payme-reconcile`, {
                paymeTransId: txid.trim(),
                paymeReceiptId: receiptId.trim(),
                amountSum: order.total,
                note: note.trim(),
            });
            if (r.data?.ok && r.data?.synced) {
                alert(`✅ Rekonsilatsiya muvaffaqiyatli — buyurtma "to'langan" deb belgilandi.\nAudit jurnali yangilandi.`);
                onSuccess && onSuccess();
            } else if (r.data?.alreadyPaid) {
                alert("Allaqachon to'langan.");
                onSuccess && onSuccess();
            } else {
                alert(`Xato: ${r.data?.error || 'noma\'lum'}`);
            }
        } catch (err) {
            alert(`Xato: ${err.response?.data?.error || err.message}`);
        }
    };

    return (
        <button
            className="btn btn-outline btn-sm"
            onClick={handleAutoVerify}
            disabled={busy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
            {busy ? '⏳' : '🔄'} Payme'dan tekshirish
        </button>
    );
}

function OrderDetailModal({ order, onClose, onStatusChange, onAssignCourier, onUpdate, couriers, updating }) {
    const [note, setNote] = useState('');

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">#{order.orderNumber}</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
                </div>
                <div className="modal-body">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                        <span className={`badge ${STATUS_BADGE_MAP[order.status]}`}>{STATUS_ICONS[order.status]} {STATUS_LABELS[order.status]}</span>
                        <span className="badge badge-gray">
                            <PaymentBadge method={order.paymentMethod} size={18} />
                        </span>
                        <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                            {order.paymentStatus === 'paid' ? '✅ To\'langan' : "⏳ To'lanmagan"}
                        </span>
                        {order.paymentMethod === 'payme' && order.paymentStatus !== 'paid' && (
                            <PaymeVerifyButton order={order} onSuccess={onUpdate} />
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        <InfoCell label="Mijoz" value={order.customerName || '—'} />
                        <InfoCell label="Telefon" value={<span>
                            <a href={`tel:${order.phone}`} style={{ color: 'var(--primary)' }}>{order.phone || '—'}</a>
                            {order.extraPhone && <> · <a href={`tel:${order.extraPhone}`} style={{ color: 'var(--primary)' }}>{order.extraPhone}</a></>}
                        </span>} />
                        <InfoCell label="Yetkazish" value={order.deliveryType === 'delivery' ? '🚗 Yetkazib berish' : '🏃 Olib ketish'} />
                        <InfoCell label="Filial" value={`#${order.branch?.number} ${order.branch?.name || ''}`} />
                        {order.address && <InfoCell label="Manzil" value={order.address} span={2} />}
                        {order.addressLat && order.addressLng && (
                            <div style={{ gridColumn: 'span 2' }}>
                                <a
                                    href={mapsLink(order.addressLat, order.addressLng)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-outline btn-sm"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                                >
                                    <YandexIcon size={18} />
                                    Yandex Xaritada ochish ({order.addressLat.toFixed(4)}, {order.addressLng.toFixed(4)})
                                </a>
                            </div>
                        )}
                        <InfoCell label="Vaqt" value={(order.deliveryDate || order.deliveryTime) ? `🕐 ${[order.deliveryDate, order.deliveryTime].filter(Boolean).join(' ')}` : '⚡ Imkon qadar tez'} />
                        <InfoCell label="Yaratilgan" value={new Date(order.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} />
                        {order.notes && <InfoCell label="Izoh" value={order.notes} span={2} />}
                    </div>

                    {/* Kurier tayinlash (faqat delivery turida) */}
                    {order.deliveryType === 'delivery' && ['confirmed', 'preparing', 'ready', 'on_the_way', 'delivered'].includes(order.status) && (
                        <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🏍 Kurier</div>
                            {order.courierId ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: 13 }}>
                                        <div style={{ fontWeight: 600 }}>{order.courierId.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {order.courierId.phone} {order.courierId.carPlate && `• ${order.courierId.carPlate}`}
                                        </div>
                                    </div>
                                    {order.status !== 'delivered' && (
                                        <button
                                            className="btn btn-outline btn-sm"
                                            disabled={updating}
                                            onClick={() => onAssignCourier(order._id, null)}
                                        >✕ Olib tashlash</button>
                                    )}
                                </div>
                            ) : (
                                <select
                                    className="form-input"
                                    disabled={updating || couriers.length === 0}
                                    defaultValue=""
                                    onChange={e => e.target.value && onAssignCourier(order._id, e.target.value)}
                                    style={{ fontSize: 13 }}
                                >
                                    <option value="" disabled>{couriers.length === 0 ? 'Faol kurier yo\'q' : 'Kurier tanlang...'}</option>
                                    {couriers.map(c => (
                                        <option key={c._id} value={c._id}>
                                            {c.name} — {c.phone} {c.carPlate && `(${c.carPlate})`}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {/* Items */}
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🍽 Taomlar</div>
                    {order.items?.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                            <div>
                                <span style={{ fontWeight: 600 }}>{item.productName}</span>
                                <span style={{ color: '#6b7280' }}> ×{item.qty}</span>
                                {item.note && <div style={{ fontSize: 11, color: 'var(--warning)', marginTop: 2 }}>📝 {item.note}</div>}
                            </div>
                            <span style={{ fontWeight: 700 }}>{(item.price * item.qty).toLocaleString()} so'm</span>
                        </div>
                    ))}
                    {[
                        ['Yetkazish', order.deliveryCost, ''],
                        ['Promo chegirma', order.promoDiscount, '−'],
                        ['Bonus chegirma', order.bonusDiscount, '−'],
                    ].filter(([, v]) => v > 0).map(([l, v, sign]) => (
                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                            <span>{l}</span><span>{sign}{fmt(v)} so'm</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 800, fontSize: 15 }}>
                        <span>JAMI</span>
                        <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-strong))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{(order.total || 0).toLocaleString()} so'm</span>
                    </div>

                    {/* Change status */}
                    {(['cancelled', 'rejected'].includes(order.status) && order.paymentStatus === 'paid' && order.paymentMethod !== 'cash') && (
                        <div style={{ marginTop: 14, padding: 10, borderRadius: 10, background: 'rgba(231,76,60,0.08)', color: '#e74c3c', fontSize: 13, fontWeight: 600 }}>
                            ⚠️ Buyurtma onlayn to'langan — pulni {order.paymentMethod === 'payme' ? 'Payme' : 'Click'} kabinetidan mijozga qaytaring.
                        </div>
                    )}

                    {(nextStatuses(order).length > 0 || CANCELLABLE.includes(order.status)) && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🔄 Statusni o'zgartirish</div>
                            <input
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Izoh (ixtiyoriy)"
                                className="form-input"
                                style={{ marginBottom: 10 }}
                            />
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {nextStatuses(order).map(ns => (
                                    <button
                                        key={ns}
                                        className="btn"
                                        disabled={updating}
                                        onClick={() => onStatusChange(order._id, ns, note)}
                                        style={{ background: ns === 'rejected' ? 'linear-gradient(135deg, #c0392b, #e74c3c)' : 'linear-gradient(135deg, var(--primary), var(--primary-strong))', color: ns === 'rejected' ? '#fff' : '#1a1a24' }}
                                    >
                                        {STATUS_ICONS[ns]} {ns === 'delivered' && order.deliveryType === 'pickup' ? 'Mijozga berildi' : STATUS_LABELS[ns]}
                                    </button>
                                ))}
                                {CANCELLABLE.includes(order.status) && (
                                    <button className="btn btn-outline" disabled={updating}
                                        onClick={() => onStatusChange(order._id, 'cancelled', note)}
                                        style={{ color: '#e74c3c', borderColor: 'rgba(231,76,60,0.4)' }}>
                                        🚫 Bekor qilish
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status history */}
                    {order.statusHistory?.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>📋 Tarix</div>
                            {order.statusHistory.map((h, i) => (
                                <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                                    <span>{STATUS_ICONS[h.status] || '•'}</span>
                                    <div>
                                        <span style={{ fontWeight: 600 }}>{STATUS_LABELS[h.status] || h.status}</span>
                                        {h.note && <span style={{ color: '#6b7280' }}> — {h.note}</span>}
                                        <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                                            {new Date(h.changedAt).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoCell({ label, value, span = 1 }) {
    return (
        <div style={{ gridColumn: span > 1 ? `span ${span}` : undefined }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{value}</div>
        </div>
    );
}
