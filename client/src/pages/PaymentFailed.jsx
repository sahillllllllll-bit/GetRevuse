import { useLocation, useNavigate } from 'react-router-dom';
import {
  XCircle, RefreshCw, ArrowLeft, AlertCircle,
  Phone, Mail, MessageSquare,
} from 'lucide-react';

// ─── Common failure reasons + user-friendly messages ──────────
const FAILURE_MESSAGES = {
  'BAD_REQUEST_ERROR':         'Payment was declined. Please try a different card.',
  'GATEWAY_ERROR':             'Payment gateway error. Please try again.',
  'SERVER_ERROR':              'Something went wrong. Please try again in a few minutes.',
  'NETWORK_ERROR':             'Network error during payment. Your card was not charged.',
  'Payment modal closed':      'You closed the payment window. No charges were made.',
  'Payment cancelled':         'Payment was cancelled. No charges were made.',
  'SIGNATURE_MISMATCH':        'Payment verification failed. Please contact support.',
  'Insufficient funds':        'Insufficient funds. Please try a different card.',
  'Card declined':             'Your card was declined. Please try a different card.',
};

function getFriendlyMessage(reason, code) {
  if (!reason && !code) return 'Your payment could not be completed. No charges were made.';
  for (const [key, msg] of Object.entries(FAILURE_MESSAGES)) {
    if (reason?.includes(key) || code?.includes(key)) return msg;
  }
  return reason || 'Payment failed. Please try again.';
}

export default function PaymentFailed() {
  const location = useLocation();
  const navigate = useNavigate();
  const state    = location.state || {};

  const { message, code, error } = state;
  const friendlyMsg = getFriendlyMessage(message, code);
  const isDismissed = message?.includes('closed') || message?.includes('cancelled');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10
      bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md">

        {/* ── Main card ────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl
          border border-gray-200 dark:border-gray-800 overflow-hidden">

          {/* Red/yellow top bar */}
          <div className={`h-2 ${isDismissed
            ? "bg-gradient-to-r from-yellow-400 to-orange-400"
            : "bg-gradient-to-r from-red-400 to-rose-500"}`}
          />

          <div className="p-8 flex flex-col items-center gap-6">

            {/* Icon */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center
              ${isDismissed
                ? "bg-yellow-100 dark:bg-yellow-900/30"
                : "bg-red-100 dark:bg-red-900/30"}`}>
              {isDismissed
                ? <span className="text-4xl">😕</span>
                : <XCircle size={40} className="text-red-500" />
              }
            </div>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                {isDismissed ? "Payment Cancelled" : "Payment Failed"}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {friendlyMsg}
              </p>
            </div>

            {/* Important notice */}
            <div className="w-full flex items-start gap-3 p-4 rounded-2xl
              bg-green-50 dark:bg-green-900/20
              border border-green-200 dark:border-green-800">
              <AlertCircle size={16} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-700 dark:text-green-400">
                  No charges were made
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5 leading-relaxed">
                  Your card or bank account has not been charged. You can safely try again.
                </p>
              </div>
            </div>

            {/* Error code if available */}
            {code && !isDismissed && (
              <div className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800
                border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-400">
                  Error code: <span className="font-mono text-gray-600 dark:text-gray-400">{code}</span>
                </p>
              </div>
            )}

            {/* What to try */}
            {!isDismissed && (
              <div className="w-full">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                  Things to try
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    "Try a different card (Visa, Mastercard, Rupay)",
                    "Check your card has international payments enabled",
                    "Ensure sufficient balance/credit limit",
                    "Try UPI payment instead",
                    "Clear browser cache and try again",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                      <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/30
                        text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={() => navigate('/pricing')}
                className="w-full flex items-center justify-center gap-2 py-3
                  bg-blue-600 hover:bg-blue-500 text-white rounded-xl
                  font-bold text-sm transition"
              >
                <RefreshCw size={15} /> Try Again
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-center gap-2 py-2.5
                  border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-800 rounded-xl
                  text-sm font-semibold text-gray-600 dark:text-gray-300
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <ArrowLeft size={14} /> Back to Dashboard
              </button>
            </div>

            {/* Support */}
            <div className="w-full pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 text-center mb-3">
                Still having issues? Contact support
              </p>
              <div className="flex justify-center gap-4">
                <a
                  href="mailto:support@getrevuse.com"
                  className="flex items-center gap-1.5 text-xs text-blue-600
                    dark:text-blue-400 hover:underline"
                >
                  <Mail size={12} /> Email Support
                </a>
                <a
                  href="https://wa.me/your-number"
                  className="flex items-center gap-1.5 text-xs text-green-600
                    dark:text-green-400 hover:underline"
                >
                  <MessageSquare size={12} /> WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          If you were charged but see this page, contact us immediately.
        </p>
      </div>
    </div>
  );
}