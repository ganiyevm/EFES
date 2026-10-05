import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT, fmt } from '../i18n';
import api from '../api';
import { openExternal } from './Payment';

const ACTIVE = ['awaiting_payment', 'pending_operator', 'confirmed', 'preparing', 'ready', 'on_the_way'];
import BottomNav from '../components/BottomNav';
import { PaymentIcon } from '../components/BrandIcon';

const STATUS_COLORS = {
    awaiting_payment: { color: '#f39c12', bg: 'rgba(243,156,18,0.1)' },
    pending_operator: { color: '#3498db', bg: 'rgba(52,152,219,0.1)' },
    confirmed: { color: '#2ecc71', bg: 'rgba(46,204,113,0.1)' },
    preparing: { color: '#D4A017', bg: 'rgba(212,160,23,0.1)' },
    ready: { color: '#1abc9c', bg: 'rgba(26,188,156,0.1)' },
    on_the_way: { color: '#e67e22', bg: 'rgba(230,126,34,0.1)' },
    delivered: { color: '#2ecc71', bg: 'rgba(46,204,113,0.1)' },
    rejected: { color: '#e74c3c', bg: 'rgba(231,76,60,0.1)' },
    cancelled: { color: '#e74c3c', bg: 'rgba(231,76,60,0.1)' },
};

const STATUS_ICONS = {
    awaiting_payment: '⏳', pending_operator: '🔄', confirmed: '✅',
    preparing: '🍳', ready: '✅', on_the_way: '🚗',
    delivered: '🎉', rejected: '❌', cancelled: '❌',
};


function StatusBadge({ status, t }) {
    const c = STATUS_COLORS[status] || { color: '#999', bg: 'rgba(153,153,153,0.1)' };
    const icon = STATUS_ICONS[status] || '❓';
    const key = `status_${status}`;
    const label = t(key) !== key ? t(key) : status;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            color: c.color, background: c.bg,
            border: `1px solid ${c.color}22`,
        }}>
            {icon} {label}
        </span>
    );
}

