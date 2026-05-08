import { useState, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, AreaChart, Area, BarChart, Bar,
} from 'recharts';

const METRICS = [
  { key: 'sent',         label: 'Sent',        color: '#3B82F6' },
  { key: 'delivered',    label: 'Delivered',   color: '#10B981' },
  { key: 'opened',       label: 'Opened',      color: '#F59E0B' },
  { key: 'clicked',      label: 'Clicked',     color: '#8B5CF6' },
  { key: 'bounced',      label: 'Bounced',     color: '#EF4444' },
  { key: 'unsubscribed', label: 'Unsubscribed',color: '#94A3B8' },
];

const CHART_TYPES = [
  { id: 'area', label: 'Area' },
  { id: 'line', label: 'Line' },
  { id: 'bar',  label: 'Bar'  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs font-mono min-w-[140px]">
      <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-2">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-semibold text-slate-800">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function StatsChart({ dailyStats = [], title = 'Email Performance' }) {
  const [activeMetrics, setActiveMetrics] = useState(['sent', 'opened', 'clicked']);
  const [chartType,     setChartType]     = useState('area');

  const data = useMemo(() =>
    (dailyStats || []).map(d => ({
      ...d,
      date: d.date
        ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : d.date,
    })),
  [dailyStats]);

  const toggleMetric = (key) => {
    setActiveMetrics(prev =>
      prev.includes(key)
        ? prev.length > 1 ? prev.filter(k => k !== key) : prev
        : [...prev, key]
    );
  };

  const visibleMetrics = METRICS.filter(m => activeMetrics.includes(m.key));

  const axisProps = {
    tick: { fill: '#94A3B8', fontSize: 11, fontFamily: 'ui-monospace,monospace' },
    axisLine: false,
    tickLine: false,
  };

  const commonProps = {
    data,
    margin: { top: 8, right: 8, left: -16, bottom: 0 },
  };

  const renderChart = () => {
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />;
    const xAxis = <XAxis dataKey="date" {...axisProps} />;
    const yAxis = (
      <YAxis
        {...axisProps}
        tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
      />
    );
    const tip = <Tooltip content={<CustomTooltip />} />;

    if (chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tip}
          {visibleMetrics.map(m => (
            <Bar key={m.key} dataKey={m.key} name={m.label} fill={m.color}
              radius={[4, 4, 0, 0]} maxBarSize={36} opacity={0.85} />
          ))}
        </BarChart>
      );
    }

    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tip}
          {visibleMetrics.map(m => (
            <Line key={m.key} type="monotone" dataKey={m.key} name={m.label}
              stroke={m.color} strokeWidth={2} dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }} />
          ))}
        </LineChart>
      );
    }

    return (
      <AreaChart {...commonProps}>
        <defs>
          {visibleMetrics.map(m => (
            <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={m.color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={m.color} stopOpacity={0}    />
            </linearGradient>
          ))}
        </defs>
        {grid}{xAxis}{yAxis}{tip}
        {visibleMetrics.map(m => (
          <Area key={m.key} type="monotone" dataKey={m.key} name={m.label}
            stroke={m.color} strokeWidth={2} fill={`url(#grad-${m.key})`}
            dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        ))}
      </AreaChart>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
        <div className="flex gap-1">
          {CHART_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setChartType(t.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold font-mono transition-all duration-150
                ${chartType === t.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {METRICS.map(m => {
          const isActive = activeMetrics.includes(m.key);
          return (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase
                border transition-all duration-150
                ${isActive
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-slate-200 text-slate-400 bg-white hover:border-slate-300 hover:text-slate-600'
                }`}
              style={isActive ? { background: m.color, borderColor: m.color } : {}}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isActive ? 'rgba(255,255,255,0.7)' : m.color }}
              />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-300 gap-3">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span className="text-sm font-mono">No data available</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={270}>
          {renderChart()}
        </ResponsiveContainer>
      )}
    </div>
  );
}