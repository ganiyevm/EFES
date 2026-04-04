import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import api from '../api';
import BottomNav from '../components/BottomNav';

const STATUS_COLORS = {
    awaiting_payment: { color: '#f39c12', bg: 'rgba(243,156,18,0.12)' },
    pending_operator: { color: '#3498db', bg: 'rgba(52,152,219,0.12)' },
    confirmed:        { color: '#27ae60', bg: 'rgba(39,174,96,0.12)' },
    preparing:        { color: '#9b59b6', bg: 'rgba(155,89,182,0.12)' },
    ready:            { color: '#1abc9c', bg: 'rgba(26,188,156,0.12)' },
    on_the_way:       { color: '#e67e22', bg: 'rgba(230,126,34,0.12)' },
    delivered:        { color: '#27ae60', bg: 'rgba(39,174,96,0.12)' },
    rejected:         { color: '#e74c3c', bg: 'rgba(231,76,60,0.12)' },
    cancelled:        { color: '#e74c3c', bg: 'rgba(231,76,60,0.12)' },
};

const STATUS_ICONS = {
    awaiting_payment: '⏳', pending_operator: '🔄', confirmed: '✅',
    preparing: '🍳', ready: '✅', on_the_way: '🚗',
    delivered: '🎉', rejected: '❌', cancelled: '❌',
};

const PAY_ICONS = { cash: '💵', payme: '💳', click: '💙' };

function StatusBadge({ status, t }) {
    const c = STATUS_COLORS[status] || { color: '#999', bg: 'rgba(153,153,153,0.12)' };
    const icon = STATUS_ICONS[status] || '❓';
    const key = `status_${status}`;
    const label = t(key) !== key ? t(key) : status;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: c.color, background: c.bg }}>
            {icon} {label}
        </span>
    );
}

function OrderDetail({ order, onClose, t }) {
    const payKey = `pay_${order.paymentMethod}`;
    const payLabel = t(payKey) !== payKey
        ? `${PAY_ICONS[order.paymentMethod] || '💳'} ${t(payKey)}`
        : `${PAY_ICONS[order.paymentMethod] || '💳'} ${order.paymentMethod}`;

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}
            onClick={onClose}
        >
            <div
                style={{ width: '100%', maxHeight: '88vh', overflowY: 'auto', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', animation: 'slideUp .25s ease' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 18 }}>#{order.orderNumber}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {new Date(order.createdAt).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: 50, width: 34, height: 34, fontSize: 18, cursor: 'pointer', color: 'var(--text)' }}>×</button>
                </div>

                <StatusBadge status={order.status} t={t} />

                {order.estimatedTime > 0 && (
                    <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                        ⏱ {t('estimatedTime')}: ~{order.estimatedTime} {t('minutes')}
                    </div>
                )}

                <hr style={{ margin: '14px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                {/* Items */}
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>🍽 {t('orderItems')}</div>
                {order.items?.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, fontSize: 13 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{item.productName || item.product?.name || t('orderProduct')}</div>
                            {item.note && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>📝 {item.note}</div>}
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                {(item.price || 0).toLocaleString()} so'm × {item.qty}
                            </div>
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap', marginLeft: 12 }}>
                            {((item.price || 0) * item.qty).toLocaleString()} so'm
                        </div>
                    </div>
                ))}

                <hr style={{ margin: '14px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                {order.branch?.name && <InfoRow label={`🏢 ${t('branch')}`} value={order.branch.name} />}
                {order.branch?.phone && <InfoRow label={`📞 ${t('orderBranchPhone')}`} value={order.branch.phone} />}
                <InfoRow label={`📍 ${t('orderAddr')}`} value={order.address || (order.deliveryType === 'pickup' ? t('pickup') : '—')} />
                <InfoRow label={`💳 ${t('paymentTitle')}`} value={payLabel} />
                {order.notes && <InfoRow label={`📝 ${t('orderNote')}`} value={order.notes} />}

                <hr style={{ margin: '14px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                {order.deliveryCost > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>
                        <span>{t('deliveryCost')}</span>
                        <span>{order.deliveryCost.toLocaleString()} so'm</span>
                    </div>
                )}
                {order.bonusDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#27ae60' }}>
                        <span>Bonus chegirma</span>
                        <span>−{order.bonusDiscount.toLocaleString()} so'm</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
                    <span>{t('orderTotal')}</span>
                    <span style={{ color: 'var(--primary)' }}>{(order.total || 0).toLocaleString()} so'm</span>
                </div>

                {/* Status History */}
                {order.statusHistory?.length > 0 && (
                    <>
                        <hr style={{ margin: '14px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📋 {t('statusHistory')}</div>
                        {order.statusHistory.map((h, i) => {
                            const c = STATUS_COLORS[h.status] || { color: '#999' };
                            const icon = STATUS_ICONS[h.status] || '❓';
                            const k = `status_${h.status}`;
                            const label = t(k) !== k ? t(k) : h.status;
                            return (
                                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 12 }}>
                                    <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                                    <div>
                                        <span style={{ fontWeight: 700, color: c.color }}>{label}</span>
                                        {h.note && <div style={{ color: 'var(--text-secondary)' }}>{h.note}</div>}
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
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
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        api.get('/orders')
            .then(r => setOrders(r.data || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
            <div style={{ fontSize: 36 }}>⏳</div>
        </div>
    );

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 90 }}>
            <div style={{ padding: '16px 16px 12px' }}>
                <div style={{ fontWeight: 800, fontSize: 20 }}>📋 {t('myOrders')}</div>
            </div>

            {orders.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>📋</div>
                    <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{t('noOrders')}</div>
                    <button onClick={() => navigate('/menu')} style={{ padding: '14px 28px', background: 'var(--primary)', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        🍽 {t('goToMenu')}
                    </button>
                </div>
            ) : (
                <div style={{ padding: '0 16px' }}>
                    {orders.map(o => (
                        <div
                            key={o._id}
                            onClick={() => setSelected(o)}
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, marginBottom: 10, cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontWeight: 800, fontSize: 15 }}>#{o.orderNumber}</span>
                                <StatusBadge status={o.status} t={t} />
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                {o.items?.length || 0} {t('orderItems').toLowerCase()} · {o.branch?.name || ''}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 15 }}>
                                    {(o.total || 0).toLocaleString()} so'm
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {new Date(o.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} t={t} />}
            <BottomNav />
        </div>
    );
}
