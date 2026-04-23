import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';

const EMPTY = { name: '', phone: '', carPlate: '', bonusPerDelivery: 5000 };

export default function CouriersList() {
    const [couriers, setCouriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    const fetchList = useCallback(() => {
        setLoading(true);
        api.get('/couriers')
            .then(r => setCouriers(r.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchList(); }, [fetchList]);

    const openAdd = () => { setForm(EMPTY); setModal('add'); };
    const openEdit = (c) => {
        setForm({
            name: c.name,
            phone: c.phone,
            carPlate: c.carPlate || '',
            bonusPerDelivery: c.bonusPerDelivery,
        });
        setModal(c);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.phone.trim()) {
            alert('Ism va telefon talab qilinadi');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                phone: form.phone.trim(),
                carPlate: form.carPlate.trim(),
                bonusPerDelivery: parseInt(form.bonusPerDelivery) || 0,
            };
            if (modal === 'add') {
                await api.post('/couriers', payload);
            } else {
                await api.put(`/couriers/${modal._id}`, payload);
            }
            setModal(null);
            fetchList();
        } catch (err) {
            alert(err.response?.data?.error || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const toggleField = async (c, field) => {
        try {
            await api.put(`/couriers/${c._id}`, { [field]: !c[field] });
            fetchList();
        } catch (err) {
            alert(err.response?.data?.error || 'Xatolik');
        }
    };

    const copyLink = async (c) => {
        try {
            await navigator.clipboard.writeText(c.inviteLink);
            setCopiedId(c._id);
            setTimeout(() => setCopiedId(null), 1500);
        } catch {
            prompt('Invite link:', c.inviteLink);
        }
    };

    const regenerateToken = async (c) => {
        if (!confirm(`${c.name} uchun yangi invite link? Eski link ishlamay qoladi.`)) return;
        try {
            await api.post(`/couriers/${c._id}/regenerate-token`);
            fetchList();
        } catch (err) {
            alert(err.response?.data?.error || 'Xatolik');
        }
    };

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">🏍 Kuriyerlar</h1>
                <button className="btn btn-primary" onClick={openAdd}>+ Yangi kurier</button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>⏳</div>
            ) : couriers.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    Hech qanday kurier yo'q. "+ Yangi kurier" tugmasi orqali qo'shing.
                </div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Ism / Telefon</th>
                                    <th>Mashina</th>
                                    <th>Bugun</th>
                                    <th>Oy</th>
                                    <th>Yil</th>
                                    <th>Yig'gan bonus</th>
                                    <th>Botga ulangan</th>
                                    <th>Faol</th>
                                    <th>Bonus</th>
                                    <th>Amal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {couriers.map(c => (
                                    <tr key={c._id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{c.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.phone}</div>
                                        </td>
                                        <td style={{ fontSize: 13, fontFamily: 'monospace' }}>{c.carPlate || '—'}</td>
                                        <td style={{ fontWeight: 700, textAlign: 'center' }}>{c.stats?.today || 0}</td>
                                        <td style={{ fontWeight: 700, textAlign: 'center' }}>{c.stats?.month || 0}</td>
                                        <td style={{ fontWeight: 700, textAlign: 'center' }}>{c.stats?.year || 0}</td>
                                        <td style={{ fontSize: 13 }}>
                                            {(c.earnedBonus || 0).toLocaleString()} so'm
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                                {c.bonusPerDelivery.toLocaleString()} / yetkazish
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', fontSize: 13 }}>
                                            {c.telegramId ? (
                                                <span style={{ color: '#2ecc71', fontWeight: 600 }}>✅ #{c.telegramId}</span>
                                            ) : (
                                                <span style={{ color: '#e67e22', fontWeight: 600 }}>⏳ Kutilmoqda</span>
                                            )}
                                        </td>
                                        <td>
                                            <label className="switch">
                                                <input type="checkbox" checked={c.isActive} onChange={() => toggleField(c, 'isActive')} />
                                                <span className="switch-slider" />
                                            </label>
                                        </td>
                                        <td>
                                            <label className="switch">
                                                <input type="checkbox" checked={c.bonusEnabled} onChange={() => toggleField(c, 'bonusEnabled')} />
                                                <span className="switch-slider" />
                                            </label>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <button className="btn btn-outline btn-sm" onClick={() => copyLink(c)} style={{ marginRight: 6 }}>
                                                {copiedId === c._id ? '✅' : '🔗'}
                                            </button>
                                            <button className="btn btn-outline btn-sm" onClick={() => regenerateToken(c)} style={{ marginRight: 6 }} title="Yangi invite link">
                                                🔄
                                            </button>
                                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>
                                                ✏️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">
                                {modal === 'add' ? '+ Yangi kurier' : `✏️ ${form.name}`}
                            </span>
                            <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Ism *</label>
                                <input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Ali Valiev" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Telefon *</label>
                                <input className="form-input" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+998901234567" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mashina raqami</label>
                                <input className="form-input" value={form.carPlate} onChange={e => setField('carPlate', e.target.value)} placeholder="01 A 123 BC" style={{ fontFamily: 'monospace' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bonus / har yetkazishga (so'm)</label>
                                <input className="form-input" type="number" value={form.bonusPerDelivery} onChange={e => setField('bonusPerDelivery', e.target.value)} />
                            </div>
                        </div>
                        {modal !== 'add' && (
                            <div style={{ padding: '0 16px 12px' }}>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>Invite link:</div>
                                <div style={{
                                    padding: '10px 12px', background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)', borderRadius: 8,
                                    fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all',
                                }}>
                                    {modal.inviteLink}
                                </div>
                            </div>
                        )}
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
