import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap, Star, Building2, Sparkles,
  Check, X, Mail, MessageSquare,
  ChevronRight, AlertCircle, Calculator,
} from "lucide-react";
import { usePayment } from "../hooks/usePayment";

// ─── Constants ────────────────────────────────────────────────
const CREDITS_PER_DOLLAR = 35;
const MIN_CUSTOM         = 5;
const MAX_CUSTOM         = 999;

const CURRENCY_CONFIG = {
  USD: { symbol: "$",  rate: 1,      locale: "en-US" },
  INR: { symbol: "₹",  rate: 83.5,   locale: "en-IN" },
  EUR: { symbol: "€",  rate: 0.92,   locale: "de-DE" },
  GBP: { symbol: "£",  rate: 0.79,   locale: "en-GB" },
};

// ─── Plans definition ─────────────────────────────────────────
// const PLANS_DATA = [
//   {
//     id:          "starter",
//     name:        "Starter",
//     icon:        <Zap size={22} />,
//     color:       "gray",
//     amountUSD:   0,
//     originalUSD: null,
//     discountPct: 0,
//     credits:     100,
//     isFree:      true,
//     badge:       null,
//     description: "Perfect to get started",
//     features: [
//       { text: "100 credits one-time",          ok: true  },
//       { text: "Email campaigns only",           ok: true  },
//       { text: "Basic review routing",           ok: true  },
//       { text: "1 campaign",                     ok: true  },
//       { text: "Slow delivery speed",            ok: true  },
//       { text: "SMS messaging",                  ok: false },
//       { text: "Advanced analytics",             ok: false },
//       { text: "Priority support",               ok: false },
//     ],
//   },
//   {
//     id:          "pro",
//     name:        "Pro",
//     icon:        <Star size={22} />,
//     color:       "blue",
//     amountUSD:   19.99,
//     originalUSD: 29.99,
//     discountPct: 33,
//     credits:     1000,
//     isFree:      false,
//     badge:       "Most Popular",
//     description: "Great for small businesses",
//     features: [
//       { text: "1,000 credits / month",          ok: true },
//       { text: "Email + SMS campaigns",          ok: true },
//       { text: "Feedback + review funnel",       ok: true },
//       { text: "Unlimited campaigns",            ok: true },
//       { text: "Fast delivery speed",            ok: true },
//       { text: "Basic analytics",                ok: true },
//       { text: "Advanced analytics",             ok: false },
//       { text: "Priority support",               ok: false },
//     ],
//   },
//   {
//     id:          "growth",
//     name:        "Growth",
//     icon:        <Sparkles size={22} />,
//     color:       "purple",
//     amountUSD:   49.99,
//     originalUSD: 74.99,
//     discountPct: 33,
//     credits:     3000,
//     isFree:      false,
//     badge:       "Best Value",
//     description: "Scale your review strategy",
//     features: [
//       { text: "3,000 credits / month",          ok: true },
//       { text: "Email + SMS campaigns",          ok: true },
//       { text: "Feedback + review funnel",       ok: true },
//       { text: "Unlimited campaigns",            ok: true },
//       { text: "Priority delivery speed",        ok: true },
//       { text: "Advanced analytics",             ok: true },
//       { text: "Custom branding",                ok: true },
//       { text: "Priority support",               ok: false },
//     ],
//   },
//   {
//     id:          "enterprise",
//     name:        "Enterprise",
//     icon:        <Building2 size={22} />,
//     color:       "dark",
//     amountUSD:   null,
//     originalUSD: null,
//     discountPct: 0,
//     credits:     null,
//     isFree:      false,
//     badge:       "Scale",
//     description: "For large teams & agencies",
//     features: [
//       { text: "Unlimited credits",              ok: true },
//       { text: "All channels",                   ok: true },
//       { text: "White-label options",            ok: true },
//       { text: "Custom integrations",            ok: true },
//       { text: "Dedicated infrastructure",       ok: true },
//       { text: "Advanced analytics",             ok: true },
//       { text: "Custom branding",                ok: true },
//       { text: "Dedicated account manager",      ok: true },
//     ],
//   },
// ];

