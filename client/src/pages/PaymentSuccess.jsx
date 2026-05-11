import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Zap, ArrowRight, Mail,
  MessageSquare, Copy, Check, Download,
} from 'lucide-react';
import { usePayment } from '../hooks/usePayment';

export default function PaymentSuccess() {
  const location                    = useLocation();
  const navigate                    = useNavigate();
  const { getPaymentStatus }        = usePayment();
  const [data,    setData]          = useState(location.state || null);
  const [loading, setLoading]       = useState(!location.state);
  const [copied,  setCopied]        = useState(false);

  // If navigated directly (not from payment flow), fetch from API
  useEffect(() => {
    if (location.state) {
      setData(location.state);
      setLoading(false);
      return;
    }

    // Try to get paymentId from URL params
    const params    = new URLSearchParams(window.location.search);
    const paymentId = params.get('pid');

    if (!paymentId) {
      navigate('/pricing');
      return;
    }

    // Poll for payment status
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const result = await getPaymentStatus(paymentId);

      if (result?.payment?.status === 'paid') {
        setData(result);
        setLoading(false);
      } else if (attempts >= 10) {
        // After 10 attempts (20s) — show partial success
        setData({ timedOut: true, paymentId });
        setLoading(false);
      } else {
        setTimeout(poll, 2000);
      }
    };

    poll();
  }, []);

  const copyPaymentId = () => {
    const pid = data?.payment?.rzpPaymentId || data?.paymentId || '';
    navigator.clipboard.writeText(pid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4
        bg-gray-50 dark:bg-gray-950 p-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent
          rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Confirming your payment…
          </p>
          <p className="text-xs text-gray-400 mt-1">
            This usually takes a few seconds
          </p>
        </div>
      </div>
    );
  }

  // Timed out — payment may still process via webhook
  if (data?.timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl
          border border-gray-200 dark:border-gray-800 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30
            flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">
            Payment Processing
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Your payment is being processed. Credits will be added to your account
            within a few minutes. Check your dashboard shortly.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center gap-2 py-3
                bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition"
            >
              Go to Dashboard <ArrowRight size={15} />
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold
                text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
            >
              Back to Pricing
            </button>
          </div>
        </div>
      </div>
    );
  }

  const credits        = data?.credits          || data?.payment?.creditsAdded || 0;
  const balance        = data?.currentBalance   || 0;
  const plan           = data?.planName         || data?.payment?.plan         || '';
  const amountUSD      = data?.displayAmount    || data?.payment?.amountUSD    || 0;
  const displayCurr    = data?.displayCurrency  || 'USD';
  const rzpPaymentId   = data?.payment?.rzpPaymentId || '';
  const emailCredits   = credits;
  const smsCredits     = Math.floor(credits / 2);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10
      bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md">

        {/* ── Success card ────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl
          border border-gray-200 dark:border-gray-800 overflow-hidden">

          {/* Green top bar */}
          <div className="h-2 bg-gradient-to-r from-green-400 to-emerald-500" />

          <div className="p-8 flex flex-col items-center gap-6">

            {/* Icon */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30
                flex items-center justify-center">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-full
                flex items-center justify-center">
                <Zap size={14} className="text-white" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                Payment Successful! 🎉
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your credits have been added instantly
              </p>
            </div>

            {/* Credits added box */}
            <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-50
              dark:from-blue-900/20 dark:to-indigo-900/20
              rounded-2xl p-5 border border-blue-100 dark:border-blue-800">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3 text-center">
                Credits Added
              </p>
              <div className="flex items-center justify-center gap-2 mb-3">
                <Zap size={22} className="text-blue-500" />
                <span className="text-5xl font-black text-blue-600 dark:text-blue-400">
                  +{credits.toLocaleString()}
                </span>
              </div>

              {/* What you can do */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3
                border-t border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800
                  rounded-xl p-2.5 border border-gray-100 dark:border-gray-700">
                  <Mail size={14} className="text-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">
                      {emailCredits.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-400">Emails</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800
                  rounded-xl p-2.5 border border-gray-100 dark:border-gray-700">
                  <MessageSquare size={14} className="text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">
                      {smsCredits.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-gray-400">SMS</p>
                  </div>
                </div>
              </div>

              {/* New balance */}
              <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-800
                flex items-center justify-between">
                <span className="text-xs text-gray-500">New balance</span>
                <span className="text-sm font-black text-gray-800 dark:text-gray-200 flex items-center gap-1">
                  <Zap size={12} className="text-blue-500" />
                  {balance.toLocaleString()} credits
                </span>
              </div>
            </div>

            {/* Payment summary */}
            <div className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4
              border border-gray-100 dark:border-gray-700">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                Payment Summary
              </p>
              {[
                { label: "Plan",    value: plan ? `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan` : '—' },
                { label: "Amount",  value: amountUSD ? `${displayCurr} ${amountUSD}` : '—' },
                { label: "Status",  value: "✅ Paid" },
              ].map((row) => (
                <div key={row.label}
                  className="flex justify-between items-center py-1.5
                    border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-xs text-gray-500">{row.label}</span>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    {row.value}
                  </span>
                </div>
              ))}

              {/* Payment ID */}
              {rzpPaymentId && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-gray-500">Payment ID</span>
                  <button
                    onClick={copyPaymentId}
                    className="flex items-center gap-1.5 text-xs font-mono
                      text-gray-500 hover:text-blue-600 transition"
                  >
                    {rzpPaymentId.slice(0, 16)}…
                    {copied
                      ? <Check size={11} className="text-green-500" />
                      : <Copy size={11} />}
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-center gap-2 py-3
                  bg-blue-600 hover:bg-blue-500 text-white rounded-xl
                  font-bold text-sm transition shadow-md shadow-blue-500/20"
              >
                Go to Dashboard <ArrowRight size={15} />
              </button>
              <button
                onClick={() => navigate('/campaigns/new')}
                className="w-full flex items-center justify-center gap-2 py-2.5
                  border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-800 rounded-xl
                  text-sm font-semibold text-gray-600 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Create Campaign Now ✨
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          A payment receipt has been sent to your email
        </p>
      </div>
    </div>
  );
}