import { useState } from 'react';
import { useDashboardAnalytics, useCampaignAnalytics } from '../../hooks/useAnalytics';
import StatCard         from '../../components/analytics/StatCard';
import StatsChart       from '../../components/analytics/StatsChart';
import CampaignSelector from '../../components/analytics/CampaignSelector';
import EmailStatsTable  from '../../components/analytics/EmailStatsTable';

// ─── Quota Bar ────────────────────────────────────────────────
function QuotaBar({ quota }) {
  if (!quota) return null;
  const used  = quota.used  ?? quota.emailsSent  ?? 0;
  const total = quota.total ?? quota.emailsLimit ?? 0;
  if (!total) return null;
  const pct  = Math.min((used / total) * 100, 100);
  const warn = pct > 80;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Monthly Quota</span>
        <span className={`text-xs font-mono font-semibold ${warn ? 'text-amber-600' : 'text-emerald-600'}`}>
          {used.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${warn ? 'bg-gradient-to-r from-amber-400 to-red-400' : 'bg-gradient-to-r from-blue-500 to-emerald-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-[10px] text-slate-400 font-mono">
        {pct.toFixed(1)}% used · {(total - used).toLocaleString()} remaining
        {quota.resetDate && ` · Resets ${new Date(quota.resetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 font-mono mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────
function Skeleton({ h = 80, rounded = 'rounded-2xl' }) {
  return (
    <div
      className={`${rounded} bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse`}
      style={{ height: h, backgroundSize: '400% 100%' }}
    />
  );
}

// ─── Error Banner ─────────────────────────────────────────────
function ErrorBanner({ msg }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-mono">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {msg}
    </div>
  );
}

// ─── Card builders ────────────────────────────────────────────
function buildOverviewCards(overview) {
  if (!overview) return [];
  const total = overview.totalSent || overview.sent || 0;
  return [
    { title: 'Total Sent',    value: overview.totalSent ?? overview.sent,                             type: 'sent',         subtitle: 'All campaigns' },
    { title: 'Delivered',     value: overview.delivered,  rate: total ? (overview.delivered/total*100) : undefined,          type: 'delivered'    },
    { title: 'Opened',        value: overview.opened    ?? overview.uniqueOpens,  rate: overview.openRate  ?? (total ? (overview.opened/total*100) : undefined),  type: 'opened'       },
    { title: 'Clicked',       value: overview.clicked   ?? overview.uniqueClicks, rate: overview.clickRate ?? (total ? (overview.clicked/total*100) : undefined), type: 'clicked'      },
    { title: 'Bounced',       value: overview.bounced,    rate: overview.bounceRate ?? (total ? (overview.bounced/total*100) : undefined),                        type: 'bounced'      },
    { title: 'Unsubscribed',  value: overview.unsubscribed ?? overview.unsubscribes, rate: overview.unsubscribeRate,                                              type: 'unsubscribed' },
  ].filter(c => c.value !== undefined && c.value !== null);
}

function buildCampaignCards(stats) {
  if (!stats) return [];
  const s = stats.stats || stats;
  const total = s.totalSent || s.sent || 0;
  return [
    { title: 'Sent',         value: s.sent        ?? s.totalSent,    type: 'sent'         },
    { title: 'Delivered',    value: s.delivered,   rate: s.deliveryRate ?? (total ? (s.delivered/total*100)  : undefined), type: 'delivered'    },
    { title: 'Opened',       value: s.opened       ?? s.uniqueOpens,  rate: s.openRate,    type: 'opened'       },
    { title: 'Clicked',      value: s.clicked      ?? s.uniqueClicks, rate: s.clickRate,   type: 'clicked'      },
    { title: 'Bounced',      value: s.bounced,                        rate: s.bounceRate,  type: 'bounced'      },
    { title: 'Unsubscribed', value: s.unsubscribed ?? s.unsubscribes, rate: s.unsubRate,   type: 'unsubscribed' },
  ].filter(c => c.value !== undefined && c.value !== null);
}

// ─── Divider ──────────────────────────────────────────────────
const Divider = () => <hr className="border-none border-t border-slate-100 my-0" />;

// ─── Main Dashboard ───────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const {
    overview, dailyStats, quota,
    loading: dashLoading, error: dashError, fromCache: dashCache,
    refresh: refreshDash,
  } = useDashboardAnalytics();

  const {
    stats: campStats, daily: campDaily,
    loading: campLoading, error: campError,
    refresh: refreshCamp,
  } = useCampaignAnalytics(selectedCampaign);

  const campaignList  = overview?.campaigns || [];
  const overviewCards = buildOverviewCards(overview);
  const campaignCards = buildCampaignCards(campStats);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 font-bold text-slate-800 text-[15px] tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            Analytics
          </div>

          {/* Live dot */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>

          <div className="ml-auto flex items-center gap-2">
            {dashCache && (
              <span className="px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider font-mono">
                Cached
              </span>
            )}
            <button
              onClick={() => { refreshDash(); if (selectedCampaign) refreshCamp(); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 shadow-none hover:shadow-sm"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* Page title */}
        <div className="animate-[fadeUp_0.35s_ease_both]">
          <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }`}</style>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Email Analytics</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            {overview?.period || 'Last 30 days'} · All campaigns overview
          </p>
        </div>

        {/* Errors */}
        {dashError && <ErrorBanner msg={dashError} />}

        {/* Quota */}
        {quota && <QuotaBar quota={quota} />}

        {/* ── Overview stats ── */}
        <section className="flex flex-col gap-4">
          <SectionHeader title="Overview" subtitle="Aggregate performance across all campaigns" />
          {dashLoading ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} h={140} />)}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} h={110} />)}
              </div>
            </div>
          ) : overviewCards.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {overviewCards.filter(c => ['sent','opened','clicked'].includes(c.type)).map(card => (
                  <StatCard key={card.type} {...card} />
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {overviewCards.filter(c => !['sent','opened','clicked'].includes(c.type)).map(card => (
                  <StatCard key={card.type} {...card} />
                ))}
              </div>
            </div>
          ) : !dashError && (
            <p className="text-sm text-slate-400 font-mono py-2">No overview data available</p>
          )}
        </section>

        <Divider />

        {/* ── Daily trends chart ── */}
        <section className="flex flex-col gap-4">
          <SectionHeader title="Daily Trends" subtitle="30-day email activity breakdown" />
          {dashLoading
            ? <Skeleton h={320} />
            : <StatsChart dailyStats={dailyStats} title="30-Day Performance" />
          }
        </section>

        <Divider />

        {/* ── Campaign drill-down ── */}
        <section className="flex flex-col gap-5">
          <SectionHeader title="Campaign Drill-down" subtitle="Select a campaign for detailed stats" />

          <div className="flex items-center flex-wrap gap-3">
            <CampaignSelector
              campaigns={campaignList}
              selected={selectedCampaign}
              onChange={setSelectedCampaign}
              loading={dashLoading}
            />
            {campStats?.fromCache && (
              <span className="px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider font-mono">
                Cached
              </span>
            )}
          </div>

          {selectedCampaign && (
            <div className="flex flex-col gap-6">
              {campError && <ErrorBanner msg={campError} />}

              {/* Campaign stat cards */}
              {campLoading ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} h={140} />)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} h={110} />)}
                  </div>
                </div>
              ) : campaignCards.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {campaignCards.filter(c => ['sent','opened','clicked'].includes(c.type)).map(card => (
                      <StatCard key={card.type} {...card} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {campaignCards.filter(c => !['sent','opened','clicked'].includes(c.type)).map(card => (
                      <StatCard key={card.type} {...card} />
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Campaign chart */}
              {campLoading
                ? <Skeleton h={300} />
                : <StatsChart dailyStats={campDaily} title="Campaign Daily Breakdown (14 days)" />
              }

              {/* Customer table */}
              <EmailStatsTable campaignId={selectedCampaign} />
            </div>
          )}
        </section>

      </main>
    </div>
  );
}