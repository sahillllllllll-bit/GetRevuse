import React from "react";

const CONFIG = {
  // Campaign statuses
  draft:      { label: "Draft",      bg: "bg-gray-100 dark:bg-gray-800",     text: "text-gray-600 dark:text-gray-400",   dot: "bg-gray-400"   },
  scheduled:  { label: "Scheduled",  bg: "bg-blue-50 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-400",   dot: "bg-blue-500"   },
  running:    { label: "Running",    bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", dot: "bg-green-500"  },
  paused:     { label: "Paused",     bg: "bg-yellow-50 dark:bg-yellow-900/30",text:"text-yellow-600 dark:text-yellow-400",dot:"bg-yellow-500" },
  completed:  { label: "Completed",  bg: "bg-indigo-50 dark:bg-indigo-900/30",text:"text-indigo-600 dark:text-indigo-400",dot:"bg-indigo-500" },
  cancelled:  { label: "Cancelled",  bg: "bg-red-50 dark:bg-red-900/30",     text: "text-red-600 dark:text-red-400",     dot: "bg-red-500"    },
  // Customer statuses
  pending:    { label: "Pending",    bg: "bg-gray-100 dark:bg-gray-800",     text: "text-gray-500 dark:text-gray-400",   dot: "bg-gray-400"   },
  queued:     { label: "Queued",     bg: "bg-blue-50 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-400",   dot: "bg-blue-400"   },
  sent:       { label: "Sent",       bg: "bg-cyan-50 dark:bg-cyan-900/30",   text: "text-cyan-600 dark:text-cyan-400",   dot: "bg-cyan-500"   },
  delivered:  { label: "Delivered",  bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", dot: "bg-green-500"  },
  failed:     { label: "Failed",     bg: "bg-red-50 dark:bg-red-900/30",     text: "text-red-600 dark:text-red-400",     dot: "bg-red-500"    },
  bounced:    { label: "Bounced",    bg: "bg-orange-50 dark:bg-orange-900/30",text:"text-orange-600 dark:text-orange-400",dot:"bg-orange-500" },
  // Feedback statuses
  new:        { label: "New",        bg: "bg-blue-50 dark:bg-blue-900/30",   text: "text-blue-600 dark:text-blue-400",   dot: "bg-blue-500"   },
  read:       { label: "Read",       bg: "bg-gray-100 dark:bg-gray-800",     text: "text-gray-500 dark:text-gray-400",   dot: "bg-gray-400"   },
  resolved:   { label: "Resolved",   bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", dot: "bg-green-500"  },
  // Routing
  positive:   { label: "Positive",   bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", dot: "bg-green-500"  },
  negative:   { label: "Negative",   bg: "bg-orange-50 dark:bg-orange-900/30",text:"text-orange-600 dark:text-orange-400",dot:"bg-orange-500"},
};

export default function StatusBadge({ status, pulse = false, size = "sm" }) {
  const cfg = CONFIG[status] || CONFIG.draft;
  const textSize = size === "xs" ? "text-[10px]" : "text-xs";

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold ${textSize} ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot} ${pulse && status === "running" ? "animate-pulse" : ""}`} />
      {cfg.label}
    </span>
  );
}