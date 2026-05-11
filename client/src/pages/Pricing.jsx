import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import {
  Zap, Star, Building2, Sparkles, Check, X,
  Mail, MessageSquare, ChevronRight, AlertCircle,
  Calculator, Shield, Clock, RefreshCw,
} from "lucide-react";
import { usePayment } from "../hooks/usePayment";
import { useAuth } from "../context/AuthContext";

// ─── Constants ────────────────────────────────────────────────
const CREDITS_PER_DOLLAR = 30;
const MIN_CUSTOM         = 0.10;
const MAX_CUSTOM         = 999;

const CURRENCY_CONFIG = {
  USD: { symbol: "$",  rate: 1,     label: "$ USD" },
  INR: { symbol: "₹",  rate: 83.5,  label: "₹ INR" },
  EUR: { symbol: "€",  rate: 0.92,  label: "€ EUR" },
  GBP: { symbol: "£",  rate: 0.79,  label: "£ GBP" },
};

// const PLANS_DATA = [
//   {
//     id:          "starter",
//     name:        "Starter",
//     icon:        <Zap size={20} />,
//     color:       "gray",
//     amountUSD:   0,
//     originalUSD: null,
//     discountPct: 0,
//     credits:     100,
//     isFree:      true,
//     badge:       null,
//     description: "Perfect to get started",
//     features: [
//       { text: "100 credits one-time",     ok: true  },
//       { text: "Email campaigns",          ok: true  },
//       { text: "Review routing",           ok: true  },
//       { text: "1 active campaign",        ok: true  },
//       { text: "SMS messaging",            ok: false },
//       { text: "Advanced analytics",       ok: false },
//       { text: "Priority support",         ok: false },
//     ],
//   },
//   {
//     id:          "pro",
//     name:        "Pro",
//     icon:        <Star size={20} />,
//     color:       "blue",
//     amountUSD:   19.99,
//     originalUSD: 29.99,
//     discountPct: 33,
//     credits:     1000,
//     isFree:      false,
//     badge:       "Most Popular",
//     description: "For growing businesses",
//     features: [
//       { text: "1,000 credits",            ok: true },
//       { text: "Email + SMS campaigns",    ok: true },
//       { text: "Review routing funnel",    ok: true },
//       { text: "Unlimited campaigns",      ok: true },
//       { text: "Basic analytics",          ok: true },
//       { text: "Advanced analytics",       ok: false },
//       { text: "Priority support",         ok: false },
//     ],
//   },
//   {
//     id:          "growth",
//     name:        "Growth",
//     icon:        <Sparkles size={20} />,
//     color:       "purple",
//     amountUSD:   49.99,
//     originalUSD: 74.99,
//     discountPct: 33,
//     credits:     3000,
//     isFree:      false,
//     badge:       "Best Value",
//     description: "Scale your reviews",
//     features: [
//       { text: "3,000 credits",            ok: true },
//       { text: "Email + SMS campaigns",    ok: true },
//       { text: "Review routing funnel",    ok: true },
//       { text: "Unlimited campaigns",      ok: true },
//       { text: "Advanced analytics",       ok: true },
//       { text: "Custom branding",          ok: true },
//       { text: "Priority support",         ok: false },
//     ],
//   },
//   {
//     id:          "enterprise",
//     name:        "Enterprise",
//     icon:        <Building2 size={20} />,
//     color:       "dark",
//     amountUSD:   null,
//     originalUSD: null,
//     discountPct: 0,
//     credits:     null,
//     isFree:      false,
//     badge:       "Scale",
//     description: "Large teams & agencies",
//     features: [
//       { text: "Unlimited credits",        ok: true },
//       { text: "All channels",             ok: true },
//       { text: "White-label",              ok: true },
//       { text: "Custom integrations",      ok: true },
//       { text: "Advanced analytics",       ok: true },
//       { text: "Custom branding",          ok: true },
//       { text: "Dedicated manager",        ok: true },
//     ],
//   },
// ];

