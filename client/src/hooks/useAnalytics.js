import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

// ─── Simple frontend cache ────────────────────────────────────
const frontendCache = new Map();

function getCached(key, ttlMs = 60000) {
  const entry = frontendCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) { frontendCache.delete(key); return null; }
  return entry.data;
}

function setCached(key, data) {
  frontendCache.set(key, { data, ts: Date.now() });
}

// ═══════════════════════════════════════════════════════════════
// useDashboardAnalytics — overview stats + daily chart
// ═══════════════════════════════════════════════════════════════
export function useDashboardAnalytics() {
  const [overview,    setOverview]    = useState(null);
  const [dailyStats,  setDailyStats]  = useState([]);
  const [quota,       setQuota]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [fromCache,   setFromCache]   = useState(false);

  const fetch = useCallback(async (force = false) => {
    setLoading(true);
    setError('');

    try {
      const cacheKey = 'dashboard:overview';

      if (!force) {
        const cached = getCached(cacheKey, 60000); // 1 min
        if (cached) {
          setOverview(cached.overview);
          setDailyStats(cached.dailyStats);
          setQuota(cached.quota);
          setFromCache(true);
          setLoading(false);
          return;
        }
      }

      const [overviewRes, dailyRes, quotaRes] = await Promise.allSettled([
        api.get('/api/analytics/dashboard'),
        api.get('/api/analytics/dashboard/daily?days=30'),
        api.get('/api/analytics/quota'),
      ]);

      const ov = overviewRes.status === 'fulfilled' ? overviewRes.value.data?.overview    : null;
      const ds = dailyRes.status    === 'fulfilled' ? dailyRes.value.data?.dailyStats     : [];
      const qt = quotaRes.status    === 'fulfilled' ? quotaRes.value.data?.quota          : null;

      setOverview(ov);
      setDailyStats(ds || []);
      setQuota(qt);
      setFromCache(false);

      setCached(cacheKey, { overview: ov, dailyStats: ds, quota: qt });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { overview, dailyStats, quota, loading, error, fromCache, refresh: () => fetch(true) };
}

// ═══════════════════════════════════════════════════════════════
// useCampaignAnalytics — single campaign full stats
// ═══════════════════════════════════════════════════════════════
export function useCampaignAnalytics(campaignId) {
  const [stats,      setStats]      = useState(null);
  const [daily,      setDaily]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [fromCache,  setFromCache]  = useState(false);

  const fetch = useCallback(async (force = false) => {
    if (!campaignId) return;
    setLoading(true);
    setError('');

    try {
      const cacheKey = `campaign:stats:${campaignId}`;

      if (!force) {
        const cached = getCached(cacheKey, 120000); // 2 min
        if (cached) {
          setStats(cached.stats);
          setDaily(cached.daily);
          setFromCache(true);
          setLoading(false);
          return;
        }
      }

      const [statsRes, dailyRes] = await Promise.allSettled([
        api.get(`/api/analytics/${campaignId}/stats`),
        api.get(`/api/analytics/${campaignId}/daily?days=14`),
      ]);

      const s = statsRes.status === 'fulfilled' ? statsRes.value.data  : null;
      const d = dailyRes.status === 'fulfilled' ? dailyRes.value.data?.dailyStats : [];

      setStats(s);
      setDaily(d || []);
      setFromCache(s?.fromCache || false);
      setCached(cacheKey, { stats: s, daily: d });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load campaign stats');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, daily, loading, error, fromCache, refresh: () => fetch(true) };
}

// ═══════════════════════════════════════════════════════════════
// useCampaignCustomers — paginated customer list
// ═══════════════════════════════════════════════════════════════
export function useCampaignCustomers(campaignId) {
  const [customers,   setCustomers]   = useState([]);
  const [pagination,  setPagination]  = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [filters,     setFilters]     = useState({
    page: 1, limit: 20,
    status: '', routing: '', search: '',
    opened: '', clicked: '', feedback: '',
  });

  const fetchCustomers = useCallback(async (f = filters, force = false) => {
    if (!campaignId) return;
    setLoading(true);
    setError('');

    try {
      const cacheKey = `campaign:customers:${campaignId}:${JSON.stringify(f)}`;

      if (!force) {
        const cached = getCached(cacheKey, 180000); // 3 min
        if (cached) {
          setCustomers(cached.customers);
          setPagination(cached.pagination);
          setLoading(false);
          return;
        }
      }

      const params = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });

      const { data } = await api.get(`/api/analytics/${campaignId}/customers?${params}`);

      setCustomers(data.customers);
      setPagination(data.pagination);
      setCached(cacheKey, { customers: data.customers, pagination: data.pagination });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [campaignId, filters]);

  useEffect(() => { fetchCustomers(); }, [filters]);

  const updateFilter = (key, value) => {
    const next = { ...filters, [key]: value, page: key !== 'page' ? 1 : value };
    setFilters(next);
  };

  const exportCSV = async () => {
    try {
      const res = await api.get(`/api/analytics/${campaignId}/export`, {
        responseType: 'blob',
      });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `campaign_${campaignId}_customers.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Export failed. Please try again.');
    }
  };

  return {
    customers, pagination, loading, error, filters,
    updateFilter,
    refresh: () => fetchCustomers(filters, true),
    exportCSV,
  };
}