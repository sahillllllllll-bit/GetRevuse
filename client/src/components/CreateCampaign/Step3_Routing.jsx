import React from "react";
import { Star, ArrowRight, MessageSquare, ExternalLink, Bell, AlertCircle } from "lucide-react";

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, desc }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</span>
        {desc && <span className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{desc}</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors
          ${checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
          ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

// ─── Routing flow diagram ─────────────────────────────────────────────────────
function RoutingDiagram({ threshold }) {
  const stars = [1, 2, 3, 4, 5];
  const belowLabel = threshold === 1
    ? "No stars below threshold"
    : `${threshold - 1} ★ and below`;
  const aboveLabel = `${threshold} ★ and above`;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700
      bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800/30
      p-2.5 sm:p-3 md:p-5 flex flex-col gap-2 sm:gap-3 md:gap-4">

      <div className="flex items-center gap-2">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-400">
          How It Works
        </span>
      </div>

      <div className="flex flex-col items-center gap-1.5 sm:gap-2 md:gap-3">

        {/* Step 1 */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-xl
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm w-full max-w-xs">
          <span className="text-sm sm:base md:text-lg">📩</span>
          <span className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">
            Customer receives your message
          </span>
        </div>

        <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 rotate-90" />

        {/* Step 2 */}
        <div className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm w-full max-w-xs">
          <span className="text-base sm:text-lg">⭐</span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Customer rates their experience
          </span>
        </div>

        <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 rotate-90" />

        {/* Fork — column on mobile, row on sm+ */}
        <div className="w-full flex flex-col sm:flex-row items-stretch gap-1.5 sm:gap-2 md:gap-3">

          {/* Below threshold → feedback */}
          <div className={`flex-1 rounded-xl border-2 p-2 sm:p-2.5 md:p-3 flex flex-col gap-1 sm:gap-1.5 md:gap-2
            ${threshold > 1
              ? "border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20"
              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50"}`}>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm">😟</span>
              <span className="text-[10px] sm:text-xs font-bold text-orange-600 dark:text-orange-400 leading-tight">
                {belowLabel}
              </span>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {stars.filter((s) => s < threshold).map((s) => (
                <span key={s} className="flex items-center gap-0.5 text-[8px] sm:text-[9px] md:text-[10px] font-semibold
                  bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400
                  px-1 sm:px-1.5 py-0.5 rounded-md">
                  {s} <Star size={9} fill="currentColor" />
                </span>
              ))}
              {threshold === 1 && (
                <span className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-400">No ratings here</span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5 sm:mt-1 text-[9px] sm:text-xs text-orange-600 dark:text-orange-400 font-semibold">
              <MessageSquare size={10} className="sm:w-3 sm:h-3" />
              → Private Feedback Form
            </div>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-orange-500 dark:text-orange-500 leading-relaxed">
              Unhappy customers are redirected to your private feedback form so you can resolve issues before they leave a public review.
            </p>
          </div>

          {/* Horizontal divider on mobile, vertical on sm+ */}
          <div className="flex sm:hidden items-center">
            <div className="h-px w-full bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="hidden sm:flex items-center justify-center">
            <div className="w-px h-full bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* At/above threshold → review link */}
          <div className="flex-1 rounded-xl border-2 border-blue-300 dark:border-blue-600
            bg-blue-50 dark:bg-blue-900/20 p-2 sm:p-2.5 md:p-3 flex flex-col gap-1 sm:gap-1.5 md:gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm">😊</span>
              <span className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 leading-tight">
                {aboveLabel}
              </span>
            </div>
            <div className="flex flex-wrap gap-0.5">
              {stars.filter((s) => s >= threshold).map((s) => (
                <span key={s} className="flex items-center gap-0.5 text-[8px] sm:text-[9px] md:text-[10px] font-semibold
                  bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400
                  px-1 sm:px-1.5 py-0.5 rounded-md">
                  {s} <Star size={9} fill="currentColor" />
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-0.5 sm:mt-1 text-[9px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold">
              <ExternalLink size={10} className="sm:w-3 sm:h-3" />
              → Your Review Link
            </div>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] text-blue-500 leading-relaxed">
              Happy customers are sent directly to your public review page to leave a glowing review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Star threshold slider ────────────────────────────────────────────────────
function StarSlider({ value, onChange }) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Visual star row — smaller stars on mobile */}
      <div className="flex items-center justify-between gap-0 px-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="flex flex-col items-center gap-1 sm:gap-1.5 group transition flex-1 min-w-0"
          >
            <Star
              size={24}
              className={`sm:w-7 sm:h-7 transition-all ${
                s >= value
                  ? "text-yellow-400 fill-yellow-400 scale-110"
                  : "text-gray-300 dark:text-gray-600 fill-gray-300 dark:fill-gray-600"
              }`}
            />
            <span className={`text-[9px] sm:text-[10px] font-bold transition
              ${s === value
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-400 dark:text-gray-500"}`}>
              {s}★
            </span>
          </button>
        ))}
      </div>

      {/* Range input */}
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer
          bg-gray-200 dark:bg-gray-700 accent-blue-600"
      />

      {/* Summary pills — column on mobile, row on sm+ */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center sm:justify-center">
        <span className="flex items-center justify-center gap-1.5 text-xs font-semibold
          bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400
          border border-orange-200 dark:border-orange-700
          px-3 py-1.5 rounded-full text-center">
          <MessageSquare size={11} className="shrink-0" />
          Below {value}★ → Feedback Form
        </span>
        <span className="flex items-center justify-center gap-1.5 text-xs font-semibold
          bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400
          border border-blue-200 dark:border-blue-700
          px-3 py-1.5 rounded-full text-center">
          <ExternalLink size={11} className="shrink-0" />
          {value}★ and above → Review Link
        </span>
      </div>
    </div>
  );
}

// ─── Feedback form field toggles ──────────────────────────────────────────────
const FEEDBACK_FIELDS = [
  { key: "name",    label: "Name",         required: true  },
  { key: "email",   label: "Email",        required: false },
  { key: "phone",   label: "Phone",        required: false },
  { key: "message", label: "Message",      required: true  },
  { key: "rating",  label: "Star Rating",  required: false },
  { key: "order",   label: "Order / Ref #", required: false },
];

// ═══════════════════════════════════════════════════════════════════════════════
export default function Step3_Routing({ form, update, errors }) {
  const toggleField = (key) => {
    const current = form.feedbackFields || [];
    const next = current.includes(key)
      ? current.filter((f) => f !== key)
      : [...current, key];
    update("feedbackFields", next);
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 md:gap-5 lg:gap-6">

      {/* ── Threshold setting ─────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
            Review Routing Threshold
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
            Set the minimum star rating required to send customers to your public review page.
            Customers below this rating will be redirected to a private feedback form instead.
          </p>
        </div>

        <StarSlider
          value={form.threshold}
          onChange={(v) => update("threshold", v)}
        />
      </div>

      {/* ── Routing diagram ───────────────────────────────────── */}
      <RoutingDiagram threshold={form.threshold} />

      {/* ── Feedback form config ──────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-800/30 p-2.5 sm:p-3 md:p-5 flex flex-col gap-3 sm:gap-4 md:gap-5">

        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                Private Feedback Form
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Shown to customers who rate below your threshold
              </p>
            </div>
            <Toggle
              checked={form.feedbackFormEnabled}
              onChange={(v) => update("feedbackFormEnabled", v)}
              label=""
            />
          </div>
        </div>

        {form.feedbackFormEnabled && (
          <>
            {/* Fields — 2 cols on mobile, 3 on sm+ */}
            <Field label="Form Fields to Collect">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 mt-1">
                {FEEDBACK_FIELDS.map(({ key, label, required }) => {
                  const active = (form.feedbackFields || []).includes(key);
                  const locked = required;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={locked}
                      onClick={() => !locked && toggleField(key)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-xl border text-xs font-semibold transition
                        ${active
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"}
                        ${locked ? "opacity-60 cursor-default" : "hover:border-blue-300 cursor-pointer"}`}
                    >
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition
                        ${active ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600"}`}>
                        {active && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span className="truncate">{label}</span>
                      {locked && <span className="text-[9px] opacity-60 ml-auto shrink-0">req</span>}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Intro note */}
            <Field
              label="Form Introduction Message"
              hint="Shown at the top of the feedback form to explain why the customer is seeing it."
            >
              <textarea
                value={form.feedbackNote}
                onChange={(e) => update("feedbackNote", e.target.value)}
                rows={3}
                className="w-full px-3 sm:px-3.5 py-2.5 rounded-xl text-sm resize-none
                  bg-white dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  text-gray-800 dark:text-gray-200
                  placeholder-gray-400 dark:placeholder-gray-600
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </Field>

            {/* Notification */}
            <div className="flex flex-col gap-3 pt-1 border-t border-gray-200 dark:border-gray-700">
              <Toggle
                checked={form.notifyOnNegative}
                onChange={(v) => update("notifyOnNegative", v)}
                label="Notify me on negative feedback"
                desc="Get an email alert whenever a customer submits the feedback form"
              />

              {form.notifyOnNegative && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Notification Email
                  </label>
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-gray-400 shrink-0" />
                    <input
                      type="email"
                      value={form.notifyEmail}
                      onChange={(e) => update("notifyEmail", e.target.value)}
                      placeholder="you@yourbusiness.com"
                      className="flex-1 min-w-0 px-3 sm:px-3.5 py-2.5 rounded-xl text-sm
                        bg-white dark:bg-gray-800
                        border border-gray-200 dark:border-gray-700
                        text-gray-800 dark:text-gray-200
                        placeholder-gray-400 dark:placeholder-gray-600
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {!form.feedbackFormEnabled && (
          <div className="flex items-start gap-2 text-sm text-gray-400 py-1">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Feedback form is disabled. All customers will be sent directly to your review link regardless of rating.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}