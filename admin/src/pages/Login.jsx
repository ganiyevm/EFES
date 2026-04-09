import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Login() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/admin/login', { username, password });
            localStorage.setItem('efes_admin_token', data.token);
            navigate('/admin');
        } catch (err) {
            setError(err.response?.data?.error || 'Login yoki parol xato');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh', background: 'var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Background decorative glows */}
            <div style={{
                position: 'absolute', top: '20%', left: '30%',
                width: 300, height: 300, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '10%', right: '20%',
                width: 200, height: 200, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(232,100,32,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 24, padding: 36, width: '100%', maxWidth: 400,
                boxShadow: '0 24px 64px rgba(0,0,0,0.4)', position: 'relative',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 20,
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-strong))',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 36, marginBottom: 16,
                        boxShadow: '0 8px 32px rgba(212,160,23,0.3)',
                    }}>
                        🔥
                    </div>
                    <div style={{
                        fontWeight: 900, fontSize: 26,
                        background: 'linear-gradient(135deg, #F0C040, #D4A017)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>EFES Admin</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>Boshqaruv paneli</div>
                </div>

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">Login</label>
                        <input
                            className="form-input"
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="admin"
                            required
                            autoComplete="username"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Parol</label>
                        <input
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.2)',
                            color: 'var(--danger)', borderRadius: 12, padding: '11px 16px',
                            fontSize: 13, marginBottom: 16, fontWeight: 500,
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '14px',
                            background: loading ? 'rgba(154,148,136,0.3)' : 'linear-gradient(135deg, var(--primary), var(--primary-strong))',
                            border: 'none', borderRadius: 14,
                            color: loading ? 'var(--text-secondary)' : '#1a1a24',
                            fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
                            fontFamily: 'inherit', transition: 'all 0.3s',
                            boxShadow: loading ? 'none' : '0 4px 20px rgba(212,160,23,0.3)',
                        }}
                    >
                        {loading ? '⏳ Kirish...' : '🔐 Kirish'}
                    </button>
                </form>
            </div>
        </div>
    );
}