// ─── Color config ─────────────────────────────────────────────
// const COLORS = {
//   gray: {
//     card:    "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700",
//     icon:    "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
//     btn:     "bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white",
//     check:   "text-gray-500 dark:text-gray-400",
//     cross:   "text-gray-300 dark:text-gray-600",
//     text:    "text-gray-900 dark:text-white",
//     sub:     "text-gray-500 dark:text-gray-400",
//   },
//   blue: {
//     card:    "bg-blue-600 border-blue-600",
//     icon:    "bg-blue-500/30 text-white",
//     btn:     "bg-white hover:bg-blue-50 text-blue-700 font-bold",
//     check:   "text-blue-200",
//     cross:   "text-blue-300/40",
//     text:    "text-white",
//     sub:     "text-blue-100",
//   },
//   purple: {
//     card:    "bg-white dark:bg-gray-900 border-purple-400 dark:border-purple-600",
//     icon:    "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
//     btn:     "bg-purple-600 hover:bg-purple-500 text-white",
//     check:   "text-purple-500",
//     cross:   "text-gray-300 dark:text-gray-600",
//     text:    "text-gray-900 dark:text-white",
//     sub:     "text-gray-500 dark:text-gray-400",
//   },
//   dark: {
//     card:    "bg-gray-900 dark:bg-gray-950 border-gray-700",
//     icon:    "bg-gray-800 text-gray-300",
//     btn:     "bg-blue-600 hover:bg-blue-500 text-white",
//     check:   "text-blue-400",
//     cross:   "text-gray-600",
//     text:    "text-white",
//     sub:     "text-gray-400",
//   },
// };

// function formatPrice(usd, currency) {
//   if (usd === null) return "Custom";
//   if (usd === 0)    return "Free";
//   const cfg = CURRENCY_CONFIG[currency];
//   return `${cfg.symbol}${(usd * cfg.rate).toFixed(0)}`;
// }

// ─── Plan Card ─────────────────────────────────────────────────
// function PlanCard({ plan, currency, onSelect, loadingPlan }) {
//   const c         = COLORS[plan.color];
//   const isBlue    = plan.color === "blue";
//   const isDark    = plan.color === "dark";
//   const isLoading = loadingPlan === plan.id;
//   const colored   = isBlue || isDark;

//   return (
//     <div className={`relative flex flex-col rounded-3xl border-2 p-5 transition-all
//       hover:shadow-xl hover:-translate-y-0.5 duration-200
//       ${c.card}
//       ${plan.badge === "Most Popular" ? "shadow-2xl shadow-blue-500/20 scale-105 z-10" : ""}`}
//     >
//       {/* Badge */}
//       {plan.badge && (
//         <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2
//           px-4 py-1 rounded-full text-[11px] font-black whitespace-nowrap shadow
//           ${isBlue ? "bg-white text-blue-600" : "bg-blue-600 text-white"}`}>
//           {plan.badge}
//         </span>
//       )}

//       {/* Discount ribbon */}
//       {plan.discountPct > 0 && (
//         <div className={`absolute top-4 right-4 px-2 py-0.5 rounded-full
//           text-[10px] font-black
//           ${isBlue ? "bg-yellow-400 text-yellow-900" : "bg-red-100 dark:bg-red-900/30 text-red-600"}`}>
//           🔥 {plan.discountPct}% OFF
//         </div>
//       )}

//       {/* Icon + name */}
//       <div className="flex items-center gap-2.5 mb-4">
//         <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.icon}`}>
//           {plan.icon}
//         </div>
//         <div>
//           <h3 className={`text-base font-black ${c.text}`}>{plan.name}</h3>
//           <p className={`text-[11px] ${c.sub}`}>{plan.description}</p>
//         </div>
//       </div>

//       {/* Price */}
//       <div className="mb-4">
//         <div className="flex items-end gap-2 flex-wrap">
//           <span className={`text-3xl font-black ${c.text}`}>
//             {formatPrice(plan.amountUSD, currency)}
//           </span>
//           {plan.amountUSD > 0 && (
//             <div className="flex flex-col mb-1">
//               {plan.originalUSD && (
//                 <span className={`text-sm line-through ${c.cross}`}>
//                   {formatPrice(plan.originalUSD, currency)}
//                 </span>
//               )}
//               <span className={`text-[11px] ${c.sub}`}>/one-time</span>
//             </div>
//           )}
//         </div>

//         {plan.credits && (
//           <div className={`mt-2 inline-flex items-center gap-1 px-2.5 py-1
//             rounded-full text-[11px] font-bold
//             ${isBlue ? "bg-white/20 text-white" : isDark ? "bg-white/10 text-gray-300"
//             : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"}`}>
//             <Zap size={10} />
//             {plan.credits.toLocaleString()} credits
//           </div>
//         )}
//       </div>

