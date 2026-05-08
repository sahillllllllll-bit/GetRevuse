import { useState } from 'react';

const icons = {
  sent: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  delivered: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  opened: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  clicked: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  bounced: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  unsubscribed: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  default: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
};

const typeStyles = {
  sent:         { icon: 'text-blue-600  bg-blue-50',   bar: 'bg-blue-500',    trend: 'text-blue-600  bg-blue-50'  },
  delivered:    { icon: 'text-emerald-600 bg-emerald-50', bar: 'bg-emerald-500', trend: 'text-emerald-600 bg-emerald-50' },
  opened:       { icon: 'text-amber-600  bg-amber-50',  bar: 'bg-amber-500',   trend: 'text-amber-600  bg-amber-50'  },
  clicked:      { icon: 'text-violet-600 bg-violet-50', bar: 'bg-violet-500',  trend: 'text-violet-600 bg-violet-50' },
  bounced:      { icon: 'text-red-500    bg-red-50',    bar: 'bg-red-400',     trend: 'text-red-500    bg-red-50'    },
  unsubscribed: { icon: 'text-slate-500  bg-slate-100', bar: 'bg-slate-400',   trend: 'text-slate-500  bg-slate-100' },
  default:      { icon: 'text-blue-500   bg-blue-50',   bar: 'bg-blue-400',    trend: 'text-blue-500   bg-blue-50'   },
};

const FEATURED_TYPES = ['sent', 'opened', 'clicked'];

const featuredStyles = {
  sent: {
    gradient: 'from-blue-600 to-blue-500',
    glow:     'shadow-blue-200',
    ring:     'ring-blue-100',
    rateBg:   'bg-blue-500/20',
    rateText: 'text-blue-100',
    subText:  'text-blue-200',
  },
  opened: {
    gradient: 'from-amber-500 to-amber-400',
    glow:     'shadow-amber-200',
    ring:     'ring-amber-100',
    rateBg:   'bg-amber-400/20',
    rateText: 'text-amber-100',
    subText:  'text-amber-200',
  },
  clicked: {
    gradient: 'from-violet-600 to-violet-500',
    glow:     'shadow-violet-200',
    ring:     'ring-violet-100',
    rateBg:   'bg-violet-500/20',
    rateText: 'text-violet-100',
    subText:  'text-violet-200',
  },
};

export default function StatCard({ title, value, rate, type = 'default', trend, subtitle }) {
  const [hovered, setHovered] = useState(false);
  const styles    = typeStyles[type] || typeStyles.default;
  const icon      = icons[type]      || icons.default;
  const isFeatured = FEATURED_TYPES.includes(type);
  const fs        = featuredStyles[type];

  const trendPositive = trend > 0;
  const trendNeutral  = trend === 0 || trend === undefined;

  // ── FEATURED card (Sent / Opened / Clicked) ──────────────────
  if (isFeatured) {
    return (
      <div
        className={`
          relative rounded-2xl p-5 cursor-default overflow-hidden
          bg-gradient-to-br ${fs.gradient}
          transition-all duration-200 ease-out group
          ${hovered
            ? `shadow-xl ${fs.glow} -translate-y-1 ring-2 ${fs.ring}`
            : `shadow-md ${fs.glow}/40`
          }
        `}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Decorative circle */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

        {/* Top row */}
        <div className="flex items-start justify-between mb-4 relative">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 text-white transition-transform duration-200 group-hover:scale-105">
            {icon}
          </div>
          {trend !== undefined && (
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold font-mono bg-white/20 text-white
            `}>
              {!trendNeutral && (trendPositive ? '↑' : '↓')}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        {/* Title */}
        <div className="text-[10px] font-bold tracking-widest uppercase text-white/70 mb-2 relative">
          {title}
        </div>

        {/* Value */}
        <div className="text-4xl font-bold text-white font-mono leading-none mb-3 tracking-tight relative">
          {value?.toLocaleString() ?? '—'}
        </div>

        {/* Rate pill */}
        {rate !== undefined && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${fs.rateBg} relative`}>
            <span className={`text-xs font-mono font-semibold ${fs.rateText}`}>
              {typeof rate === 'number' ? `${rate.toFixed(1)}%` : rate} rate
            </span>
          </div>
        )}

        {/* Subtitle */}
        {subtitle && (
          <div className={`text-[11px] mt-1.5 ${fs.subText} relative`}>{subtitle}</div>
        )}
      </div>
    );
  }

  // ── STANDARD card ─────────────────────────────────────────────
  return (
    <div
      className={`
        relative bg-white rounded-2xl border border-slate-100 p-5 cursor-default
        transition-all duration-200 ease-out overflow-hidden group
        ${hovered ? 'shadow-lg shadow-blue-100/60 -translate-y-0.5 border-blue-100' : 'shadow-sm'}
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="flex items-start justify-between mb-4">
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${styles.icon} transition-transform duration-200 group-hover:scale-105`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`
            flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold font-mono
            ${trendNeutral  ? 'text-slate-400 bg-slate-100' :
              trendPositive ? 'text-emerald-600 bg-emerald-50' :
                              'text-red-500 bg-red-50'}
          `}>
            {!trendNeutral && (trendPositive ? '↑' : '↓')}
            {trend !== undefined ? `${Math.abs(trend)}%` : '—'}
          </div>
        )}
      </div>

      <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2">
        {title}
      </div>
      <div className="text-3xl font-bold text-slate-800 font-mono leading-none mb-2 tracking-tight">
        {value?.toLocaleString() ?? '—'}
      </div>
      {rate !== undefined && (
        <div className="text-xs text-slate-400 font-mono">
          Rate: <span className="text-blue-600 font-semibold">
            {typeof rate === 'number' ? `${rate.toFixed(1)}%` : rate}
          </span>
        </div>
      )}
      {subtitle && <div className="text-[11px] text-slate-300 mt-1">{subtitle}</div>}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${styles.bar} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    </div>
  );
}