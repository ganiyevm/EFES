import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../api/axios';

const STATUS_COLORS_MAP = {
    awaiting_payment: '#f39c12', pending_operator: '#3498db',
    confirmed: '#27ae60', preparing: '#9b59b6', ready: '#1abc9c',
    on_the_way: '#e67e22', delivered: '#27ae60', rejected: '#e74c3c', cancelled: '#e74c3c',
};
const STATUS_LABELS = {
    awaiting_payment: "To'lov kutilmoqda", pending_operator: 'Operator',
    confirmed: 'Tasdiqlandi', preparing: 'Tayyorlanmoqda', ready: 'Tayyor',
    on_the_way: "Yo'lda", delivered: 'Yetkazildi', rejected: 'Rad etildi', cancelled: 'Bekor',
};
const PAY_COLORS = { click: '#3498db', payme: '#27ae60', cash: '#f39c12' };

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/admin/stats'),
            api.get('/analytics/dashboard'),
        ]).then(([s, a]) => {
            setStats(s.data);
            setAnalytics(a.data);
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>⏳ Yuklanmoqda...</div>;

    const statCards = [
        { icon: '📋', label: "Jami buyurtmalar", value: stats?.totalOrders || 0, color: 'var(--primary)' },
        { icon: '📦', label: 'Bugungi buyurtmalar', value: stats?.todayOrders || 0, color: 'var(--info)' },
        { icon: '💰', label: 'Jami daromad', value: `${(stats?.totalRevenue || 0).toLocaleString()} so'm`, color: 'var(--success)' },
        { icon: '💵', label: "Bugungi daromad", value: `${(stats?.todayRevenue || 0).toLocaleString()} so'm`, color: 'var(--warning)' },
        { icon: '👥', label: 'Foydalanuvchilar', value: stats?.totalUsers || 0, color: '#9b59b6' },
        { icon: '🍽', label: 'Faol mahsulotlar', value: stats?.totalProducts || 0, color: 'var(--accent)' },
        { icon: '🔥', label: 'Faol buyurtmalar', value: stats?.activeOrders || 0, color: 'var(--primary)' },
    ];

    const revenueData = (analytics?.revenueByDay || []).map(d => ({
        date: d._id?.slice(5) || '',
        revenue: Math.round(d.revenue / 1000),
        orders: d.orders,
    }));

    const statusData = (analytics?.ordersByStatus || []).map(s => ({
        name: STATUS_LABELS[s._id] || s._id,
        value: s.count,
        color: STATUS_COLORS_MAP[s._id] || '#999',
    }));

    const payData = (analytics?.paymentMethods || []).map(p => ({
        name: p._id, value: p.count,
        color: PAY_COLORS[p._id] || '#999',
    }));

    const topProducts = analytics?.topProducts || [];

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">📊 Dashboard</h1>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>

            {/* Stat cards */}
            <div className="stat-grid">
                {statCards.map(s => (
                    <div key={s.label} className="stat-card">
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Revenue line chart */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📈 30 kunlik daromad (ming so'm)</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v) => [`${v}K so'm`, 'Daromad']} />
                            <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Orders bar chart */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📦 Kunlik buyurtmalar</div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="orders" fill="var(--primary)" radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {/* Status pie */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📊 Status taqsimoti</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                                {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment pie */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>💳 To'lov usullari</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={payData} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                                {payData.map((p, i) => <Cell key={i} fill={p.color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Top products */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>⭐ Eng mashhur taomlar</div>
                    {topProducts.slice(0, 6).map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 5 ? '1px solid #f0f0f0' : 'none', fontSize: 13 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 20, height: 20, background: 'var(--primary)', borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                    {i + 1}
                                </span>
                                <span style={{ fontWeight: 500 }}>{p._id}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.count} ta</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
