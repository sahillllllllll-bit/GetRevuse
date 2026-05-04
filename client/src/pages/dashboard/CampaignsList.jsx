import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Copy, Trash2, AlertCircle, Users, Mail, MessageSquare,
  BarChart2, ExternalLink,
} from "lucide-react";
import StatusBadge  from "../../components/Shared/StatusBadge";
import LaunchButton from "../../components/Campaign/LaunchButton";
import CreditsWidget from "../../components/Credits/CreditsWidget";
import api from "../../utils/api";

// ─── Campaign card ────────────────────────────────────────────
function CampaignCard({ campaign: initial, onDuplicate, onDelete, onCreateNew }) {
  const [campaign, setCampaign] = useState(initial);

  const handleStatusChange = (status) => {
    setCampaign((prev) => ({ ...prev, status }));
  };

  const channelIcon = campaign.channel === "email"
    ? <Mail size={13} />
    : campaign.channel === "sms"
    ? <MessageSquare size={13} />
    : <><Mail size={13} /><MessageSquare size={13} /></>;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700
      p-4 flex flex-col gap-4 hover:shadow-sm transition">

      {/* Top row */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
              {campaign.campaignName}
            </h3>
            <StatusBadge status={campaign.status} pulse />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{campaign.businessName}</p>
        </div>

        {/* Action menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onDuplicate(campaign.campaignId)}
            title="Duplicate"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={() => onDelete(campaign.campaignId)}
            title="Delete"
            className="p-2 rounded-lg text-gray-400 hover:text-red-500
              hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <Users size={12} /> {campaign.stats?.totalCustomers ?? 0} customers
        </span>
        <span className="flex items-center gap-1.5">
          {channelIcon} {campaign.channel}
        </span>
        <span className="flex items-center gap-1.5">
          🌐 {campaign.platform}
        </span>
        {campaign.stats?.totalSent > 0 && (
          <span className="flex items-center gap-1.5">
            <BarChart2 size={12} />
            {campaign.stats.totalSent} sent ·
            {campaign.stats.totalOpened > 0 ? ` ${campaign.stats.totalOpened} opened` : ""}
          </span>
        )}
      </div>

      {/* Footer: feedback link + launch */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2
        border-t border-gray-100 dark:border-gray-800">

        {/* Feedback page link (if exists) */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
        </div>

        {/* Launch / status control */}
        <LaunchButton campaign={campaign} onStatusChange={handleStatusChange} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function CampaignsList({ onCreateNew }) {
  const [campaigns,   setCampaigns]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState("");
  const [page,        setPage]        = useState(1);
  const [pagination,  setPagination]  = useState(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search)       params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const { data } = await api.get(`/api/campaigns?${params}`);
      setCampaigns(data.campaigns);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/api/campaigns/${id}/duplicate`);
      fetchCampaigns();
    } catch (_) {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this campaign? This cannot be undone.")) return;
    try {
      await api.delete(`/api/campaigns/${id}`);
      setCampaigns((prev) => prev.filter((c) => c.campaignId !== id));
    } catch (_) {}
  };

  const STATUSES = ["", "draft", "scheduled", "running", "paused", "completed", "cancelled"];

  return (
    <div className="p-4 md:p-6 text-gray-800 dark:text-gray-200 w-full max-w-5xl mx-auto">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage and track your review campaigns
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchCampaigns}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700
              bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
              bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
          >
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>

      {/* ── Credits widget ───────────────────────────────────── */}
      <div className="mb-5">
        <CreditsWidget compact />
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search campaigns..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200
              placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
              focus:border-transparent transition"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="appearance-none pl-8 pr-7 py-2 rounded-xl text-xs font-semibold
              bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-300
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            <option value="">All Status</option>
            {STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-36 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20
          border border-red-200 dark:border-red-700 text-red-600 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl">
            🚀
          </div>
          <div>
            <p className="font-bold text-gray-700 dark:text-gray-300">No campaigns yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first campaign to start collecting reviews</p>
          </div>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
              bg-blue-600 hover:bg-blue-500 text-white transition"
          >
            <Plus size={16} /> Create Campaign
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.campaignId}
              campaign={c}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onCreateNew={onCreateNew}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────── */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
          <p className="text-xs text-gray-400">
            {pagination.total} total campaigns
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={!pagination.hasPrev}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="text-xs font-semibold text-gray-500 px-2">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}