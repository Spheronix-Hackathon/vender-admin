import axios from 'axios';

const getBaseUrl = () => {
    // 1. If NEXT_PUBLIC_API_URL is configured (e.g. deployed on Render/Vercel), always use it!
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    // 2. Client-side browser resolution
    if (typeof window !== 'undefined') {
        const { hostname, protocol } = window.location;
        // If accessed through HTTPS or Cloudflare tunnel, use relative path so Next.js proxies to backend without mixed content
        if (protocol === 'https:' || hostname.includes('trycloudflare.com') || hostname.includes('cloudflare')) {
            return '/api';
        }
        return `http://${hostname}:5050/api`;
    }
    // 3. Fallback
    return 'http://localhost:5050/api';
};

export const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptor for auth token if needed
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('admin_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Add interceptor for 401 Unauthorized handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('admin_token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
