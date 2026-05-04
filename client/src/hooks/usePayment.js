import { useState, useCallback } from 'react';
import api from '../utils/api';

export function usePayment() {
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [plans,     setPlans]     = useState(null);
  const [plansLoading, setPlansLoading] = useState(false);

  // ── Fetch plan config from backend ───────────────────────────
  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const { data } = await api.get('/api/payments/plans');
      setPlans(data);
    } catch {
      // Fall back to hardcoded plans if API fails
    } finally {
      setPlansLoading(false);
    }
  }, []);

  // ── Create checkout and redirect ──────────────────────────────
  const checkout = useCallback(async (plan, customAmount = null) => {
    setLoading(true);
    setError('');

    try {
      const body = { plan };
      if (plan === 'custom' && customAmount) {
        body.customAmount = parseFloat(customAmount);
      }

      const { data } = await api.post('/api/payments/checkout', body);

      if (!data.checkoutUrl) {
        throw new Error('No checkout URL returned');
      }

      // Redirect to LemonSqueezy checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to start checkout. Please try again.';
      setError(msg);
      setLoading(false);
    }
  }, []);

  // ── Verify payment after redirect ────────────────────────────
  const verifyPayment = useCallback(async (paymentId) => {
    try {
      const { data } = await api.get(`/api/payments/verify?pid=${paymentId}`);
      return data;
    } catch {
      return null;
    }
  }, []);

  return {
    checkout,
    fetchPlans,
    verifyPayment,
    loading,
    error,
    plans,
    plansLoading,
    setError,
  };
}