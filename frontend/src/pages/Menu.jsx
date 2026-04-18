import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useT } from '../i18n';
import api from '../api';
import BottomNav from '../components/BottomNav';
import { getProductImage } from '../utils/productImage';

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
            {/* ── Sticky Header ── */}
            <div style={{
                padding: '16px 16px 0', position: 'sticky', top: 0,
                background: 'var(--bg)', zIndex: 10, paddingBottom: 4,
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{
                    fontWeight: 800, fontSize: 20, marginBottom: 12,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <span style={{ color: 'var(--primary-light)' }}>🍽</span> Menyu
                </div>

                {/* ── Search ── */}
                <div style={{ position: 'relative', marginBottom: 12 }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, opacity: 0.5 }}>🔍</span>
                    <input
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        style={{
                            width: '100%', padding: '12px 40px 12px 42px',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 14, color: 'var(--text)', fontSize: 14, outline: 'none',
                            fontFamily: 'inherit', transition: 'all 0.25s',
                        }}
                        onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.12)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                    />
                    {search && (
                        <button
                            onClick={() => { setSearch(''); fetchProducts('', category); }}
                            style={{
                                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                background: 'rgba(212,160,23,0.15)', border: 'none',
                                color: 'var(--primary-light)', cursor: 'pointer', fontSize: 14,
                                width: 24, height: 24, borderRadius: 8,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700,
                            }}
                        >✕</button>
                    )}
                </div>

                {/* ── Category Pills ── */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
                    {CATS.map(c => (
                        <button
                            key={c.key}
                            onClick={() => setCategory(c.key)}
                            style={{
                                flexShrink: 0, padding: '9px 16px', borderRadius: 24,
                                background: category === c.key
                                    ? 'linear-gradient(135deg, var(--primary), var(--primary-light))'
                                    : 'var(--bg-card)',
                                border: `1px solid ${category === c.key ? 'transparent' : 'var(--border)'}`,
                                color: category === c.key ? '#1a1a24' : 'var(--text)',
                                fontSize: 13, fontWeight: category === c.key ? 700 : 600,
                                cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                                transition: 'all 0.25s',
                                boxShadow: category === c.key ? '0 2px 12px rgba(212,160,23,0.25)' : 'none',
                            }}
                        >
                            {c.icon} {c.key === 'all' ? t('allCategories') : t(`cat_${c.key}`)}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Results count ── */}
            {!loading && (
                <div style={{ padding: '8px 16px 4px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {search ? t('foundCount').replace('{n}', products.length) : ''}
                </div>
            )}

            {/* ── Products Grid ── */}
            <div style={{ padding: '0 16px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
                        <div className="spinner" />
                    </div>
                ) : products.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>🔍</div>
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
                            />
                        ))}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}

function MenuCard({ product, inCart, onPress, onAdd }) {
    return (
        <div
            style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                transition: 'all 0.25s', boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            }}
            onClick={onPress}
        >
            <div style={{
                height: 120, background: 'var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 48, position: 'relative', flexShrink: 0, overflow: 'hidden',
            }}>
                <img
                    src={getProductImage(product)}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.src = '/uploads/menu/assartitaom.jpg'; }}
                />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, background: 'linear-gradient(transparent, rgba(26,26,38,0.4))' }} />
                <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
                    {product.isSpicy && <span style={{ background: 'rgba(231,76,60,0.9)', color: '#fff', borderRadius: 6, fontSize: 9, padding: '2px 6px', fontWeight: 700, backdropFilter: 'blur(4px)' }}>🌶</span>}
                    {product.isVegetarian && <span style={{ background: 'rgba(46,204,113,0.9)', color: '#fff', borderRadius: 6, fontSize: 9, padding: '2px 6px', fontWeight: 700 }}>🥗</span>}
                    {product.isPopular && <span style={{ background: 'rgba(212,160,23,0.9)', color: '#1a1a24', borderRadius: 6, fontSize: 9, padding: '2px 6px', fontWeight: 700 }}>⭐</span>}
                </div>
            </div>
            <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, lineHeight: 1.3 }}>
                    {product.name}
                </div>
                {product.weight && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                        {product.weight} {product.calories ? `· ${product.calories} kcal` : ''}
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 'auto' }}>
                    <button
                        onClick={e => { e.stopPropagation(); onAdd(); }}
                        style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: inCart > 0
                                ? 'linear-gradient(135deg, var(--accent), #FF8C42)'
                                : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                            border: 'none', color: '#1a1a24', fontSize: 16,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, lineHeight: 1,
                            boxShadow: '0 2px 8px rgba(212,160,23,0.25)',
                            transition: 'all 0.2s',
                        }}
                    >
                        {inCart > 0 ? inCart : '+'}
                    </button>
                </div>
            </div>
        </div>
    );
}
