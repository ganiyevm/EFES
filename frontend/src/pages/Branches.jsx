import { useState, useEffect } from 'react';
import { useT } from '../i18n';
import api from '../api';
import BottomNav from '../components/BottomNav';

export default function Branches() {
    const { t } = useT();
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userPos, setUserPos] = useState(null);
    const [locating, setLocating] = useState(false);

    useEffect(() => {
        api.get('/branches')
            .then(r => setBranches((r.data || []).filter(b => b.isActive)))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleLocate = () => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
            () => setLocating(false),
            { timeout: 8000 }
        );
    };

    const calcDist = (b) => {
        if (!userPos || !b.location?.lat) return null;
        const R = 6371;
        const dLat = (b.location.lat - userPos.lat) * Math.PI / 180;
        const dLng = (b.location.lng - userPos.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(userPos.lat * Math.PI / 180) * Math.cos(b.location.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const fmtDist = (d) => d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;

    const sorted = [...branches].sort((a, b) => {
        const da = calcDist(a), db = calcDist(b);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
    });

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 90 }}>
            {/* ── Header ── */}
            <div style={{ padding: '16px 16px 14px' }}>
                <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--primary-light)' }}>📍</span> Filiallar
                </div>
                <button
                    onClick={handleLocate}
                    disabled={locating}
                    style={{
                        width: '100%', padding: '12px 16px',
                        background: userPos ? 'rgba(46,204,113,0.08)' : 'var(--bg-card)',
                        border: `1px solid ${userPos ? 'rgba(46,204,113,0.3)' : 'var(--border)'}`,
                        borderRadius: 14, color: userPos ? '#2ecc71' : 'var(--text)',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.25s',
                    }}
                >
                    {locating ? `⏳ ${t('locating')}` : userPos ? `✅ ${t('locationFound')}` : `📍 ${t('getDirections')}`}
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
                    <div className="spinner" />
                </div>
            ) : branches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 52, marginBottom: 14 }}>🏢</div>
                    <div style={{ fontWeight: 700 }}>{t('noBranches')}</div>
                </div>
            ) : (
                <div style={{ padding: '0 16px' }}>
                    {sorted.map((b, idx) => {
                        const dist = calcDist(b);
                        const isNearest = idx === 0 && dist !== null;
                        return (
                            <BranchCard key={b._id} branch={b} dist={dist} isNearest={isNearest} fmtDist={fmtDist} t={t} />
                        );
                    })}
                </div>
            )}

            <BottomNav />
        </div>
    );
}

function BranchCard({ branch, dist, isNearest, fmtDist, t }) {
    const [navOpen, setNavOpen] = useState(false);

    const navLinks = [
        { label: 'Yandex Navigator', url: `yandexnavi://build_route_on_map?lat_to=${branch.location?.lat}&lon_to=${branch.location?.lng}` },
        { label: 'Yandex Maps', url: `https://yandex.com/maps/?pt=${branch.location?.lng},${branch.location?.lat}&z=16&l=map` },
        { label: 'Google Maps', url: `https://www.google.com/maps/dir/?api=1&destination=${branch.location?.lat},${branch.location?.lng}` },
    ];

    return (
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 18, marginBottom: 12,
            boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
            transition: 'all 0.25s',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 800, fontSize: 15 }}>#{branch.number} {branch.name}</span>
                        {isNearest && (
                            <span style={{
                                background: 'rgba(212,160,23,0.15)', color: 'var(--primary-light)',
                                borderRadius: 10, fontSize: 10, padding: '3px 8px', fontWeight: 700,
                            }}>
                                ⭐ {t('nearest')}
                            </span>
                        )}
                    </div>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: branch.isOpen ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)',
                        color: branch.isOpen ? '#2ecc71' : '#e74c3c',
                    }}>
                        ● {branch.isOpen ? t('openText') : t('closedText')}
                    </span>
                </div>
                {dist !== null && (
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                        <div style={{
                            fontWeight: 800, fontSize: 14,
                            background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>{fmtDist(dist)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('away')}</div>
                    </div>
                )}
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {branch.address && <DetailRow icon="📍" text={branch.address} />}
                {branch.phone && (
                    <a href={`tel:${branch.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                        <DetailRow icon="📞" text={branch.phone} />
                    </a>
                )}
                <DetailRow icon="🕐" text={branch.hours || '10:00 — 23:00'} />
                {branch.minOrderAmount > 0 && (
                    <DetailRow icon="💰" text={`Minimal: ${branch.minOrderAmount.toLocaleString()} so'm`} />
                )}
            </div>

            {/* Navigate button */}
            {branch.location?.lat > 0 && (
                <>
                    <button
                        onClick={() => setNavOpen(!navOpen)}
                        style={{
                            width: '100%', padding: '11px',
                            background: navOpen ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'var(--bg-secondary)',
                            border: `1px solid ${navOpen ? 'transparent' : 'var(--border)'}`,
                            borderRadius: 12, color: navOpen ? '#1a1a24' : 'var(--text)',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            boxShadow: navOpen ? '0 2px 12px rgba(212,160,23,0.25)' : 'none',
                            transition: 'all 0.25s',
                        }}
                    >
                        🗺 {t('navigate')} {navOpen ? '▲' : '▼'}
                    </button>
                    {navOpen && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {navLinks.map(nav => (
                                <a key={nav.label} href={nav.url} target="_blank" rel="noreferrer"
                                    style={{
                                        padding: '11px 14px', background: 'var(--bg)',
                                        border: '1px solid var(--border)', borderRadius: 12,
                                        color: 'var(--text)', fontSize: 13, fontWeight: 600,
                                        textDecoration: 'none', display: 'block', textAlign: 'center',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {nav.label}
                                </a>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function DetailRow({ icon, text }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
            <span style={{ flexShrink: 0 }}>{icon}</span>
            <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4, fontWeight: 500 }}>{text}</span>
        </div>
    );
}
