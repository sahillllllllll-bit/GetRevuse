// ════════════════════════════════════════════════════════════════
// hooks/useFeedback.js
// ════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export function useFeedback(initialFilters = {}) {
  const [submissions, setSubmissions] = useState([]);
  const [stats,       setStats]       = useState(null);
  const [pagination,  setPagination]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [filters,     setFilters]     = useState({ page: 1, limit: 20, ...initialFilters });

  const fetchFeedback = useCallback(async (f = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });
      const { data } = await api.get(`/api/feedback?${params}`);
      setSubmissions(data.submissions);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchFeedback(); }, [filters]);

  const updateFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  const goToPage = (page) =>
    setFilters((prev) => ({ ...prev, page }));

  const markStatus = async (submissionId, status, ownerNote) => {
    await api.patch(`/api/feedback/${submissionId}/status`, { status, ownerNote });
    setSubmissions((prev) =>
      prev.map((s) => s.submissionId === submissionId ? { ...s, status } : s)
    );
  };

  return {
    submissions, stats, pagination, loading, error,
    filters, updateFilter, goToPage, markStatus, refresh: fetchFeedback,
  };
}