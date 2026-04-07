import { useState, useEffect } from 'react';
import api from '../../api/axios';

const EMPTY = {
    title: { uz: '', ru: '', en: '' },
    description: { uz: '', ru: '', en: '' },
    imageUrl: '',
    discountType: 'percent',
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscount: 0,
    promoCode: '',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: '',
    isActive: true,
    usageLimit: 0,
    sortOrder: 0,
};

export default function PromotionsPage() {
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // null | 'add' | {promo}
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState('uz');

    const fetchPromos = () => {
        setLoading(true);
        api.get('/promotions/admin/list')
            .then(r => setPromos(r.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    };
    useEffect(fetchPromos, []);

    const openAdd = () => {
        const now = new Date();
        const end = new Date(now);
        end.setMonth(end.getMonth() + 1);
        setForm({
            ...EMPTY,
            startDate: now.toISOString().slice(0, 16),
            endDate: end.toISOString().slice(0, 16),
        });
        setTab('uz');
        setModal('add');
    };

    const openEdit = (p) => {
        setForm({
            ...EMPTY, ...p,
            title: { uz: p.title?.uz || '', ru: p.title?.ru || '', en: p.title?.en || '' },
            description: { uz: p.description?.uz || '', ru: p.description?.ru || '', en: p.description?.en || '' },
            startDate: p.startDate ? new Date(p.startDate).toISOString().slice(0, 16) : '',
            endDate: p.endDate ? new Date(p.endDate).toISOString().slice(0, 16) : '',
        });
        setTab('uz');
        setModal(p);
    };

    const handleSave = async () => {
        if (!form.title.uz) { alert('Sarlavha (UZ) kerak'); return; }
        if (!form.discountValue || form.discountValue <= 0) { alert('Chegirma qiymati kerak'); return; }
        setSaving(true);
        try {
            const payload = {
                ...form,
                promoCode: form.promoCode?.toUpperCase().trim(),
                startDate: form.startDate ? new Date(form.startDate) : new Date(),
                endDate: form.endDate ? new Date(form.endDate) : null,
            };
            if (modal === 'add') {
                await api.post('/promotions/admin', payload);
            } else {
                await api.put(`/promotions/admin/${modal._id}`, payload);
            }
            setModal(null);
            fetchPromos();
        } catch (err) {
            alert(err.response?.data?.error || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!confirm(`"${title}" aksiyani o'chirmoqchimisiz?`)) return;
        try {
            await api.delete(`/promotions/admin/${id}`);
            fetchPromos();
        } catch { }
    };

    const handleToggle = async (p) => {
        try {
            await api.put(`/promotions/admin/${p._id}`, { isActive: !p.isActive });
            fetchPromos();
        } catch { }
    };

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setTitle = (lang, v) => setForm(f => ({ ...f, title: { ...f.title, [lang]: v } }));
    const setDesc = (lang, v) => setForm(f => ({ ...f, description: { ...f.description, [lang]: v } }));

    const now = new Date();
    const isExpired = (p) => p.endDate && new Date(p.endDate) < now;
    const isScheduled = (p) => new Date(p.startDate) > now;

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">🎁 Aksiyalar</h1>
                <button className="btn btn-primary" onClick={openAdd}>+ Yangi aksiya</button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>⏳</div>
            ) : promos.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Hozircha aksiyalar yo'q</div>
                    <div style={{ fontSize: 13 }}>Yangi aksiya yaratish uchun tugmani bosing</div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {promos.map(p => (
                        <div key={p._id} className="card" style={{
                            padding: 0, overflow: 'hidden',
                            opacity: (!p.isActive || isExpired(p)) ? 0.65 : 1,
                            transition: 'all 0.2s',
                        }}>
                            {/* Gradient header */}
                            <div style={{
                                background: p.isActive && !isExpired(p)
                                    ? 'linear-gradient(135deg, #B8860B, #D4A017, #E86420)'
                                    : 'var(--bg-secondary)',
                                padding: '18px 20px',
                                position: 'relative', overflow: 'hidden',
                            }}>
                                <div style={{ position: 'absolute', top: -30, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: 16, color: p.isActive && !isExpired(p) ? '#1a1a24' : 'var(--text)' }}>
                                            {p.title?.uz || '—'}
                                        </div>
                                        {p.description?.uz && (
                                            <div style={{ fontSize: 12, marginTop: 4, color: p.isActive && !isExpired(p) ? 'rgba(26,26,36,0.7)' : 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                {p.description.uz}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        borderRadius: 10, padding: '6px 12px',
                                        fontWeight: 900, fontSize: 18,
                                        color: p.isActive && !isExpired(p) ? '#1a1a24' : 'var(--text)',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {p.discountType === 'percent' ? `${p.discountValue}%` : `${p.discountValue.toLocaleString()} so'm`}
                                    </div>
                                </div>
                            </div>

                            {/* Info */}
                            <div style={{ padding: '14px 20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                    <InfoItem label="Promo kod" value={p.promoCode || '—'} mono />
                                    <InfoItem label="Foydalanish" value={`${p.usageCount} / ${p.usageLimit || '∞'}`} />
                                    <InfoItem label="Min buyurtma" value={p.minOrderAmount ? `${p.minOrderAmount.toLocaleString()} so'm` : '—'} />
                                    <InfoItem label="Holat" value={
                                        !p.isActive ? '⛔ O\'chirilgan' :
                                            isExpired(p) ? '⏰ Muddati o\'tgan' :
                                                isScheduled(p) ? '📅 Rejalashtirilgan' :
                                                    '✅ Faol'
                                    } />
                                    {p.startDate && <InfoItem label="Boshlanish" value={new Date(p.startDate).toLocaleDateString('uz')} />}
                                    {p.endDate && <InfoItem label="Tugash" value={new Date(p.endDate).toLocaleDateString('uz')} />}
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <label className="switch" style={{ marginRight: 4 }}>
                                        <input type="checkbox" checked={p.isActive} onChange={() => handleToggle(p)} />
                                        <span className="switch-slider" />
                                    </label>
                                    <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEdit(p)}>
                                        ✏️ Tahrirlash
                                    </button>
                                    <button
                                        className="btn btn-sm"
                                        style={{ background: 'rgba(231,76,60,0.08)', color: 'var(--danger)', border: '1px solid rgba(231,76,60,0.15)' }}
                                        onClick={() => handleDelete(p._id, p.title?.uz)}
                                    >
                                        🗑
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Modal ── */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{modal === 'add' ? '+ Yangi aksiya' : '✏️ Aksiya tahrirlash'}</span>
                            <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Lang tabs */}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                                {['uz', 'ru', 'en'].map(l => (
                                    <button key={l} onClick={() => setTab(l)} style={{
                                        padding: '6px 16px', borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                        background: tab === l ? 'var(--primary)' : 'var(--bg-secondary)',
                                        color: tab === l ? '#1a1a24' : 'var(--text)',
                                        border: `1px solid ${tab === l ? 'var(--primary)' : 'var(--border)'}`,
                                        transition: 'all 0.2s',
                                    }}>{l.toUpperCase()}</button>
                                ))}
                            </div>

                            {/* Title/Desc per language */}
                            <div className="form-group">
                                <label className="form-label">Sarlavha ({tab.toUpperCase()}) *</label>
                                <input className="form-input" value={form.title[tab]} onChange={e => setTitle(tab, e.target.value)}
                                    placeholder={tab === 'uz' ? "Birinchi buyurtmada chegirma" : tab === 'ru' ? 'Скидка на первый заказ' : 'Discount on first order'} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tavsif ({tab.toUpperCase()})</label>
                                <input className="form-input" value={form.description[tab]} onChange={e => setDesc(tab, e.target.value)}
                                    placeholder={tab === 'uz' ? "Qo'shimcha ma'lumot..." : tab === 'ru' ? 'Дополнительная информация...' : 'Additional info...'} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {/* Discount type */}
                                <div className="form-group">
                                    <label className="form-label">Chegirma turi</label>
                                    <select className="form-input" value={form.discountType} onChange={e => setField('discountType', e.target.value)}>
                                        <option value="percent">% Foiz</option>
                                        <option value="fixed">So'm (qat'iy)</option>
                                    </select>
                                </div>
                                {/* Discount value */}
                                <div className="form-group">
                                    <label className="form-label">Chegirma miqdori {form.discountType === 'percent' ? '(%)' : "(so'm)"}</label>
                                    <input className="form-input" type="number" value={form.discountValue}
                                        onChange={e => setField('discountValue', parseFloat(e.target.value) || 0)} />
                                </div>
                                {/* Min order */}
                                <div className="form-group">
                                    <label className="form-label">Minimal buyurtma (so'm)</label>
                                    <input className="form-input" type="number" value={form.minOrderAmount}
                                        onChange={e => setField('minOrderAmount', parseInt(e.target.value) || 0)} />
                                </div>
                                {/* Max discount (for percent) */}
                                {form.discountType === 'percent' && (
                                    <div className="form-group">
                                        <label className="form-label">Maks chegirma (so'm, 0=cheksiz)</label>
                                        <input className="form-input" type="number" value={form.maxDiscount}
                                            onChange={e => setField('maxDiscount', parseInt(e.target.value) || 0)} />
                                    </div>
                                )}
                                {/* Promo code */}
                                <div className="form-group">
                                    <label className="form-label">Promo kod (ixtiyoriy)</label>
                                    <input className="form-input" value={form.promoCode}
                                        onChange={e => setField('promoCode', e.target.value.toUpperCase())}
                                        placeholder="EFES10" style={{ fontFamily: 'monospace', letterSpacing: 2 }} />
                                </div>
                                {/* Usage limit */}
                                <div className="form-group">
                                    <label className="form-label">Foydalanish limiti (0=cheksiz)</label>
                                    <input className="form-input" type="number" value={form.usageLimit}
                                        onChange={e => setField('usageLimit', parseInt(e.target.value) || 0)} />
                                </div>
                                {/* Start date */}
                                <div className="form-group">
                                    <label className="form-label">Boshlanish sanasi</label>
                                    <input className="form-input" type="datetime-local" value={form.startDate}
                                        onChange={e => setField('startDate', e.target.value)} />
                                </div>
                                {/* End date */}
                                <div className="form-group">
                                    <label className="form-label">Tugash sanasi (ixtiyoriy)</label>
                                    <input className="form-input" type="datetime-local" value={form.endDate}
                                        onChange={e => setField('endDate', e.target.value)} />
                                </div>
                                {/* Sort order */}
                                <div className="form-group">
                                    <label className="form-label">Tartib raqami (yuqori = birinchi)</label>
                                    <input className="form-input" type="number" value={form.sortOrder}
                                        onChange={e => setField('sortOrder', parseInt(e.target.value) || 0)} />
                                </div>
                                {/* Image URL */}
                                <div className="form-group">
                                    <label className="form-label">Rasm URL (ixtiyoriy)</label>
                                    <input className="form-input" value={form.imageUrl}
                                        onChange={e => setField('imageUrl', e.target.value)}
                                        placeholder="https://..." />
                                </div>
                            </div>

                            {/* Active toggle */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)', marginTop: 4 }}>
                                <input type="checkbox" checked={form.isActive} onChange={e => setField('isActive', e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>✅ Faol holat</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>Mini appda ko'rsatilsin</div>
                                </div>
                            </label>
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

function InfoItem({ label, value, mono }) {
    return (
        <div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit', letterSpacing: mono ? 1 : 0 }}>{value}</div>
        </div>
    );
}
