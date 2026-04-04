import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function DeliverySettings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        api.get('/delivery/settings').then(r => setSettings(r.data)).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            await api.put('/delivery/settings', settings);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            alert(err.response?.data?.error || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const setField = (k, v) => setSettings(s => ({ ...s, [k]: v }));

    if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳</div>;

    return (
        <div style={{ maxWidth: 600 }}>
            <div className="page-header">
                <h1 className="page-title">🚗 Yetkazib berish sozlamalari</h1>
            </div>

            {settings ? (
                <div className="card">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Yetkazib berish narxi (so'm)</label>
                            <input className="form-input" type="number" value={settings.deliveryCost || 0} onChange={e => setField('deliveryCost', parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Minimal buyurtma (so'm)</label>
                            <input className="form-input" type="number" value={settings.minOrderAmount || 0} onChange={e => setField('minOrderAmount', parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Bepul yetkazish chegara (so'm)</label>
                            <input className="form-input" type="number" value={settings.freeDeliveryThreshold || 0} onChange={e => setField('freeDeliveryThreshold', parseInt(e.target.value) || 0)} />
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>0 = yoqilmagan</div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Taxminiy yetkazish vaqti (daq)</label>
                            <input className="form-input" type="number" value={settings.estimatedDeliveryTime || 30} onChange={e => setField('estimatedDeliveryTime', parseInt(e.target.value) || 30)} />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Ish vaqti</label>
                            <input className="form-input" value={settings.workHours || '10:00 — 23:00'} onChange={e => setField('workHours', e.target.value)} placeholder="10:00 — 23:00" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Bonus foizi (%)</label>
                            <input className="form-input" type="number" value={settings.bonusPercent || 5} onChange={e => setField('bonusPercent', parseInt(e.target.value) || 5)} />
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Har buyurtmadan beriladigan bonus</div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Maks bonus ishlatish (%)</label>
                            <input className="form-input" type="number" value={settings.maxBonusPercent || 20} onChange={e => setField('maxBonusPercent', parseInt(e.target.value) || 20)} />
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Buyurtma summasidan qancha bonus ishlatish mumkin</div>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '14px 16px', background: '#f9fafb', borderRadius: 10, border: '1px solid var(--border)' }}>
                                <input type="checkbox" checked={settings.isOpen !== false} onChange={e => setField('isOpen', e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>🟢 Qabul qilinmoqda</div>
                                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Buyurtmalarni qabul qilishni yoq/yoq qilish</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <button className="btn btn-primary" style={{ padding: '12px 24px' }} disabled={saving} onClick={handleSave}>
                            {saving ? '⏳ Saqlanmoqda...' : saved ? '✅ Saqlandi!' : '💾 Saqlash'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', color: '#6b7280' }}>
                    Sozlamalar topilmadi. Backend /delivery/settings route ni tekshiring.
                </div>
            )}
        </div>
    );
}
