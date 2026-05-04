// frontend/src/components/AutoReply/ActivityPage.jsx
import React, { useState } from "react";
import LiveActivity from "./LiveActivity";
import { useReviews } from "../../hooks/useReviews";
import { Activity } from "lucide-react";

export default function ActivityPage() {
  const { projects, selectedProject, setSelectedProject, loading: projectsLoading } = useReviews();

  return (
    <div className="p-4 md:p-6 space-y-5 text-gray-800 dark:text-gray-200">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <Activity size={18} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Live activity</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time auto-reply queue with countdown timers · refreshes every 15s
          </p>
        </div>
      </div>

      {/* Project selector */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Project</p>
        {projectsLoading ? (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : projects.length === 0 ? (
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

      {/* Live Activity Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <LiveActivity projectId={selectedProject?.projectId} />
      </div>
    </div>
  );
}