//       {/* Divider */}
//       <div className={`h-px mb-4 ${colored ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800"}`} />

//       {/* Features */}
//       <ul className="flex flex-col gap-1.5 flex-1 mb-5">
//         {plan.features.map((f, i) => (
//           <li key={i} className={`flex items-center gap-2 text-[13px] ${c.sub}`}>
//             {f.ok
//               ? <Check size={13} className={`shrink-0 ${c.check}`} />
//               : <X     size={13} className={`shrink-0 ${c.cross}`} />
//             }
//             <span className={!f.ok ? "opacity-40" : ""}>{f.text}</span>
//           </li>
//         ))}
//       </ul>

//       {/* Button */}
//       <button
//         onClick={() => onSelect(plan)}
//         disabled={isLoading}
//         className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
//           text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed
//           ${c.btn}`}
//       >
//         {isLoading
//           ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Processing…</>
//           : plan.isFree        ? "Get Started Free"
//           : plan.amountUSD === null ? <>Contact Us <ChevronRight size={14} /></>
//           : <>Get {plan.name} <ChevronRight size={14} /></>
//         }
//       </button>
//     </div>
//   );
// }

// ─── Custom Amount Card ────────────────────────────────────────
function CustomCard({ currency, onCheckout, loading, error, setError, isAuthenticated }) {
  const [amount,  setAmount]  = useState("");
  const [touched, setTouched] = useState(false);

  const cfg         = CURRENCY_CONFIG[currency];
  const usdAmount   = parseFloat(amount) / cfg.rate || 0;
  const credits     = Math.floor(usdAmount * CREDITS_PER_DOLLAR);
  const emails      = credits;
  const sms         = Math.floor(credits / 2);
  const isValid     = usdAmount >= MIN_CUSTOM && usdAmount <= MAX_CUSTOM;
  const showErr     = touched && !!amount && !isValid;

  const handleChange = (v) => {
    setAmount(v);
    setTouched(true);
    if (error) setError('');
  };

  return (
    <div className="rounded-3xl border-2 border-dashed border-blue-300 dark:border-blue-700
      bg-gradient-to-br from-blue-50/80 to-indigo-50/60
      dark:from-blue-900/10 dark:to-indigo-900/10 p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30
          text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <Calculator size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">Custom Amount</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pay exactly what you need</p>
        </div>
      </div>

      {/* Rate pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { icon: <Mail size={11} className="text-blue-500" />,        label: `${cfg.symbol}1 = ${Math.floor(CREDITS_PER_DOLLAR * cfg.rate)} emails` },
          { icon: <MessageSquare size={11} className="text-green-500" />, label: `${cfg.symbol}1 = ${Math.floor((CREDITS_PER_DOLLAR / 2) * cfg.rate)} SMS` },
        ].map((p, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs font-semibold
            bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400
            px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
            {p.icon} {p.label}
          </span>
        ))}
      </div>

      {/* Input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Enter Amount ({currency})
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">
            {cfg.symbol}
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="0"
            min={MIN_CUSTOM * cfg.rate}
            max={MAX_CUSTOM * cfg.rate}
            step="1"
            disabled={!isAuthenticated}
            className={`w-full pl-10 pr-4 py-3.5 rounded-2xl text-2xl font-black
              bg-white dark:bg-gray-800 border-2 transition
              text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700
              focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
              ${showErr ? "border-red-400" : "border-gray-200 dark:border-gray-700"}`}
          />
        </div>
        {showErr && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={12} />
            {usdAmount < MIN_CUSTOM
              ? `Minimum is ${cfg.symbol}${Math.ceil(MIN_CUSTOM * cfg.rate)}`
              : `Maximum is ${cfg.symbol}${Math.floor(MAX_CUSTOM * cfg.rate)}`}
          </p>
        )}
        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={12} /> {error}
          </p>
        )}
      </div>

      {/* Live calculation */}
      {credits > 0 && isValid && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">You'll get</p>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-center">
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{credits.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500">Total Credits</p>
            </div>
            <span className="text-gray-300 dark:text-gray-600 text-xl font-bold">=</span>
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <Mail size={13} className="text-blue-500" />
                <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{emails.toLocaleString()}</p>
              </div>
              <p className="text-[11px] text-gray-500">Emails</p>
            </div>
            <span className="text-gray-300 dark:text-gray-600 text-sm">or</span>
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <MessageSquare size={13} className="text-green-500" />
                <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{sms.toLocaleString()}</p>
              </div>
              <p className="text-[11px] text-gray-500">SMS</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-4 text-[10px] text-gray-400">
            <span>≈ {cfg.symbol}{(usdAmount * cfg.rate / emails).toFixed(4)} per email</span>
            <span>≈ {cfg.symbol}{(usdAmount * cfg.rate / sms).toFixed(4)} per SMS</span>
          </div>
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={() => isValid && onCheckout(usdAmount)}
        disabled={!isValid || loading || !isAuthenticated}
        title={!isAuthenticated ? "Please log in to proceed" : ""}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
          bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition
          disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
      >
        {loading ? (
          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Opening payment…</>
        ) : !isAuthenticated ? (
          <>Log in to Pay</>
        ) : (
         <>Pay {amount ? `${cfg.symbol}${parseFloat(amount).toFixed(0)}` : "Now"} <ChevronRight size={15} /></>
        )}
      </button>

      <p className="text-center text-[10px] text-gray-400">
        Min {cfg.symbol}{Math.ceil(MIN_CUSTOM * cfg.rate)} · Max {cfg.symbol}{Math.floor(MAX_CUSTOM * cfg.rate)} · Secure via Razorpay
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Pricing Page
// ═══════════════════════════════════════════════════════════════
export default function Pricing() {
  const navigate                            = useNavigate();
  const { user: authUser } = useAuth(); // ✅ Check AuthContext for user state
  const [currency, setCurrency]             = useState("USD");
  const [loadingPlan, setLoadingPlan]       = useState(null);
  const [authError, setAuthError]           = useState(""); // ✅ Track auth errors
  const { checkout, loading, error, setError } = usePayment();

  // Get current Firebase user for prefill
  const auth  = getAuth();
  const user  = auth.currentUser;

  // ✅ Better checkout handler with auth check
  const handlePlanSelect = async (plan) => {
    if (plan.isFree)          { navigate("/dashboard"); return; }
    if (plan.amountUSD === null) { navigate("/contact"); return; }

    // ✅ Check if user is authenticated
    if (!authUser) {
      setAuthError("Please log in to proceed with payment");
      return;
    }

    setLoadingPlan(plan.id);
    setAuthError("");

    await checkout({
      plan:         plan.id,
      currency,
      userEmail:    user?.email    || '',
      userName:     user?.displayName || '',
      onSuccess:    (data) => {
        setLoadingPlan(null);
        navigate('/payment/success', { state: data });
      },
      onFailure:    (data) => {
        setLoadingPlan(null);
        // ✅ Check if failure is due to auth
        if (data?.message?.includes('401') || data?.message?.includes('Unauthorized') || data?.code === '401') {
          setAuthError("Session expired. The token has been refreshed — please try again.");
          // Don't auto-redirect — token should be refreshed automatically
        } else {
          navigate('/payment/failed', { state: data });
        }
      },
      onDismiss:    () => {
        setLoadingPlan(null);
      },
    });

    setLoadingPlan(null);
  };

  // ✅ Better custom checkout handler with auth check
  const handleCustomCheckout = async (usdAmount) => {
    // ✅ Check if user is authenticated
    if (!authUser) {
      setAuthError("Please log in to proceed with payment");
      return;
    }

    setLoadingPlan("custom");
    setAuthError("");

    await checkout({
      plan:         'custom',
      customAmount: usdAmount,
      currency:     'USD',
      userEmail:    user?.email       || '',
      userName:     user?.displayName || '',
      onSuccess:    (data) => {
        setLoadingPlan(null);
        navigate('/payment/success', { state: data });
      },
      onFailure:    (data) => {
        setLoadingPlan(null);
        // ✅ Check if failure is due to auth
        if (data?.message?.includes('401') || data?.message?.includes('Unauthorized') || data?.code === '401') {
          setAuthError("Session expired. The token has been refreshed — please try again.");
          // Don't auto-redirect — token should be refreshed automatically
        } else {
          navigate('/payment/failed', { state: data });
        }
      },
      onDismiss:    () => setLoadingPlan(null),
    });

    setLoadingPlan(null);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
            bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400
            text-xs font-bold border border-blue-200 dark:border-blue-800 mb-4">
            <Sparkles size={12} /> Limited Time — 33% OFF Pro & Growth
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-3">
            Simple, Transparent{" "}
            <span className="text-blue-600">Pricing</span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            Pay only for what you use. No hidden fees. Credits never expire.
          </p>
        </div>

        {/* ── Currency switcher ───────────────────────────── */}
        <div className="flex justify-center mb-10">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
            {Object.entries(CURRENCY_CONFIG).map(([cur, cfg]) => (
              <button
                key={cur}
                onClick={() => setCurrency(cur)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition
                  ${currency === cur
                    ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Plan cards ──────────────────────────────────── */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 items-start">
          {PLANS_DATA.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currency={currency}
              onSelect={handlePlanSelect}
              loadingPlan={loadingPlan}
            />
          ))}
        </div> */}

        {/* ── Auth Error Alert ─────────────────────────────– */}
        {authError && (
          <div className="max-w-2xl mx-auto mb-6 flex items-start gap-3 p-4 rounded-2xl
            bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">{authError}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button
                  onClick={() => {
                    setAuthError("");
                    // User can retry — token should be refreshed automatically now
                  }}
                  className="text-sm font-semibold text-red-600 dark:text-red-500 hover:underline"
                >
                  Try Again
                </button>
                <span className="text-red-400 dark:text-red-600">•</span>
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm font-semibold text-red-600 dark:text-red-500 hover:underline"
                >
                  Log In Again
                </button>
                <span className="text-red-400 dark:text-red-600">•</span>
                <button
                  onClick={() => window.location.reload()}
                  className="text-sm font-semibold text-red-600 dark:text-red-500 hover:underline"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Login Prompt for Non-Authenticated Users ────────── */}
        {!authUser && (
          <div className="max-w-2xl mx-auto mb-6 flex items-start gap-3 p-4 rounded-2xl
            bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                Log in or sign up to purchase credits
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => navigate('/login')}
                  className="text-sm font-semibold text-blue-600 dark:text-blue-500 hover:underline"
                >
                  Log In
                </button>
                <span className="text-blue-400 dark:text-blue-600">or</span>
                <button
                  onClick={() => navigate('/signup')}
                  className="text-sm font-semibold text-blue-600 dark:text-blue-500 hover:underline"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Custom card ─────────────────────────────────── */}
        <div className="max-w-2xl mx-auto mb-10">
          <CustomCard
            currency={currency}
            onCheckout={handleCustomCheckout}
            loading={loadingPlan === "custom"}
            error={authError || (loadingPlan !== "custom" ? "" : error)}
            setError={setError}
            isAuthenticated={!!authUser}
          />
        </div>

        {/* ── How credits work ─────────────────────────────── */}
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50
          border border-gray-200 dark:border-gray-700 p-5 mb-10">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Zap size={15} className="text-blue-500" /> How credits work
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Mail size={16} className="text-blue-500" />,           label: "1 Email send",     cost: "1 credit"  },
              { icon: <MessageSquare size={16} className="text-green-500" />, label: "1 SMS send",       cost: "2 credits" },
              { icon: <Zap size={16} className="text-purple-500" />,          label: "Email + SMS",      cost: "3 credits" },
              { icon: <Clock size={16} className="text-gray-500" />,          label: "Credits expire",   cost: "Never ✅"  },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 p-3 text-center
                bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                {item.icon}
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                <p className="text-xs font-black text-gray-800 dark:text-gray-200">{item.cost}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust badges ─────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-5 text-xs text-gray-400 mb-12">
          {[
            { icon: <Shield size={13} />,     text: "Secure payment via Razorpay" },
            { icon: <Check size={13} />,      text: "No subscription — pay once"  },
            { icon: <Zap size={13} />,        text: "Credits added instantly"     },
            { icon: <RefreshCw size={13} />,  text: "30-day refund guarantee"     },
          ].map((t, i) => (
            <span key={i} className="flex items-center gap-1.5">{t.icon} {t.text}</span>
          ))}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6
          flex flex-wrap gap-6 justify-center text-sm text-gray-400">
          {[
            { label: "Privacy Policy",     href: "/privacy"  },
            { label: "Terms & Conditions", href: "/terms"    },
            { label: "Refund Policy",      href: "/refund"   },
            { label: "Contact Us",         href: "/contact"  },
          ].map((l) => (
            <a key={l.label} href={l.href}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}