// // ─── Color maps ───────────────────────────────────────────────
// const COLORS = {
//   gray: {
//     bg:      "bg-gray-50 dark:bg-gray-800/30",
//     border:  "border-gray-200 dark:border-gray-700",
//     icon:    "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
//     btn:     "bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white",
//     badge:   "",
//     check:   "text-gray-500",
//   },
//   blue: {
//     bg:      "bg-blue-600",
//     border:  "border-blue-600",
//     icon:    "bg-blue-500/30 text-white",
//     btn:     "bg-white hover:bg-blue-50 text-blue-700 font-bold",
//     badge:   "bg-white text-blue-600",
//     check:   "text-blue-200",
//     text:    "text-white",
//   },
//   purple: {
//     bg:      "bg-white dark:bg-gray-900",
//     border:  "border-purple-400 dark:border-purple-600",
//     icon:    "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
//     btn:     "bg-purple-600 hover:bg-purple-500 text-white",
//     badge:   "bg-purple-600 text-white",
//     check:   "text-purple-500",
//   },
//   dark: {
//     bg:      "bg-gray-900 dark:bg-gray-950",
//     border:  "border-gray-700",
//     icon:    "bg-gray-800 text-gray-300",
//     btn:     "bg-blue-600 hover:bg-blue-500 text-white",
//     badge:   "bg-blue-500 text-white",
//     check:   "text-blue-400",
//     text:    "text-white",
//   },
// };

// ─── Format price ──────────────────────────────────────────────
function formatPrice(usd, currency) {
  const cfg    = CURRENCY_CONFIG[currency];
  const amount = (usd * cfg.rate).toFixed(2);
  return `${cfg.symbol}${amount}`;
}

// ─── Plan Card ─────────────────────────────────────────────────
// function PlanCard({ plan, currency, onSelect, loadingPlan }) {
  // const c       = COLORS[plan.color];
  // const isBlue  = plan.color === "blue";
  // const isDark  = plan.color === "dark";
  // const isLoading = loadingPlan === plan.id;

  // const textColor   = (isBlue || isDark) ? "text-white" : "text-gray-900 dark:text-white";
  // const subColor    = (isBlue || isDark) ? "opacity-80 text-white" : "text-gray-500 dark:text-gray-400";
  // const featureText = (isBlue || isDark) ? "text-white/90" : "text-gray-600 dark:text-gray-400";
  // const crossColor  = (isBlue || isDark) ? "text-white/40" : "text-gray-300 dark:text-gray-600";

  // return (
    // <div className={`relative flex flex-col rounded-3xl border-2 p-6 transition-all duration-200
    //   hover:shadow-xl hover:-translate-y-1 overflow-y-auto
    //   ${c.bg} ${c.border}
    //   ${plan.badge === "Most Popular" ? "shadow-2xl shadow-blue-500/20 scale-105 z-10" : ""}`}
    // >
      {/* Badge */}
      // {plan.badge && (
      //   <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1
      //     rounded-full text-xs font-bold whitespace-nowrap shadow-sm ${c.badge ||
      //     "bg-blue-600 text-white"}`}>
      //     {plan.badge}
      //   </span>
      // )}

      {/* Discount ribbon */}
      // {plan.discountPct > 0 && (
      //   <div className={`absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1
      //     rounded-full text-[10px] font-black
      //     ${isBlue ? "bg-yellow-400 text-yellow-900" : "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"}`}>
      //     🔥 {plan.discountPct}% OFF
      //   </div>
      // )}

      {/* Icon + name */}
      // <div className="flex items-center gap-3 mb-4">
      //   <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${c.icon}`}>
      //     {plan.icon}
      //   </div>
      //   <div>
      //     <h3 className={`text-lg font-black ${textColor}`}>{plan.name}</h3>
      //     <p className={`text-xs ${subColor}`}>{plan.description}</p>
      //   </div>
      // </div>

      {/* Price */}
      // <div className="mb-5">
      //   {plan.isFree ? (
      //     <p className={`text-4xl font-black ${textColor}`}>Free</p>
      //   ) : plan.amountUSD === null ? (
      //     <p className={`text-4xl font-black ${textColor}`}>Custom</p>
      //   ) : (
      //     <div className="flex items-end gap-2 flex-wrap">
      //       <p className={`text-4xl font-black ${textColor}`}>
      //         {formatPrice(plan.amountUSD, currency)}
      //       </p>
      //       <div className="flex flex-col mb-1">
      //         {plan.originalUSD && (
      //           <span className={`text-sm line-through ${crossColor}`}>
      //             {formatPrice(plan.originalUSD, currency)}
      //           </span>
      //         )}
      //         <span className={`text-xs ${subColor}`}>/month</span>
      //       </div>
      //     </div>
      //   )}

        {/* Credits badge */}
        {/* {plan.credits && (
          <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
            ${isBlue ? "bg-white/20 text-white" : isDark ? "bg-white/10 text-gray-300" :
            "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"}`}>
            <Zap size={11} />
            {plan.credits.toLocaleString()} credits
            <span className={`ml-1 opacity-70 font-normal`}>
              = {plan.credits} emails or {Math.floor(plan.credits / 2)} SMS
            </span>
          </div>
        )} */}
      // </div>

      {/* Divider */}
      {/* <div className={`h-px mb-4 ${isBlue || isDark ? "bg-white/20" : "bg-gray-200 dark:bg-gray-700"}`} /> */}

      {/* Features */}
      {/* <ul className="flex flex-col gap-2 flex-1 mb-6">
        {plan.features.map((f, i) => (
          <li key={i} className={`flex items-center gap-2.5 text-sm ${featureText}`}>
            {f.ok ? (
              <Check size={15} className={`shrink-0 ${c.check}`} />
            ) : (
              <X size={15} className={`shrink-0 ${crossColor}`} />
            )}
            <span className={!f.ok ? `opacity-40` : ""}>{f.text}</span>
          </li>
        ))}
      </ul> */}

      {/* CTA button */}
      {/* <button
        onClick={() => onSelect(plan)}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl
          text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed
          ${c.btn}`}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Redirecting…
          </>
        ) : plan.isFree ? (
          <> Get Started Free </>
        ) : plan.amountUSD === null ? (
          <>Contact Us <ChevronRight size={15} /></>
        ) : (
          <>Get {plan.name} <ChevronRight size={15} /></>
        )}
      </button> */}
