import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useT } from '../i18n';
import api from '../api';
import BottomNav from '../components/BottomNav';
import DeliveryTypeModal from '../components/DeliveryTypeModal';
import SideMenu from '../components/SideMenu';
import LangSelect from '../components/LangSelect';
import { getProductImage } from '../utils/productImage';

const CATS = [
    { key: 'all',      label: 'Barchasi',     icon: '🍽' },
    { key: 'set_menu', label: 'Setlar',        icon: '🍱' },
    { key: 'kebab',    label: 'Kebab',         icon: '🥙' },
    { key: 'doner',    label: 'Döner',         icon: '🌯' },
    { key: 'burger',   label: 'Burger',        icon: '🍔' },
    { key: 'pide',     label: 'Pide',          icon: '🫓' },
    { key: 'izgara',   label: 'Izgara',        icon: '🥩' },
    { key: 'corba',    label: "Sho'rva",       icon: '🍲' },
    { key: 'salat',    label: 'Salatlar',      icon: '🥗' },
    { key: 'pizza',    label: 'Pizza',         icon: '🍕' },
    { key: 'drink',    label: 'Ichimliklar',   icon: '🥤' },
    { key: 'dessert',  label: 'Desertlar',     icon: '🍰' },
    { key: 'garnir',   label: 'Garnirlar',     icon: '🍟' },
];

// Mahsulotlarni kategoriyalarga guruhlash
function groupByCategory(products) {
    const order = CATS.filter(c => c.key !== 'all').map(c => c.key);
    const map = {};
    products.forEach(p => {
        const key = p.category || 'other';
        if (!map[key]) map[key] = [];
        map[key].push(p);
    });
    const result = [];
    order.forEach(key => { if (map[key]?.length) result.push({ key, items: map[key] }); });
    Object.keys(map).forEach(key => {
        if (!order.includes(key) && map[key]?.length) result.push({ key, items: map[key] });
    });
    return result;
}

