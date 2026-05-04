import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Monitor, Smartphone } from "lucide-react";
import { useCreateCampaign } from "../../hooks/useCreateCampaign";
import Step1_Basics      from "./Step1_Basics";
import Step2_Templates   from "./Step2_Templates";
import Step3_Routing     from "./Step3_Routing";
import Step4_Launch      from "./Step4_Launch";

const STEPS = [
  { num: 1, label: "Basics",    icon: "📝", title: "Campaign Basics",    sub: "Name your business, choose review platform and channel" },
  { num: 2, label: "Templates", icon: "✉️",  title: "Message Templates",  sub: "Craft the email and SMS messages your customers will receive" },
  { num: 3, label: "Routing",   icon: "🔀", title: "Review Routing",     sub: "Set the star threshold for sending to your review page vs. feedback form" },
  { num: 4, label: "Launch",    icon: "🚀", title: "Launch Campaign",    sub: "Set schedule, sender details, and review everything before going live" },
];

// ─── Mobile warning popup ─────────────────────────────────────────────────────
const POPUP_DURATION = 6; // seconds

function MobileWarningPopup({ onDismiss }) {
  const [secondsLeft, setSecondsLeft] = useState(POPUP_DURATION);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const progress = (secondsLeft / POPUP_DURATION) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm p-6 text-center shadow-xl">

        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
          <Smartphone size={24} className="text-amber-500" />
        </div>

        {/* Title */}
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">
          Best viewed on desktop
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          This campaign builder is designed for laptops and tablets. On mobile, some steps may feel cramped or tricky to use.
        </p>

        {/* Recommendation box */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4 text-left">
          <div className="flex items-center gap-2 mb-1">
            <Monitor size={14} className="text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
              Open on a laptop for the best experience
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            Multi-step forms, message templates, and review routing are designed for larger screens.
          </p>
        </div>

        {/* Countdown bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 dark:bg-amber-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 min-w-[24px]">
            {secondsLeft}s
          </span>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-800 text-sm font-semibold
            text-gray-600 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          Continue anyway
        </button>
      </div>
    </div>
  );
}

// ─── Mobile detection hook ────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ─── Progress stepper ─────────────────────────────────────────────────────────
function Stepper({ step }) {
  return (
    <div className="flex items-center w-full">
      {STEPS.map((st, i) => (
        <React.Fragment key={st.num}>
          <div className="flex flex-col items-center shrink-0">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center
              text-xs font-bold border-2 transition-all duration-300
              ${st.num < step
                ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900"
                : st.num === step
                ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              }`}
            >
              {st.num < step ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span>{st.num}</span>
              )}
            </div>
            <span className={`mt-1 text-[10px] font-semibold whitespace-nowrap hidden sm:block transition-colors
              ${st.num === step
                ? "text-blue-600 dark:text-blue-400"
                : st.num < step
                ? "text-blue-400 dark:text-blue-500"
                : "text-gray-400 dark:text-gray-600"
              }`}>
              {st.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1.5 sm:mx-2 mb-4 sm:mb-3 rounded-full transition-colors duration-500
              ${st.num < step ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"}`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function CreateCampaign({ onBack, onSuccess }) {
  const {
    step, TOTAL_STEPS, form, errors, loading, submitError, parseErrors,
    update, updateMany, nextStep, prevStep, submitCampaign,
    applyCSV, applyManual, applyExcel,
  } = useCreateCampaign(onSuccess);

  const isMobile = useIsMobile();
  const [popupDismissed, setPopupDismissed] = useState(false);
  const showPopup = isMobile && !popupDismissed;

  const meta = STEPS[step - 1];

  const renderStep = () => {
    const props = { form, update, errors };
    switch (step) {
      case 1: return <Step1_Basics     {...props} applyCSV={applyCSV} applyManual={applyManual} applyExcel={applyExcel} parseErrors={parseErrors} />;
      case 2: return <Step2_Templates  {...props} />;
      case 3: return <Step3_Routing    {...props} />;
      case 4: return <Step4_Launch     {...props} />;
      default: return null;
    }
  };

  return (
    <>
      {/* Mobile warning popup */}
      {showPopup && <MobileWarningPopup onDismiss={() => setPopupDismissed(true)} />}

      <div className="p-4 md:p-5 text-gray-800 dark:text-gray-200 w-full max-w-3xl mx-auto">

        {/* ── Top bar ───────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              title="Back to Campaigns"
              className="shrink-0 p-2 rounded-lg border border-gray-300 dark:border-gray-700
                hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold truncate">Create New Campaign</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{meta.sub}</p>
            </div>
          </div>
          <span className="self-start sm:self-auto shrink-0 text-xs font-bold
            text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400
            px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800">
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>

        {/* ── Stepper ───────────────────────────────────────── */}
        <div className="mb-5">
          <Stepper step={step} />
        </div>

        {/* ── Step card ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm
          border border-gray-200 dark:border-gray-700 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800
            bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2.5">
            <span className="text-xl">{meta.icon}</span>
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">{meta.title}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 hidden sm:block">{meta.sub}</p>
            </div>
          </div>

          <div className="px-5 py-5 max-h-[58vh] overflow-y-auto">
            {renderStep()}
          </div>

          {submitError && (
            <div className="mx-5 mb-2 p-3
              bg-red-50 dark:bg-red-900/20
              border border-red-200 dark:border-red-700
              rounded-xl text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span>{submitError}</span>
            </div>
          )}

          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800
            bg-gray-50 dark:bg-gray-800/30 flex items-center justify-between gap-3">
            <div>
              {step > 1 ? (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl
                    border border-gray-300 dark:border-gray-600
                    bg-white dark:bg-gray-800
                    text-sm font-semibold text-gray-600 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : (
                <button
                  onClick={onBack}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition font-medium px-2 py-1"
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step < TOTAL_STEPS ? (
                <button
                  onClick={nextStep}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500
                    text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm"
                >
                  Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={submitCampaign}
                  disabled={loading}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500
                    text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-sm
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Launching…
                    </>
                  ) : (
                    <>🚀 Launch Campaign</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
          {step} of {TOTAL_STEPS} steps completed
          {step === 3 && " — Configure how GetRevUse routes your customer feedback"}
          {step === 4 && " — One last check before your campaign goes live"}
        </p>
      </div>
    </>
  );
}