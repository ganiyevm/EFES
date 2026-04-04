import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';

export default function UsersList() {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const limit = 20;

    const fetchUsers = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ page, limit });
        if (search) params.set('search', search);
        api.get(`/admin/users?${params}`)
            .then(r => { setUsers(r.data.users || []); setTotal(r.data.total || 0); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [page, search]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleBlock = async (user) => {
        try {
            await api.patch(`/admin/users/${user._id}/block`, { isBlocked: !user.isBlocked });
            fetchUsers();
        } catch {}
    };

    const TIER_COLORS = { bronze: '#cd7f32', silver: '#aaa', gold: '#f39c12' };
    const TIER_LABELS = { bronze: '🥉 Bronza', silver: '🥈 Kumush', gold: '🥇 Oltin' };
    const pages = Math.ceil(total / limit);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">👥 Foydalanuvchilar</h1>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Jami: {total}</span>
            </div>

            <div className="filter-row">
                <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
                    <span className="search-icon">🔍</span>
                    <input className="form-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Ism yoki telefon..." />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>⏳</div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Foydalanuvchi</th>
                                    <th>Telefon</th>
                                    <th>Daraja</th>
                                    <th>Bonus</th>
                                    <th>Buyurtmalar</th>
                                    <th>Jami sarflagan</th>
                                    <th>Til</th>
                                    <th>Ro'yxatdan</th>
                                    <th>Amal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u._id} style={{ opacity: u.isBlocked ? 0.5 : 1 }}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 50, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                                                    {(u.firstName?.[0] || '?').toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</div>
                                                    {u.username && <div style={{ fontSize: 11, color: '#6b7280' }}>@{u.username}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 13 }}>{u.phone || '—'}</td>
                                        <td>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: TIER_COLORS[u.bonusTier] }}>
                                                {TIER_LABELS[u.bonusTier] || u.bonusTier}
                                            </span>
                                        </td>
                                        <td><span className="badge badge-warning">{u.bonusPoints || 0} ball</span></td>
                                        <td style={{ fontWeight: 600 }}>{u.totalOrders || 0}</td>
                                        <td style={{ fontWeight: 600 }}>{(u.totalSpent || 0).toLocaleString()} so'm</td>
                                        <td><span style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 8px', borderRadius: 6 }}>{u.language || 'uz'}</span></td>
                                        <td style={{ fontSize: 11, color: '#6b7280' }}>{new Date(u.registeredAt).toLocaleDateString()}</td>
                                        <td>
                                            <button
                                                className="btn btn-sm"
                                                style={{ background: u.isBlocked ? '#dcfce7' : '#fee2e2', color: u.isBlocked ? 'var(--success)' : 'var(--danger)', border: 'none' }}
                                                onClick={() => handleBlock(u)}
                                            >
                                                {u.isBlocked ? '✅ Ochish' : '🚫 Bloklash'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {pages > 1 && (
                        <div className="pagination" style={{ padding: '12px 0' }}>
                            <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
                            {Array.from({ length: Math.min(pages, 5) }, (_, i) => (
                                <button key={i + 1} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                            ))}
                            <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === pages}>›</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
