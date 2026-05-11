import axios from 'axios';
import { getAuth } from 'firebase/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000,
});

// ─── Request interceptor ──────────────────────────────────────
// ✅ DO NOT use getIdToken(true) on every request
// That force-refreshes token on every call = repeated backend calls
// + blocks Razorpay popup from opening
api.interceptors.request.use(async (config) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      // false = use cached token, only refresh when Firebase decides it's expired
      const token = await user.getIdToken(false);
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.error('[api] Token error:', err.message);
    delete config.headers.Authorization;
  }
  return config;
});

// ─── Response interceptor ─────────────────────────────────────
let isRetrying = false;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;

    // ── Retry ONCE on 401 with force-refreshed token ──────────
    if (status === 401 && !isRetrying && !err.config?._retried) {
      isRetrying          = true;
      err.config._retried = true;

      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const freshToken = await user.getIdToken(true); // force refresh only here
          err.config.headers.Authorization = `Bearer ${freshToken}`;
          isRetrying = false;
          return api(err.config);
        }
      } catch (retryErr) {
        console.error('[api] Token retry failed:', retryErr.message);
      }

      isRetrying = false;
    }

    // ── Redirect only on protected routes ─────────────────────
    if (status === 401) {
      const protectedRoutes = ['/dashboard', '/campaigns', '/feedback', '/credits', '/payment/history'];
      const isProtected     = protectedRoutes.some((r) => window.location.pathname.startsWith(r));
      const isAuthPage      = ['/login', '/signup'].some((r) => window.location.pathname.includes(r));
      if (isProtected && !isAuthPage) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;