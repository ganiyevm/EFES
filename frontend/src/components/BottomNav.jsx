import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useT } from '../i18n';

const TABS = [
    { path: '/', key: 'home', label: 'Menyu', icon: 'Menu' },
    { path: '/cart', key: 'cart', label: 'Savat', icon: 'Cart' },
    { path: '/orders', key: 'orders', label: 'Tarix', icon: 'List' },
    { path: '/profile', key: 'profile', label: 'Profil', icon: 'User' },
];

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { totalItems } = useCart();
    const { t } = useT();

    return (
        <nav className="efes-bottom-nav">
            {TABS.map(tab => {
                const active = location.pathname === tab.path;
                const isCart = tab.path === '/cart';
                const translated = t(tab.key);
                const label = translated && translated !== tab.key ? translated : tab.label;
                return (
                    <button
                        key={tab.path}
                        type="button"
                        className={active ? 'active' : ''}
                        onClick={() => navigate(tab.path)}
                    >
                        <span className="efes-bottom-nav__icon">
                            {tab.icon}
                            {isCart && totalItems > 0 && <b>{totalItems}</b>}
                        </span>
                        <span>{label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
