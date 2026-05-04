import React, { useState } from "react";
import { Star, CheckCircle2, Clock, Eye, ChevronDown, ChevronUp } from "lucide-react";
import StatusBadge from "../Shared/StatusBadge";

export default function FeedbackCard({ submission, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const { fields, starRating, routingOutcome, status, createdAt, submissionId } = submission;

  const handleMark = async (newStatus) => {
    setUpdating(true);
    try { await onStatusChange(submissionId, newStatus); }
    finally { setUpdating(false); }
  };

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60)   return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border transition-all
      ${status === "new"
        ? "border-blue-200 dark:border-blue-800 shadow-sm shadow-blue-100 dark:shadow-none"
        : "border-gray-200 dark:border-gray-700"
      }`}>

      {/* Header row */}
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Stars */}
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map((s) => (
            <Star key={s} size={14}
              className={s <= starRating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700"}
            />
          ))}
        </div>

        {/* Name */}
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1 min-w-0 truncate">
          {fields?.name || "Anonymous"}
        </span>

        {/* Status + routing badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={routingOutcome} size="xs" />
          <StatusBadge status={status} size="xs" />
        </div>

        {/* Time */}
        <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
          <Clock size={11} /> {timeAgo(createdAt)}
        </span>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Preview message (always visible) */}
      {fields?.message && (
        <div className="px-4 pb-3">
          <p className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed
            ${!expanded ? "line-clamp-2" : ""}`}>
            {fields.message}
          </p>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fields?.email && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{fields.email}</p>
              </div>
            )}
            {fields?.phone && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Phone</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{fields.phone}</p>
              </div>
            )}
            {fields?.order && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Order #</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{fields.order}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {status !== "resolved" && (
            <div className="flex gap-2 flex-wrap">
              {status === "new" && (
                <button
                  onClick={() => handleMark("read")}
                  disabled={updating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                    border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition disabled:opacity-60"
                >
                  <Eye size={12} /> Mark as Read
                </button>
              )}
              <button
                onClick={() => handleMark("resolved")}
                disabled={updating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700
                  text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30
                  transition disabled:opacity-60"
              >
                <CheckCircle2 size={12} /> Mark Resolved
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}