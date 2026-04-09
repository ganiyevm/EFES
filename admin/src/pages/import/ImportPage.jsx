import { useState, useRef } from 'react';
import api from '../../api/axios';

export default function ImportPage() {
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef();

    const handleUpload = async () => {
        if (!file) { setError('Fayl tanlang'); return; }
        setLoading(true);
        setError('');
        setResult(null);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const { data } = await api.post('/import/excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResult(data);
            setFile(null);
            if (fileRef.current) fileRef.current.value = '';
        } catch (err) {
            setError(err.response?.data?.error || 'Import xatoligi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">📥 Excel Import</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Upload card */}
                <div className="card">
                    <h3 style={{ marginBottom: 16, fontSize: 16 }}>📂 Fayl yuklash</h3>

                    <div
                        onClick={() => fileRef.current?.click()}
                        style={{
                            border: `2px dashed ${file ? 'var(--primary)' : 'rgba(154,148,136,0.3)'}`,
                            borderRadius: 12, padding: '32px 20px', textAlign: 'center',
                            cursor: 'pointer', marginBottom: 16,
                            background: file ? 'var(--primary-light)' : 'var(--bg-secondary)',
                            transition: 'all 0.2s',
                        }}
                    >
                        <div style={{ fontSize: 36, marginBottom: 10 }}>{file ? '✅' : '📁'}</div>
                        <div style={{ fontWeight: 600, color: file ? 'var(--primary)' : 'var(--text)' }}>
                            {file ? file.name : 'Excel faylni bu yerga tashlang'}
                        </div>
                        {!file && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>.xlsx yoki .xls formati</div>}
                    </div>

                    <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                        onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); }}
                    />

                    {error && (
                        <div style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.15)', color: 'var(--danger)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '12px' }}
                        onClick={handleUpload}
                        disabled={loading || !file}
                    >
                        {loading ? '⏳ Import qilinmoqda...' : '🚀 Importni boshlash'}
                    </button>

                    {result && (
                        <div style={{ marginTop: 16, background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 10 }}>✅ Import muvaffaqiyatli!</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <Stat label="Jami qatorlar" value={result.totalRows} color="#374151" />
                                <Stat label="Import qilindi" value={result.imported} color="var(--success)" />
                                <Stat label="Xatoliklar" value={result.errors} color="var(--danger)" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div className="card">
                    <h3 style={{ marginBottom: 16, fontSize: 16 }}>📋 Excel format</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                        Excel faylning birinchi satri sarlavha bo'lishi kerak. Quyidagi ustun nomlari qo'llab-quvvatlanadi:
                    </p>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ background: 'rgba(212,160,23,0.04)', padding: '8px 12px', borderBottom: '2px solid var(--border)', fontSize: 12, textAlign: 'left' }}>Ustun nomi</th>
                                    <th style={{ background: 'rgba(212,160,23,0.04)', padding: '8px 12px', borderBottom: '2px solid var(--border)', fontSize: 12, textAlign: 'left' }}>Vazifasi</th>
                                    <th style={{ background: 'rgba(212,160,23,0.04)', padding: '8px 12px', borderBottom: '2px solid var(--border)', fontSize: 12, textAlign: 'left' }}>Majburiy</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ['Nomi / Name', 'Taom nomi', '✅'],
                                    ['Kategoriya / Category', 'kebab, doner, pide...', ''],
                                    ['Narx / Price', "Narx (so'm)", '✅'],
                                    ['Vazn / Weight', 'Masalan: 350g', ''],
                                    ['Kaloriya / Calories', 'Kaloriya soni', ''],
                                    ['Vaqt / PrepTime', 'Tayyorlanish (daq)', ''],
                                    ['Tarkibi / Ingredients', 'Tarkibiy qismlar', ''],
                                    ['Tavsif_uz', "O'zbekcha tavsif", ''],
                                    ['Tavsif_ru', 'Ruscha tavsif', ''],
                                ].map(([col, desc, req]) => (
                                    <tr key={col}>
                                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                                            <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>{col}</code>
                                        </td>
                                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</td>
                                        <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>{req}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: 16, background: 'rgba(241,196,15,0.06)', border: '1px solid rgba(241,196,15,0.15)', color: 'var(--primary)' }}>
                        💡 <strong>Eslatma:</strong> Agar mahsulot allaqachon mavjud bo'lsa (bir xil nomi bo'lsa), yangilanadi. Yangi bo'lsa, qo'shiladi.
                    </div>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, color }) {
    return (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontWeight: 800, fontSize: 20, color }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
        </div>
    );
}
