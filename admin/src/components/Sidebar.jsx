import { NavLink, useNavigate } from 'react-router-dom';

const NAV = [
    { to: '/admin', icon: '📊', label: 'Dashboard', end: true },
    { to: '/admin/orders', icon: '📋', label: 'Buyurtmalar' },
    { to: '/admin/products', icon: '🍽', label: 'Mahsulotlar' },
    { to: '/admin/branches', icon: '🏢', label: 'Filiallar' },
    { to: '/admin/couriers', icon: '🏍', label: 'Kuriyerlar' },
    { to: '/admin/users', icon: '👥', label: 'Foydalanuvchilar' },
    { to: '/admin/promotions', icon: '🎁', label: 'Aksiyalar' },
    { to: '/admin/import', icon: '📥', label: 'Import' },
    { to: '/admin/delivery', icon: '🚗', label: 'Yetkazib berish' },
    { to: '/admin/app-content', icon: '📱', label: 'Ilova kontenti' },
    { to: '/admin/accounts', icon: '🔐', label: 'Adminlar' },
];

export default function Sidebar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('efes_admin_token');
        navigate('/admin/login');
    };

    return (
        <aside style={{
            position: 'fixed', left: 0, top: 0, bottom: 0, width: 250,
            background: 'var(--sidebar)', display: 'flex', flexDirection: 'column',
            zIndex: 100, borderRight: '1px solid var(--border)',
        }}>
            {/* Logo */}
            <div style={{
                padding: '24px 20px 22px',
                borderBottom: '1px solid var(--border)',
                background: 'linear-gradient(180deg, rgba(212,160,23,0.06) 0%, transparent 100%)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img
                        src="/logo/efes_logo.jpg"
                        alt="EFES"
                        style={{
                            width: 44, height: 44, borderRadius: 14,
                            objectFit: 'cover', flexShrink: 0,
                            boxShadow: '0 4px 16px rgba(212,160,23,0.3)',
                        }}
                    />
                    <div>
                        <div style={{
                            fontWeight: 900, fontSize: 19, letterSpacing: -0.5,
                            background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>EFES</div>
                        <div style={{ fontSize: 11, color: 'var(--sidebar-text)', marginTop: 1, fontWeight: 500 }}>Admin Panel</div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '14px 12px', overflowY: 'auto' }}>
                {NAV.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '11px 14px', borderRadius: 12, marginBottom: 4,
                            textDecoration: 'none', fontSize: 14, fontWeight: 600,
                            background: isActive ? 'var(--sidebar-active)' : 'transparent',
                            color: isActive ? 'var(--primary-strong)' : 'var(--sidebar-text)',
                            borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                            transition: 'all 0.2s',
                        })}
                    >
                        <span style={{ fontSize: 17 }}>{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div style={{ padding: '14px 12px', borderTop: '1px solid var(--border)' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%', padding: '11px 14px', borderRadius: 12,
                        background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.15)',
                        color: '#e74c3c', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                        fontFamily: 'inherit', transition: 'all 0.2s',
                    }}
                >
                    🚪 Chiqish
                </button>
            </div>
        </aside>
    );
}
