import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useT } from '../i18n';
import api from '../api';
import { getProductImage } from '../utils/productImage';
import BottomNav from '../components/BottomNav';

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useT();
    const { addItem } = useCart();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);
    const [note, setNote] = useState('');
    const [added, setAdded] = useState(false);

    useEffect(() => {
        api.get(`/products/${id}`)
            .then(r => setProduct(r.data))
            .catch(() => navigate(-1))
            .finally(() => setLoading(false));
    }, [id]);

    const handleAdd = () => {
        addItem(product, qty, note);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
            <div className="spinner" />
        </div>
    );

    if (!product) return null;

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
            {/* ── Hero Image ── */}
            <div style={{ position: 'relative', height: 280, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                <img
                    src={getProductImage(product)}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.src = '/uploads/menu/assartitaom.jpg'; }}
                />
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(transparent, var(--bg))' }} />

                {/* Back button — large and visible */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        position: 'absolute', top: 16, left: 16,
                        background: 'rgba(13,13,20,0.75)', border: '1.5px solid rgba(255,255,255,0.18)',
                        borderRadius: 16, height: 48, paddingLeft: 14, paddingRight: 18,
                        color: '#fff', fontSize: 15, fontWeight: 700,
                        cursor: 'pointer', backdropFilter: 'blur(12px)',
                        display: 'flex', alignItems: 'center', gap: 8,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        fontFamily: 'inherit',
                    }}
                >
                    <span style={{ fontSize: 20, lineHeight: 1 }}>←</span>
                    <span>{t('back')}</span>
                </button>

                {/* Badges */}
                <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {product.isSpicy && <Badge color="rgba(231,76,60,0.9)" text={t('spicy')} />}
                    {product.isVegetarian && <Badge color="rgba(46,204,113,0.9)" text={t('vegetarian')} />}
                    {product.isPopular && <Badge color="rgba(212,160,23,0.9)" text={t('popular')} textColor="#1a1a24" />}
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ padding: '20px 20px 210px', marginTop: -20, position: 'relative' }}>
                <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, lineHeight: 1.3 }}>
                    {product.name}
                </div>

                {/* Meta row */}
                {(product.weight || product.calories || product.prepTime) && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                        {product.weight && (
                            <MetaItem icon="⚖️" label={t('weight')} value={product.weight} />
                        )}
                        {product.calories > 0 && (
                            <MetaItem icon="🔥" label={t('calories')} value={`${product.calories} ${t('kcal')}`} />
                        )}
                        {product.prepTime > 0 && (
                            <MetaItem icon="⏱" label={t('prepTime')} value={`${product.prepTime} ${t('min')}`} />
                        )}
                    </div>
                )}

                {/* Ingredients */}
                {product.ingredients && (
                    <div style={{ marginBottom: 18 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--primary-light)' }}>🧾</span> {t('ingredients')}
                        </div>
                        <div style={{
                            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
                            background: 'var(--bg-card)', borderRadius: 14,
                            padding: '14px 16px', border: '1px solid var(--border)',
                        }}>
                            {product.ingredients}
                        </div>
                    </div>
                )}

                {/* Description */}
                {product.description?.uz && (
                    <div style={{ marginBottom: 18 }}>
                        <div style={{
                            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
                            background: 'var(--bg-card)', borderRadius: 14,
                            padding: '14px 16px', border: '1px solid var(--border)',
                        }}>
                            {product.description.uz}
                        </div>
                    </div>
                )}

                {/* Note */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--primary-light)' }}>📝</span> {t('itemNote')}
                    </div>
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder={t('itemNotePlaceholder')}
                        rows={2}
                        style={{
                            width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 14, padding: '13px 16px', color: 'var(--text)',
                            fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit',
                            transition: 'all 0.25s',
                        }}
                        onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.12)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                    />
                </div>
            </div>

            {/* ── Bottom Bar (above BottomNav) ── */}
            <div style={{
                position: 'fixed', bottom: 68, left: 0, right: 0,
                background: 'rgba(13,13,20,0.95)', borderTop: '1px solid var(--border)',
                padding: '12px 20px 14px', backdropFilter: 'blur(20px)',
            }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', maxWidth: 480, margin: '0 auto' }}>
                    {/* Qty */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: 'var(--bg-secondary)', borderRadius: 14, padding: '4px 8px',
                        border: '1px solid var(--border)',
                    }}>
                        <button
                            onClick={() => setQty(q => Math.max(1, q - 1))}
                            style={{
                                width: 34, height: 34, background: 'var(--bg-card)',
                                border: '1px solid var(--border)', borderRadius: 10,
                                color: 'var(--text)', fontSize: 18, cursor: 'pointer', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >−</button>
                        <span style={{ fontWeight: 800, fontSize: 16, minWidth: 30, textAlign: 'center' }}>{qty}</span>
                        <button
                            onClick={() => setQty(q => q + 1)}
                            style={{
                                width: 34, height: 34,
                                background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                                border: 'none', borderRadius: 10,
                                color: '#1a1a24', fontSize: 18, cursor: 'pointer', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(212,160,23,0.3)',
                            }}
                        >+</button>
                    </div>

                    {/* Add button */}
                    <button
                        onClick={handleAdd}
                        style={{
                            flex: 1, padding: '15px 16px', borderRadius: 14, border: 'none',
                            background: added
                                ? 'linear-gradient(135deg, #27ae60, #2ecc71)'
                                : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                            color: added ? '#fff' : '#1a1a24',
                            fontSize: 15, fontWeight: 800, cursor: 'pointer',
                            transition: 'all 0.3s', fontFamily: 'inherit',
                            boxShadow: added ? '0 4px 16px rgba(46,204,113,0.3)' : '0 4px 16px rgba(212,160,23,0.3)',
                            letterSpacing: 0.02,
                        }}
                    >
                        {added ? '✅ ' + t('inCart') : t('addToCart')}
                    </button>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}

function Badge({ color, text, textColor = '#fff' }) {
    return (
        <span style={{
            background: color, color: textColor, borderRadius: 10,
            fontSize: 11, padding: '4px 10px', fontWeight: 700,
            backdropFilter: 'blur(4px)',
        }}>
            {text}
        </span>
    );
}

function MetaItem({ icon, label, value }) {
    return (
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '12px 14px', flex: 1, textAlign: 'center',
        }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: 'var(--primary-light)' }}>{value}</div>
        </div>
    );
}
