import React, { useState, useRef } from "react";
import { AlertCircle, Eye, Pencil, CheckCircle2, Smartphone, Mail } from "lucide-react";
import {
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_SMS_TEMPLATES,
  TEMPLATE_VARS,
  countSMSChars,
} from "../../utils/campaignHelpers";

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, error, hint, children }) {
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

// ─── Token substitution for previews ─────────────────────────────────────────
function previewText(text) {
  return (text || "")
    .replace(/\{\{customer_name\}\}/g,  "Alex Johnson")
    .replace(/\{\{business_name\}\}/g,  "Your Business")
    .replace(/\{\{review_link\}\}/g,    "https://g.page/r/review")
    .replace(/\{\{feedback_link\}\}/g,  "https://getrevuse.com/feedback/xyz");
}

// ─── Email preview ────────────────────────────────────────────────────────────
function EmailPreview({ subject, body }) {
  const lines = previewText(body).split("\n");
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm bg-white dark:bg-gray-900">
      {/* Browser chrome */}
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="w-3 h-3 rounded-full bg-red-400/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <div className="w-3 h-3 rounded-full bg-green-400/80" />
        </div>
        {[
          ["From",    "Your Business <hello@yourbusiness.com>"],
          ["To",      "Alex Johnson <alex@email.com>"],
          ["Subject", previewText(subject) || "(no subject)"],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs leading-5">
            <span className="text-gray-400 w-12 shrink-0">{k}:</span>
            <span className={`text-gray-700 dark:text-gray-300 ${k === "Subject" ? "font-semibold" : ""}`}>{v}</span>
          </div>
        ))}
      </div>
      {/* Body */}
      <div className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-64 overflow-y-auto">
        {lines.map((line, i) => {
          const ctaMatch = line.trim().match(/^\[(.+)\]$/);
          if (ctaMatch) {
            return (
              <div key={i} className="my-3 text-center">
                <span className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl">
                  {ctaMatch[1]}
                </span>
              </div>
            );
          }
          return <p key={i} className={line.trim() === "" ? "h-3" : "mb-0.5"}>{line}</p>;
        })}
      </div>
    </div>
  );
}

