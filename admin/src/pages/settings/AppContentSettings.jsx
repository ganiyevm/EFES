import { useState, useEffect } from 'react';
import api from '../../api/axios';

const TABS = [
    { key: 'contact', label: '📞 Aloqa' },
    { key: 'about', label: 'ℹ️ Biz haqimizda' },
    { key: 'jobs', label: '💼 Ish o\'rinlari' },
    { key: 'reviews', label: '⭐ Sharhlar' },
    { key: 'delivery', label: '🚗 Yetkazib berish' },
];

const EMPTY_REVIEW = { name: '', stars: 5, text: '' };

export default function AppContentSettings() {
    const [tab, setTab] = useState('contact');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [newJob, setNewJob] = useState('');
    const [newReview, setNewReview] = useState(EMPTY_REVIEW);

    useEffect(() => {
        api.get('/delivery/app-content/admin')
            .then(r => setData(r.data))
            .catch(err => alert('Ma\'lumot yuklanmadi: ' + (err.response?.data?.error || err.message)))
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

    // Jobs
    const addJob = () => {
        const trimmed = newJob.trim();
        if (!trimmed) return;
        set('jobs_positions', [...(data?.jobs_positions || []), trimmed]);
        setNewJob('');
    };
    const removeJob = (i) => set('jobs_positions', (data.jobs_positions || []).filter((_, idx) => idx !== i));

    // Reviews
    const addReview = () => {
        if (!newReview.name.trim() || !newReview.text.trim()) return;
        set('reviews', [...(data?.reviews || []), { ...newReview, name: newReview.name.trim(), text: newReview.text.trim() }]);
        setNewReview(EMPTY_REVIEW);
    };
    const removeReview = (i) => set('reviews', (data.reviews || []).filter((_, idx) => idx !== i));

    if (loading || !data) return <div style={{ textAlign: 'center', padding: 40 }}>⏳</div>;

    return (
        <div style={{ maxWidth: 720 }}>
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
                            <label className="form-label">Vakansiyalar ro'yxati ({(data.jobs_positions || []).length} ta)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                                {(data.jobs_positions || []).length === 0 && (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '10px 0' }}>
                                        Hali vakansiya yo'q. Quyidan qo'shing.
                                    </div>
                                )}
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
                                <input
                                    className="form-input"
                                    value={newJob}
                                    onChange={e => setNewJob(e.target.value)}
                                    placeholder="Yangi vakansiya nomini kiriting..."
                                    style={{ flex: 1 }}
                                    onKeyDown={e => e.key === 'Enter' && addJob()}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={addJob}
                                    disabled={!newJob.trim()}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    + Qo'shish
                                </button>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                                Qo'shgandan keyin "💾 Saqlash" tugmasini bosing
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Sharhlar ── */}
                {tab === 'reviews' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Existing reviews */}
                        <div>
                            <label className="form-label">Mijozlar sharhlari ({(data.reviews || []).length} ta)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                                {(data.reviews || []).length === 0 && (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '10px 0' }}>
                                        Hali sharh yo'q. Quyidan qo'shing.
                                    </div>
                                )}
                                {(data.reviews || []).map((rv, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                                        padding: '12px 14px', background: 'var(--bg-secondary)',
                                        borderRadius: 12, border: '1px solid var(--border)',
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{rv.name}</div>
                                            <div style={{ color: '#f5a623', fontSize: 14, margin: '3px 0' }}>
                                                {'★'.repeat(rv.stars)}{'☆'.repeat(5 - rv.stars)}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rv.text}</div>
                                        </div>
                                        <button onClick={() => removeReview(i)} style={{
                                            background: 'rgba(231,76,60,0.1)', border: 'none', borderRadius: 8,
                                            color: 'var(--danger)', cursor: 'pointer', padding: '4px 10px', fontSize: 13, flexShrink: 0,
                                        }}>🗑</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add new review */}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                            <label className="form-label">Yangi sharh qo'shish</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            className="form-input"
                                            value={newReview.name}
                                            onChange={e => setNewReview(r => ({ ...r, name: e.target.value }))}
                                            placeholder="Ism (masalan: Aziz T.)"
                                        />
                                    </div>
                                    <div style={{ width: 120 }}>
                                        <select
                                            className="form-input"
                                            value={newReview.stars}
                                            onChange={e => setNewReview(r => ({ ...r, stars: Number(e.target.value) }))}
                                        >
                                            <option value={5}>⭐⭐⭐⭐⭐ 5</option>
                                            <option value={4}>⭐⭐⭐⭐ 4</option>
                                            <option value={3}>⭐⭐⭐ 3</option>
                                            <option value={2}>⭐⭐ 2</option>
                                            <option value={1}>⭐ 1</option>
                                        </select>
                                    </div>
                                </div>
                                <textarea
                                    className="form-input"
                                    rows={3}
                                    value={newReview.text}
                                    onChange={e => setNewReview(r => ({ ...r, text: e.target.value }))}
                                    placeholder="Sharh matni (masalan: Juda mazali taomlar, tez yetkazib berishdi!)"
                                    style={{ resize: 'vertical' }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={addReview}
                                    disabled={!newReview.name.trim() || !newReview.text.trim()}
                                    style={{ alignSelf: 'flex-start' }}
                                >
                                    + Sharh qo'shish
                                </button>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                                Qo'shgandan keyin "💾 Saqlash" tugmasini bosing
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
