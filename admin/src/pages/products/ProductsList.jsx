import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';

const MENU_IMAGES = [
    { file: 'arabkebab.jpg', label: 'Arab Kebab' },
    { file: 'iskandarkebab.jpg', label: 'Iskandar Kebab' },
    { file: 'donar.jpg', label: 'Donar' },
    { file: 'shaurma.jpg', label: 'Shaurma' },
    { file: 'lavash.jpg', label: 'Lavash' },
    { file: 'tandirlavash.jpg', label: 'Tandir Lavash' },
    { file: 'twister.jpg', label: 'Twister' },
    { file: 'blackburger.jpg', label: 'Black Burger' },
    { file: 'chikkenburger.jpg', label: 'Chicken Burger' },
    { file: 'klab.jpg', label: 'Club Burger' },
    { file: 'stackbirger.jpg', label: 'Stack Burger' },
    { file: 'gamuburger.jpg', label: 'Hamburger' },
    { file: 'nagetsi.jpg', label: 'Nagets' },
    { file: 'salat.jpg', label: 'Salat' },
    { file: 'assartitaom.jpg', label: 'Assort / Set' },
    { file: 'guruch.jpg', label: 'Guruch' },
    { file: 'xaggi.jpg', label: 'Xaggi' },
];

const CATEGORIES = [
    { key: '', label: 'Barchasi' },
    { key: 'kebab', label: '🥙 Kebab' }, { key: 'doner', label: '🌯 Döner' },
    { key: 'pide', label: '🫓 Pide' }, { key: 'izgara', label: '🥩 Izgara' },
    { key: 'corba', label: "🍲 Sho'rva" }, { key: 'manti', label: '🥟 Manti' },
    { key: 'burger', label: '🍔 Burger' }, { key: 'pizza', label: '🍕 Pizza' },
    { key: 'hot_dog', label: '🌭 Hot Dog' }, { key: 'salat', label: '🥗 Salat' },
    { key: 'drink', label: '🥤 Ichimlik' }, { key: 'dessert', label: '🍰 Desert' },
    { key: 'garnir', label: '🍟 Garnir' }, { key: 'sous', label: '🧴 Sous' },
    { key: 'set_menu', label: '🍱 Set menyu' }, { key: 'other', label: 'Boshqa' },
];

const EMPTY = { name: '', category: 'other', price: '', weight: '', calories: '', prepTime: '15', ingredients: '', description: { uz: '', ru: '' }, isSpicy: false, isVegetarian: false, isPopular: false, imageUrl: '' };

