import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../utils/api';

// ─── Pre-load Razorpay script once globally ───────────────────
// Done at module level so it loads as soon as usePayment is imported
// This ensures the script is ready before user clicks Pay
let scriptState = 'idle'; // 'idle' | 'loading' | 'loaded' | 'failed'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    // Already loaded
    if (scriptState === 'loaded' || window.Razorpay) {
      scriptState = 'loaded';
      resolve(true);
      return;
    }

    // Already loading — poll until ready
    if (scriptState === 'loading') {
      const check = setInterval(() => {
        if (window.Razorpay) {
          clearInterval(check);
          scriptState = 'loaded';
          resolve(true);
        }
        if (scriptState === 'failed') {
          clearInterval(check);
          resolve(false);
        }
      }, 100);
      return;
    }

    // Start loading
    scriptState = 'loading';
    const script    = document.createElement('script');
    script.src      = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async    = true;
    script.onload   = () => { scriptState = 'loaded';  resolve(true);  };
    script.onerror  = () => { scriptState = 'failed';  resolve(false); };
    document.body.appendChild(script);
  });
}

// Pre-load immediately when this module is first imported
loadRazorpayScript();

// ─── Hook ─────────────────────────────────────────────────────
export function usePayment() {
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [plans,        setPlans]        = useState(null);
  const [plansLoading, setPlansLoading] = useState(false);

  // Use ref for razorpayKey so it's always current inside callbacks
  const razorpayKeyRef = useRef(
    import.meta.env.VITE_RAZORPAY_KEY_ID || ''
  );

  // ── Fetch plans ───────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const { data } = await api.get('/api/payments/plans');
      setPlans(data);
      if (data.razorpayKeyId) {
        razorpayKeyRef.current = data.razorpayKeyId;
      }
    } catch {
      // Silent fail — env key is used as fallback
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // ── Main checkout ─────────────────────────────────────────
  const checkout = useCallback(async ({
    plan,
    customAmount = null,
    currency     = 'USD',
    userEmail    = '',
    userName     = '',
    onSuccess,
    onFailure,
    onDismiss,
  }) => {
    setLoading(true);
    setError('');

    try {
      // ── 1. Ensure Razorpay SDK is ready ─────────────────
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError('Payment SDK failed to load. Please check your connection.');
        setLoading(false);
        return;
      }

      // ── 2. Validate key ──────────────────────────────────
      const key = razorpayKeyRef.current;
      if (!key) {
        setError('Payment not configured. Please refresh the page.');
        setLoading(false);
        return;
      }

      // ── 3. Create order (ONE backend call) ───────────────
      let orderData;
      try {
        const { data } = await api.post('/api/payments/create-order', {
          plan,
          customAmount,
          currency,
        });
        orderData = data;
      } catch (err) {
        setLoading(false);
        const msg  = err.response?.data?.message || 'Failed to create payment order. Please try again.';
        const code = err.response?.status === 401 ? '401' : 'ORDER_FAILED';
        setError(msg);
        onFailure?.({ message: msg, code });
        return;
      }

      const {
        orderId,
        paymentId,
        amountPaise,
        credits     = 0,
        planName    = plan,
        displayAmount,
        displayCurrency = 'USD',
      } = orderData;

      // ── 4. Stop loading BEFORE opening modal ─────────────
      // Important: if loading stays true, UI is frozen while modal is open
      setLoading(false);

      // ── 5. Build Razorpay options ────────────────────────
      const options = {
        key,
        amount:      amountPaise,
        currency:    'INR',
        name:        'GetRevUse',
        description: `${planName} — ${credits.toLocaleString()} Credits`,
        order_id:    orderId,
        image:       '/logo.png',
        prefill: {
          name:  userName  || '',
          email: userEmail || '',
        },
        theme:  { color: '#2563eb' },
        notes: {
          plan,
          credits:       String(credits),
          displayAmount: `${displayCurrency} ${displayAmount}`,
        },

        // ── Success: payment completed ─────────────────────
        handler: async (response) => {
          setLoading(true);
          try {
            const { data: verifyData } = await api.post('/api/payments/verify', {
              rzpOrderId:   response.razorpay_order_id,
              rzpPaymentId: response.razorpay_payment_id,
              rzpSignature: response.razorpay_signature,
              paymentId,
            });

            setLoading(false);
            onSuccess?.({
              ...verifyData,
              orderId,
              paymentId,
              plan,
              planName,
              credits,
              displayAmount,
              displayCurrency,
            });
          } catch (err) {
            setLoading(false);
            const msg = err.response?.data?.message || 'Payment verification failed';
            setError(msg);
            onFailure?.({ message: msg, paymentId });
          }
        },

        modal: {
          // ── User closed modal ──────────────────────────
          ondismiss: async () => {
            setLoading(false);
            try {
              await api.post('/api/payments/failed', {
                paymentId,
                rzpOrderId: orderId,
                reason:     'Payment modal closed by user',
              });
            } catch (_) {}
            onDismiss?.({ paymentId, orderId });
          },
          confirm_close: true,
          escape:        false,
        },
      };

      // ── 6. Open Razorpay ─────────────────────────────────
      const rzp = new window.Razorpay(options);

      // Payment failed inside modal
      rzp.on('payment.failed', async (response) => {
        setLoading(false);
        const reason = response.error?.description || 'Payment failed';
        const code   = response.error?.code        || 'PAYMENT_FAILED';
        try {
          await api.post('/api/payments/failed', {
            paymentId,
            rzpOrderId: orderId,
            reason,
            code,
          });
        } catch (_) {}
        setError(reason);
        onFailure?.({ message: reason, code, paymentId, error: response.error });
      });

      rzp.open();

    } catch (err) {
      setLoading(false);
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(msg);
      onFailure?.({ message: msg });
    }
  }, []); // no deps needed — uses ref for key

  // ── Helpers ───────────────────────────────────────────────
  const getPaymentStatus = useCallback(async (paymentId) => {
    try {
      const { data } = await api.get(`/api/payments/status/${paymentId}`);
      return data;
    } catch { return null; }
  }, []);

  const getHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/api/payments/history');
      return data.payments || [];
    } catch { return []; }
  }, []);

  return {
    checkout,
    fetchPlans,
    getPaymentStatus,
    getHistory,
    loading,
    error,
    plans,
    plansLoading,
    razorpayKey: razorpayKeyRef.current,
    setError,
  };
}