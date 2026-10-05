import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';

const TIER_LABELS = { bronze: 'Bronza', silver: 'Kumush', gold: 'Oltin' };

export default function UsersList() {
    const isSuperAdmin = localStorage.getItem('efes_admin_role') === 'super_admin';
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const limit = 20;

    const fetchUsers = useCallback(() => {
        setLoading(true);
        setError('');
        const params = new URLSearchParams({ page, limit });
        if (search.trim()) params.set('search', search.trim());
        api.get(`/admin/users?${params}`)
            .then(({ data }) => { setUsers(data.users || []); setTotal(data.total || 0); })
            .catch(err => setError(err.response?.data?.error || "Foydalanuvchilarni yuklab bo'lmadi"))
            .finally(() => setLoading(false));
    }, [page, search]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleBlock = async user => {
        try {
            await api.patch(`/admin/users/${user._id}/block`, { isBlocked: !user.isBlocked });
            fetchUsers();
        } catch (err) { setError(err.response?.data?.error || "Holatni o'zgartirib bo'lmadi"); }
    };

    const handleDelete = async user => {
        const label = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phone || 'Foydalanuvchi';
        if (!window.confirm(`"${label}" ni o'chirishni tasdiqlaysizmi?`)) return;
        try {
            await api.delete(`/admin/users/${user._id}`);
            fetchUsers();
        } catch (err) { setError(err.response?.data?.error || "Foydalanuvchini o'chirib bo'lmadi"); }
    };

    const pages = Math.ceil(total / limit);
    return (
        <div>
            <div className="page-header">
                <div><h1 className="page-title">Mijozlar</h1><p className="page-subtitle">Mini App orqali ro'yxatdan o'tgan foydalanuvchilar</p></div>
                <span className="users-total">Jami {total}</span>
            </div>
            <div className="filter-row users-toolbar">
                <div className="search-bar users-search"><input className="form-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Ism, telefon yoki username" /></div>
                <button className="btn btn-secondary" onClick={fetchUsers}>Yangilash</button>
            </div>

            {loading ? <UsersState title="Ma'lumotlar yuklanmoqda..." /> : error ? (
                <UsersState title="Ro'yxatni ochib bo'lmadi" detail={error} error action={fetchUsers} />
            ) : users.length === 0 ? (
                <UsersState title={search ? 'Mijoz topilmadi' : "Hali ro'yxatdan o'tgan mijoz yo'q"} detail={search ? "Qidiruv matnini o'zgartirib ko'ring." : "Foydalanuvchi Telegram Mini App ni ochganda shu yerda ko'rinadi."} />
            ) : (
                <div className="card users-table-card"><div className="table-wrap"><table>
                    <thead><tr><th>Mijoz</th><th>Telefon</th><th>Daraja</th><th>Bonus</th><th>Buyurtma</th><th>Jami sarf</th><th>Til</th><th>Ro'yxatdan o'tgan</th><th>Amal</th></tr></thead>
                    <tbody>{users.map(user => <tr key={user._id} className={user.isBlocked ? 'user-row--blocked' : ''}>
                        <td><div className="user-identity"><span className="user-avatar">{(user.firstName?.[0] || '?').toUpperCase()}</span><div><strong>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Nomsiz mijoz'}</strong><small>{user.username ? `@${user.username}` : `TG ${user.telegramId}`}</small></div></div></td>
                        <td>{user.phone || '-'}</td><td><span className={`user-tier user-tier--${user.bonusTier || 'bronze'}`}>{TIER_LABELS[user.bonusTier] || 'Bronza'}</span></td><td>{user.bonusPoints || 0} ball</td><td>{user.totalOrders || 0}</td><td>{(user.totalSpent || 0).toLocaleString('uz-UZ')} so'm</td><td>{(user.language || 'uz').toUpperCase()}</td><td>{user.registeredAt ? new Date(user.registeredAt).toLocaleString('uz-UZ') : '-'}</td>
                        <td><div className="user-actions"><button className="btn btn-sm btn-secondary" onClick={() => handleBlock(user)}>{user.isBlocked ? 'Faollashtirish' : 'Bloklash'}</button>{isSuperAdmin && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user)}>O'chirish</button>}</div></td>
                    </tr>)}</tbody>
                </table></div>{pages > 1 && <div className="pagination users-pagination"><button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Oldingi</button><span>{page} / {pages}</span><button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === pages}>Keyingi</button></div>}</div>
            )}
        </div>
    );
}

function UsersState({ title, detail, error, action }) {
    return <div className={`users-state${error ? ' users-state--error' : ''}`}><strong>{title}</strong>{detail && <span>{detail}</span>}{action && <button className="btn btn-primary" onClick={action}>Qayta urinish</button>}</div>;
}
