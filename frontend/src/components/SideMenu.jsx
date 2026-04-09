import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';

const PHONE = '+998 71 200-94-44';

const ICON = ({ d, size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {d.split('|').map((path, i) => <path key={i} d={path} />)}
    </svg>
);

export default function SideMenu({ onClose, onLangOpen }) {
    const navigate = useNavigate();
    const { lang } = useT();

    const langLabel = { uz: "O'zbekcha", ru: 'Русский', en: 'English' }[lang] || "O'zbekcha";

    const go = (path) => { onClose(); navigate(path); };

    const ITEMS = [
        {
            icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10',
            label: 'Bosh sahifa',
            action: () => go('/'),
        },
        {
            icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
            label: 'Aksiyalar',
            action: () => go('/'),
        },
        {
            icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9|M13.73 21a2 2 0 0 1-3.46 0',
            label: 'Xabarnoma',
            action: () => {},
        },
        {
            icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
            label: 'Biz haqimizda',
            action: () => {},
        },
        {
            icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10',
            label: 'Filiallar',
            action: () => go('/branches'),
        },
        {
            icon: 'M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z|M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
            label: "Ish o'rinlari",
            action: () => {},
        },
        {
            icon: 'M5 12h14|M12 5l7 7-7 7',
            label: 'Yetkazib berish',
            action: () => go('/cart'),
        },
        {
            icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z|M22 6l-10 7L2 6',
            label: "Biz bilan bog'lanish",
            action: () => {},
        },
    ];

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 200,
                    background: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(2px)',
                    animation: 'fadeIn 0.2s ease',
                }}
            />

            {/* Drawer */}
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
                    padding: '20px 20px 16px',
                    borderBottom: '1px solid #F0EAE2',
                }}>
                    <div style={{ fontWeight: 900, fontSize: 22, color: '#1A1A1A' }}>Menyu</div>
                    <button onClick={onClose} style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: '#F5F0EA', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, color: '#555',
                    }}>✕</button>
                </div>

                {/* Menu items */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {ITEMS.map((item, i) => (
                        <button
                            key={i}
                            onClick={item.action}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                                padding: '16px 20px',
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontFamily: 'inherit', textAlign: 'left',
                                borderBottom: '1px solid #F5F0EA',
                                color: '#1A1A1A', fontSize: 15, fontWeight: 500,
                                transition: 'background 0.15s',
                            }}
                            onTouchStart={e => e.currentTarget.style.background = '#FFF5F0'}
                            onTouchEnd={e => e.currentTarget.style.background = 'none'}
                        >
                            <span style={{ color: '#666', flexShrink: 0 }}>
                                <ICON d={item.icon} />
                            </span>
                            <span>{item.label}</span>
                        </button>
                    ))}

                    {/* Til */}
                    <button
                        onClick={() => { onClose(); onLangOpen(); }}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                            padding: '16px 20px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: 'inherit', borderBottom: '1px solid #F5F0EA',
                            transition: 'background 0.15s',
                        }}
                        onTouchStart={e => e.currentTarget.style.background = '#FFF5F0'}
                        onTouchEnd={e => e.currentTarget.style.background = 'none'}
                    >
                        <span style={{ color: '#666', flexShrink: 0 }}>
                            <ICON d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                        </span>
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>Til</span>
                        <span style={{ fontSize: 13, color: '#999', fontWeight: 500 }}>{langLabel}</span>
                    </button>

                    {/* Mavzu */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '16px 20px', borderBottom: '1px solid #F5F0EA',
                    }}>
                        <span style={{ color: '#666', flexShrink: 0 }}>
                            <ICON d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </span>
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: '#1A1A1A' }}>Mavzu</span>
                        <span style={{ fontSize: 13, color: '#999', fontWeight: 500 }}>Kunduzgi</span>
                    </div>

                    {/* Phone */}
                    <a
                        href={`tel:${PHONE.replace(/\s/g, '')}`}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 16,
                            padding: '16px 20px', textDecoration: 'none',
                            color: '#1A1A1A', borderBottom: '1px solid #F5F0EA',
                        }}
                    >
                        <span style={{ color: '#666', flexShrink: 0 }}>
                            <ICON d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 500 }}>{PHONE}</span>
                    </a>
                </div>
            </div>
        </>
    );
}
