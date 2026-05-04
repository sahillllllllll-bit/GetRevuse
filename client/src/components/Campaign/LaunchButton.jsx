import React, { useState } from "react";
import { Rocket, Pause, RotateCcw, AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { useSendCampaign } from "../../hooks/useSendCampaign";
import api from "../../utils/api";

export default function LaunchButton({ campaign, onStatusChange }) {
  const { launch, launching, progress, error, result, reset } = useSendCampaign();
  const [pausing,  setPausing]  = useState(false);
  const [resuming, setResuming] = useState(false);
  const [localStatus, setLocalStatus] = useState(campaign.status);

  const handleLaunch = async () => {
    try {
      const data = await launch(campaign.campaignId);
      setLocalStatus(data.status);
      onStatusChange?.(data.status, data);
    } catch (_) {}
  };

  const handlePause = async () => {
    setPausing(true);
    try {
      await api.patch(`/api/campaigns/${campaign.campaignId}/pause`);
      setLocalStatus("paused");
      onStatusChange?.("paused");
      reset();
    } catch (_) {}
    finally { setPausing(false); }
  };

  const handleResume = async () => {
    setResuming(true);
    try {
      await api.patch(`/api/campaigns/${campaign.campaignId}/resume`);
      setLocalStatus("running");
      onStatusChange?.("running");
    } catch (_) {}
    finally { setResuming(false); }
  };

  // ── Progress bar ──────────────────────────────────────────────
  if (progress && localStatus === "running") {
    return (
      <div className="flex flex-col gap-2 w-full min-w-[200px]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-600 dark:text-gray-400">
            Sending… {progress.percent}%
          </span>
          <span className="text-gray-400">
            {progress.counts?.sent || 0}/{progress.counts?.total || 0}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <button
          onClick={handlePause}
          disabled={pausing}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold
            text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
        >
          <Pause size={12} /> {pausing ? "Pausing…" : "Pause"}
        </button>
      </div>
    );
  }

  // ── Completed ─────────────────────────────────────────────────
  if (localStatus === "completed") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
        <CheckCircle2 size={14} /> Campaign Complete
      </span>
    );
  }

  // ── Paused ────────────────────────────────────────────────────
  if (localStatus === "paused") {
    return (
      <button
        onClick={handleResume}
        disabled={resuming}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
          bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700
          text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition"
      >
        <RotateCcw size={14} /> {resuming ? "Resuming…" : "Resume"}
      </button>
    );
  }

  // ── Running (no progress yet) ─────────────────────────────────
  if (localStatus === "running") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
          <Zap size={13} className="animate-pulse" /> Running
        </span>
        <button
          onClick={handlePause}
          disabled={pausing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400
            hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <Pause size={11} /> Pause
        </button>
      </div>
    );
  }

  // ── Credit error ──────────────────────────────────────────────
  if (error?.code === "INSUFFICIENT_CREDITS") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle size={13} />
          Need {error.details?.needed} credits (have {error.details?.balance})
        </div>
        <button onClick={reset} className="text-xs text-blue-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle size={13} /> {error.message}
        </p>
        <button onClick={reset} className="text-xs text-blue-600 hover:underline self-start">
          Try again
        </button>
      </div>
    );
  }

  // ── Default: Launch button ────────────────────────────────────
  return (
    <button
      onClick={handleLaunch}
      disabled={launching}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
        bg-green-600 hover:bg-green-500 text-white transition shadow-sm
        disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {launching ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Launching…
        </>
      ) : (
        <>
          <Rocket size={15} /> Launch
        </>
      )}
    </button>
  );
}