function OrderDetail({ order, onClose, t, onCancel, onPay, busy }) {
    const payKey = `pay_${order.paymentMethod}`;
    const payText = t(payKey) !== payKey ? t(payKey) : order.paymentMethod;
    const payLabel = (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <PaymentIcon method={order.paymentMethod} size={18} />
            {payText}
        </span>
    );

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end',
                backdropFilter: 'blur(4px)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%', maxHeight: '88vh', overflowY: 'auto',
                    background: 'var(--bg-card)', borderRadius: '22px 22px 0 0',
                    padding: '22px 20px 40px', animation: 'slideUp .3s ease',
                    border: '1px solid var(--border)', borderBottom: 'none',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border)', margin: '0 auto 16px' }} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 20 }}>#{order.orderNumber}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                            {new Date(order.createdAt).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 12, width: 36, height: 36, fontSize: 16,
                        cursor: 'pointer', color: 'var(--text)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>×</button>
                </div>

                <StatusBadge status={order.status} t={t} />

                {(order.deliveryDate || order.deliveryTime) && (
                    <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                        🕐 {t('deliveryTimeLabel')}: <b style={{ color: 'var(--text)' }}>{[order.deliveryDate, order.deliveryTime].filter(Boolean).join(' ')}</b>
                    </div>
                )}
                {!order.deliveryTime && order.estimatedTime > 0 && ['pending_operator', 'confirmed', 'preparing', 'ready', 'on_the_way'].includes(order.status) && (
                    <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                        ⏱ {t('estimatedTime')}: ~{order.estimatedTime} {t('minutes')}
                    </div>
                )}

                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                {/* Items */}
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--primary-light)' }}>🍽</span> {t('orderItems')}
                </div>
                {order.items?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, fontSize: 13 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{item.productName || item.product?.name || t('orderProduct')}</div>
                            {item.note && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>📝 {item.note}</div>}
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                {fmt(item.price)} {t('sum')} × {item.qty}
                            </div>
                        </div>
                        <div style={{
                            fontWeight: 800, whiteSpace: 'nowrap', marginLeft: 12,
                            background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            {fmt((item.price || 0) * item.qty)} {t('sum')}
                        </div>
                    </div>
                ))}

                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                {order.branch?.name && <InfoRow label={`🏢 ${t('branch')}`} value={order.branch.name} />}
                {order.branch?.phone && <InfoRow label={`📞 ${t('orderBranchPhone')}`} value={<a href={`tel:${order.branch.phone.replace(/[^\d+]/g, '')}`} style={{ color: 'var(--primary)' }}>{order.branch.phone}</a>} />}
                <InfoRow label={`📍 ${t('orderAddr')}`} value={order.address || (order.deliveryType === 'pickup' ? t('pickup') : '—')} />
                <InfoRow label={t('paymentTitle')} value={payLabel} />
                {order.notes && <InfoRow label={`📝 ${t('orderNote')}`} value={order.notes} />}

                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                {order.deliveryCost > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>
                        <span>{t('deliveryCost')}</span>
                        <span>{fmt(order.deliveryCost)} {t('sum')}</span>
                    </div>
                )}
                {order.bonusDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#2ecc71' }}>
                        <span>{t('bonusDiscountRow')}</span>
                        <span>−{fmt(order.bonusDiscount)} {t('sum')}</span>
                    </div>
                )}
                {order.promoDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#2ecc71' }}>
                        <span>{t('promoDiscountRow')}</span>
                        <span>−{fmt(order.promoDiscount)} {t('sum')}</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17, marginTop: 4 }}>
                    <span>{t('orderTotal')}</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>{fmt(order.total)} {t('sum')}</span>
                </div>

                {/* Amallar: to'lash / bekor qilish */}
                {(order.status === 'awaiting_payment' || (order.status === 'pending_operator' && order.paymentStatus !== 'paid')) && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                        {order.status === 'awaiting_payment' && (
                            <button disabled={busy} onClick={() => onPay(order)} style={{ ...actionBtn, flex: 2, background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', color: '#1a1a24', border: 'none' }}>
                                💳 {t('payNow')}
                            </button>
                        )}
                        <button disabled={busy} onClick={() => onCancel(order)} style={{ ...actionBtn, flex: 1, color: '#e74c3c' }}>
                            {busy ? '⏳' : `✕ ${t('cancelOrder')}`}
                        </button>
                    </div>
                )}

                {/* Status History */}
                {order.statusHistory?.length > 0 && (
                    <>
                        <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--primary-light)' }}>📋</span> {t('statusHistory')}
                        </div>
                        {order.statusHistory.map((h, i) => {
                            const c = STATUS_COLORS[h.status] || { color: '#999' };
                            const icon = STATUS_ICONS[h.status] || '❓';
                            const k = `status_${h.status}`;
                            const label = t(k) !== k ? t(k) : h.status;
                            return (
                                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 12 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 10,
                                        background: `${c.color}15`, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        fontSize: 16, flexShrink: 0,
                                    }}>{icon}</div>
                                    <div>
                                        <span style={{ fontWeight: 700, color: c.color }}>{label}</span>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 2 }}>
                                            {new Date(h.changedAt).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}

const actionBtn = {
    width: '100%', padding: '13px 16px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
    background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)',
    fontSize: 14, fontWeight: 700,
};

function InfoRow({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
        </div>
    );
}

export default function Orders() {
    const { t } = useT();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        return api.get('/orders')
            .then(r => { setOrders(r.data || []); setError(false); })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    // Faol buyurtma bo'lsa holat avtomatik yangilanib turadi
    const hasActive = orders.some(o => ACTIVE.includes(o.status));
    useEffect(() => {
        if (!hasActive) return;
        const id = setInterval(() => { if (!document.hidden) load(); }, 10000);
        const onVisible = () => { if (!document.hidden) load(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
    }, [hasActive, load]);

    const selected = orders.find(o => o._id === selectedId) || null;

    const handleCancel = async (order) => {
        if (!window.confirm(t('cancelConfirm'))) return;
        setBusy(true);
        try {
            const r = await api.patch(`/orders/${order._id}/cancel`);
            setOrders(prev => prev.map(o => o._id === order._id ? { ...o, ...r.data, branch: o.branch } : o));
        } catch (err) {
            alert(err.response?.data?.error || t('serverConnectError'));
            load();
        } finally {
            setBusy(false);
        }
    };

    const handlePay = async (order) => {
        setBusy(true);
        try {
            const r = await api.get(`/orders/${order._id}/pay`);
            if (r.data.paymentUrl) openExternal(r.data.paymentUrl);
            const q = new URLSearchParams({ orderId: order._id, method: order.paymentMethod, total: String(order.total), orderNum: order.orderNumber, type: order.deliveryType });
            if (r.data.paymentUrl) q.set('payUrl', r.data.paymentUrl);
            navigate(`/payment?${q}`);
        } catch (err) {
            alert(err.response?.data?.error || t('serverConnectError'));
            load();
        } finally {
            setBusy(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
            <div className="spinner" />
        </div>
    );

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 90 }}>
            <div style={{ padding: '16px 16px 12px' }}>
                <div style={{ fontWeight: 800, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--primary-light)' }}>📋</span> {t('myOrders')}
                </div>
            </div>

            {error && orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>📡</div>
                    <div style={{ marginBottom: 16 }}>{t('loadError')}</div>
                    <button onClick={() => { setLoading(true); load(); }} style={{ ...actionBtn, maxWidth: 200, margin: '0 auto' }}>🔄 {t('retry')}</button>
                </div>
            ) : orders.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: 24,
                        background: 'rgba(212,160,23,0.08)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 40, marginBottom: 20,
                    }}>📋</div>
                    <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{t('noOrders')}</div>
                    <button onClick={() => navigate('/menu')} style={{
                        padding: '14px 32px',
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                        border: 'none', borderRadius: 14, color: '#1a1a24',
                        fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        boxShadow: '0 4px 16px rgba(212,160,23,0.3)',
                    }}>
                        🍽 {t('goToMenu')}
                    </button>
                </div>
            ) : (
                <div style={{ padding: '0 16px' }}>
                    {orders.map(o => (
                        <div
                            key={o._id}
                            onClick={() => setSelectedId(o._id)}
                            style={{
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                borderRadius: 18, padding: 16, marginBottom: 10, cursor: 'pointer',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                                transition: 'all 0.25s',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <span style={{ fontWeight: 800, fontSize: 16 }}>#{o.orderNumber}</span>
                                <StatusBadge status={o.status} t={t} />
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
                                {o.items?.length || 0} {t('orderItems').toLowerCase()} · {o.branch?.name || ''}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{
                                    fontWeight: 800, fontSize: 16,
                                    background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                }}>
                                    {fmt(o.total)} {t('sum')}
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {new Date(o.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selected && <OrderDetail order={selected} onClose={() => setSelectedId(null)} t={t} onCancel={handleCancel} onPay={handlePay} busy={busy} />}
            <BottomNav />
        </div>
    );
}
