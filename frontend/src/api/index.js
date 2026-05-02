import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_URL });

// ─── Request: access token qo'shish ───
api.interceptors.request.use(config => {
    const token = localStorage.getItem('efes_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ─── Response: TOKEN_EXPIRED bo'lsa refresh qilib qayta urinish ───
let _refreshing = false;
let _queue = [];

function processQueue(error, token = null) {
    _queue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
    _queue = [];
}

api.interceptors.response.use(
    res => res,
    async err => {
        const original = err.config;

        const isExpired = err.response?.status === 401
            && err.response?.data?.code === 'TOKEN_EXPIRED'
            && !original._retry;

        if (!isExpired) {
            if (err.response?.status === 401) {
                localStorage.removeItem('efes_token');
                localStorage.removeItem('efes_refresh_token');
            }
            return Promise.reject(err);
        }

        if (_refreshing) {
            return new Promise((resolve, reject) => {
                _queue.push({ resolve, reject });
            }).then(token => {
                original.headers.Authorization = `Bearer ${token}`;
                return api(original);
            });
        }

        original._retry = true;
        _refreshing = true;

        try {
            const refreshToken = localStorage.getItem('efes_refresh_token');
            if (!refreshToken) throw new Error('no refresh token');

            const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
            localStorage.setItem('efes_token', data.token);
            localStorage.setItem('efes_refresh_token', data.refreshToken);

            processQueue(null, data.token);
            original.headers.Authorization = `Bearer ${data.token}`;
            return api(original);
        } catch (refreshErr) {
            processQueue(refreshErr, null);
            localStorage.removeItem('efes_token');
            localStorage.removeItem('efes_refresh_token');
            return Promise.reject(refreshErr);
        } finally {
            _refreshing = false;
        }
    }
);

export default api;
