import { useState, useEffect } from 'react';
import api from '../../api/axios';

const TABS = [
    { key: 'contact', label: '📞 Aloqa' },
    { key: 'about', label: 'ℹ️ Biz haqimizda' },
    { key: 'jobs', label: '💼 Ish o\'rinlari' },
    { key: 'delivery', label: '🚗 Yetkazib berish' },
];

export default function AppContentSettings() {
    const [tab, setTab] = useState('contact');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [newJob, setNewJob] = useState('');

    useEffect(() => {
        api.get('/delivery/app-content/admin')
            .then(r => setData(r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const set = (k, v) => setData(d => ({ ...d, [k]: v }));

    const handleSave = async () => {
        setSaving(true); setSaved(false);
        try {
            await api.put('/delivery/app-content', data);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            alert(err.response?.data?.error || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const addJob = () => {
        if (!newJob.trim()) return;
        set('jobs_positions', [...(data.jobs_positions || []), newJob.trim()]);
        setNewJob('');
    };
    const removeJob = (i) => set('jobs_positions', data.jobs_positions.filter((_, idx) => idx !== i));

    if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳</div>;

    return (
        <div style={{ maxWidth: 680 }}>
            <div className="page-header">
                <h1 className="page-title">📱 Ilova kontenti</h1>
                <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                    {saving ? '⏳' : saved ? '✅ Saqlandi!' : '💾 Saqlash'}
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} className="btn" style={{
                        background: tab === t.key ? 'var(--primary)' : 'var(--bg-card)',
                        color: tab === t.key ? '#1a1a24' : 'var(--text)',
                        border: '1px solid var(--border)',
                        fontWeight: tab === t.key ? 700 : 500,
                    }}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="card">
                {/* ── Aloqa ── */}
                {tab === 'contact' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">📞 Telefon raqam</label>
                            <input className="form-input" value={data.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+998 71 200-94-44" />
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                                Menyu va "Biz bilan bog'lanish" da ko'rinadi
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">✈️ Telegram username</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>@</span>
                                <input className="form-input" value={data.telegram || ''} onChange={e => set('telegram', e.target.value.replace('@', ''))} placeholder="efes_kebab_bot" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">📸 Instagram username</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>@</span>
                                <input className="form-input" value={data.instagram || ''} onChange={e => set('instagram', e.target.value.replace('@', ''))} placeholder="efeskebab" />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Biz haqimizda ── */}
                {tab === 'about' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Tavsif</label>
                            <textarea className="form-input" rows={4} value={data.about_description || ''} onChange={e => set('about_description', e.target.value)} style={{ resize: 'vertical' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">📍 Manzil</label>
                            <input className="form-input" value={data.about_address || ''} onChange={e => set('about_address', e.target.value)} placeholder="Toshkent shahri, Yunusobod tumani" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">🕐 Ish vaqti</label>
                            <input className="form-input" value={data.about_work_hours || ''} onChange={e => set('about_work_hours', e.target.value)} placeholder="Har kuni 10:00 – 23:00" />
                        </div>
                    </div>
                )}

                {/* ── Ish o'rinlari ── */}
                {tab === 'jobs' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Vakansiyalar ro'yxati</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                                {(data.jobs_positions || []).map((job, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 14px', background: 'var(--bg-secondary)',
                                        borderRadius: 10, border: '1px solid var(--border)',
                                    }}>
                                        <span style={{ fontWeight: 600 }}>✅ {job}</span>
                                        <button onClick={() => removeJob(i)} style={{
                                            background: 'rgba(231,76,60,0.1)', border: 'none', borderRadius: 8,
                                            color: 'var(--danger)', cursor: 'pointer', padding: '4px 10px', fontSize: 13,
                                        }}>🗑</button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="form-input" value={newJob} onChange={e => setNewJob(e.target.value)}
                                    placeholder="Yangi vakansiya..." style={{ flex: 1 }}
                                    onKeyDown={e => e.key === 'Enter' && addJob()} />
                                <button className="btn btn-primary" onClick={addJob}>+ Qo'shish</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Yetkazib berish ── */}
                {tab === 'delivery' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">🚗 Yetkazish vaqti</label>
                            <input className="form-input" value={data.delivery_time || ''} onChange={e => set('delivery_time', e.target.value)} placeholder="30–60 daqiqa ichida" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">💰 Narx (ko'rsatish uchun)</label>
                            <input className="form-input" value={data.delivery_cost_text || ''} onChange={e => set('delivery_cost_text', e.target.value)} placeholder="15 000 so'mdan" />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">🎁 Bepul yetkazish sharti</label>
                            <input className="form-input" value={data.delivery_free_text || ''} onChange={e => set('delivery_free_text', e.target.value)} placeholder="150 000 so'mdan yuqori buyurtmalarda" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">📍 Yetkazish zonasi</label>
                            <input className="form-input" value={data.delivery_zone || ''} onChange={e => set('delivery_zone', e.target.value)} placeholder="Toshkent shahri bo'ylab" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">🕐 Ish vaqti</label>
                            <input className="form-input" value={data.delivery_work_hours || ''} onChange={e => set('delivery_work_hours', e.target.value)} placeholder="Har kuni 10:00 – 23:00" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">📦 Minimal buyurtma</label>
                            <input className="form-input" value={data.delivery_min_order || ''} onChange={e => set('delivery_min_order', e.target.value)} placeholder="50 000 so'm" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
