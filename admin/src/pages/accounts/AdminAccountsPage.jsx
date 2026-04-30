import { useState, useEffect } from 'react';
import api from '../../api/axios';

const EMPTY = { username: '', password: '', role: 'admin' };

export default function AdminAccountsPage() {
    const isSuperAdmin = localStorage.getItem('efes_admin_role') === 'super_admin';
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchAccounts = () => {
        setLoading(true);
        api.get('/admin/accounts').then(r => setAccounts(r.data || [])).catch(() => { }).finally(() => setLoading(false));
    };
    useEffect(fetchAccounts, []);

    const handleSave = async () => {
        setError('');
        if (!form.username.trim() || !form.password.trim()) { setError('Login va parol kerak'); return; }
        setSaving(true);
        try {
            await api.post('/admin/accounts', form);
            setModal(false);
            setForm(EMPTY);
            fetchAccounts();
        } catch (err) {
            setError(err.response?.data?.error || 'Xatolik yuz berdi');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, username) => {
        if (!confirm(`"${username}" adminni o'chirishni tasdiqlaysizmi?`)) return;
        try {
            await api.delete(`/admin/accounts/${id}`);
            fetchAccounts();
        } catch { }
    };

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div style={{ maxWidth: 700 }}>
            <div className="page-header">
                <h1 className="page-title">🔐 Admin akkauntlar</h1>
                <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setError(''); setModal(true); }}>
                    + Yangi admin
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>⏳</div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Login</th>
                                    <th>Rol</th>
                                    <th>Yaratilgan</th>
                                    <th>Amal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map(a => (
                                    <tr key={a._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 50, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>
                                                    {a.username[0].toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{a.username}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${a.role === 'super_admin' ? 'badge-danger' : a.role === 'admin' ? 'badge-primary' : 'badge-info'}`}>
                                                {a.role === 'super_admin' ? '🔑 Super Admin' : a.role === 'admin' ? '👑 Admin' : '📊 Manager'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {new Date(a.createdAt).toLocaleDateString()}
                                        </td>
                                        <td>
                                            {isSuperAdmin && (
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ background: 'rgba(231,76,60,0.08)', color: 'var(--danger)', border: '1px solid rgba(231,76,60,0.15)' }}
                                                    onClick={() => handleDelete(a._id, a.username)}
                                                >
                                                    🗑 O'chirish
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">+ Yangi admin</span>
                            <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Login</label>
                                <input className="form-input" value={form.username} onChange={e => setField('username', e.target.value)} placeholder="admin123" autoComplete="off" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Parol</label>
                                <input className="form-input" type="password" value={form.password} onChange={e => setField('password', e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rol</label>
                                <select className="form-input" value={form.role} onChange={e => setField('role', e.target.value)}>
                                    {isSuperAdmin && <option value="super_admin">🔑 Super Admin</option>}
                                    <option value="admin">👑 Admin</option>
                                    <option value="manager">📊 Manager</option>
                                </select>
                            </div>
                            {error && (
                                <div style={{ background: '#fee2e2', color: 'var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                                    ⚠️ {error}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setModal(false)}>Bekor</button>
                            <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                                {saving ? '⏳' : '✅ Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
