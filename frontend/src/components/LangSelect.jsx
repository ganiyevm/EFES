import { useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const LANGS = [
    { key: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
    { key: 'ru', label: 'Русский',   flag: '🇷🇺' },
    { key: 'en', label: 'English',   flag: '🇺🇸' },
];

export default function LangSelect({ onSelect }) {
    const { user } = useAuth();
    const [selected, setSelected] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSelect = async (key) => {
        setSelected(key);
        setSaving(true);
        localStorage.setItem('efes_lang', key);
        try {
            if (user) await api.put('/user/profile', { language: key });
        } catch { }
        finally {
            setSaving(false);
            onSelect(key);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'var(--bg)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 24px',
        }}>
            {/* Logo */}
            <div style={{ marginBottom: 40, textAlign: 'center' }}>
                <div style={{
                    width: 80, height: 80, borderRadius: 24, margin: '0 auto 16px',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 42,
                    boxShadow: '0 8px 32px rgba(212,160,23,0.4)',
                }}>🍽</div>
                <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: 1 }}>EFES</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                    Kebab & Fast Food
                </div>
            </div>

            {/* Title */}
            <div style={{
                fontWeight: 800, fontSize: 22, marginBottom: 24, textAlign: 'center',
            }}>Язык / Til / Language</div>

            {/* Lang buttons */}
            <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {LANGS.map(({ key, label, flag }) => {
                    const isActive = selected === key;
                    return (
                        <button
                            key={key}
                            onClick={() => !saving && handleSelect(key)}
                            disabled={saving}
                            style={{
                                width: '100%', padding: '17px 24px',
                                borderRadius: 16, cursor: saving ? 'default' : 'pointer',
                                fontFamily: 'inherit', fontSize: 17, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                                border: `2px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                                background: isActive
                                    ? 'linear-gradient(135deg, var(--primary), var(--primary-light))'
                                    : 'var(--bg-card)',
                                color: isActive ? '#1a1a24' : 'var(--text)',
                                boxShadow: isActive ? '0 4px 20px rgba(212,160,23,0.35)' : '0 2px 8px rgba(0,0,0,0.1)',
                                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <span style={{ fontSize: 22 }}>{flag}</span>
                            <span>{label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
