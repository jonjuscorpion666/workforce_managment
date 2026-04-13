import axios from 'axios';

const nurseApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach nurse JWT from its own localStorage key — never touches access_token
nurseApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nurse_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401 using nurse_refresh_token → redirects to portal login on failure
nurseApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('nurse_refresh_token');
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/refresh`,
          { refreshToken: refresh },
        );
        localStorage.setItem('nurse_access_token', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return nurseApi(original);
      } catch {
        localStorage.removeItem('nurse_access_token');
        localStorage.removeItem('nurse_refresh_token');
        window.location.href = '/portal/login';
      }
    }
    return Promise.reject(err);
  },
);

export default nurseApi;
