import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import api from '../api';
import BottomNav from '../components/BottomNav';

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

const PAY_ICONS = { cash: '💵', payme: '💳', click: '💙' };

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

function OrderDetail({ order, onClose, t }) {
    const payKey = `pay_${order.paymentMethod}`;
    const payLabel = t(payKey) !== payKey
        ? `${PAY_ICONS[order.paymentMethod] || '💳'} ${t(payKey)}`
        : `${PAY_ICONS[order.paymentMethod] || '💳'} ${order.paymentMethod}`;

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

                {order.estimatedTime > 0 && (
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
                                {(item.price || 0).toLocaleString()} so'm × {item.qty}
                            </div>
                        </div>
                        <div style={{
                            fontWeight: 800, whiteSpace: 'nowrap', marginLeft: 12,
                            background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            {((item.price || 0) * item.qty).toLocaleString()} so'm
                        </div>
                    </div>
                ))}

                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                {order.branch?.name && <InfoRow label={`🏢 ${t('branch')}`} value={order.branch.name} />}
                {order.branch?.phone && <InfoRow label={`📞 ${t('orderBranchPhone')}`} value={order.branch.phone} />}
                <InfoRow label={`📍 ${t('orderAddr')}`} value={order.address || (order.deliveryType === 'pickup' ? t('pickup') : '—')} />
                <InfoRow label={`💳 ${t('paymentTitle')}`} value={payLabel} />
                {order.notes && <InfoRow label={`📝 ${t('orderNote')}`} value={order.notes} />}

                <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                {order.deliveryCost > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>
                        <span>{t('deliveryCost')}</span>
                        <span>{order.deliveryCost.toLocaleString()} so'm</span>
                    </div>
                )}
                {order.bonusDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: '#2ecc71' }}>
                        <span>Bonus chegirma</span>
                        <span>−{order.bonusDiscount.toLocaleString()} so'm</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17, marginTop: 4 }}>
                    <span>{t('orderTotal')}</span>
                    <span style={{
                        background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>{(order.total || 0).toLocaleString()} so'm</span>
                </div>

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
                                        {h.note && <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{h.note}</div>}
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

            {orders.length === 0 ? (
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
                            onClick={() => setSelected(o)}
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
