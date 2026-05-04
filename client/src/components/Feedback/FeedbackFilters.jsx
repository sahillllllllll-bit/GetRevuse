import React from "react";
import { Search, Filter, ChevronDown } from "lucide-react";

export default function FeedbackFilters({ filters, updateFilter, campaigns = [] }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">

      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={filters.search || ""}
          onChange={(e) => updateFilter("search", e.target.value)}
          placeholder="Search feedback..."
          className="w-full pl-9 pr-3 py-2 rounded-xl text-sm
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
            text-gray-800 dark:text-gray-200 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* Status */}
      <Select
        value={filters.status || ""}
        onChange={(v) => updateFilter("status", v)}
        options={[
          { value: "",         label: "All Status" },
          { value: "new",      label: "New"      },
          { value: "read",     label: "Read"     },
          { value: "resolved", label: "Resolved" },
        ]}
      />

      {/* Routing */}
      <Select
        value={filters.routing || ""}
        onChange={(v) => updateFilter("routing", v)}
        options={[
          { value: "",         label: "All Routing" },
          { value: "negative", label: "Negative"    },
          { value: "positive", label: "Positive"    },
        ]}
      />

      {/* Min rating */}
      <Select
        value={filters.minRating || ""}
        onChange={(v) => updateFilter("minRating", v)}
        options={[
          { value: "",  label: "Any Rating" },
          { value: "1", label: "1★ +"       },
          { value: "2", label: "2★ +"       },
          { value: "3", label: "3★ +"       },
          { value: "4", label: "4★ +"       },
          { value: "5", label: "5★ only"    },
        ]}
      />

      {/* Campaign filter */}
      {campaigns.length > 0 && (
        <Select
          value={filters.campaignId || ""}
          onChange={(v) => updateFilter("campaignId", v)}
          options={[
            { value: "", label: "All Campaigns" },
            ...campaigns.map((c) => ({ value: c.campaignId, label: c.campaignName })),
          ]}
        />
      )}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-7 py-2 rounded-xl text-xs font-semibold
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
          text-gray-700 dark:text-gray-300
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition cursor-pointer"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}