export default function ProductsList() {
    const [products, setProducts] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [category, setCategory] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // null | 'add' | product obj
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const limit = 30;

    const fetchProducts = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams({ page, limit });
        if (category) params.set('category', category);
        if (search) params.set('search', search);
        api.get(`/products?${params}`)
            .then(r => { setProducts(r.data.products || []); setTotal(r.data.total || 0); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [page, category, search]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const openAdd = () => { setForm(EMPTY); setModal('add'); };
    const openEdit = (p) => {
        setForm({ ...EMPTY, ...p, price: p.price || '', calories: p.calories || '', prepTime: p.prepTime || '15', weight: p.weight || '', description: p.description || { uz: '', ru: '' } });
        setModal(p);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.price) { alert('Nomi va narxi kerak'); return; }
        setSaving(true);
        try {
            const payload = { ...form, price: parseInt(form.price), calories: parseInt(form.calories) || 0, prepTime: parseInt(form.prepTime) || 15 };
            if (modal === 'add') {
                await api.post('/products', payload);
            } else {
                await api.put(`/products/${modal._id}`, payload);
            }
            setModal(null);
            fetchProducts();
        } catch (err) {
            alert(err.response?.data?.error || 'Xatolik');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (product) => {
        try {
            await api.put(`/products/${product._id}`, { isActive: !product.isActive });
            fetchProducts();
        } catch { }
    };

    const handleDelete = async (product) => {
        if (!confirm(`"${product.name}" ni o'chirishni tasdiqlaysizmi?`)) return;
        try {
            await api.delete(`/products/${product._id}`);
            fetchProducts();
        } catch { }
    };

    const pages = Math.ceil(total / limit);
    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const setDesc = (lang, v) => setForm(f => ({ ...f, description: { ...f.description, [lang]: v } }));

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">🍽 Mahsulotlar</h1>
                <button className="btn btn-primary" onClick={openAdd}>+ Yangi taom</button>
            </div>

            <div className="filter-row">
                <div className="search-bar" style={{ flex: 1, maxWidth: 280 }}>
                    <span className="search-icon">🔍</span>
                    <input className="form-input" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Taom qidirish..." />
                </div>
                <select className="form-input" style={{ width: 'auto' }} value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>⏳</div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Taom</th>
                                    <th>Kategoriya</th>
                                    <th>Narx</th>
                                    <th>Vazn</th>
                                    <th>Vaqt</th>
                                    <th>Belgilar</th>
                                    <th>Faol</th>
                                    <th>Amal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(p => (
                                    <tr key={p._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <img
                                                    src={p.imageUrl || `/uploads/menu/assartitaom.jpg`}
                                                    alt=""
                                                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                                                    onError={e => { e.target.src = '/uploads/menu/assartitaom.jpg'; }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                                                    {p.ingredients && <div style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.ingredients}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td><span style={{ fontSize: 12, background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 6 }}>{CATEGORIES.find(c => c.key === p.category)?.label || p.category}</span></td>
                                        <td><strong>{(p.price || 0).toLocaleString()} so'm</strong></td>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.weight || '—'}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.prepTime ? `${p.prepTime} daq` : '—'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 3 }}>
                                                {p.isSpicy && <span title="Achchiq" style={{ fontSize: 14 }}>🌶</span>}
                                                {p.isVegetarian && <span title="Vegetarian" style={{ fontSize: 14 }}>🥗</span>}
                                                {p.isPopular && <span title="Mashhur" style={{ fontSize: 14 }}>⭐</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <label className="switch">
                                                <input type="checkbox" checked={p.isActive} onChange={() => handleToggle(p)} />
                                                <span className="switch-slider" />
                                            </label>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>✏️</button>
                                                <button className="btn btn-sm" style={{ background: 'rgba(231,76,60,0.08)', color: 'var(--danger)', border: '1px solid rgba(231,76,60,0.15)' }} onClick={() => handleDelete(p)}>🗑</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {pages > 1 && (
                        <div className="pagination" style={{ padding: '12px 0' }}>
                            <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
                            {Array.from({ length: Math.min(pages, 7) }, (_, i) => (
                                <button key={i + 1} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
                            ))}
                            <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page === pages}>›</button>
                        </div>
                    )}
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{modal === 'add' ? '+ Yangi taom' : `✏️ ${form.name}`}</span>
                            <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Nomi *</label>
                                <input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Adana Kebab" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Kategoriya</label>
                                <select className="form-input" value={form.category} onChange={e => setField('category', e.target.value)}>
                                    {CATEGORIES.filter(c => c.key).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Narx (so'm) *</label>
                                <input className="form-input" type="number" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="25000" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Vazn</label>
                                <input className="form-input" value={form.weight} onChange={e => setField('weight', e.target.value)} placeholder="350g" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Kaloriya</label>
                                <input className="form-input" type="number" value={form.calories} onChange={e => setField('calories', e.target.value)} placeholder="450" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tayyorlanish (daq)</label>
                                <input className="form-input" type="number" value={form.prepTime} onChange={e => setField('prepTime', e.target.value)} placeholder="15" />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Rasm tanlash</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 8 }}>
                                    {MENU_IMAGES.map(img => {
                                        const url = `/uploads/menu/${img.file}`;
                                        const selected = form.imageUrl === url;
                                        return (
                                            <div
                                                key={img.file}
                                                onClick={() => setField('imageUrl', selected ? '' : url)}
                                                title={img.label}
                                                style={{
                                                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                                                    border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                                                    boxShadow: selected ? '0 0 0 3px rgba(212,160,23,0.2)' : 'none',
                                                    transition: 'all 0.2s', position: 'relative',
                                                }}
                                            >
                                                <img src={url} alt={img.label} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                                                {selected && (
                                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(212,160,23,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✅</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <input className="form-input" value={form.imageUrl} onChange={e => setField('imageUrl', e.target.value)} placeholder="Yoki URL kiriting: https://..." style={{ fontSize: 12 }} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Tarkibi</label>
                                <input className="form-input" value={form.ingredients} onChange={e => setField('ingredients', e.target.value)} placeholder="Mol go'shti, piyoz, ziravorlar..." />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Tavsif (O'zbekcha)</label>
                                <textarea className="form-input" value={form.description?.uz} onChange={e => setDesc('uz', e.target.value)} placeholder="Taom haqida..." rows={2} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">Tavsif (Ruscha)</label>
                                <textarea className="form-input" value={form.description?.ru} onChange={e => setDesc('ru', e.target.value)} placeholder="Описание блюда..." rows={2} />
                            </div>
                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: 20 }}>
                                <CheckboxField label="🌶 Achchiq" checked={form.isSpicy} onChange={v => setField('isSpicy', v)} />
                                <CheckboxField label="🥗 Vegetarian" checked={form.isVegetarian} onChange={v => setField('isVegetarian', v)} />
                                <CheckboxField label="⭐ Mashhur" checked={form.isPopular} onChange={v => setField('isPopular', v)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setModal(null)}>Bekor</button>
                            <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                                {saving ? '⏳ Saqlanmoqda...' : '✅ Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CheckboxField({ label, checked, onChange }) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
            {label}
        </label>
    );
}