//     </div>
//   );
// }

// ─── Custom Amount Calculator Card ────────────────────────────
function CustomCard({ currency, onCheckout, loading, error, setError }) {
  const [amount,   setAmount]   = useState("");
  const [touched,  setTouched]  = useState(false);

  const cfg          = CURRENCY_CONFIG[currency];
  const usdAmount    = parseFloat(amount) / cfg.rate || 0;
  const credits      = Math.floor(usdAmount * CREDITS_PER_DOLLAR);
  const emails       = credits;
  const smsMessages  = Math.floor(credits / 2);
  const isValid      = usdAmount >= MIN_CUSTOM && usdAmount <= MAX_CUSTOM;
  const showError    = touched && amount && !isValid;

  const handleChange = (val) => {
    setAmount(val);
    setTouched(true);
    if (error) setError('');
  };

  const handlePay = () => {
    if (!isValid) return;
    onCheckout('custom', usdAmount);
  };

  return (
    <div className="rounded-3xl border-2 border-dashed border-blue-300 dark:border-blue-700
      bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10
      p-6 flex flex-col gap-5">

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

      {/* Rate info */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold
          bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400
          px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
          <Mail size={11} className="text-blue-500" />
          {cfg.symbol}1 = {Math.floor(CREDITS_PER_DOLLAR * cfg.rate)} emails
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold
          bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400
          px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
          <MessageSquare size={11} className="text-green-500" />
          {cfg.symbol}1 = {Math.floor((CREDITS_PER_DOLLAR / 2) * cfg.rate)} SMS
        </div>
      </div>

      {/* Amount input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-widest
          text-gray-500 dark:text-gray-400">
          Enter Amount ({currency})
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold
            text-gray-500 dark:text-gray-400">
            {cfg.symbol}
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="0.00"
            min={MIN_CUSTOM * cfg.rate}
            max={MAX_CUSTOM * cfg.rate}
            step="1"
            className={`w-full pl-10 pr-4 py-3.5 rounded-2xl text-xl font-bold
              bg-white dark:bg-gray-800 border-2 transition
              text-gray-900 dark:text-white
              placeholder-gray-300 dark:placeholder-gray-600
              focus:outline-none focus:border-blue-500
              ${showError
                ? "border-red-400 dark:border-red-500"
                : "border-gray-200 dark:border-gray-700"}`}
          />
        </div>

        {/* Validation message */}
        {showError && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={12} />
            {usdAmount < MIN_CUSTOM
              ? `Minimum is ${cfg.symbol}${(MIN_CUSTOM * cfg.rate).toFixed(0)}`
              : `Maximum is ${cfg.symbol}${(MAX_CUSTOM * cfg.rate).toFixed(0)}`}
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200
          dark:border-gray-700 p-4 flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
            You'll get
          </p>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-center">
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {credits.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Total Credits</p>
            </div>
            <div className="text-gray-300 dark:text-gray-600 text-2xl">=</div>
            <div className="text-center">
              <div className="flex items-center gap-1.5">
                <Mail size={14} className="text-blue-500" />
                <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                  {emails.toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-gray-500">Emails</p>
            </div>
            <div className="text-gray-300 dark:text-gray-600 text-lg">or</div>
            <div className="text-center">
              <div className="flex items-center gap-1.5">
                <MessageSquare size={14} className="text-green-500" />
                <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                  {smsMessages.toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-gray-500">SMS</p>
            </div>
          </div>
          {/* Per unit cost */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700
            flex gap-3 flex-wrap text-[10px] text-gray-400">
            <span>= {cfg.symbol}{(usdAmount / emails * cfg.rate).toFixed(4)} per email</span>
            <span>= {cfg.symbol}{(usdAmount / smsMessages * cfg.rate).toFixed(4)} per SMS</span>
          </div>
        </div>
      )}

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={!isValid || loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
          text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition
          disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Redirecting to payment…
          </>
        ) : (
          <>
            Pay {amount ? `${cfg.symbol}${parseFloat(amount).toFixed(2)}` : "Now"}
            <ChevronRight size={15} />
          </>
        )}
      </button>

      <p className="text-center text-[10px] text-gray-400">
        Min {cfg.symbol}{(MIN_CUSTOM * cfg.rate).toFixed(0)} · Max {cfg.symbol}{(MAX_CUSTOM * cfg.rate).toFixed(0)} · Secure payment via LemonSqueezy
      </p>
    </div>
  );
}

// ─── Credit calculator row ─────────────────────────────────────
function CreditInfo() {
  return (
    <div className="mt-8 rounded-2xl bg-gray-50 dark:bg-gray-800/50
      border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <Zap size={15} className="text-blue-500" /> How credits work
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Mail size={16} className="text-blue-500" />,        label: "Email Send",   cost: "1 credit"  },
          { icon: <MessageSquare size={16} className="text-green-500" />, label: "SMS Send", cost: "2 credits" },
          { icon: <Zap size={16} className="text-purple-500" />,       label: "Both (Email+SMS)", cost: "3 credits" },
          { icon: <Check size={16} className="text-gray-500" />,       label: "Credits expire", cost: "Never"   },
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 p-3
            bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
            {item.icon}
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
            <p className="text-xs font-black text-gray-800 dark:text-gray-200">{item.cost}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Pricing Component
// ═══════════════════════════════════════════════════════════════
export default function Pricing() {
  const navigate                                         = useNavigate();
  const [currency, setCurrency]                          = useState("USD");
  const [loadingPlan, setLoadingPlan]                    = useState(null);
  const { checkout, loading, error, setError }           = usePayment();

  const handleSelect = async (plan) => {
    if (plan.isFree) { navigate("/dashboard"); return; }
    if (plan.amountUSD === null) { navigate("/contact"); return; }
    setLoadingPlan(plan.id);
    await checkout(plan.id);
    setLoadingPlan(null);
  };

  const handleCustomCheckout = async (plan, amount) => {
    setLoadingPlan("custom");
    await checkout(plan, amount);
    setLoadingPlan(null);
  };

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
            bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400
            text-xs font-bold border border-blue-200 dark:border-blue-800 mb-4">
            <Sparkles size={12} /> Limited Time — 33% OFF Pro & Growth
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-4">
            Simple, Transparent
            <span className="text-blue-600"> Pricing</span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Pay only for what you use. No hidden fees. Credits never expire.
          </p>
        </div>

        {/* ── Currency switcher ───────────────────────────────── */}
        <div className="flex justify-center mb-10">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
            {Object.keys(CURRENCY_CONFIG).map((cur) => (
              <button
                key={cur}
                onClick={() => setCurrency(cur)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition
                  ${currency === cur
                    ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
              >
                {CURRENCY_CONFIG[cur].symbol} {cur}
              </button>
            ))}
          </div>
        </div>

        {/* ── Pricing cards ───────────────────────────────────── */}
        {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start mb-10">
          {PLANS_DATA.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currency={currency}
              onSelect={handleSelect}
              loadingPlan={loadingPlan}
            />
          ))}
        </div> */}

        {/* ── Custom amount card ──────────────────────────────── */}
        <div className="max-w-2xl mx-auto mb-10">
          <CustomCard
            currency={currency}
            onCheckout={handleCustomCheckout}
            loading={loadingPlan === "custom"}
            error={loadingPlan !== "custom" ? error : ""}
            setError={setError}
          />
        </div>

        {/* ── Credits info ────────────────────────────────────── */}
        <CreditInfo />

        {/* ── Trust badges ────────────────────────────────────── */}
        <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs text-gray-400">
          {[
            "🔒 Secure payments via LemonSqueezy",
            "✅ No subscription — pay once",
            "⚡ Credits added instantly",
            
          ].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>

        {/* ── Footer links ────────────────────────────────────── */}
        <div className="mt-16 border-t border-gray-200 dark:border-gray-800 pt-6
          flex flex-wrap gap-6 justify-center text-sm text-gray-400">
          {[
            { label: "Privacy Policy",    href: "/privacy"  },
            { label: "Terms & Conditions",href: "/terms"    },
            { label: "Refund Policy",     href: "/refund"   },
            { label: "Contact Us",        href: "/contact"  },
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