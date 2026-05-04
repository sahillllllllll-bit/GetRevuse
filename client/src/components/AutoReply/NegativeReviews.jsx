// frontend/src/components/AutoReply/NegativeReviews.jsx
import React from "react";
import { useReviews } from "../../hooks/useReviews";
import { RefreshCw, Star, CheckCircle, XCircle, Clock, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

const FILTERS = [
  { value: "negative",       label: "All negative" },
  { value: "needs_approval", label: "Needs approval" },
  { value: "queued",         label: "Queued" },
  { value: "all",            label: "All reviews" },
];

function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} size={12} className={i <= rating ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-600"} />
      ))}
    </div>
  );
}

function StatusBadge({ status, allowReply }) {
  if (status === "sent") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Replied</span>;
  if (status === "queued") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Queued</span>;
  if (status === "skipped") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Skipped</span>;
  if (status === "failed") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Failed</span>;
  if (status === "pending" && allowReply === null) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Needs approval</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">Pending</span>;
}

export default function NegativeReviews() {
  const {
    projects, selectedProject, setSelectedProject,
    reviews, stats, pagination, page, setPage,
    activeFilter, setActiveFilter,
    loading, actionLoading, error,
    approve, deny, triggerFetch,
  } = useReviews();

  return (
    <div className="p-4 md:p-6 space-y-5 text-gray-800 dark:text-gray-200">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Reviews</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage and approve review replies</p>
        </div>
        <button
          onClick={triggerFetch}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition self-start"
        >
          <RefreshCw size={15} />
          Sync reviews
        </button>
      </div>

      {/* Project selector */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Select project</p>
        {projects.length === 0 ? (
          <p className="text-sm text-gray-400">No projects found.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {projects.map((p) => {
              const active = selectedProject?.projectId === p.projectId;
              return (
                <button
                  key={p.projectId}
                  onClick={() => setSelectedProject(p)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition
                    ${active
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-blue-300"
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.googleConnection?.connected ? "bg-green-500" : "bg-gray-300"}`} />
                  {p.projectName}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedProject && (
        <>
          {/* Stats row */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total reviews", value: stats.total, color: "text-gray-800 dark:text-gray-200" },
                { label: "Negative", value: stats.negative, color: "text-red-600 dark:text-red-400" },
                { label: "Needs approval", value: stats.needsApproval, color: "text-amber-600 dark:text-amber-400" },
                { label: "Queued", value: stats.queued, color: "text-blue-600 dark:text-blue-400" },
                { label: "Replied", value: stats.sent, color: "text-green-600 dark:text-green-400" },
              ].map((s) => (
                <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value ?? 0}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setActiveFilter(f.value); setPage(1); }}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition
                  ${activeFilter === f.value
                    ? "border-blue-500 bg-blue-600 text-white"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-blue-400"
                  }`}
              >
                {f.label}
                {f.value === "needs_approval" && stats?.needsApproval > 0 && (
                  <span className="ml-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {stats.needsApproval}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle size={15} />
              {error}
            </div>
          )}

          {/* Reviews list */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No reviews here</p>
              <p className="text-xs text-gray-400 mt-1">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div
                  key={r._id}
                  className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 transition
                    ${r.isNegative && r.allowReply === null
                      ? "border-amber-300 dark:border-amber-800"
                      : "border-gray-200 dark:border-gray-700"
                    }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">

                    {/* Left: review info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 flex-shrink-0">
                          {r.reviewerName?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-semibold">{r.reviewerName}</span>
                        <StarRow rating={r.starRating} />
                        <StatusBadge status={r.replyStatus} allowReply={r.allowReply} />
                        {r.isNegative && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            Negative
                          </span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">
                          {r.googleReviewTime ? new Date(r.googleReviewTime).toLocaleDateString() : ""}
                        </span>
                      </div>

                      {r.comment && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2 line-clamp-3">
                          "{r.comment}"
                        </p>
                      )}

                      {r.replyText && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mt-2">
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">AI reply:</p>
                          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">{r.replyText}</p>
                          {r.scheduledAt && r.replyStatus === "queued" && (
                            <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1.5 flex items-center gap-1">
                              <Clock size={10} />
                              Sending at {new Date(r.scheduledAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: action buttons */}
                    {r.isNegative && r.allowReply === null && r.replyStatus === "pending" && (
                      <div className="flex gap-2 flex-shrink-0 self-start">
                        <button
                          onClick={() => approve(r._id)}
                          disabled={!!actionLoading[r._id]}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition disabled:opacity-60"
                        >
                          {actionLoading[r._id] === "approving" ? (
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          ) : <CheckCircle size={13} />}
                          Allow
                        </button>
                        <button
                          onClick={() => deny(r._id)}
                          disabled={!!actionLoading[r._id]}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold transition disabled:opacity-60"
                        >
                          {actionLoading[r._id] === "denying" ? (
                            <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : <XCircle size={13} />}
                          Deny
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-400">
                    Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center px-2">
                      {page} / {pagination.pages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                      disabled={page === pagination.pages}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}