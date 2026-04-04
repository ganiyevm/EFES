import { useState, useEffect } from 'react';
import api from '../../api/axios';

const EMPTY = { number: '', name: '', address: '', phone: '', hours: '10:00 — 23:00', isOpen: true, isActive: true, deliveryRadius: 5, minOrderAmount: 30000, location: { lat: '', lng: '' } };

export default function BranchesList() {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const fetchBranches = () => {
        setLoading(true);
        api.get('/branches').then(r => setBranches(r.data || [])).catch(() => {}).finally(() => setLoading(false));
    };
    useEffect(fetchBranches, []);

    const openAdd = () => { setForm(EMPTY); setModal('add'); };
    const openEdit = (b) => {
        setForm({ ...EMPTY, ...b, number: b.number || '', location: { lat: b.location?.lat || '', lng: b.location?.lng || '' } });
        setModal(b);
    };

    const handleSave = async () => {
        if (!form.number || !form.address) { alert('Raqam va manzil kerak'); return; }
        setSaving(true);
        try {
            const payload = { ...form, number: parseInt(form.number), deliveryRadius: parseFloat(form.deliveryRadius) || 5, minOrderAmount: parseInt(form.minOrderAmount) || 30000, location: { lat: parseFloat(form.location.lat) || 0, lng: parseFloat(form.location.lng) || 0 } };
            if (modal === 'add') {
                await api.post('/branches', payload);
            } else {
                await api.put(`/branches/${modal._id}`, payload);
            }
            setModal(null); fetchBranches();
        } catch (err) { alert(err.response?.data?.error || 'Xatolik'); }
        finally { setSaving(false); }
    };

    const handleToggle = async (b, field) => {
        try {
            await api.put(`/branches/${b._id}`, { [field]: !b[field] });
            fetchBranches();
        } catch {}
    };

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setLoc = (k, v) => setForm(f => ({ ...f, location: { ...f.location, [k]: v } }));

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">🏢 Filiallar</h1>
                <button className="btn btn-primary" onClick={openAdd}>+ Yangi filial</button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>⏳</div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Nomi / Manzil</th>
                                    <th>Telefon</th>
                                    <th>Ish vaqti</th>
                                    <th>Min buyurtma</th>
                                    <th>Radius</th>
                                    <th>Ochiq</th>
                                    <th>Faol</th>
                                    <th>Amal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branches.map(b => (
                                    <tr key={b._id}>
                                        <td><strong>#{b.number}</strong></td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{b.name || '—'}</div>
                                            <div style={{ fontSize: 12, color: '#6b7280' }}>{b.address}</div>
                                        </td>
                                        <td style={{ fontSize: 13 }}>{b.phone || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{b.hours}</td>
                                        <td style={{ fontSize: 12 }}>{(b.minOrderAmount || 0).toLocaleString()} so'm</td>
                                        <td style={{ fontSize: 12 }}>{b.deliveryRadius} km</td>
                                        <td>
                                            <label className="switch">
                                                <input type="checkbox" checked={b.isOpen} onChange={() => handleToggle(b, 'isOpen')} />
                                                <span className="switch-slider" />
                                            </label>
                                        </td>
                                        <td>
                                            <label className="switch">
                                                <input type="checkbox" checked={b.isActive} onChange={() => handleToggle(b, 'isActive')} />
                                                <span className="switch-slider" />
                                            </label>
                                        </td>
                                        <td>
                                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(b)}>✏️ Tahrirlash</button>
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
                            <span className="modal-title">{modal === 'add' ? '+ Yangi filial' : `✏️ Filial #${form.number}`}</span>
                            <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Raqam *</label>
                                <input className="form-input" type="number" value={form.number} onChange={e => setField('number', e.target.value)} placeholder="1" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nomi</label>
                                <input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Chilonzor" />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Manzil *</label>
                                <input className="form-input" value={form.address} onChange={e => setField('address', e.target.value)} placeholder="Toshkent, Chilonzor tumani..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Telefon</label>
                                <input className="form-input" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+998901234567" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ish vaqti</label>
                                <input className="form-input" value={form.hours} onChange={e => setField('hours', e.target.value)} placeholder="10:00 — 23:00" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Min buyurtma (so'm)</label>
                                <input className="form-input" type="number" value={form.minOrderAmount} onChange={e => setField('minOrderAmount', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Yetkazish radiusi (km)</label>
                                <input className="form-input" type="number" value={form.deliveryRadius} onChange={e => setField('deliveryRadius', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Kenglik (lat)</label>
                                <input className="form-input" type="number" step="0.0001" value={form.location?.lat} onChange={e => setLoc('lat', e.target.value)} placeholder="41.2995" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Uzunlik (lng)</label>
                                <input className="form-input" type="number" step="0.0001" value={form.location?.lng} onChange={e => setLoc('lng', e.target.value)} placeholder="69.2401" />
                            </div>
                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: 24 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={form.isOpen} onChange={e => setField('isOpen', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                                    <span style={{ fontWeight: 500, fontSize: 13 }}>🟢 Hozir ochiq</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={form.isActive} onChange={e => setField('isActive', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                                    <span style={{ fontWeight: 500, fontSize: 13 }}>✅ Faol</span>
                                </label>
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
