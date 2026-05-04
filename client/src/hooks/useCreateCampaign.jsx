import { useState, useCallback } from "react";
import { auth } from "../firebase/config";
import {
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_SMS_TEMPLATES,
  parseCSVText,
  parseManualRows,
} from "../utils/campaignHelpers";

export const TOTAL_STEPS = 4;

const INITIAL_FORM = {
  // ── Step 1: Basics ──────────────────────────────────────────────
  businessName: "",
  platform:     "google",
  reviewLink:   "",
  channel:      "email",
  dataSource:   "",   // "csv" | "excel" | "manual"
  customers:    [],   // [{ name, email, phone }]
  rawCSV:       "",
  manualRows:   Array.from({ length: 5 }, () => ({ name: "", email: "", phone: "" })),

  // ── Step 2: Templates ───────────────────────────────────────────
  selectedEmailTemplate: "friendly",
  emailSubject:          DEFAULT_EMAIL_TEMPLATES[0].subject,
  emailBody:             DEFAULT_EMAIL_TEMPLATES[0].body,
  selectedSMSTemplate:   "sms_short",
  smsBody:               DEFAULT_SMS_TEMPLATES[0].body,

  // ── Step 3: Routing ─────────────────────────────────────────────
  threshold:           4,     // stars: below → feedback form, at/above → review link
  feedbackFormEnabled: true,
  feedbackFields:      ["name", "email", "message"],
  feedbackNote:        "We're sorry your experience wasn't perfect. Please share what happened so we can improve.",
  notifyOnNegative:    true,
  notifyEmail:         "",

  // ── Step 4: Launch ──────────────────────────────────────────────
  campaignName:   "",
  senderName:     "",
  senderEmail:    "",
  senderPhone:    "",
  schedule:       "now",
  customDateTime: "",
};

// ─── Per-step validators ──────────────────────────────────────────────────────
const VALIDATORS = {
  1: (f) => {
    const e = {};
    if (!f.businessName.trim()) e.businessName = "Business name is required";
    if (!f.reviewLink.trim())   e.reviewLink   = "Review link is required";
    else if (!/^https?:\/\/.+/.test(f.reviewLink))
      e.reviewLink = "Must be a valid URL starting with https://";
    if (f.customers.length === 0)
      e.customers = "Please add at least one customer";
    return e;
  },
  2: (f) => {
    const e = {};
    if (["email", "both"].includes(f.channel)) {
      if (!f.emailSubject.trim()) e.emailSubject = "Subject line is required";
      if (!f.emailBody.trim())    e.emailBody    = "Email body is required";
    }
    if (["sms", "both"].includes(f.channel)) {
      if (!f.smsBody.trim()) e.smsBody = "SMS message is required";
      const len = f.smsBody.replace(/\{\{[^}]+\}\}/g, "XXXXXXXXXX").length;
      if (len > 320) e.smsBody = "SMS must be under 320 characters";
    }
    return e;
  },
  3: (_f) => ({}),
  4: (f) => {
    const e = {};
    if (!f.campaignName.trim()) e.campaignName = "Campaign name is required";
    if (!f.senderName.trim())   e.senderName   = "Sender name is required";
    if (f.schedule === "custom" && !f.customDateTime)
      e.customDateTime = "Please pick a date and time";
    return e;
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useCreateCampaign(onSuccess) {
  const [step,        setStep]        = useState(1);
  const [form,        setForm]        = useState(INITIAL_FORM);
  const [errors,      setErrors]      = useState({});
  const [loading,     setLoading]     = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [parseErrors, setParseErrors] = useState([]);

  // ── Generic field updater ───────────────────────────────────────
  const update = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  }, []);

  const updateMany = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Customer data helpers ───────────────────────────────────────
  const applyCSV = useCallback((text) => {
    const { data, errors: errs } = parseCSVText(text);
    setParseErrors(errs);
    setForm((prev) => ({ ...prev, customers: data, rawCSV: text }));
  }, []);

  const applyManual = useCallback((rows) => {
    const { data, errors: errs } = parseManualRows(rows);
    setParseErrors(errs);
    setForm((prev) => ({ ...prev, customers: data, manualRows: rows }));
  }, []);

  const applyExcel = useCallback((rows) => {
    const { data, errors: errs } = parseManualRows(rows);
    setParseErrors(errs);
    setForm((prev) => ({ ...prev, customers: data }));
  }, []);

  // ── Navigation ──────────────────────────────────────────────────
  const nextStep = useCallback(() => {
    const errs = VALIDATORS[step]?.(form) || {};
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, form]);

  const prevStep = useCallback(() => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Submit ──────────────────────────────────────────────────────
  const submitCampaign = useCallback(async () => {
    const errs = VALIDATORS[4]?.(form) || {};
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setSubmitError("");

    try {
      const payload = {
        businessName: form.businessName,
        platform:     form.platform,
        reviewLink:   form.reviewLink,
        channel:      form.channel,
        customers:    form.customers,
        templates: {
          email: ["email", "both"].includes(form.channel)
            ? { subject: form.emailSubject, body: form.emailBody }
            : null,
          sms: ["sms", "both"].includes(form.channel)
            ? { body: form.smsBody }
            : null,
        },
        routing: {
          threshold:           form.threshold,
          feedbackFormEnabled: form.feedbackFormEnabled,
          feedbackFields:      form.feedbackFields,
          feedbackNote:        form.feedbackNote,
          notifyOnNegative:    form.notifyOnNegative,
          notifyEmail:         form.notifyEmail,
        },
        launch: {
          campaignName:   form.campaignName,
          schedule:       form.schedule,
          customDateTime: form.customDateTime,
          senderName:     form.senderName,
          senderEmail:    form.senderEmail,
          senderPhone:    form.senderPhone,
        },
      };

      // Get Firebase ID token from current user
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be logged in to create a campaign');
      }
      
      const token = await user.getIdToken();

      const res   = await fetch("/api/campaigns", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const data = await res.json();
          throw new Error(data.message || "Failed to create campaign");
        } else {
          throw new Error("Server error: Invalid response format");
        }
      }

      const data = await res.json();
      onSuccess?.(data);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [form, onSuccess]);

  return {
    step, TOTAL_STEPS, form, errors, loading, submitError, parseErrors,
    update, updateMany, nextStep, prevStep, submitCampaign,
    applyCSV, applyManual, applyExcel,
  };
}