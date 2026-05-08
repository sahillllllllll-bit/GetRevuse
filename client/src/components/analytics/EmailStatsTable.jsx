import { useState } from 'react';
import { useCampaignCustomers } from '../../hooks/useAnalytics';

const statusStyle = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'delivered') return 'text-emerald-700 bg-emerald-50 border-emerald-100';
  if (s === 'bounced' || s === 'failed') return 'text-red-600 bg-red-50 border-red-100';
  if (s === 'sent')    return 'text-blue-700 bg-blue-50 border-blue-100';
  if (s === 'pending') return 'text-amber-700 bg-amber-50 border-amber-100';
  return 'text-slate-500 bg-slate-100 border-slate-200';
};

const statusDot = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'delivered') return 'bg-emerald-400';
  if (s === 'bounced' || s === 'failed') return 'bg-red-400';
  if (s === 'sent')    return 'bg-blue-400';
  if (s === 'pending') return 'bg-amber-400';
  return 'bg-slate-300';
};

function BoolIcon({ value }) {
  if (value === true || value === 'true' || value === 1) {
    return <span className="text-emerald-500 text-base leading-none">✓</span>;
  }
  return <span className="text-slate-300 text-base leading-none">—</span>;
}

const BOOL_FILTERS = [
  { key: 'opened',   label: 'Opened'   },
  { key: 'clicked',  label: 'Clicked'  },
  { key: 'feedback', label: 'Feedback' },
];

export default function EmailStatsTable({ campaignId }) {
  const {
    customers, pagination, loading, error, filters,
    updateFilter, refresh, exportCSV,
  } = useCampaignCustomers(campaignId);

  const [expandedRow, setExpandedRow] = useState(null);

  if (!campaignId) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-300 flex items-center justify-center mx-auto mb-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <p className="text-slate-400 text-sm font-mono">Select a campaign to view customer stats</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex items-center flex-wrap gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <span className="text-sm font-bold text-slate-800 mr-1">Customers</span>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 text-xs font-mono text-slate-700 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            placeholder="Search name or email…"
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
          />
        </div>

        {/* Status select */}
        <select
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer transition"
          value={filters.status}
          onChange={e => updateFilter('status', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="bounced">Bounced</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>

        {/* Routing select */}
        <select
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-600 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer transition"
          value={filters.routing}
          onChange={e => updateFilter('routing', e.target.value)}
        >
          <option value="">All Routing</option>
          <option value="transactional">Transactional</option>
          <option value="marketing">Marketing</option>
        </select>

        {/* Bool filter pills */}
        {BOOL_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => updateFilter(f.key, filters[f.key] === 'true' ? '' : 'true')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-150
              ${filters[f.key] === 'true'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-100'
                : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-500'
              }`}
          >
            {f.label}
          </button>
        ))}

        {/* Refresh */}
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-500 border border-slate-200 bg-white hover:border-slate-300 hover:text-slate-700 transition"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>

        {/* Export */}
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition ml-auto"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div className="flex items-center justify-center gap-2.5 py-16 text-slate-400 text-sm font-mono">
          <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          Loading customers…
        </div>
      ) : error ? (
        <div className="py-8 text-center text-red-500 text-sm font-mono">⚠ {error}</div>
      ) : customers.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-sm font-mono">No customers match the current filters</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                {['Customer', 'Status', 'Routing', 'Opened', 'Clicked', 'Feedback', 'Sent At'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap bg-slate-50/60">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => {
                const id = c._id || c.id || i;
                const isExpanded = expandedRow === id;
                const name = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || null;

                return [
                  <tr
                    key={id}
                    onClick={() => setExpandedRow(isExpanded ? null : id)}
                    className={`border-b border-slate-50 cursor-pointer transition-colors duration-100 ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 text-[13px]">{name || '—'}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{c.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${statusStyle(c.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot(c.status)}`} />
                        {c.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{c.routing || '—'}</td>
                    <td className="px-4 py-3"><BoolIcon value={c.opened} /></td>
                    <td className="px-4 py-3"><BoolIcon value={c.clicked} /></td>
                    <td className="px-4 py-3">
                      {c.feedback
                        ? <span className="text-amber-600 text-xs font-mono">{c.feedback}</span>
                        : <BoolIcon value={false} />
                      }
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400 font-mono whitespace-nowrap">
                      {c.sentAt ? new Date(c.sentAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>,

                  isExpanded && (
                    <tr key={`${id}-exp`} className="bg-blue-50/30 border-b border-blue-100/60">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {[
                            ['Message ID',  c.messageId],
                            ['Open Count',  c.openCount  ?? c.opensCount],
                            ['Click Count', c.clickCount ?? c.clicksCount],
                            ['IP',          c.ip],
                            ['Country',     c.country],
                            ['Updated At',  c.updatedAt && new Date(c.updatedAt).toLocaleString()],
                          ].filter(([, v]) => v != null).map(([label, val]) => (
                            <div key={label}>
                              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</div>
                              <div className="text-xs font-mono text-slate-700 truncate">{String(val)}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination && (
        <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs font-mono text-slate-400">
            {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of <span className="text-slate-600 font-semibold">{pagination.total?.toLocaleString()}</span> customers
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => updateFilter('page', pagination.page - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono border border-slate-200 text-slate-500 bg-white hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              ← Prev
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateFilter('page', pagination.page + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono border border-slate-200 text-slate-500 bg-white hover:border-blue-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}