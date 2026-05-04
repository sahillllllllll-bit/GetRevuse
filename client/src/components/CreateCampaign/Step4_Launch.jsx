import React from "react";
import {
  AlertCircle, Calendar, Send, User, Mail, Phone,
  Users, Star, MessageSquare, ExternalLink, CheckCircle2,
} from "lucide-react";
import { REVIEW_PLATFORMS, SCHEDULE_OPTIONS } from "../../utils/campaignHelpers";

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, required, error, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {label} {required && <span className="text-blue-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500 mt-0.5">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({ error, icon, ...props }) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </span>
      )}
      <input
        {...props}
        className={`w-full py-2.5 rounded-xl text-sm
          bg-gray-50 dark:bg-gray-800/80
          border ${error
            ? "border-red-400 dark:border-red-500 focus:ring-red-400"
            : "border-gray-200 dark:border-gray-700 focus:ring-blue-500"}
          text-gray-800 dark:text-gray-200
          placeholder-gray-400 dark:placeholder-gray-600
          focus:outline-none focus:ring-2 focus:border-transparent transition
          ${icon ? "pl-10 pr-3.5" : "px-3.5"}`}
      />
    </div>
  );
}

// ─── Schedule option card ─────────────────────────────────────────────────────
function ScheduleCard({ opt, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-xl border-2 transition text-center
        ${selected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
        }`}
    >
      <span className="text-lg sm:text-xl">{opt.icon}</span>
      <span className={`text-[10px] sm:text-xs font-semibold leading-tight
        ${selected ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"}`}>
        {opt.label}
      </span>
    </button>
  );
}

// ─── Summary row ──────────────────────────────────────────────────────────────
function SummaryRow({ icon, label, value, accent }) {
  const accentCls = {
    blue:   "text-blue-600 dark:text-blue-400",
    green:  "text-green-600 dark:text-green-400",
    orange: "text-orange-500 dark:text-orange-400",
    purple: "text-purple-600 dark:text-purple-400",
  };
  return (
    <div className="flex items-start gap-2 sm:gap-3 py-2 sm:py-2.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <span className={`mt-0.5 shrink-0 w-4 h-4 sm:w-auto sm:h-auto flex items-center justify-center ${accentCls[accent] || "text-gray-400"}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 mt-0.5 break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── Campaign summary card ────────────────────────────────────────────────────
function CampaignSummary({ form }) {
  const platform = REVIEW_PLATFORMS.find((p) => p.value === form.platform);
  const scheduleOpt = SCHEDULE_OPTIONS.find((s) => s.value === form.schedule);

  const channelLabel = {
    email: "Email Only",
    sms:   "SMS Only",
    both:  "Email + SMS",
  }[form.channel] || form.channel;

  const routingDesc = form.feedbackFormEnabled
    ? `Below ${form.threshold}★ → Feedback Form · ${form.threshold}★ and above → Review Link`
    : `All ratings → Review Link (feedback form disabled)`;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700
      bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/40 dark:to-gray-800/20
      overflow-hidden">

      {/* Header */}
      <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 bg-white dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700
        flex items-center gap-2">
        <CheckCircle2 size={14} className="sm:w-4 sm:h-4 text-green-500" />
        <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200">Campaign Summary</span>
        <span className="ml-auto text-[10px] sm:text-xs text-gray-400">Review before launching</span>
      </div>

      {/* Rows */}
      <div className="px-3 sm:px-5 py-1">
        <SummaryRow icon={<User size={15} />}           label="Business"         value={form.businessName}          accent="blue"   />
        <SummaryRow icon={<ExternalLink size={15} />}   label="Review Platform"  value={platform?.label}            accent="blue"   />
        <SummaryRow icon={<Send size={15} />}           label="Channel"          value={channelLabel}               accent="purple" />
        <SummaryRow icon={<Users size={15} />}          label="Recipients"       value={`${form.customers.length} customers`} accent="green" />
        <SummaryRow icon={<Star size={15} />}           label="Routing"          value={routingDesc}                accent="orange" />
        <SummaryRow icon={<MessageSquare size={15} />}  label="Feedback Form"    value={form.feedbackFormEnabled ? "Enabled" : "Disabled"} accent="orange" />
        <SummaryRow icon={<Calendar size={15} />}       label="Schedule"
          value={form.schedule === "custom" ? form.customDateTime : scheduleOpt?.label} accent="blue" />
        <SummaryRow icon={<Mail size={15} />}           label="Sender"
          value={[form.senderName, form.senderEmail, form.senderPhone].filter(Boolean).join(" · ")} accent="green" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Step4_Launch({ form, update, errors }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5 md:gap-6">

      {/* ── Campaign Name ─────────────────────────────────────── */}
      <Field label="Campaign Name" required error={errors.campaignName}
        hint="An internal name to identify this campaign in your dashboard.">
        <Input
          value={form.campaignName}
          onChange={(e) => update("campaignName", e.target.value)}
          placeholder={`e.g. ${form.businessName || "My Business"} — May 2025`}
          error={errors.campaignName}
          icon={<Send size={14} />}
        />
      </Field>

      {/* ── Sender Details ────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700
        bg-gray-50 dark:bg-gray-800/30 p-3 sm:p-4 md:p-5 flex flex-col gap-3 sm:gap-3 md:gap-4">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200">Sender Details</h3>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
            How your messages will appear to customers
          </p>
        </div>

        <Field label="Sender / Display Name" required error={errors.senderName}>
          <Input
            value={form.senderName}
            onChange={(e) => update("senderName", e.target.value)}
            placeholder={form.businessName || "Your Business Name"}
            error={errors.senderName}
            icon={<User size={14} />}
          />
        </Field>
      </div>

      {/* ── Schedule ──────────────────────────────────────────── */}
      <Field label="Send Schedule" required>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 sm:gap-2 md:gap-2">
          {SCHEDULE_OPTIONS.map((opt) => (
            <ScheduleCard
              key={opt.value}
              opt={opt}
              selected={form.schedule === opt.value}
              onClick={() => update("schedule", opt.value)}
            />
          ))}
        </div>

        {form.schedule === "custom" && (
          <div className="mt-3">
            <Field label="Pick Date & Time" error={errors.customDateTime}>
              <input
                type="datetime-local"
                value={form.customDateTime}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => update("customDateTime", e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm
                  bg-gray-50 dark:bg-gray-800/80
                  border ${errors.customDateTime
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-200 dark:border-gray-700 focus:ring-blue-500"}
                  text-gray-800 dark:text-gray-200
                  focus:outline-none focus:ring-2 focus:border-transparent transition`}
              />
            </Field>
          </div>
        )}

        {/* Info pills */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
          {form.schedule === "now" && (
            <span className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400
              bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700
              px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
              ⚡ Messages will be queued immediately after you click Launch
            </span>
          )}
          {form.schedule === "tomorrow" && (
            <span className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400
              bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700
              px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
              🌅 Will send at 9:00 AM tomorrow (your timezone)
            </span>
          )}
        </div>
      </Field>

      {/* ── Campaign Summary ──────────────────────────────────── */}
      <CampaignSummary form={form} />

      {/* ── Final disclaimer ──────────────────────────────────── */}
      <div className="flex gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl
        bg-green-50 dark:bg-green-900/20
        border border-green-200 dark:border-green-700">
        <CheckCircle2 size={14} className="sm:w-4 sm:h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
        <p className="text-[10px] sm:text-xs text-green-700 dark:text-green-400 leading-relaxed">
          <strong>You're all set!</strong> Review the summary above and click <strong>Launch Campaign</strong> when ready.
          You can pause or cancel the campaign anytime from your dashboard.
          All messages comply with CAN-SPAM and TCPA regulations.
        </p>
      </div>
    </div>
  );
}