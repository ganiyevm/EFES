import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authenticate();
    }, []);

    const authenticate = async () => {
        try {
            const tg = window.Telegram?.WebApp;
            if (tg?.initData) {
                tg.ready();
                tg.expand();
                const { data } = await api.post('/auth/telegram', { initData: tg.initData });
                localStorage.setItem('efes_token', data.token);
                setUser(data.user);
            } else {
                // Development mode
                const token = localStorage.getItem('efes_token');
                if (token) {
                    const { data } = await api.get('/user/profile');
                    setUser(data);
                }
            }
        } catch (err) {
            console.error('Auth error:', err);
            localStorage.removeItem('efes_token');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
