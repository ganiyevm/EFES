import { useEffect, useMemo, useRef, useState } from 'react';
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
    { key: 'set_menu', label: 'Setlar', cue: 'Combo' },
    { key: 'kebab', label: 'Kebab', cue: 'Grill' },
    { key: 'doner', label: 'Doner', cue: 'Classic' },
    { key: 'burger', label: 'Burger', cue: 'Fast' },
    { key: 'pide', label: 'Pide', cue: 'Oven' },
    { key: 'izgara', label: 'Izgara', cue: 'Fire' },
    { key: 'corba', label: "Sho'rva", cue: 'Hot' },
    { key: 'salat', label: 'Salatlar', cue: 'Fresh' },
    { key: 'pizza', label: 'Pizza', cue: 'Slice' },
    { key: 'drink', label: 'Ichimliklar', cue: 'Cold' },
    { key: 'dessert', label: 'Desertlar', cue: 'Sweet' },
    { key: 'garnir', label: 'Garnirlar', cue: 'Side' },
];

function groupByCategory(products) {
    const order = CATS.map(c => c.key);
    const map = {};
    products.forEach(p => {
        const key = p.category || 'other';
        if (!map[key]) map[key] = [];
        map[key].push(p);
    });
    return [
        ...order.filter(key => map[key]?.length).map(key => ({ key, items: map[key] })),
        ...Object.keys(map).filter(key => !order.includes(key)).map(key => ({ key, items: map[key] })),
    ];
}