// ─── SMS phone preview ────────────────────────────────────────────────────────
function SMSPreview({ body }) {
  return (
    <div className="flex justify-center py-2">
      <div className="w-52 bg-gray-900 dark:bg-gray-950 rounded-[2rem] p-3 shadow-2xl border border-gray-700">
        {/* Notch */}
        <div className="flex justify-center mb-2">
          <div className="w-16 h-1.5 bg-gray-700 rounded-full" />
        </div>
        {/* Screen */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden min-h-40">
          <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 text-center border-b border-gray-200 dark:border-gray-600">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Messages</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">Your Business</p>
          </div>
          <div className="p-3 flex flex-col gap-1">
            <div className="bg-blue-500 text-white text-[11px] rounded-2xl rounded-tl-sm px-3 py-2 leading-relaxed max-w-[90%]">
              {previewText(body) || "Your SMS preview will appear here..."}
            </div>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 self-end">Now · Delivered ✓✓</p>
          </div>
        </div>
        {/* Home bar */}
        <div className="flex justify-center mt-2">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Template picker ──────────────────────────────────────────────────────────
function TemplatePicker({ templates, selected, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {templates.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t)}
          className={`text-left p-3 rounded-xl border-2 transition-all
            ${selected === t.id
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{t.name}</span>
            {selected === t.id && <CheckCircle2 size={13} className="text-blue-500 shrink-0" />}
          </div>
          <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
            {(t.body || t.subject || "").slice(0, 75)}…
          </p>
        </button>
      ))}
    </div>
  );
}

// ─── Variable token bar ───────────────────────────────────────────────────────
function VarTokens({ onInsert }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="text-[10px] text-gray-400 self-center mr-1">Insert:</span>
      {TEMPLATE_VARS.map((v) => (
        <button
          key={v.token}
          type="button"
          title={v.desc}
          onClick={() => onInsert(v.token)}
          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border
            bg-indigo-50 dark:bg-indigo-900/30
            text-indigo-600 dark:text-indigo-400
            border-indigo-200 dark:border-indigo-700
            hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
        >
          {v.token}
        </button>
      ))}
    </div>
  );
}

// ─── Textarea with token insertion support ────────────────────────────────────
function TokenTextarea({ value, onChange, rows = 8, placeholder, error }) {
  const ref = useRef();

  const insertToken = (token) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const next  = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  return (
    <div className="flex flex-col gap-2">
      <VarTokens onInsert={insertToken} />
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono resize-none
          bg-gray-50 dark:bg-gray-800/80
          border ${error
            ? "border-red-400 dark:border-red-500 focus:ring-red-400"
            : "border-gray-200 dark:border-gray-700 focus:ring-blue-500"}
          text-gray-800 dark:text-gray-200
          placeholder-gray-400 dark:placeholder-gray-600
          focus:outline-none focus:ring-2 focus:border-transparent transition`}
      />
    </div>
  );
}

// ─── Edit/Preview toggle ──────────────────────────────────────────────────────
function EditPreviewToggle({ preview, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
      {[
        { val: false, icon: <Pencil size={11} />, label: "Edit" },
        { val: true,  icon: <Eye    size={11} />, label: "Preview" },
      ].map(({ val, icon, label }) => (
        <button
          key={String(val)}
          type="button"
          onClick={() => onChange(val)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition
            ${preview === val
              ? "bg-white dark:bg-gray-700 shadow text-gray-800 dark:text-gray-200"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
        >
          {icon} {label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Step2_Templates({ form, update, errors }) {
  const [emailPreview, setEmailPreview] = useState(false);
  const showEmail = ["email", "both"].includes(form.channel);
  const showSMS   = ["sms",  "both"].includes(form.channel);
  const [activeTab, setActiveTab] = useState(showEmail ? "email" : "sms");

  const smsChars = countSMSChars(form.smsBody);
  const smsParts = Math.ceil(smsChars / 160) || 1;

  const pickEmailTemplate = (t) => {
    update("selectedEmailTemplate", t.id);
    update("emailSubject", t.subject);
    update("emailBody", t.body);
  };

  const pickSMSTemplate = (t) => {
    update("selectedSMSTemplate", t.id);
    update("smsBody", t.body);
  };

  // ─── Tab strip when both channels are on ─────────────────────
  const TabStrip = () => (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/70 p-1 rounded-xl w-fit">
      {[
        { key: "email", icon: <Mail size={13} />,       label: "Email Template" },
        { key: "sms",   icon: <Smartphone size={13} />, label: "SMS Template"   },
      ].map(({ key, icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setActiveTab(key)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition
            ${activeTab === key
              ? "bg-white dark:bg-gray-700 shadow text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
        >
          {icon} {label}
        </button>
      ))}
    </div>
  );

  // ═════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-6">

      {/* Tab strip for both-channel mode */}
      {form.channel === "both" && <TabStrip />}

      {/* ── EMAIL SECTION ─────────────────────────────────────── */}
      {showEmail && (activeTab === "email" || form.channel !== "both") && (
        <div className="flex flex-col gap-5">

          {/* Section header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Mail size={14} className="text-blue-600 dark:text-blue-400" />
              </span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Email Template</span>
            </div>
            <EditPreviewToggle preview={emailPreview} onChange={setEmailPreview} />
          </div>

          {/* Template picker */}
          <Field label="Start with a template">
            <TemplatePicker
              templates={DEFAULT_EMAIL_TEMPLATES}
              selected={form.selectedEmailTemplate}
              onSelect={pickEmailTemplate}
            />
          </Field>

          {!emailPreview ? (
            <>
              {/* Subject */}
              <Field label="Subject Line" error={errors.emailSubject}>
                <input
                  value={form.emailSubject}
                  onChange={(e) => update("emailSubject", e.target.value)}
                  placeholder="How was your experience with {{business_name}}?"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm
                    bg-gray-50 dark:bg-gray-800/80
                    border ${errors.emailSubject
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-200 dark:border-gray-700 focus:ring-blue-500"}
                    text-gray-800 dark:text-gray-200
                    placeholder-gray-400 dark:placeholder-gray-600
                    focus:outline-none focus:ring-2 focus:border-transparent transition`}
                />
                {errors.emailSubject && (
                  <p className="flex items-center gap-1.5 text-xs text-red-500 mt-0.5">
                    <AlertCircle size={12} /> {errors.emailSubject}
                  </p>
                )}
              </Field>

              {/* Body */}
              <Field
                label="Email Body"
                error={errors.emailBody}
                hint='Wrap CTA button text in square brackets: [Leave a Review ⭐]. Use tokens to personalize.'
              >
                <TokenTextarea
                  value={form.emailBody}
                  onChange={(v) => update("emailBody", v)}
                  rows={10}
                  error={errors.emailBody}
                  placeholder="Write your email body here..."
                />
              </Field>
            </>
          ) : (
            <Field label="Live Preview — sample data filled in">
              <EmailPreview subject={form.emailSubject} body={form.emailBody} />
            </Field>
          )}
        </div>
      )}

      {/* ── SMS SECTION ───────────────────────────────────────── */}
      {showSMS && (activeTab === "sms" || form.channel !== "both") && (
        <div className="flex flex-col gap-5">

          {/* Section header */}
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Smartphone size={14} className="text-green-600 dark:text-green-400" />
            </span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">SMS Template</span>
          </div>

          {/* Template picker */}
          <Field label="Start with a template">
            <TemplatePicker
              templates={DEFAULT_SMS_TEMPLATES}
              selected={form.selectedSMSTemplate}
              onSelect={pickSMSTemplate}
            />
          </Field>

          {/* Editor + preview side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="SMS Message" error={errors.smsBody}>
              <TokenTextarea
                value={form.smsBody}
                onChange={(v) => update("smsBody", v)}
                rows={6}
                error={errors.smsBody}
                placeholder="Type your SMS message here..."
              />
              {/* Character counter */}
              <div className="flex justify-between items-center mt-1">
                <span className={`text-xs font-mono font-semibold
                  ${smsChars > 320 ? "text-red-500" : smsChars > 160 ? "text-amber-500" : "text-gray-400"}`}>
                  {smsChars} chars · {smsParts} {smsParts === 1 ? "message" : "messages"}
                </span>
                <span className="text-[10px] text-gray-400">Max 320 chars</span>
              </div>
              {/* Compliance note */}
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                💡 Always include opt-out instructions (e.g. "Reply STOP to unsubscribe") to comply with SMS regulations.
              </p>
            </Field>

            <Field label="Live Preview">
              <SMSPreview body={form.smsBody} />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}