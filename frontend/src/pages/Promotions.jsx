import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import BottomNav from '../components/BottomNav';

export default function Promotions() {
    const navigate = useNavigate();
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/promotions')
            .then(r => setPromos(r.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const active = promos.filter(p => {
        if (!p.isActive) return false;
        const now = new Date();
        if (p.startDate && new Date(p.startDate) > now) return false;
        if (p.endDate && new Date(p.endDate) < now) return false;
        return true;
    });

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 90 }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '18px 16px 14px',
                background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                <button onClick={() => navigate(-1)} style={{
                    background: 'var(--bg-secondary)', border: 'none', borderRadius: 12,
                    width: 38, height: 38, cursor: 'pointer', color: 'var(--text)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>←</button>
                <div style={{ fontWeight: 800, fontSize: 20 }}>Aksiyalar</div>
            </div>

            <div style={{ padding: '16px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>⏳</div>
                ) : active.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <div style={{ fontSize: 52, marginBottom: 16 }}>🎁</div>
                        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Hozircha aksiyalar yo'q</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Tez orada yangi aksiyalar bo'ladi!</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {active.map(p => (
                            <div key={p._id} style={{
                                background: 'var(--bg-card)', borderRadius: 18,
                                border: '1px solid var(--border)',
                                overflow: 'hidden',
                                boxShadow: 'var(--shadow-gold)',
                            }}>
                                {p.imageUrl && (
                                    <img src={p.imageUrl} alt={p.title}
                                        style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                                )}
                                <div style={{ padding: '16px' }}>
                                    <div style={{
                                        display: 'inline-block', padding: '3px 10px',
                                        background: 'rgba(212,160,23,0.12)', borderRadius: 8,
                                        fontSize: 12, fontWeight: 700, color: 'var(--primary)',
                                        marginBottom: 8,
                                    }}>
                                        {p.discountType === 'percent'
                                            ? `−${p.discountValue}%`
                                            : `−${p.discountValue?.toLocaleString()} so'm`}
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{p.title}</div>
                                    {p.description && (
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
                                            {p.description}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                                        {p.promoCode && (
                                            <span style={{
                                                background: 'var(--bg-secondary)', padding: '4px 10px',
                                                borderRadius: 8, fontWeight: 700, letterSpacing: 1,
                                                color: 'var(--primary)', border: '1px dashed var(--primary)',
                                            }}>
                                                {p.promoCode}
                                            </span>
                                        )}
                                        {p.minOrderAmount > 0 && (
                                            <span>Min: {p.minOrderAmount.toLocaleString()} so'm</span>
                                        )}
                                        {p.endDate && (
                                            <span>📅 {new Date(p.endDate).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <BottomNav />
        </div>
    );
}
