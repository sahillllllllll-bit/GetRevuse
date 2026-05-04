import React from "react";
import { Zap, Mail, MessageSquare, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useCredits } from "../../hooks/useCredits";
import { useNavigate } from "react-router-dom";

function LogRow({ entry }) {
  const isDeduction = entry.amount < 0;
  const icon = entry.type === "email"
    ? <Mail size={13} />
    : entry.type === "sms"
    ? <MessageSquare size={13} />
    : <ArrowUpRight size={13} />;

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
        ${isDeduction
          ? "bg-red-50 dark:bg-red-900/20 text-red-500"
          : "bg-green-50 dark:bg-green-900/20 text-green-500"}`}>
        {isDeduction ? icon : <ArrowUpRight size={13} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize">{entry.type}</p>
        {entry.note && <p className="text-[10px] text-gray-400 truncate">{entry.note}</p>}
      </div>

      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${isDeduction ? "text-red-500" : "text-green-500"}`}>
          {isDeduction ? "" : "+"}{entry.amount}
        </p>
        <p className="text-[10px] text-gray-400">{timeAgo(entry.createdAt)}</p>
      </div>

      <div className="text-right shrink-0 w-14">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{entry.balanceAfter}</p>
        <p className="text-[10px] text-gray-400">balance</p>
      </div>
    </div>
  );
}

export default function CreditsPage() {
  const navigate = useNavigate();
  const { credits, creditsUsed, recentLog, plan, loading } = useCredits();

  return (
    <div className="p-4 md:p-6 text-gray-800 dark:text-gray-200 w-full max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Credits</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Your sending credit balance and usage history
        </p>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white mb-5 shadow-lg relative overflow-hidden">
  {/* Subtle light bleed */}
  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

  <div className="flex items-start justify-between flex-wrap gap-3 relative z-10">
    <div>
      <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">Available Credits</p>
      {loading
        ? <div className="w-24 h-10 bg-blue-500/50 rounded-xl animate-pulse mt-1" />
        : <p className="text-5xl font-black mt-1 tracking-tight">{credits ?? "—"}</p>
      }
      <p className="text-blue-200/75 text-xs mt-1.5">{creditsUsed} credits used total</p>
    </div>

    <div className="text-right flex flex-col items-end gap-2.5">
      <span className="px-3 py-1 bg-white/15 border border-white/20 rounded-full text-xs font-bold uppercase tracking-wide">
        {plan} plan
      </span>
      <button onClick={() => navigate("/pricing")} className="px-4 py-1.5 bg-white text-blue-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-150 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
          <path d="M8 1L2 8h5l-1 5 7-8H8l1-4z" fill="currentColor" strokeLinejoin="round"/>
        </svg>
        Recharge Now
      </button>
    </div>
  </div>
</div>

      {/* Cost breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail size={16} className="text-blue-500" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Email</span>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">1</p>
          <p className="text-xs text-gray-400">credit per send</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-green-500" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">SMS</span>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">2</p>
          <p className="text-xs text-gray-400">credits per send</p>
        </div>
      </div>

      {/* Low balance warning */}
      {credits !== null && credits < 20 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl mb-5
          bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
          <TrendingDown size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-400">Low Credit Balance</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
              You have {credits} credits left. Top up to continue sending campaigns.
            </p>
          </div>
        </div>
      )}

      {/* Recent log */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <Zap size={15} className="text-blue-500" />
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Recent Activity</span>
        </div>

        {loading ? (
          <div className="p-4 flex flex-col gap-2">
            {[1,2,3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentLog.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No credit activity yet
          </div>
        ) : (
          <div className="px-4">
            {recentLog.map((entry, i) => (
              <LogRow key={i} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}