import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import api from '../api/axios';

const STATUS_COLORS_MAP = {
    awaiting_payment: '#F1C40F', pending_operator: '#3498DB',
    confirmed: '#2ECC71', preparing: '#9b59b6', ready: '#1abc9c',
    on_the_way: '#E86420', delivered: '#2ECC71', rejected: '#E74C3C', cancelled: '#E74C3C',
};
const STATUS_LABELS = {
    awaiting_payment: "To'lov kutilmoqda", pending_operator: 'Operator',
    confirmed: 'Tasdiqlandi', preparing: 'Tayyorlanmoqda', ready: 'Tayyor',
    on_the_way: "Yo'lda", delivered: 'Yetkazildi', rejected: 'Rad etildi', cancelled: 'Bekor',
};
const PAY_COLORS = { click: '#3498DB', payme: '#2ECC71', cash: '#F1C40F' };

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: p.color || 'var(--primary)', fontWeight: 600 }}>
                    {p.name}: {p.value}
                </div>
            ))}
        </div>
    );
};

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
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Yuklanmoqda...</div>
            </div>
        </div>
    );

    const statCards = [
        { icon: '📋', label: "Jami buyurtmalar", value: stats?.totalOrders || 0, color: 'var(--primary)' },
        { icon: '📦', label: 'Bugungi buyurtmalar', value: stats?.todayOrders || 0, color: 'var(--info)' },
        { icon: '💰', label: 'Jami daromad', value: `${(stats?.totalRevenue || 0).toLocaleString()}`, color: 'var(--success)' },
        { icon: '💵', label: "Bugungi daromad", value: `${(stats?.todayRevenue || 0).toLocaleString()}`, color: 'var(--warning)' },
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
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--primary)' }}>📊</span> Dashboard
                </h1>
                <div style={{
                    fontSize: 13, color: 'var(--text-secondary)',
                    background: 'var(--card)', borderRadius: 12,
                    padding: '8px 16px', border: '1px solid var(--border)',
                }}>
                    {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
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
                {/* Revenue area chart */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--primary)' }}>📈</span> 30 kunlik daromad (ming so'm)
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={revenueData}>
                            <defs>
                                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#D4A017" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#D4A017" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,160,23,0.06)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9A9488' }} axisLine={{ stroke: 'rgba(212,160,23,0.1)' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#9A9488' }} axisLine={{ stroke: 'rgba(212,160,23,0.1)' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="revenue" stroke="#D4A017" strokeWidth={2.5} fill="url(#goldGradient)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Orders bar chart */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--accent)' }}>📦</span> Kunlik buyurtmalar
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,160,23,0.06)" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9A9488' }} axisLine={{ stroke: 'rgba(212,160,23,0.1)' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#9A9488' }} axisLine={{ stroke: 'rgba(212,160,23,0.1)' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="orders" fill="#D4A017" radius={[6, 6, 0, 0]} opacity={0.85} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {/* Status pie */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--primary)' }}>📊</span> Status taqsimoti
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={72} innerRadius={30}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                                {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment pie */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--info)' }}>💳</span> To'lov usullari
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={payData} dataKey="value" cx="50%" cy="50%" outerRadius={72} innerRadius={30}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                                {payData.map((p, i) => <Cell key={i} fill={p.color} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Top products */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--warning)' }}>⭐</span> Eng mashhur taomlar
                    </div>
                    {topProducts.slice(0, 6).map((p, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none', fontSize: 13,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                    width: 24, height: 24, borderRadius: 7,
                                    background: i < 3 ? 'linear-gradient(135deg, var(--primary), var(--primary-strong))' : 'rgba(154,148,136,0.15)',
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    color: i < 3 ? '#1a1a24' : 'var(--text-secondary)',
                                    fontSize: 10, fontWeight: 800,
                                }}>
                                    {i + 1}
                                </span>
                                <span style={{ fontWeight: 500, fontSize: 13 }}>{p._id}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.count} ta</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
