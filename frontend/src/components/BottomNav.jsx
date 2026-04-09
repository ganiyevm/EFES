import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const TABS = [
    { path: '/',        label: 'Bosh sahifa', svg: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
    { path: '/cart',    label: 'Savat',       svg: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0' },
    { path: '/orders',  label: 'Buyurtmalar', svg: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 M12 12h.01 M12 16h.01' },
    { path: '/profile', label: 'Profil',      svg: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
];

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { totalItems } = useCart();

    return (
        <nav style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#fff',
            borderTop: '1px solid #EDE8E2',
            display: 'flex', justifyContent: 'space-around',
            padding: '8px 0 20px', zIndex: 100,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        }}>
            {TABS.map(tab => {
                const active = location.pathname === tab.path;
                const isCart = tab.path === '/cart';
                return (
                    <button
                        key={tab.path}
                        onClick={() => navigate(tab.path)}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: 'inherit', padding: '4px 16px',
                            position: 'relative',
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <svg
                                width="24" height="24" viewBox="0 0 24 24"
                                fill="none"
                                stroke={active ? '#C1440E' : '#999'}
                                strokeWidth={active ? 2.2 : 1.8}
                                strokeLinecap="round" strokeLinejoin="round"
                            >
                                {tab.svg.split(' M').map((d, i) => (
                                    <path key={i} d={i === 0 ? d : 'M' + d} />
                                ))}
                            </svg>
                            {isCart && totalItems > 0 && (
                                <div style={{
                                    position: 'absolute', top: -4, right: -6,
                                    background: '#C1440E', color: '#fff',
                                    fontSize: 9, fontWeight: 800,
                                    minWidth: 16, height: 16, borderRadius: 8,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '0 4px',
                                }}>
                                    {totalItems}
                                </div>
                            )}
                        </div>
                        <span style={{
                            fontSize: 10, fontWeight: active ? 700 : 500,
                            color: active ? '#C1440E' : '#999',
                        }}>{tab.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
