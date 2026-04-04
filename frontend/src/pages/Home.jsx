import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useT } from '../i18n';
import api from '../api';
import BottomNav from '../components/BottomNav';

export default function Home() {
    const { user } = useAuth();
    const { totalItems } = useCart();
    const { t } = useT();
    const navigate = useNavigate();
    const [popular, setPopular] = useState([]);
    const [loading, setLoading] = useState(true);

    const categories = [
        { key: 'kebab', icon: '🥙' }, { key: 'doner', icon: '🌯' },
        { key: 'pide', icon: '🫓' }, { key: 'izgara', icon: '🥩' },
        { key: 'corba', icon: '🍲' }, { key: 'burger', icon: '🍔' },
        { key: 'pizza', icon: '🍕' }, { key: 'salat', icon: '🥗' },
        { key: 'drink', icon: '🥤' }, { key: 'dessert', icon: '🍰' },
    ];

    useEffect(() => {
        api.get('/products?popular=true&limit=6')
            .then(r => setPopular(r.data.products || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 90 }}>
            {/* ── Header ── */}
            <div style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, #c0392b 100%)',
                padding: '20px 20px 28px',
                borderRadius: '0 0 24px 24px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>
                            🔥 {t('appName')}
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                            {t('appSubtitle')}
                        </div>
                    </div>
                    {user && (
                        <div style={{
                            background: 'rgba(255,255,255,0.2)', borderRadius: 12,
                            padding: '6px 12px', fontSize: 12, color: '#fff', fontWeight: 600,
                        }}>
                            🏅 {user.bonusPoints || 0} ball
                        </div>
                    )}
                </div>

                {/* Search bar */}
                <div
                    onClick={() => navigate('/menu')}
                    style={{
                        background: 'rgba(255,255,255,0.95)', borderRadius: 12,
                        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer', color: '#999', fontSize: 14,
                    }}
                >
                    🔍 {t('searchPlaceholder')}
                </div>
            </div>

            <div style={{ padding: '0 0 20px' }}>
                {/* ── Promo Banner ── */}
                <div style={{ margin: '16px 16px 0', background: 'linear-gradient(135deg, #ff8c42, #e94560)', borderRadius: 16, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>{t('promoTitle')}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{t('promoText')}</div>
                    </div>
                    <div style={{ fontSize: 36 }}>🎁</div>
                </div>

                {/* ── Categories ── */}
                <div style={{ padding: '20px 16px 0' }}>
                    <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>🍽 Menyu</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                        {categories.map(cat => (
                            <div
                                key={cat.key}
                                onClick={() => navigate(`/menu?category=${cat.key}`)}
                                style={{
                                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                                    borderRadius: 14, padding: '12px 4px', textAlign: 'center',
                                    cursor: 'pointer', transition: 'transform 0.15s',
                                }}
                                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.93)'}
                                onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <div style={{ fontSize: 24 }}>{cat.icon}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 600, lineHeight: 1.2 }}>
                                    {t(`cat_${cat.key}`)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Popular ── */}
                <div style={{ padding: '20px 16px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 800, fontSize: 17 }}>⭐ {t('popularDishes')}</div>
                        <button
                            onClick={() => navigate('/menu?popular=true')}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                            Barchasi →
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>
                            {t('loading')}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {popular.map(p => (
                                <PopularCard key={p._id} product={p} onPress={() => navigate(`/product/${p._id}`)} t={t} />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Info cards ── */}
                <div style={{ padding: '20px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <InfoCard icon="🚀" title={t('deliveryInfo')} value="30–60 daq" />
                    <InfoCard icon="🕐" title={t('workHours')} value="10:00 — 23:00" />
                    <InfoCard icon="💰" title={t('minOrder')} value="30 000 so'm" />
                    <InfoCard icon="🎁" title="Bonus" value="5% har buyurtmada" />
                </div>
            </div>

            <BottomNav />
        </div>
    );
}

function PopularCard({ product, onPress, t }) {
    return (
        <div
            onClick={onPress}
            style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
            }}
        >
            <div style={{
                height: 110, background: 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, position: 'relative',
            }}>
                {product.imageUrl
                    ? <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '🍽'
                }
                {product.isSpicy && (
                    <span style={{ position: 'absolute', top: 6, right: 6, background: '#e74c3c', color: '#fff', borderRadius: 8, fontSize: 10, padding: '2px 6px', fontWeight: 700 }}>
                        🌶
                    </span>
                )}
            </div>
            <div style={{ padding: '10px 10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, lineHeight: 1.3 }}>
                    {product.name}
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary)' }}>
                    {(product.price || 0).toLocaleString()} so'm
                </div>
            </div>
        </div>
    );
}

function InfoCard({ icon, title, value }) {
    return (
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 14px',
        }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{value}</div>
        </div>
    );
}