export default function Home() {
    const { user } = useAuth();
    const { items, addItem } = useCart();
    const { lang } = useT();
    const navigate = useNavigate();

    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [promos, setPromos] = useState([]);
    const [activeKey, setActiveKey] = useState('');
    const [search, setSearch] = useState('');
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [showSideMenu, setShowSideMenu] = useState(false);
    const [showLangSelect, setShowLangSelect] = useState(false);

    const debounceRef = useRef(null);
    const catBarRef = useRef(null);        // pills container
    const sectionRefs = useRef({});        // { catKey: domEl }
    const scrollingRef = useRef(false);    // pill click scroll lock

    const deliveryType = localStorage.getItem('efes_delivery_type') || 'delivery';
    const savedAddress = localStorage.getItem('efes_address') || '';
    const inCartMap = Object.fromEntries(items.map(i => [i.productId, i.qty]));

    // ── Fetch ──
    const fetchAll = (q = '') => {
        setLoading(true);
        const p = new URLSearchParams({ limit: 200 });
        if (q) p.set('search', q);
        api.get(`/products?${p}`)
            .then(r => setAllProducts(r.data.products || []))
            .catch(() => setAllProducts([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAll();
        api.get('/promotions').then(r => setPromos(r.data || [])).catch(() => {});
    }, []);

    const handleSearch = (val) => {
        setSearch(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchAll(val), 400);
    };

    // ── Grouped data ──
    const groups = search
        ? [{ key: 'search', items: allProducts }]
        : groupByCategory(allProducts);

    // ── Scroll pill into view ──
    const scrollPillIntoView = (key) => {
        const el = catBarRef.current?.querySelector(`[data-cat="${key}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };

    // ── Category pill click → scroll to section ──
    const handleCatClick = (key) => {
        const el = sectionRefs.current[key];
        if (!el) return;
        scrollingRef.current = true;
        setActiveKey(key);
        scrollPillIntoView(key);
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => { scrollingRef.current = false; }, 800);
    };

    // ── IntersectionObserver: section → active pill ──
    useEffect(() => {
        if (search) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (scrollingRef.current) return;
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const key = entry.target.dataset.section;
                        setActiveKey(key);
                        scrollPillIntoView(key);
                    }
                });
            },
            { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
        );
        Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
        return () => observer.disconnect();
    }, [groups.map(g => g.key).join(','), search]);

    const addressLabel = deliveryType === 'pickup'
        ? 'Olib ketish'
        : (savedAddress ? savedAddress.split(',')[0] : 'Manzil tanlang');

    // visible cats = only those with products (no "Barchasi")
    const activeCats = groups.map(g => CATS.find(c => c.key === g.key)).filter(Boolean);

    return (
        <div style={{ background: '#F5F2EE', minHeight: '100vh', paddingBottom: 90 }}>

            {/* ══ HEADER ══ */}
            <div style={{
                background: 'linear-gradient(135deg, #3D0F0F 0%, #5C1A1A 100%)',
                padding: '14px 16px 16px',
                position: 'sticky', top: 0, zIndex: 50,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #D4A017, #F0C040)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 17, color: '#3D0F0F', flexShrink: 0,
                    }}>
                        {user?.firstName?.[0]?.toUpperCase() || 'G'}
                    </div>
                    <button onClick={() => setShowDeliveryModal(true)} style={{
                        flex: 1, margin: '0 12px', textAlign: 'center',
                        background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {deliveryType === 'delivery' ? '🚗 Yetkazib berish' : '🏃 Olib ketish'}
                            <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 1, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px auto 0' }}>
                            {addressLabel}
                        </div>
                    </button>
                    <button onClick={() => setShowSideMenu(true)} style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: 'rgba(255,255,255,0.1)', border: 'none',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                        {[0, 0, 0].map((_, i) => (
                            <div key={i} style={{ width: 18, height: 2, borderRadius: 2, background: '#fff' }} />
                        ))}
                    </button>
                </div>
            </div>

            {/* ══ PROMO BANNER ══ */}
            {promos.length > 0 && (
                <div style={{ overflowX: 'auto', display: 'flex', gap: 12, padding: '12px 16px 4px', scrollbarWidth: 'none' }}>
                    {promos.map(p => <PromoBanner key={p._id} promo={p} lang={lang} />)}
                </div>
            )}

            {/* ══ SEARCH ══ */}
            <div style={{ padding: '12px 16px 0' }}>
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#999' }}>🔍</span>
                    <input
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Qidirish..."
                        style={{
                            width: '100%', padding: '13px 40px 13px 44px',
                            background: '#fff', border: '1.5px solid #E8E0D5',
                            borderRadius: 14, fontSize: 15, color: '#222',
                            outline: 'none', fontFamily: 'inherit',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = '#C1440E'}
                        onBlur={e => e.target.style.borderColor = '#E8E0D5'}
                    />
                    {search && (
                        <button onClick={() => { setSearch(''); fetchAll(''); }} style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: '#eee', border: 'none', borderRadius: 8,
                            width: 26, height: 26, cursor: 'pointer', fontSize: 13, color: '#666',
                        }}>✕</button>
                    )}
                </div>
            </div>

            {/* ══ CATEGORY PILLS (sticky) ══ */}
            <div ref={catBarRef} style={{
                display: 'flex', gap: 8, overflowX: 'auto',
                padding: '12px 16px 8px', scrollbarWidth: 'none',
                position: 'sticky', top: 78, zIndex: 40,
                background: '#F5F2EE',
            }}>
                {activeCats.map(c => {
                    const active = activeKey === c.key;
                    return (
                        <button
                            key={c.key}
                            data-cat={c.key}
                            onClick={() => handleCatClick(c.key)}
                            style={{
                                flexShrink: 0, padding: '9px 16px', borderRadius: 24,
                                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                fontSize: 13, fontWeight: active ? 700 : 500,
                                background: active ? '#C1440E' : '#fff',
                                color: active ? '#fff' : '#444',
                                boxShadow: active ? '0 4px 12px rgba(193,68,14,0.35)' : '0 1px 4px rgba(0,0,0,0.08)',
                                transition: 'all 0.2s', whiteSpace: 'nowrap',
                            }}
                        >
                            {c.icon} {c.label}
                        </button>
                    );
                })}
            </div>

            {/* ══ PRODUCTS (grouped sections) ══ */}
            <div style={{ padding: '4px 16px 8px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
                        <div className="spinner" style={{ borderTopColor: '#C1440E', borderColor: '#E8E0D5' }} />
                    </div>
                ) : groups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>🔍</div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: '#333', marginBottom: 6 }}>Mahsulot topilmadi</div>
                        <div style={{ color: '#999', fontSize: 14 }}>Boshqa kalit so'z bilan qidiring</div>
                    </div>
                ) : (
                    groups.map(group => {
                        const catInfo = CATS.find(c => c.key === group.key);
                        return (
                            <div
                                key={group.key}
                                ref={el => { sectionRefs.current[group.key] = el; }}
                                data-section={group.key}
                            >
                                {/* Section header */}
                                {!search && (
                                    <div style={{
                                        fontWeight: 800, fontSize: 16, color: '#1A1A1A',
                                        padding: '16px 0 10px',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                    }}>
                                        <span>{catInfo?.icon}</span>
                                        <span>{catInfo?.label || group.key}</span>
                                    </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
                                    {group.items.map(p => (
                                        <ProductCard
                                            key={p._id}
                                            product={p}
                                            inCart={inCartMap[p._id] || 0}
                                            onPress={() => navigate(`/product/${p._id}`)}
                                            onAdd={() => addItem(p)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {showDeliveryModal && (
                <DeliveryTypeModal onSelect={() => { setShowDeliveryModal(false); window.location.reload(); }} />
            )}
            {showSideMenu && (
                <SideMenu onClose={() => setShowSideMenu(false)} onLangOpen={() => setShowLangSelect(true)} />
            )}
            {showLangSelect && (
                <LangSelect onSelect={() => { setShowLangSelect(false); window.location.reload(); }} />
            )}
            <BottomNav />
        </div>
    );
}

function PromoBanner({ promo, lang }) {
    const title = promo.title?.[lang] || promo.title?.uz || '';
    const discountLabel = promo.discountType === 'percent'
        ? `${promo.discountValue}%`
        : `${promo.discountValue?.toLocaleString()} so'm`;

    return (
        <div style={{
            minWidth: 280, flexShrink: 0,
            background: 'linear-gradient(135deg, #1A0A00 0%, #5C1A1A 100%)',
            borderRadius: 18, padding: '16px 20px',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{
                display: 'inline-block', background: '#C1440E',
                borderRadius: 8, padding: '3px 10px',
                fontSize: 12, fontWeight: 800, color: '#fff', marginBottom: 8,
            }}>
                -{discountLabel} chegirma
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', lineHeight: 1.35 }}>{title}</div>
            {promo.promoCode && (
                <div style={{ marginTop: 8, display: 'inline-flex', gap: 6, alignItems: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 10px' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>KOD:</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#F0C040', letterSpacing: 2, fontFamily: 'monospace' }}>{promo.promoCode}</span>
                </div>
            )}
        </div>
    );
}

function ProductCard({ product, inCart, onPress, onAdd }) {
    return (
        <div
            onClick={onPress}
            style={{
                background: '#fff', borderRadius: 18,
                overflow: 'hidden', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(34,139,34,0.22)',
                display: 'flex', flexDirection: 'column',
                transition: 'transform 0.15s',
                position: 'relative',
            }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
        >
            {/* Image */}
            <div style={{ height: 130, position: 'relative', flexShrink: 0, background: '#F0EBE3' }}>
                <img
                    src={getProductImage(product)}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.src = '/uploads/menu/assartitaom.jpg'; }}
                />
                {/* Badge */}
                {product.isNew && (
                    <div style={{
                        position: 'absolute', top: 8, left: 8,
                        background: '#1A3A5C', color: '#fff',
                        fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                    }}>Yangi mahsulot</div>
                )}
                {product.isPopular && !product.isNew && (
                    <div style={{
                        position: 'absolute', top: 8, left: 8,
                        background: '#C1440E', color: '#fff',
                        fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                    }}>Mashhur</div>
                )}
                {product.discountPrice && (
                    <div style={{
                        position: 'absolute', top: 8, left: 8,
                        background: '#C1440E', color: '#fff',
                        fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                    }}>Aksiya</div>
                )}
            </div>

            {/* Info */}
            <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1A1A1A', lineHeight: 1.3, flex: 1, marginBottom: 8 }}>
                    {product.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    {/* + button */}
                    <button
                        onClick={e => { e.stopPropagation(); onAdd(); }}
                        style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: inCart > 0 ? '#C1440E' : '#F5F0E8',
                            border: `2px solid ${inCart > 0 ? '#C1440E' : '#E0D8CC'}`,
                            color: inCart > 0 ? '#fff' : '#333',
                            fontSize: inCart > 0 ? 13 : 20,
                            fontWeight: 800, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                            flexShrink: 0,
                        }}
                    >
                        {inCart > 0 ? inCart : '+'}
                    </button>
                </div>
            </div>
        </div>
    );
}

