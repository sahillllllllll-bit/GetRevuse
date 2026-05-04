import React from "react";
import { Zap, Mail, MessageSquare, TrendingDown } from "lucide-react";
import { useCredits } from "../../hooks/useCredits";

export default function CreditsWidget({ compact = false }) {
  const { credits, creditsUsed, plan, loading } = useCredits();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse">
        <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full" />
        <div className="w-16 h-3 bg-gray-300 dark:bg-gray-600 rounded" />
      </div>
    );
  }

  const isLow = credits !== null && credits < 20;

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
        ${isLow
          ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700"
          : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
        }`}>
        <Zap size={12} className={isLow ? "text-red-500" : "text-blue-500"} />
        {credits ?? "—"} credits
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3
      ${isLow
        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
      }`}>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} className={isLow ? "text-red-500" : "text-blue-500"} />
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Credits</span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full
          bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 capitalize">
          {plan}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className={`text-3xl font-black ${isLow ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
            {credits ?? "—"}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{creditsUsed} used total</p>
        </div>
        {isLow && (
          <div className="flex items-center gap-1 text-xs text-red-500 font-semibold">
            <TrendingDown size={13} /> Low balance
          </div>
        )}
      </div>

      {/* Cost reference */}
      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Mail size={11} /> <span>Email = 1 credit</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MessageSquare size={11} /> <span>SMS = 2 credits</span>
        </div>
      </div>
    </div>
  );
}