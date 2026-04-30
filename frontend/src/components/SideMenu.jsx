import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import api from '../api';

const DEFAULTS = {
    phone: '+998 71 200-94-44',
    telegram: import.meta.env.VITE_BOT_USERNAME || 'efes_kebab_bot',
    instagram: 'efeskebab',
    about_description: 'EFES Kebab — Toshkentdagi eng yaxshi Turk taomlari restoranidir.',
    about_address: 'Toshkent shahri, Yunusobod tumani',
    about_work_hours: 'Har kuni 10:00 – 23:00',
    jobs_positions: ['Oshpaz', 'Ofitsiant', 'Kassir', 'Yetkazib beruvchi'],
    reviews: [],
    delivery_time: '30–60 daqiqa ichida',
    delivery_cost_text: '15 000 so\'mdan',
    delivery_free_text: '150 000 so\'mdan yuqori buyurtmalarda',
    delivery_zone: 'Toshkent shahri bo\'ylab',
    delivery_work_hours: 'Har kuni 10:00 – 23:00',
    delivery_min_order: '50 000 so\'m',
};

const ICON = ({ d, size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {d.split('|').map((path, i) => <path key={i} d={path} />)}
    </svg>
);

function InfoModal({ title, onClose, children }) {
    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.55)', display: 'flex',
            alignItems: 'flex-end', backdropFilter: 'blur(4px)',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                width: '100%', maxHeight: '75vh', overflowY: 'auto',
                background: 'var(--bg-card)', borderRadius: '22px 22px 0 0',
                padding: '22px 20px 40px',
                border: '1px solid var(--border)', borderBottom: 'none',
            }}>
                <div style={{ width: 40, height: 4, borderRadius: 4, background: 'var(--border)', margin: '0 auto 18px' }} />
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>{title}</div>
                {children}
            </div>
        </div>
    );
}