export default function Home() {
    const { user } = useAuth();
    const { items, addItem } = useCart();
    const { lang } = useT();
    const navigate = useNavigate();
    const debounceRef = useRef(null);

    const [products, setProducts] = useState([]);
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCat, setActiveCat] = useState('all');
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [showSideMenu, setShowSideMenu] = useState(false);
    const [showLangSelect, setShowLangSelect] = useState(false);

    const deliveryType = localStorage.getItem('efes_delivery_type') || 'delivery';
    const savedAddress = localStorage.getItem('efes_address') || '';
    const addressLabel = deliveryType === 'pickup'
        ? 'Olib ketish'
        : (savedAddress ? savedAddress.split(',')[0] : 'Manzil tanlang');
    const inCartMap = useMemo(() => Object.fromEntries(items.map(i => [i.productId, i.qty])), [items]);
    const cartTotal = items.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);

    const fetchProducts = (q = '') => {
        setLoading(true);
        const params = new URLSearchParams({ limit: 200 });
        if (q) params.set('search', q);
        api.get(`/products?${params}`)
            .then(r => setProducts(r.data.products || []))
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchProducts();
        api.get('/promotions').then(r => setPromos(r.data || [])).catch(() => {});
    }, []);

    const visibleCats = useMemo(() => {
        const groups = groupByCategory(products);
        return [{ key: 'all', label: 'Barchasi', cue: `${products.length} ta` }, ...groups.map(g => {
            const cat = CATS.find(c => c.key === g.key) || { key: g.key, label: g.key, cue: 'Menu' };
            return { ...cat, count: g.items.length };
        })];
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (activeCat === 'all' || search) return products;
        return products.filter(p => p.category === activeCat);
    }, [activeCat, products, search]);

    const handleSearch = (value) => {
        setSearch(value);
        setActiveCat('all');
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchProducts(value), 350);
    };

    return (
        <div className="efes-market efes-market--pro">
            <header className="efes-market-header">
                <div className="efes-market-topline">
                    <button className="efes-avatar" type="button" onClick={() => setShowSideMenu(true)} aria-label="Menu">
                        <span />
                        <span />
                    </button>
                    <button className="efes-location" type="button" onClick={() => setShowDeliveryModal(true)}>
                        <span className="efes-location__mode">{deliveryType === 'delivery' ? 'Yetkazib berish' : 'Olib ketish'}</span>
                        <span className="efes-location__address">{addressLabel}</span>
                    </button>
                    <button className="efes-profile-chip" type="button" onClick={() => navigate('/profile')} aria-label="Profile">
                        {user?.firstName?.[0]?.toUpperCase() || 'E'}
                    </button>
                </div>

                <div className="efes-hero-strip">
                    <div>
                        <p>EFES Kebab</p>
                        <h1>Sevimli taomingizni tanlang</h1>
                        <span>Grill, doner va burgerlar bir joyda</span>
                    </div>
                    <button type="button" onClick={() => navigate('/cart')}>
                        <small>Savat</small>
                        <b>{items.length}</b>
                    </button>
                </div>
            </header>

            {promos.length > 0 && <PromoCarousel promos={promos} lang={lang} />}

            <section className="efes-search-panel">
                <div className="efes-search-box">
                    <span>Qidir</span>
                    <input
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Kebab, burger yoki ichimlik qidiring"
                    />
                    {search && <button type="button" onClick={() => { setSearch(''); fetchProducts(''); }} aria-label="Tozalash">x</button>}
                </div>
            </section>

            <nav className="efes-category-rail">
                {visibleCats.map(cat => (
                    <button
                        key={cat.key}
                        type="button"
                        className={activeCat === cat.key ? 'active' : ''}
                        onClick={() => setActiveCat(cat.key)}
                    >
                        <span>{cat.label}</span>
                        <small>{cat.count || cat.cue}</small>
                    </button>
                ))}
            </nav>

            <main className="efes-product-area">
                <div className="efes-section-head">
                    <div>
                        <span>Menyu</span>
                        <h2>{search ? 'Qidiruv natijalari' : (visibleCats.find(c => c.key === activeCat)?.label || 'Menyu')}</h2>
                    </div>
                    <button type="button" onClick={() => navigate('/orders')}>Buyurtmalar</button>
                </div>

                {loading ? (
                    <div className="loading"><div className="spinner" /></div>
                ) : filteredProducts.length === 0 ? (
                    <div className="empty">
                        <div className="empty-text">Mahsulot topilmadi</div>
                        <div className="empty-sub">Boshqa nom bilan qidirib ko'ring</div>
                    </div>
                ) : (
                    <div className="efes-product-grid">
                        {filteredProducts.map(product => (
                            <ProductCard
                                key={product._id}
                                product={product}
                                lang={lang}
                                inCart={inCartMap[product._id] || 0}
                                onOpen={() => navigate(`/product/${product._id}`)}
                                onAdd={() => addItem(product)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {showDeliveryModal && (
                <DeliveryTypeModal onSelect={() => { setShowDeliveryModal(false); window.location.reload(); }} />
            )}
            {showSideMenu && (
                <SideMenu onClose={() => setShowSideMenu(false)} onLangOpen={() => setShowLangSelect(true)} />
            )}
            {showLangSelect && (
                <LangSelect onSelect={() => { setShowLangSelect(false); window.location.reload(); }} />
            )}
            {items.length > 0 && (
                <button className="efes-floating-cart" type="button" onClick={() => navigate('/cart')}>
                    <span>{items.length} mahsulot</span>
                    <b>{cartTotal.toLocaleString('ru-RU')} so'm</b>
                </button>
            )}
            <BottomNav />
        </div>
    );
}

function PromoCarousel({ promos, lang }) {
    const [active, setActive] = useState(0);

    useEffect(() => {
        if (promos.length <= 1) return undefined;
        const timer = setInterval(() => setActive(i => (i + 1) % promos.length), 4000);
        return () => clearInterval(timer);
    }, [promos.length]);

    const promo = promos[active];
    const title = promo.title?.[lang] || promo.title?.uz || 'Aksiya';
    const discount = promo.discountValue > 0
        ? (promo.discountType === 'percent' ? `-${promo.discountValue}%` : `-${promo.discountValue?.toLocaleString()} so'm`)
        : null;

    return (
        <section className="efes-promo">
            {promo.imageUrl && <img src={promo.imageUrl} alt={title} />}
            <div className="efes-promo__shade" />
            <div className="efes-promo__content">
                {discount && <span>{discount}</span>}
                <h2>{title}</h2>
                {promo.promoCode && <p>Kod: {promo.promoCode}</p>}
            </div>
            {promos.length > 1 && (
                <div className="efes-promo__dots">
                    {promos.map((_, i) => <button key={i} type="button" className={i === active ? 'active' : ''} onClick={() => setActive(i)} />)}
                </div>
            )}
        </section>
    );
}

function ProductCard({ product, lang, inCart, onOpen, onAdd }) {
    const description = typeof product.description === 'string'
        ? product.description
        : (product.description?.[lang] || product.description?.uz || product.description?.ru || '');

    return (
        <article className="efes-menu-card" onClick={onOpen}>
            <div className="efes-menu-card__image">
                <img
                    src={getProductImage(product)}
                    alt={product.name}
                    onError={e => { e.currentTarget.src = '/uploads/menu/assartitaom.jpg'; }}
                />
                {(product.isNew || product.isPopular) && (
                    <span className={product.isNew ? 'pink' : ''}>{product.isNew ? 'Yangi' : 'Mashhur'}</span>
                )}
                <button type="button" className={inCart ? 'active' : ''} onClick={e => { e.stopPropagation(); onAdd(); }} aria-label="Savatga qo'shish">
                    {inCart ? inCart : '+'}
                </button>
            </div>
            <div className="efes-menu-card__body">
                <p>{product.name}</p>
                <strong>{(product.price || 0).toLocaleString('ru-RU')} so'm</strong>
                {description && <span>{description}</span>}
            </div>
        </article>
    );
}
