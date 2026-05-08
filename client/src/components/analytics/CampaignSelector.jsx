import { useState, useRef, useEffect } from 'react';

const statusStyle = (status) => {
  if (!status) return { dot: 'bg-slate-300', badge: 'text-slate-500 bg-slate-100' };
  const s = status.toLowerCase();
  if (s === 'sent' || s === 'active')    return { dot: 'bg-emerald-400', badge: 'text-emerald-700 bg-emerald-50 border-emerald-100' };
  if (s === 'draft')                      return { dot: 'bg-amber-400',   badge: 'text-amber-700  bg-amber-50  border-amber-100'  };
  if (s === 'scheduled')                  return { dot: 'bg-blue-400',    badge: 'text-blue-700   bg-blue-50   border-blue-100'   };
  if (s === 'paused' || s === 'stopped') return { dot: 'bg-red-400',     badge: 'text-red-600    bg-red-50    border-red-100'    };
  return { dot: 'bg-slate-300', badge: 'text-slate-500 bg-slate-100' };
};

export default function CampaignSelector({ campaigns = [], selected, onChange, loading = false }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  const selectedCampaign = campaigns.find(c => (c.id || c._id) === selected);

  const filtered = campaigns.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (campaign) => {
    onChange(campaign.id || campaign._id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative font-sans" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => !loading && setOpen(o => !o)}
        className={`
          flex items-center justify-between gap-3 min-w-[260px] max-w-full
          bg-white border rounded-xl px-4 py-2.5 cursor-pointer
          transition-all duration-150 text-left
          ${open
            ? 'border-blue-400 ring-2 ring-blue-100 shadow-sm'
            : 'border-slate-200 hover:border-blue-300 hover:shadow-sm shadow-none'
          }
        `}
      >
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            Loading campaigns…
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Campaign</div>
                {selectedCampaign
                  ? <div className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">{selectedCampaign.name}</div>
                  : <div className="text-sm text-slate-400">Select a campaign…</div>
                }
              </div>
            </div>
            <svg
              className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && !loading && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[280px] animate-[dropIn_0.16s_ease-out]">
          <style>{`
            @keyframes dropIn {
              from { opacity:0; transform:translateY(-6px) scale(0.98); }
              to   { opacity:1; transform:none; }
            }
          `}</style>

          {campaigns.length > 5 && (
            <div className="p-2.5 border-b border-slate-100">
              <input
                autoFocus
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 font-mono transition"
                placeholder="Search campaigns…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-sm font-mono">No campaigns found</div>
            ) : (
              filtered.map(c => {
                const id     = c.id || c._id;
                const st     = statusStyle(c.status);
                const active = id === selected;
                return (
                  <div
                    key={id}
                    onClick={() => select(c)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-100
                      ${active ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${active ? 'text-blue-700' : 'text-slate-700'}`}>
                        {c.name}
                      </div>
                      {c.createdAt && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                    {c.status && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${st.badge}`}>
                        {c.status}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}