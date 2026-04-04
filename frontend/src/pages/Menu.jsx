import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useT } from '../i18n';
import api from '../api';
import BottomNav from '../components/BottomNav';

const CATS = [
    { key: 'all', icon: '🍽' },
    { key: 'kebab', icon: '🥙' }, { key: 'doner', icon: '🌯' },
    { key: 'pide', icon: '🫓' }, { key: 'izgara', icon: '🥩' },
    { key: 'corba', icon: '🍲' }, { key: 'manti', icon: '🥟' },
    { key: 'burger', icon: '🍔' }, { key: 'pizza', icon: '🍕' },
    { key: 'hot_dog', icon: '🌭' }, { key: 'salat', icon: '🥗' },
    { key: 'drink', icon: '🥤' }, { key: 'dessert', icon: '🍰' },
    { key: 'garnir', icon: '🍟' }, { key: 'sous', icon: '🧴' },
    { key: 'set_menu', icon: '🍱' },
];

export default function Menu() {
    const { t } = useT();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const { items, addItem } = useCart();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState(params.get('category') || 'all');
    const debounce = useRef(null);

    const inCartMap = Object.fromEntries(items.map(i => [i.productId, i.qty]));

    const fetchProducts = (q, cat) => {
        setLoading(true);
        const params = new URLSearchParams({ limit: 100 });
        if (q) params.set('search', q);
        if (cat && cat !== 'all') params.set('category', cat);
        api.get(`/products?${params}`)
            .then(r => setProducts(r.data.products || []))
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchProducts(search, category);
    }, [category]);

    const handleSearch = (val) => {
        setSearch(val);
        clearTimeout(debounce.current);
        debounce.current = setTimeout(() => fetchProducts(val, category), 400);
    };

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 90 }}>
            {/* Header */}
            <div style={{ padding: '16px 16px 0', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10, paddingBottom: 4 }}>
                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 10 }}>🍽 Menyu</div>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
                    <input
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        style={{
                            width: '100%', padding: '11px 12px 11px 38px',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 12, color: 'var(--text)', fontSize: 14, outline: 'none',
                            fontFamily: 'inherit',
                        }}
                    />
                    {search && (
                        <button
                            onClick={() => { setSearch(''); fetchProducts('', category); }}
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16 }}
                        >✕</button>
                    )}
                </div>

                {/* Category pills */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
                    {CATS.map(c => (
                        <button
                            key={c.key}
                            onClick={() => setCategory(c.key)}
                            style={{
                                flexShrink: 0, padding: '8px 14px', borderRadius: 20,
                                background: category === c.key ? 'var(--primary)' : 'var(--bg-card)',
                                border: `1px solid ${category === c.key ? 'var(--primary)' : 'var(--border)'}`,
                                color: category === c.key ? '#fff' : 'var(--text)',
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                                fontFamily: 'inherit',
                            }}
                        >
                            {c.icon} {c.key === 'all' ? t('allCategories') : t(`cat_${c.key}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results count */}
            {!loading && (
                <div style={{ padding: '0 16px 8px', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {search ? t('foundCount').replace('{n}', products.length) : ''}
                </div>
            )}

            {/* Products grid */}
            <div style={{ padding: '0 16px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                        {t('loading')}
                    </div>
                ) : products.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{t('noProducts')}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('tryOtherSearch')}</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 8 }}>
                        {products.map(p => (
                            <MenuCard
                                key={p._id}
                                product={p}
                                inCart={inCartMap[p._id] || 0}
                                onPress={() => navigate(`/product/${p._id}`)}
                                onAdd={() => addItem(p)}
                                t={t}
                            />
                        ))}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}

function MenuCard({ product, inCart, onPress, onAdd, t }) {
    return (
        <div
            style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
            }}
            onClick={onPress}
        >
            <div style={{
                height: 110, background: 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, position: 'relative', flexShrink: 0,
            }}>
                {product.imageUrl
                    ? <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '🍽'
                }
                <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', gap: 4 }}>
                    {product.isSpicy && <span style={{ background: '#e74c3c', color: '#fff', borderRadius: 6, fontSize: 9, padding: '2px 5px', fontWeight: 700 }}>🌶</span>}
                    {product.isVegetarian && <span style={{ background: '#27ae60', color: '#fff', borderRadius: 6, fontSize: 9, padding: '2px 5px', fontWeight: 700 }}>🥗</span>}
                    {product.isPopular && <span style={{ background: '#f39c12', color: '#fff', borderRadius: 6, fontSize: 9, padding: '2px 5px', fontWeight: 700 }}>⭐</span>}
                </div>
            </div>
            <div style={{ padding: '10px 10px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, lineHeight: 1.3 }}>
                    {product.name}
                </div>
                {product.weight && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        {product.weight} {product.calories ? `· ${product.calories} kcal` : ''}
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary)' }}>
                        {(product.price || 0).toLocaleString()} so'm
                    </div>
                    <button
                        onClick={e => { e.stopPropagation(); onAdd(); }}
                        style={{
                            width: 30, height: 30, borderRadius: 8,
                            background: inCart > 0 ? 'var(--accent)' : 'var(--primary)',
                            border: 'none', color: '#fff', fontSize: 18,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, lineHeight: 1,
                        }}
                    >
                        {inCart > 0 ? inCart : '+'}
                    </button>
                </div>
            </div>
        </div>
    );
}
