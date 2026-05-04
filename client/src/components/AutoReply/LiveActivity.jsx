// frontend/src/components/AutoReply/LiveActivity.jsx
import React, { useState } from "react";
import { useLiveQueue } from "../../hooks/useReviews";
import { Clock, CheckCircle, XCircle, Zap, Edit2, X, RotateCcw, Star, Send } from "lucide-react";

function Countdown({ scheduledAt, now }) {
  const diff = new Date(scheduledAt) - now;
  if (diff <= 0) return <span className="text-green-600 dark:text-green-400 font-semibold text-xs">Sending now...</span>;
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const isUrgent = diff < 60000;
  return (
    <span className={`font-mono font-semibold text-xs ${isUrgent ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
      {mins > 0 ? `${mins}m ` : ""}{String(secs).padStart(2, "0")}s
    </span>
  );
}

function ProgressRing({ scheduledAt, createdAt, now }) {
  const total = new Date(scheduledAt) - new Date(createdAt);
  const elapsed = now - new Date(createdAt);
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const r = 18, circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-border-tertiary)" strokeWidth="3" />
      <circle cx="22" cy="22" r={r} fill="none"
        stroke={pct > 80 ? "#22c55e" : pct > 50 ? "#3b82f6" : "#f59e0b"}
        strokeWidth="3"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
      <text x="22" y="26" textAnchor="middle" fontSize="9" fontWeight="600" fill="currentColor" className="text-gray-600 dark:text-gray-400">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} size={10} className={i <= rating ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-600"} />
      ))}
    </div>
  );
}

function EditModal({ item, onSave, onClose }) {
  const [text, setText] = useState(item.replyText);
  const [saving, setSaving] = useState(false);
  return (
    <div style={{ minHeight: 320 }} className="flex items-center justify-center bg-black/40 rounded-2xl p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 w-full max-w-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Edit reply</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={16} />
          </button>
        </div>
        <textarea
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3.5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex gap-2 mt-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            Cancel
          </button>
          <button
            onClick={async () => { setSaving(true); await onSave(text); setSaving(false); onClose(); }}
            disabled={saving || !text.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold transition disabled:opacity-60"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LiveActivity({ projectId }) {
  const { queued, recentlySent, failed, loading, now, actionLoading, cancelReply, editReply } = useLiveQueue(projectId);
  const [editing, setEditing] = useState(null);

  if (!projectId) return (
    <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
      Select a project to view live activity
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Queued */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Queued replies
            {queued.length > 0 && (
              <span className="ml-2 text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">{queued.length}</span>
            )}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : queued.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <Zap size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">No replies queued right now</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queued.map((item) => (
              <div key={item._id}>
                {editing === item._id ? (
                  <EditModal
                    item={item}
                    onSave={(text) => editReply(item._id, text)}
                    onClose={() => setEditing(null)}
                  />
                ) : (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-blue-200 dark:border-blue-900 p-4">
                    <div className="flex items-start gap-3">
                      <ProgressRing scheduledAt={item.scheduledAt} createdAt={item.createdAt} now={now} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.reviewerName}</span>
                          <StarRow rating={item.starRating} />
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.triggerType === "manual" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"}`}>
                            {item.triggerType}
                          </span>
                        </div>

                        {item.reviewText && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-1.5">
                            Review: "{item.reviewText}"
                          </p>
                        )}

                        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg mb-2">
                          {item.replyText}
                        </p>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <Clock size={11} />
                            Sending in <Countdown scheduledAt={item.scheduledAt} now={now} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setEditing(item._id)}
                          className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400"
                          title="Edit reply"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => cancelReply(item._id)}
                          disabled={actionLoading[item._id]}
                          className="p-2 rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-500 dark:text-red-400 disabled:opacity-60"
                          title="Cancel reply"
                        >
                          {actionLoading[item._id] ? (
                            <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : <X size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently sent */}
      {recentlySent.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={14} className="text-green-500" />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Recently sent</p>
          </div>
          <div className="space-y-2">
            {recentlySent.map((item) => (
              <div key={item._id} className="bg-white dark:bg-gray-900 rounded-xl border border-green-200 dark:border-green-900 p-3 flex items-start gap-3">
                <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.reviewerName}</span>
                    <StarRow rating={item.starRating} />
                    <span className="text-xs text-gray-400 ml-auto">{item.sentAt ? new Date(item.sentAt).toLocaleTimeString() : ""}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{item.replyText}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed */}
      {failed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={14} className="text-red-500" />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Failed</p>
          </div>
          <div className="space-y-2">
            {failed.map((item) => (
              <div key={item._id} className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900 p-3 flex items-start gap-3">
                <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.reviewerName}</span>
                    <span className="text-xs text-red-500 ml-auto">{item.failReason || "Unknown error"}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{item.replyText}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}