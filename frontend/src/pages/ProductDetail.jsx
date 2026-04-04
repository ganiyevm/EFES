import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useT } from '../i18n';
import api from '../api';

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useT();
    const { items, addItem } = useCart();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);
    const [note, setNote] = useState('');
    const [added, setAdded] = useState(false);

    const cartItem = items.find(i => i.productId === id);

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
            <div style={{ fontSize: 36 }}>⏳</div>
        </div>
    );

    if (!product) return null;

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
            {/* Image */}
            <div style={{ position: 'relative', height: 260, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 80 }}>🍽</div>
                )}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        position: 'absolute', top: 16, left: 16,
                        background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 50,
                        width: 40, height: 40, color: '#fff', fontSize: 18,
                        cursor: 'pointer', backdropFilter: 'blur(4px)',
                    }}
                >←</button>
                {/* Badges */}
                <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {product.isSpicy && <Badge color="#e74c3c" text={t('spicy')} />}
                    {product.isVegetarian && <Badge color="#27ae60" text={t('vegetarian')} />}
                    {product.isPopular && <Badge color="#f39c12" text={t('popular')} />}
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 20px 120px' }}>
                <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6, lineHeight: 1.3 }}>
                    {product.name}
                </div>

                {/* Price */}
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)', marginBottom: 16 }}>
                    {(product.price || 0).toLocaleString()} so'm
                </div>

                {/* Meta row */}
                {(product.weight || product.calories || product.prepTime) && (
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
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
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>🧾 {t('ingredients')}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {product.ingredients}
                        </div>
                    </div>
                )}

                {/* Description */}
                {product.description?.uz && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, background: 'var(--bg-card)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border)' }}>
                            {product.description.uz}
                        </div>
                    </div>
                )}

                {/* Note */}
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>📝 {t('itemNote')}</div>
                    <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder={t('itemNotePlaceholder')}
                        rows={2}
                        style={{
                            width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 12, padding: '12px 14px', color: 'var(--text)',
                            fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit',
                        }}
                    />
                </div>
            </div>

            {/* Bottom bar */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
                padding: '12px 20px 28px',
            }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', maxWidth: 480, margin: '0 auto' }}>
                    {/* Qty */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-secondary)', borderRadius: 12, padding: '4px 8px' }}>
                        <button
                            onClick={() => setQty(q => Math.max(1, q - 1))}
                            style={{ width: 32, height: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 18, cursor: 'pointer', fontWeight: 700 }}
                        >−</button>
                        <span style={{ fontWeight: 800, fontSize: 16, minWidth: 28, textAlign: 'center' }}>{qty}</span>
                        <button
                            onClick={() => setQty(q => q + 1)}
                            style={{ width: 32, height: 32, background: 'var(--primary)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 18, cursor: 'pointer', fontWeight: 700 }}
                        >+</button>
                    </div>

                    {/* Add button */}
                    <button
                        onClick={handleAdd}
                        style={{
                            flex: 1, padding: '14px 16px', borderRadius: 14, border: 'none',
                            background: added ? '#27ae60' : 'var(--primary)',
                            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                            transition: 'background 0.2s', fontFamily: 'inherit',
                        }}
                    >
                        {added
                            ? '✅ ' + t('inCart')
                            : `${t('addToCart')} • ${(product.price * qty).toLocaleString()} so'm`
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

function Badge({ color, text }) {
    return (
        <span style={{ background: color, color: '#fff', borderRadius: 8, fontSize: 11, padding: '3px 8px', fontWeight: 700 }}>
            {text}
        </span>
    );
}

function MetaItem({ icon, label, value }) {
    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{value}</div>
        </div>
    );
}
