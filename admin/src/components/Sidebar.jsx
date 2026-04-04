import { NavLink, useNavigate } from 'react-router-dom';

const NAV = [
    { to: '/admin', icon: '📊', label: 'Dashboard', end: true },
    { to: '/admin/orders', icon: '📋', label: 'Buyurtmalar' },
    { to: '/admin/products', icon: '🍽', label: 'Mahsulotlar' },
    { to: '/admin/branches', icon: '🏢', label: 'Filiallar' },
    { to: '/admin/users', icon: '👥', label: 'Foydalanuvchilar' },
    { to: '/admin/import', icon: '📥', label: 'Import' },
    { to: '/admin/delivery', icon: '🚗', label: 'Yetkazib berish' },
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
            position: 'fixed', left: 0, top: 0, bottom: 0, width: 240,
            background: 'var(--sidebar)', display: 'flex', flexDirection: 'column',
            zIndex: 100,
        }}>
            {/* Logo */}
            <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        🔥
                    </div>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 18, color: '#fff', letterSpacing: -0.5 }}>EFES</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>Admin Panel</div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
                {NAV.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 12px', borderRadius: 10, marginBottom: 3,
                            textDecoration: 'none', fontSize: 14, fontWeight: 600,
                            background: isActive ? 'var(--sidebar-active)' : 'transparent',
                            color: isActive ? '#e94560' : 'var(--sidebar-text)',
                            borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                            transition: 'all 0.15s',
                        })}
                    >
                        <span style={{ fontSize: 17 }}>{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%', padding: '10px 12px', borderRadius: 10,
                        background: 'rgba(231,76,60,0.15)', border: 'none',
                        color: '#e74c3c', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                    }}
                >
                    🚪 Chiqish
                </button>
            </div>
        </aside>
    );
}