export default function SideMenu({ onClose, onLangOpen }) {
    const navigate = useNavigate();
    const { lang } = useT();
    const [modal, setModal] = useState(null);
    const [content, setContent] = useState(DEFAULTS);
    const [isDark, setIsDark] = useState(() =>
        document.documentElement.getAttribute('data-theme') !== 'light'
    );

    useEffect(() => {
        api.get('/delivery/app-content')
            .then(r => setContent({ ...DEFAULTS, ...r.data }))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const saved = localStorage.getItem('efes_theme');
        const dark = saved !== 'light';
        setIsDark(dark);
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }, []);

    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        const theme = newDark ? 'dark' : 'light';
        localStorage.setItem('efes_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    };

    const langLabel = { uz: "O'zbekcha", ru: 'Русский', en: 'English' }[lang] || "O'zbekcha";

    const go = (path) => { onClose(); navigate(path); };
    const openModal = (name) => setModal(name);
    const closeModal = () => setModal(null);

    const ITEMS = [
        {
            icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10',
            label: 'Bosh sahifa',
            action: () => go('/'),
        },
        {
            icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
            label: 'Aksiyalar',
            action: () => go('/promotions'),
        },
        {
            icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9|M13.73 21a2 2 0 0 1-3.46 0',
            label: 'Xabarnoma',
            action: () => go('/orders'),
        },
        {
            icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
            label: 'Biz haqimizda',
            action: () => openModal('about'),
        },
        {
            icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10',
            label: 'Filiallar',
            action: () => go('/branches'),
        },
        {
            icon: 'M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z|M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
            label: "Ish o'rinlari",
            action: () => openModal('jobs'),
        },
        {
            icon: 'M5 12h14|M12 5l7 7-7 7',
            label: 'Yetkazib berish',
            action: () => openModal('delivery'),
        },
        {
            icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z|M22 6l-10 7L2 6',
            label: "Biz bilan bog'lanish",
            action: () => openModal('contact'),
        },
    ];

    const itemStyle = {
        width: '100%', display: 'flex', alignItems: 'center', gap: 16,
        padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left', borderBottom: '1px solid #F5F0EA',
        color: '#1A1A1A', fontSize: 15, fontWeight: 500, transition: 'background 0.15s',
    };

    return (
        <>
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, zIndex: 200,
                background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
                animation: 'fadeIn 0.2s ease',
            }} />

            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: '82%', maxWidth: 340,
                background: '#fff', zIndex: 201,
                display: 'flex', flexDirection: 'column',
                animation: 'slideInRight 0.25s ease',
                boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
                borderRadius: '20px 0 0 20px',
            }}>
                <style>{`
                    @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
                    @keyframes slideInRight { from { transform:translateX(100%) } to { transform:translateX(0) } }
                `}</style>

                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 20px 16px', borderBottom: '1px solid #F0EAE2',
                }}>
                    <div style={{ fontWeight: 900, fontSize: 22, color: '#1A1A1A' }}>Menyu</div>
                    <button onClick={onClose} style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: '#F5F0EA', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, color: '#555',
                    }}>✕</button>
                </div>

                {/* Items */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {ITEMS.map((item, i) => (
                        <button key={i} onClick={item.action} style={itemStyle}
                            onTouchStart={e => e.currentTarget.style.background = '#FFF5F0'}
                            onTouchEnd={e => e.currentTarget.style.background = 'none'}>
                            <span style={{ color: '#666', flexShrink: 0 }}><ICON d={item.icon} /></span>
                            <span>{item.label}</span>
                        </button>
                    ))}

                    {/* Til */}
                    <button onClick={() => { onClose(); onLangOpen(); }} style={itemStyle}
                        onTouchStart={e => e.currentTarget.style.background = '#FFF5F0'}
                        onTouchEnd={e => e.currentTarget.style.background = 'none'}>
                        <span style={{ color: '#666', flexShrink: 0 }}>
                            <ICON d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                        </span>
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>Til</span>
                        <span style={{ fontSize: 13, color: '#999', fontWeight: 500 }}>{langLabel}</span>
                    </button>

                    {/* Mavzu (Theme toggle) */}
                    <button onClick={toggleTheme} style={itemStyle}
                        onTouchStart={e => e.currentTarget.style.background = '#FFF5F0'}
                        onTouchEnd={e => e.currentTarget.style.background = 'none'}>
                        <span style={{ color: '#666', flexShrink: 0 }}>
                            <ICON d={isDark
                                ? 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'
                                : 'M12 2v2|M12 20v2|M4.22 4.22l1.42 1.42|M18.36 18.36l1.42 1.42|M2 12h2|M20 12h2|M4.22 19.78l1.42-1.42|M18.36 5.64l1.42-1.42|M12 6a6 6 0 1 0 0 12A6 6 0 0 0 12 6z'
                            } />
                        </span>
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>Mavzu</span>
                        <span style={{ fontSize: 13, color: '#999', fontWeight: 500 }}>
                            {isDark ? 'Tungi' : 'Kunduzgi'}
                        </span>
                    </button>

                    {/* Phone */}
                    <a href={`tel:${(content.phone || '').replace(/\s/g, '')}`} style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '15px 20px', textDecoration: 'none',
                        color: '#1A1A1A', borderBottom: '1px solid #F5F0EA',
                    }}>
                        <span style={{ color: '#666', flexShrink: 0 }}>
                            <ICON d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 500 }}>{content.phone}</span>
                    </a>
                </div>
            </div>

            {/* Biz haqimizda */}
            {modal === 'about' && (
                <InfoModal title="Biz haqimizda" onClose={closeModal}>
                    <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>🍽</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                        {content.about_description}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                            <span>📍</span> {content.about_address}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                            <span>🕐</span> {content.about_work_hours}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                            <span>📞</span> {content.phone}
                        </div>
                    </div>
                    {(content.reviews || []).length > 0 && (
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Mijozlar sharhlari</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {(content.reviews || []).map((rv, i) => (
                                    <div key={i} style={{
                                        padding: '12px 14px', background: 'var(--bg-secondary)',
                                        borderRadius: 14, border: '1px solid var(--border)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{rv.name}</div>
                                            <div style={{ color: '#f5a623', fontSize: 13 }}>
                                                {'★'.repeat(rv.stars)}{'☆'.repeat(5 - rv.stars)}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{rv.text}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </InfoModal>
            )}

            {/* Ish o'rinlari */}
            {modal === 'jobs' && (
                <InfoModal title="Ish o'rinlari" onClose={closeModal}>
                    <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>💼</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                        EFES Kebab jamoasiga qo'shiling! Biz doim iqtidorli va mehnatsevar xodimlarni izlaymiz.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                        {(content.jobs_positions || []).map((job, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '12px 14px', background: 'var(--bg-secondary)',
                                borderRadius: 12, fontSize: 14, fontWeight: 600,
                            }}>
                                <span>✅</span> {job}
                            </div>
                        ))}
                    </div>
                    <a href={`https://t.me/${content.telegram}`} target="_blank" rel="noreferrer" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        width: '100%', padding: '14px', borderRadius: 14,
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                        color: '#1a1a24', fontWeight: 800, fontSize: 15, textDecoration: 'none',
                    }}>
                        ✈️ Telegramda murojaat qilish
                    </a>
                </InfoModal>
            )}

            {/* Yetkazib berish */}
            {modal === 'delivery' && (
                <InfoModal title="Yetkazib berish" onClose={closeModal}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                            { icon: '🚗', title: 'Yetkazib berish vaqti', desc: content.delivery_time },
                            { icon: '💰', title: 'Yetkazib berish narxi', desc: content.delivery_cost_text },
                            { icon: '🎁', title: 'Bepul yetkazib berish', desc: content.delivery_free_text },
                            { icon: '📍', title: 'Yetkazib berish zonasi', desc: content.delivery_zone },
                            { icon: '🕐', title: 'Ish vaqti', desc: content.delivery_work_hours },
                            { icon: '📦', title: 'Minimal buyurtma', desc: content.delivery_min_order },
                        ].map((item, i) => (
                            <div key={i} style={{
                                display: 'flex', gap: 14, alignItems: 'flex-start',
                                padding: '12px 14px', background: 'var(--bg-secondary)',
                                borderRadius: 14,
                            }}>
                                <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{item.title}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </InfoModal>
            )}

            {/* Biz bilan bog'lanish */}
            {modal === 'contact' && (
                <InfoModal title="Biz bilan bog'lanish" onClose={closeModal}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <a href={`tel:${(content.phone || '').replace(/\s/g, '')}`} style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '14px 16px', background: 'var(--bg-secondary)',
                            borderRadius: 14, textDecoration: 'none', color: 'var(--text)',
                        }}>
                            <span style={{ fontSize: 24 }}>📞</span>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Telefon</div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{content.phone}</div>
                            </div>
                        </a>
                        <a href={`https://t.me/${content.telegram}`} target="_blank" rel="noreferrer" style={{
                            display: 'flex', alignItems: 'center', gap: 14,
                            padding: '14px 16px', background: 'rgba(0,136,204,0.08)',
                            borderRadius: 14, textDecoration: 'none', color: 'var(--text)',
                            border: '1px solid rgba(0,136,204,0.15)',
                        }}>
                            <span style={{ fontSize: 24 }}>✈️</span>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Telegram</div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#0088cc' }}>@{content.telegram}</div>
                            </div>
                        </a>
                        {content.instagram && (
                            <a href={`https://instagram.com/${content.instagram}`} target="_blank" rel="noreferrer" style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '14px 16px', background: 'rgba(225,48,108,0.07)',
                                borderRadius: 14, textDecoration: 'none', color: 'var(--text)',
                                border: '1px solid rgba(225,48,108,0.15)',
                            }}>
                                <span style={{ fontSize: 24 }}>📸</span>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>Instagram</div>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: '#e1306c' }}>@{content.instagram}</div>
                                </div>
                            </a>
                        )}
                    </div>
                </InfoModal>
            )}
        </>
    );
}
