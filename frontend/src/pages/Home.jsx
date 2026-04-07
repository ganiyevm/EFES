import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useT } from '../i18n';
import api from '../api';
import BottomNav from '../components/BottomNav';
import { getProductImage } from '../utils/productImage';

export default function Home() {
    const { user } = useAuth();
    useCart();
    const { t, lang } = useT();
    const navigate = useNavigate();
    const [popular, setPopular] = useState([]);
    const [loading, setLoading] = useState(true);
    const [promos, setPromos] = useState([]);

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
            .catch(() => { })
            .finally(() => setLoading(false));
        api.get('/promotions').then(r => setPromos(r.data || [])).catch(() => { });
    }, []);

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 90 }}>
            {/* ── Premium Header ── */}
            <div style={{
                background: 'linear-gradient(160deg, #2D1F05 0%, #1A1508 40%, var(--bg) 100%)',
                padding: '20px 20px 28px',
                borderRadius: '0 0 28px 28px',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Decorative golden glow */}
                <div style={{
                    position: 'absolute', top: -60, right: -40,
                    width: 180, height: 180, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(212,160,23,0.15) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, position: 'relative' }}>
                    <div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 28 }}>🔥</span>
                            <span style={{ background: 'linear-gradient(135deg, #F0C040, #D4A017)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {t('appName')}
                            </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.6)', marginTop: 3, fontWeight: 500 }}>
                            {t('appSubtitle')}
                        </div>
                    </div>
                    {user && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(212,160,23,0.2), rgba(212,160,23,0.08))',
                            border: '1px solid rgba(212,160,23,0.25)',
                            borderRadius: 14, padding: '7px 14px', fontSize: 12,
                            color: 'var(--primary-light)', fontWeight: 700,
                            backdropFilter: 'blur(8px)',
                        }}>
                            🏅 {user.bonusPoints || 0} ball
                        </div>
                    )}
                </div>

                {/* ── Frosted glass search bar ── */}
                <div
                    onClick={() => navigate('/menu')}
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 14, padding: '13px 16px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        cursor: 'pointer', color: 'rgba(245,240,232,0.4)', fontSize: 14,
                        backdropFilter: 'blur(12px)', fontWeight: 500,
                        transition: 'all 0.25s',
                    }}
                >
                    <span style={{ fontSize: 16, opacity: 0.6 }}>🔍</span>
                    {t('searchPlaceholder')}
                </div>
            </div>

            <div style={{ padding: '0 0 20px' }}>
                {/* ── Aksiyalar ── */}
                {promos.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', marginBottom: 10 }}>
                            <div style={{ fontWeight: 800, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: 'var(--primary-light)' }}>🎁</span> {t('promos')}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 4px', scrollbarWidth: 'none' }}>
                            {promos.map(p => (
                                <PromoCard key={p._id} promo={p} lang={lang} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Categories Grid ── */}
                <div style={{ padding: '20px 16px 0' }}>
                    <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--primary-light)' }}>🍽</span> Menyu
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                        {categories.map(cat => (
                            <div
                                key={cat.key}
                                onClick={() => navigate(`/menu?category=${cat.key}`)}
                                style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 16, padding: '14px 4px', textAlign: 'center',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    position: 'relative', overflow: 'hidden',
                                }}
                                onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.93)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,0.3)'; }}
                                onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                            >
                                <div style={{ fontSize: 26, marginBottom: 2 }}>{cat.icon}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 600, lineHeight: 1.2 }}>
                                    {t(`cat_${cat.key}`)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Popular Items ── */}
                <div style={{ padding: '22px 16px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ fontWeight: 800, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--primary-light)' }}>⭐</span> {t('popularDishes')}
                        </div>
                        <button
                            onClick={() => navigate('/menu?popular=true')}
                            style={{
                                background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.2)',
                                color: 'var(--primary-light)', fontSize: 12, fontWeight: 700,
                                cursor: 'pointer', borderRadius: 20, padding: '6px 14px',
                                fontFamily: 'inherit', transition: 'all 0.2s',
                            }}
                        >
                            Barchasi →
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
                            <div className="spinner" />
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {popular.map(p => (
                                <PopularCard key={p._id} product={p} onPress={() => navigate(`/product/${p._id}`)} />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Info Cards ── */}
                <div style={{ padding: '22px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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

function PromoCard({ promo, lang }) {
    const title = promo.title?.[lang] || promo.title?.uz || '';
    const desc = promo.description?.[lang] || promo.description?.uz || '';
    const discountLabel = promo.discountType === 'percent'
        ? `${promo.discountValue}% chegirma`
        : `${promo.discountValue.toLocaleString()} so'm chegirma`;

    return (
        <div style={{
            minWidth: 240, maxWidth: 260, flexShrink: 0,
            background: 'linear-gradient(135deg, #B8860B 0%, #D4A017 55%, #E86420 100%)',
            borderRadius: 18, padding: '16px 18px',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(212,160,23,0.25)',
        }}>
            {/* Decorative circles */}
            <div style={{ position: 'absolute', top: -28, right: -28, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', bottom: -20, left: -20, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

            <div style={{ position: 'relative' }}>
                <div style={{
                    display: 'inline-block',
                    background: 'rgba(26,26,36,0.18)',
                    borderRadius: 8, padding: '3px 10px',
                    fontSize: 11, fontWeight: 800, color: '#1a1a24',
                    marginBottom: 8, letterSpacing: 0.5,
                }}>
                    {discountLabel}
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1a24', lineHeight: 1.3, marginBottom: 4 }}>
                    {title}
                </div>
                {desc && (
                    <div style={{ fontSize: 11, color: 'rgba(26,26,36,0.7)', fontWeight: 500, lineHeight: 1.4 }}>
                        {desc}
                    </div>
                )}
                {promo.promoCode && (
                    <div style={{
                        marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'rgba(26,26,36,0.15)', borderRadius: 8,
                        padding: '5px 10px',
                    }}>
                        <span style={{ fontSize: 10, color: 'rgba(26,26,36,0.6)', fontWeight: 600 }}>KOD:</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#1a1a24', letterSpacing: 2, fontFamily: 'monospace' }}>
                            {promo.promoCode}
                        </span>
                    </div>
                )}
                {promo.endDate && (
                    <div style={{ fontSize: 10, color: 'rgba(26,26,36,0.55)', marginTop: 6, fontWeight: 500 }}>
                        ⏱ {new Date(promo.endDate).toLocaleDateString()}gacha
                    </div>
                )}
            </div>
        </div>
    );
}

function PopularCard({ product, onPress }) {
    return (
        <div
            onClick={onPress}
            style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                transition: 'all 0.25s', boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            }}
        >
            <div style={{
                height: 120, background: 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, position: 'relative', overflow: 'hidden',
            }}>
                <img
                    src={getProductImage(product)}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.src = '/uploads/menu/assartitaom.jpg'; }}
                />
                {/* Bottom gradient overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, rgba(26,26,38,0.5))' }} />
                {product.isSpicy && (
                    <span style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(231,76,60,0.9)', color: '#fff',
                        borderRadius: 8, fontSize: 10, padding: '3px 7px', fontWeight: 700,
                        backdropFilter: 'blur(4px)',
                    }}>
                        🌶
                    </span>
                )}
            </div>
            <div style={{ padding: '10px 12px 14px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, lineHeight: 1.3 }}>
                    {product.name}
                </div>
                <div style={{
                    fontWeight: 800, fontSize: 14,
                    background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
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
            borderRadius: 16, padding: '14px 14px',
            transition: 'all 0.25s',
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(212,160,23,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 18, marginBottom: 8,
            }}>{icon}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{value}</div>
        </div>
    );
}
