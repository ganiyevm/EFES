import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { totalItems } = useCart();

    const tabs = [
        { path: '/', icon: '🏠', label: 'Bosh sahifa' },
        { path: '/menu', icon: '🍽', label: 'Menyu' },
        { path: '/cart', icon: '🛒', label: 'Savat' },
        { path: '/orders', icon: '📋', label: 'Buyurtmalar' },
        { path: '/profile', icon: '👤', label: 'Profil' },
    ];

    return (
        <nav className="bottom-nav">
            {tabs.map(tab => (
                <button
                    key={tab.path}
                    className={`nav-item ${location.pathname === tab.path ? 'active' : ''}`}
                    onClick={() => navigate(tab.path)}
                >
                    <span className="nav-icon">{tab.icon}</span>
                    {tab.label}
                    {tab.path === '/cart' && totalItems > 0 && (
                        <span className="nav-badge">{totalItems}</span>
                    )}
                </button>
            ))}
        </nav>
    );
}
