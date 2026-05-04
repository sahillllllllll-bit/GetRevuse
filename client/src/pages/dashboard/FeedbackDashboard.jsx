import React, { useState, useEffect } from "react";
import {
  MessageSquare, Star, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, RefreshCw, TrendingUp,
} from "lucide-react";
import { useFeedback } from "../../hooks/useFeedback";
import FeedbackCard    from "../../components/Feedback/FeedbackCard";
import FeedbackFilters from "../../components/Feedback/FeedbackFilters";
import api from "../../utils/api";

// ─── Stat card ────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }) {
  const colors = {
    blue:   "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green:  "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  };
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-gray-900 dark:text-white">{value ?? "—"}</p>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function FeedbackDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const {
    submissions, stats, pagination, loading, error,
    filters, updateFilter, goToPage, markStatus, refresh,
  } = useFeedback();

  useEffect(() => {
    api.get("/api/campaigns?limit=50")
      .then(({ data }) => setCampaigns(data.campaigns || []))
      .catch(() => {});
  }, []);

  // const avgRating = stats?.avgRating ? Math.round(stats.avgRating * 10) / 10 : null;

  return (
    <div className="p-4 md:p-6 text-gray-800 dark:text-gray-200 w-full max-w-5xl mx-auto">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Feedback</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Customer feedback from all your campaigns
          </p>
        </div>
        <button
          onClick={refresh}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
            border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
            text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Stats grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<MessageSquare size={18} />} label="Total Feedback"
          value={stats?.total ?? 0} color="blue" />
        <StatCard icon={<AlertCircle size={18} />} label="Unread"
          value={stats?.newCount ?? 0} sub="Needs attention" color="orange" />
        {/* <StatCard icon={<Star size={18} />} label="Avg Rating"
          value={avgRating ? `${avgRating}★` : "—"} color="purple" /> */}
        <StatCard icon={<CheckCircle2 size={18} />} label="Positive Routed"
          value={stats?.positive ?? 0} sub="Sent to review link" color="green" />
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="mb-4">
        <FeedbackFilters
          filters={filters}
          updateFilter={updateFilter}
          campaigns={campaigns}
        />
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20
          border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl">
            💬
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">No feedback yet</p>
          <p className="text-sm text-gray-400 max-w-xs">
            Feedback from customers who rate below your threshold will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {submissions.map((s) => (
            <FeedbackCard
              key={s.submissionId}
              submission={s}
              onStatusChange={markStatus}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
          <p className="text-xs text-gray-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed
                hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="text-xs font-semibold text-gray-500 px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed
                hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}