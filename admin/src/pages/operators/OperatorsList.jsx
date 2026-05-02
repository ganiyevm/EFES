import { useState, useEffect } from 'react';
import api from '../../api/axios';

const EMPTY_FORM = { telegramId: '', branchId: '', firstName: '', lastName: '', username: '', phone: '', note: '' };

export default function OperatorsList() {
    const [operators, setOperators] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // null | 'add' | operator object
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);

    const fetchAll = () => {
        setLoading(true);
        Promise.all([
            api.get('/operators'),
            api.get('/branches'),
        ]).then(([ops, brs]) => {
            setOperators(ops.data || []);
            setBranches(brs.data || []);
        }).catch(() => {}).finally(() => setLoading(false));
    };

    useEffect(fetchAll, []);

    const openAdd = () => { setForm(EMPTY_FORM); setModal('add'); };
    const openEdit = (op) => {
        setForm({
            telegramId: String(op.telegramId),
            branchId: op.branch?._id || '',
            firstName: op.firstName || '',
            lastName: op.lastName || '',
            username: op.username || '',
            phone: op.phone || '',
            note: op.note || '',
        });
        setModal(op);
    };

    // Telegram ID kiritilganda bot foydalanuvchisini avtomatik izlash
    const handleTelegramIdBlur = async () => {
        if (!form.telegramId || modal !== 'add') return;
        setLookupLoading(true);
        try {
            const { data } = await api.get(`/operators/lookup/${form.telegramId}`);
            if (data.found) {
                setForm(f => ({
                    ...f,
                    firstName: data.user.firstName || f.firstName,
                    lastName: data.user.lastName || f.lastName,
                    username: data.user.username || f.username,
                    phone: data.user.phone || f.phone,
                }));
            }
        } catch { }
        finally { setLookupLoading(false); }
    };

    const handleSave = async () => {
        if (!form.telegramId || !form.branchId) { alert('Telegram ID va filial kerak'); return; }
        setSaving(true);
        try {
            if (modal === 'add') {
                await api.post('/operators', { ...form, branchId: form.branchId });
            } else {
                await api.put(`/operators/${modal._id}`, { ...form, branchId: form.branchId });
            }
            setModal(null);
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.error || 'Xatolik');
        } finally { setSaving(false); }
    };

    const handleToggleBlock = async (op) => {
        const action = op.isBlocked ? 'blokdan chiqarish' : 'bloklash';
        if (!confirm(`${op.firstName || op.telegramId} ni ${action}ni tasdiqlaysizmi?`)) return;
        try {
            await api.put(`/operators/${op._id}`, { isBlocked: !op.isBlocked });
            fetchAll();
        } catch { alert('Xatolik'); }
    };

    const handleDelete = async (op) => {
        if (!confirm(`${op.firstName || op.telegramId} ni o'chirishni tasdiqlaysizmi?`)) return;
        try {
            await api.delete(`/operators/${op._id}`);
            fetchAll();
        } catch { alert('Xatolik'); }
    };

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">👤 Operatorlar</h1>
                <button className="btn btn-primary" onClick={openAdd}>+ Operator qo'shish</button>
            </div>

            <div style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 16px', marginBottom: 20,
                fontSize: 13, color: 'var(--text-secondary)',
            }}>
                Operator qo'shish uchun uning Telegram ID sini kiriting. Bot foydalanuvchi bo'lsa ma'lumotlar avtomatik to'ldiriladi.
                Yoki operatorga filialga ulash havolasini yuboring — u botdan o'zi ulanadi.
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>⏳</div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Telegram ID</th>
                                    <th>Ism</th>
                                    <th>Username</th>
                                    <th>Telefon</th>
                                    <th>Filial</th>
                                    <th>Holat</th>
                                    <th>Amal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {operators.map(op => (
                                    <tr key={op._id} style={{ opacity: op.isBlocked ? 0.55 : 1 }}>
                                        <td>
                                            <code style={{ fontSize: 12, background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 6 }}>
                                                {op.telegramId}
                                            </code>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{op.firstName} {op.lastName}</div>
                                            {op.note && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{op.note}</div>}
                                        </td>
                                        <td style={{ fontSize: 13 }}>
                                            {op.username ? `@${op.username}` : '—'}
                                        </td>
                                        <td style={{ fontSize: 13 }}>{op.phone || '—'}</td>
                                        <td>
                                            {op.branch
                                                ? <span style={{ fontSize: 13 }}>#{op.branch.number} {op.branch.name}</span>
                                                : '—'}
                                        </td>
                                        <td>
                                            {op.isBlocked ? (
                                                <span style={{
                                                    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                                                    background: 'rgba(231,76,60,0.1)', color: '#e74c3c',
                                                    fontSize: 12, fontWeight: 600,
                                                }}>🚫 Bloklangan</span>
                                            ) : op.isActive ? (
                                                <span style={{
                                                    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                                                    background: 'rgba(39,174,96,0.1)', color: 'var(--success)',
                                                    fontSize: 12, fontWeight: 600,
                                                }}>✅ Faol</span>
                                            ) : (
                                                <span style={{
                                                    display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                                                    background: 'rgba(150,150,150,0.1)', color: 'var(--text-secondary)',
                                                    fontSize: 12, fontWeight: 600,
                                                }}>⏸ Nofaol</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-outline btn-sm" onClick={() => openEdit(op)}>✏️</button>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => handleToggleBlock(op)}
                                                    style={{
                                                        background: op.isBlocked ? 'rgba(39,174,96,0.1)' : 'rgba(231,76,60,0.1)',
                                                        color: op.isBlocked ? 'var(--success)' : '#e74c3c',
                                                        border: `1px solid ${op.isBlocked ? 'rgba(39,174,96,0.2)' : 'rgba(231,76,60,0.2)'}`,
                                                    }}
                                                >
                                                    {op.isBlocked ? '🔓 Ochish' : '🚫 Bloklash'}
                                                </button>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => handleDelete(op)}
                                                    style={{ background: 'rgba(231,76,60,0.08)', color: '#e74c3c', border: '1px solid rgba(231,76,60,0.15)' }}
                                                >
                                                    🗑
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {operators.length === 0 && (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                                        Operator topilmadi
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Filiallar bo'yicha ulash havolalari */}
            <div style={{ marginTop: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🔗 Filiallar uchun ulash havolalari</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {branches.map(b => (
                        <div key={b._id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)', borderRadius: 10,
                        }}>
                            <span style={{ fontWeight: 600, fontSize: 13, minWidth: 120 }}>#{b.number} {b.name}</span>
                            <span style={{
                                flex: 1, fontSize: 11, color: 'var(--primary-light)',
                                fontFamily: 'monospace', fontWeight: 600, wordBreak: 'break-all',
                            }}>
                                https://t.me/efes_kebab_bot?start=op_{b._id}
                            </span>
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => { navigator.clipboard.writeText(`https://t.me/efes_kebab_bot?start=op_${b._id}`); alert('Nusxalandi!'); }}
                            >
                                📋 Nusxa
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <span className="modal-title">
                                {modal === 'add' ? '+ Yangi operator' : `✏️ Operator tahrirlash`}
                            </span>
                            <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">
                                    Telegram ID *
                                    {lookupLoading && <span style={{ fontSize: 11, marginLeft: 8, color: 'var(--text-secondary)' }}>⏳ Qidirilmoqda...</span>}
                                </label>
                                <input
                                    className="form-input"
                                    type="number"
                                    value={form.telegramId}
                                    onChange={e => setField('telegramId', e.target.value)}
                                    onBlur={handleTelegramIdBlur}
                                    placeholder="123456789"
                                    disabled={modal !== 'add'}
                                />
                                {modal === 'add' && (
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                                        Maydonni to'ldirib chiqing — bot foydalanuvchi bo'lsa avtomatik to'ldiriladi
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ism</label>
                                <input className="form-input" value={form.firstName} onChange={e => setField('firstName', e.target.value)} placeholder="Alisher" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Familiya</label>
                                <input className="form-input" value={form.lastName} onChange={e => setField('lastName', e.target.value)} placeholder="Karimov" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Username</label>
                                <input className="form-input" value={form.username} onChange={e => setField('username', e.target.value)} placeholder="username" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Telefon</label>
                                <input className="form-input" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+998901234567" />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Filial *</label>
                                <select className="form-input" value={form.branchId} onChange={e => setField('branchId', e.target.value)}>
                                    <option value="">— Filial tanlang —</option>
                                    {branches.map(b => (
                                        <option key={b._id} value={b._id}>#{b.number} {b.name} — {b.address}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Izoh</label>
                                <input className="form-input" value={form.note} onChange={e => setField('note', e.target.value)} placeholder="Kechki smenada ishlaydi..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setModal(null)}>Bekor</button>
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
