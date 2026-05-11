import { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, Clock, RefreshCw,
  Zap, Download, ChevronRight, Receipt,
  AlertCircle,
} from 'lucide-react';
import { usePayment } from '../hooks/usePayment';
import { useNavigate } from 'react-router-dom';

// ─── Status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
  paid: {
    label: 'Paid',
    icon:  <CheckCircle2 size={14} />,
    cls:   'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  created: {
    label: 'Pending',
    icon:  <Clock size={14} />,
    cls:   'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  },
  failed: {
    label: 'Failed',
    icon:  <XCircle size={14} />,
    cls:   'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  refunded: {
    label: 'Refunded',
    icon:  <RefreshCw size={14} />,
    cls:   'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  },
};

// ─── Plan color dots ──────────────────────────────────────────
const PLAN_COLORS = {
  starter:    'bg-gray-400',
  pro:        'bg-blue-500',
  growth:     'bg-purple-500',
  custom:     'bg-indigo-500',
  enterprise: 'bg-yellow-500',
};

// ─── Single payment row ────────────────────────────────────────
function PaymentRow({ payment }) {
  const statusCfg = STATUS_CONFIG[payment.status] || STATUS_CONFIG.created;
  const planDot   = PLAN_COLORS[payment.plan]     || 'bg-gray-400';

  const formattedDate = new Date(payment.createdAt).toLocaleDateString('en-US', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });

  const formattedTime = new Date(payment.createdAt).toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-700 rounded-2xl
      hover:shadow-sm transition flex-wrap sm:flex-nowrap">

      {/* Plan icon */}
      <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        flex items-center justify-center shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full ${planDot}`} />
      </div>

      {/* Plan + date */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">
            {payment.plan} Plan
          </p>
          {payment.isCustomAmount && (
            <span className="text-[10px] px-2 py-0.5 rounded-full
              bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400
              border border-indigo-200 dark:border-indigo-700">
              Custom
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {formattedDate} · {formattedTime}
        </p>
        {payment.rzpPaymentId && (
          <p className="text-[10px] font-mono text-gray-300 dark:text-gray-600 mt-0.5 truncate">
            {payment.rzpPaymentId}
          </p>
        )}
      </div>

      {/* Credits */}
      {payment.status === 'paid' && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
          bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800
          text-blue-600 dark:text-blue-400 shrink-0">
          <Zap size={12} />
          <span className="text-xs font-black">+{payment.creditsAdded?.toLocaleString()}</span>
        </div>
      )}

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="text-sm font-black text-gray-800 dark:text-gray-200">
          {payment.amountUSD ? `$${payment.amountUSD?.toFixed(2)}` : '—'}
        </p>
        {payment.discountApplied && payment.originalAmountUSD && (
          <p className="text-[10px] text-gray-400 line-through">
            ${payment.originalAmountUSD?.toFixed(2)}
          </p>
        )}
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
        border text-xs font-semibold shrink-0 ${statusCfg.cls}`}>
        {statusCfg.icon}
        {statusCfg.label}
      </div>
    </div>
  );
}

// ─── Stats summary ─────────────────────────────────────────────
function PaymentStats({ payments }) {
  const paid     = payments.filter((p) => p.status === 'paid');
  const total    = paid.reduce((s, p) => s + (p.amountUSD || 0), 0);
  const credits  = paid.reduce((s, p) => s + (p.creditsAdded || 0), 0);
  const refunded = payments.filter((p) => p.status === 'refunded').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: "Total Spent",     value: `$${total.toFixed(2)}`,         sub: `${paid.length} payments`,           color: "blue"   },
        { label: "Credits Bought",  value: credits.toLocaleString(),        sub: "Total credits purchased",           color: "purple" },
        { label: "Successful",      value: paid.length,                     sub: "Completed payments",                color: "green"  },
        { label: "Refunds",         value: refunded,                        sub: refunded ? "Contact support" : "None", color: "gray" },
      ].map((s) => {
        const colors = {
          blue:   "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
          purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
          green:  "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
          gray:   "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
        };
        return (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl
            border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Payment History Page
// ═══════════════════════════════════════════════════════════════
export default function PaymentHistory() {
  const navigate              = useNavigate();
  const { getHistory }        = usePayment();
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [filter,   setFilter]   = useState('all'); // all, paid, failed

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await getHistory();
        setPayments(list);
      } catch {
        setError('Failed to load payment history');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = payments.filter((p) => {
    if (filter === 'all')  return true;
    return p.status === filter;
  });

  return (
    <div className="p-4 md:p-6 text-gray-800 dark:text-gray-200 w-full max-w-4xl mx-auto">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt size={20} className="text-blue-500" /> Payment History
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            All your credit purchases
          </p>
        </div>
        <button
          onClick={() => navigate('/pricing')}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl
            text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition"
        >
          Buy More Credits <ChevronRight size={15} />
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────── */}
      {!loading && payments.length > 0 && <PaymentStats payments={payments} />}

      {/* ── Filter tabs ─────────────────────────────────── */}
      {!loading && payments.length > 0 && (
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mb-5">
          {['all', 'paid', 'failed', 'refunded'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition
                ${filter === f
                  ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-2xl
          bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700
          text-red-600 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800
            flex items-center justify-center text-3xl">
            💳
          </div>
          <div>
            <p className="font-bold text-gray-700 dark:text-gray-300">No payments yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Purchase credits to start sending campaigns
            </p>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition"
          >
            View Pricing <ChevronRight size={15} />
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          No {filter} payments found
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((payment) => (
            <PaymentRow key={payment.paymentId || payment._id} payment={payment} />
          ))}
        </div>
      )}

      {/* ── Support note ─────────────────────────────────── */}
      {!loading && payments.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-6">
          Questions about a payment?{' '}
          <a href="mailto:support@getrevuse.com"
            className="text-blue-500 hover:underline">
            Contact support
          </a>
        </p>
      )}
    </div>
  );
}