import { NavLink, useNavigate } from 'react-router-dom';

const NAV_GROUPS = [
    {
        title: 'Boshqaruv',
        items: [
            { to: '/admin', icon: 'BI', label: 'Dashboard', end: true },
            { to: '/admin/orders', icon: 'OR', label: 'Buyurtmalar' },
            { to: '/admin/users', icon: 'CU', label: 'Mijozlar' },
        ],
    },
    {
        title: 'Menyu va savdo',
        items: [
            { to: '/admin/products', icon: 'MN', label: 'Mahsulotlar' },
            { to: '/admin/promotions', icon: 'PR', label: 'Aksiyalar' },
            { to: '/admin/import', icon: 'IM', label: 'Import' },
        ],
    },
    {
        title: 'Operatsiya',
        items: [
            { to: '/admin/branches', icon: 'BR', label: 'Filiallar' },
            { to: '/admin/couriers', icon: 'CR', label: 'Kuriyerlar' },
            { to: '/admin/operators', icon: 'OP', label: 'Operatorlar' },
        ],
    },
    {
        title: 'Sozlamalar',
        items: [
            { to: '/admin/delivery', icon: 'DL', label: 'Yetkazib berish' },
            { to: '/admin/app-content', icon: 'APP', label: 'Ilova kontenti' },
            { to: '/admin/accounts', icon: 'AD', label: 'Adminlar' },
        ],
    },
];

export default function Sidebar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('efes_admin_token');
        navigate('/admin/login');
    };

    return (
        <aside className="efes-admin-sidebar">
            <div className="efes-admin-brand">
                <img src="/logo/efes_logo.jpg" alt="EFES" />
                <div>
                    <strong>EFES</strong>
                    <span>Delivery Console</span>
                </div>
            </div>

            <nav className="efes-admin-nav">
                {NAV_GROUPS.map(group => (
                    <section key={group.title}>
                        <p>{group.title}</p>
                        {group.items.map(item => (
                            <NavLink key={item.to} to={item.to} end={item.end}>
                                <b>{item.icon}</b>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </section>
                ))}
            </nav>

            <button className="efes-admin-logout" type="button" onClick={handleLogout}>
                <span>Chiqish</span>
            </button>
        </aside>
    );
}
