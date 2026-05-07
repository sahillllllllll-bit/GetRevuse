import React, { useRef, useState, useCallback } from "react";
import {
  Upload, FileText, Table2, PenLine,
  X, AlertCircle, CheckCircle2, ChevronDown,
} from "lucide-react";
import { REVIEW_PLATFORMS, CHANNELS } from "../../utils/campaignHelpers";

// ─── Reusable Field wrapper ───────────────────────────────────────────────────
function Field({ label, required, error, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {label} {required && <span className="text-blue-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{hint}</p>
      )}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Styled input ─────────────────────────────────────────────────────────────
function Input({ error, className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl text-sm
        bg-gray-50 dark:bg-gray-800/80
        border ${error
          ? "border-red-400 dark:border-red-500 focus:ring-red-400"
          : "border-gray-200 dark:border-gray-700 focus:ring-blue-500"}
        text-gray-800 dark:text-gray-200
        placeholder-gray-400 dark:placeholder-gray-600
        focus:outline-none focus:ring-2 focus:border-transparent transition ${className}`}
    />
  );
}

// ─── Channel card ─────────────────────────────────────────────────────────────
const CHANNEL_COLORS = {
  blue:   { active: "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
            ring:   "ring-blue-200 dark:ring-blue-800" },
  green:  { active: "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
            ring:   "ring-green-200 dark:ring-green-800" },
  purple: { active: "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
            ring:   "ring-purple-200 dark:ring-purple-800" },
};

function ChannelCard({ ch, selected, onClick, disabled }) {
  const col = CHANNEL_COLORS[ch.color];
  return (
    <div className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all text-center
          ${disabled 
            ? "opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600"
            : selected
            ? `${col.active} ring-2 ${col.ring} shadow-sm cursor-pointer`
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer"
          }`}
      >
        <span className="text-2xl">{ch.icon}</span>
        <span className="text-xs font-bold leading-tight">{ch.label}</span>
        <span className="text-[10px] opacity-70 leading-tight hidden sm:block">{ch.desc}</span>
      </button>
      {disabled && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-white dark:bg-gray-900 px-2 py-1 rounded-lg">
            Launching in 7 days
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Manual entry table ───────────────────────────────────────────────────────
function ManualTable({ rows, onChange }) {
  const addRow    = () => onChange([...rows, { name: "", email: "", phone: "" }]);
  const removeRow = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const updateCell = (i, key, val) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));

  return (
    <div className="flex flex-col gap-2">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-1.5 px-1">
        {["Name *", "Email", "Phone / Mobile"].map((h) => (
          <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {h}
          </span>
        ))}
        <span />
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-0.5">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-1.5">
            {(["name", "email", "phone"]).map((key) => (
              <input
                key={key}
                value={row[key]}
                onChange={(e) => updateCell(i, key, e.target.value)}
                placeholder={
                  key === "name"  ? "John Doe"        :
                  key === "email" ? "john@email.com"  :
                                   "+1 234 567 890"
                }
                className="w-full px-2.5 py-2 rounded-lg text-xs
                  bg-white dark:bg-gray-800
                  border border-gray-200 dark:border-gray-700
                  text-gray-800 dark:text-gray-200
                  placeholder-gray-400 dark:placeholder-gray-600
                  focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            ))}
            <button
              onClick={() => removeRow(i)}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addRow}
        className="self-start text-xs font-semibold text-blue-600 dark:text-blue-400
          hover:underline mt-1 transition"
      >
        + Add row
      </button>
    </div>
  );
}

// ─── Drop zone ────────────────────────────────────────────────────────────────
function DropZone({ icon, title, sub, accent, loaded, count, onClick, onDrop, inputRef, accept, onChange }) {
  const [drag, setDrag] = useState(false);
  const colors = {
    blue:  { border: "hover:border-blue-400",  drag: "border-blue-500 bg-blue-50 dark:bg-blue-900/20" },
    green: { border: "hover:border-green-400", drag: "border-green-500 bg-green-50 dark:bg-green-900/20" },
  };
  const c = colors[accent] || colors.blue;
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); onDrop(e); }}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl
        border-2 border-dashed cursor-pointer transition
        ${drag ? c.drag : `border-gray-200 dark:border-gray-700 ${c.border} hover:bg-gray-50 dark:hover:bg-gray-800/50`}`}
    >
      <div className="text-gray-400">{icon}</div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
      {loaded && count > 0 && (
        <div className="flex items-center gap-2 text-green-600 text-xs font-bold
          bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-700">
          <CheckCircle2 size={13} /> {count} customers loaded
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onChange} />
    </div>
  );
}

// ─── DATA SOURCE OPTIONS ──────────────────────────────────────────────────────
const DS_OPTIONS = [
  { value: "csv",    label: "CSV File",       icon: <FileText size={14} /> },
  { value: "excel",  label: "Excel File",     icon: <Table2   size={14} /> },
  { value: "manual", label: "Enter Manually", icon: <PenLine  size={14} /> },
];

// ═══════════════════════════════════════════════════════════════════════════════
export default function Step1_Basics({ form, update, errors, applyCSV, applyManual, applyExcel, parseErrors }) {
  const csvRef  = useRef();
  const xlsxRef = useRef();

  const currentPlatform = REVIEW_PLATFORMS.find((p) => p.value === form.platform) || REVIEW_PLATFORMS[0];

  // ── File handlers ───────────────────────────────────────────────
  const handleCSVFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => applyCSV(e.target.result);
    reader.readAsText(file);
  }, [applyCSV]);

  const handleExcelFile = useCallback(async (file) => {
    if (!file) return;
    try {
      // Dynamically load SheetJS from CDN
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const buf  = await file.arrayBuffer();
      const wb   = window.XLSX.read(buf, { type: "array" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const json = window.XLSX.utils.sheet_to_json(ws, { defval: "" });
      const rows = json.map((r) => ({
        name:  String(r.name  || r.Name  || r.NAME  || ""),
        email: String(r.email || r.Email || r.EMAIL || ""),
        phone: String(r.phone || r.Phone || r.PHONE || r.mobile || r.Mobile || ""),
      }));
      applyExcel(rows);
    } catch {
      alert("Could not read Excel file. Please try CSV instead.");
    }
  }, [applyExcel]);

  const handleDrop = useCallback((e, type) => {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.name.endsWith(".csv")) { update("dataSource", "csv");   handleCSVFile(file); }
    else if (file.name.match(/\.xlsx?$/)) { update("dataSource", "excel"); handleExcelFile(file); }
  }, [handleCSVFile, handleExcelFile, update]);

  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-6">

      {/* ── Business Name ──────────────────────────────────────── */}
      <Field label="Business Name" required error={errors.businessName}>
        <Input
          value={form.businessName}
          onChange={(e) => update("businessName", e.target.value)}
          placeholder="e.g. Glam Studio, AutoFix Garage, Sunrise Cafe"
          error={errors.businessName}
        />
      </Field>

      {/* ── Platform + Review Link ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Review Platform">
          <div className="relative">
            <select
              value={form.platform}
              onChange={(e) => update("platform", e.target.value)}
              className="w-full appearance-none px-3.5 py-2.5 rounded-xl text-sm pr-9
                bg-gray-50 dark:bg-gray-800/80
                border border-gray-200 dark:border-gray-700
                text-gray-800 dark:text-gray-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              {REVIEW_PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>{p.flag} {p.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </Field>

        <Field
          label="Your Review Link"
          required
          error={errors.reviewLink}
          hint={`e.g. ${currentPlatform.placeholder}`}
        >
          <Input
            value={form.reviewLink}
            onChange={(e) => update("reviewLink", e.target.value)}
            placeholder={currentPlatform.placeholder}
            error={errors.reviewLink}
          />
        </Field>
      </div>

      {/* ── Messaging Channel ──────────────────────────────────── */}
      <Field label="Messaging Channel" required>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          {CHANNELS.map((ch) => (
            <ChannelCard
              key={ch.value}
              ch={ch}
              selected={form.channel === ch.value}
              onClick={() => update("channel", ch.value)}
              disabled={ch.value !== "email"}
            />
          ))}
        </div>
        
        {/* Coming Soon Warning */}
        <div className="mt-1 p-1 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 flex items-start gap-2">
          {/* <span className="text-lg"></span> */}
          <div>
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">
              SMS only  and Both Email and sms  options will come soon
            </p>
          </div>
        </div>
      </Field>

      {/* ── Customer Data ──────────────────────────────────────── */}
      <Field label="Customer Data" required error={errors.customers}>

        {/* Source picker buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {DS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("dataSource", opt.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition
                ${form.dataSource === opt.value
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600"
                }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        {/* CSV */}
        {form.dataSource === "csv" && (
          <DropZone
            icon={<FileText size={32} />}
            title="Drop CSV file or click to upload"
            sub="Columns: name, email, phone — any order, auto-detected"
            accent="blue"
            loaded={form.customers.length > 0}
            count={form.customers.length}
            onClick={() => csvRef.current?.click()}
            onDrop={handleDrop}
            inputRef={csvRef}
            accept=".csv"
            onChange={(e) => handleCSVFile(e.target.files[0])}
          />
        )}

        {/* Excel */}
        {form.dataSource === "excel" && (
          <DropZone
            icon={<Table2 size={32} />}
            title="Drop Excel file or click to upload"
            sub="Supports .xlsx and .xls — first sheet used automatically"
            accent="green"
            loaded={form.customers.length > 0}
            count={form.customers.length}
            onClick={() => xlsxRef.current?.click()}
            onDrop={handleDrop}
            inputRef={xlsxRef}
            accept=".xlsx,.xls"
            onChange={(e) => handleExcelFile(e.target.files[0])}
          />
        )}

        {/* Manual */}
        {form.dataSource === "manual" && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <ManualTable
              rows={form.manualRows}
              onChange={(rows) => {
                update("manualRows", rows);
                applyManual(rows);
              }}
            />
            {form.customers.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-green-600 font-semibold mt-3">
                <CheckCircle2 size={13} /> {form.customers.length} valid customers ready
              </p>
            )}
          </div>
        )}

        {/* Nothing selected */}
        {!form.dataSource && (
          <div className="flex flex-col items-center justify-center gap-2 p-8
            rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
            text-gray-400 text-sm">
            <Upload size={24} />
            <p>Select a data source above to add customers</p>
          </div>
        )}

        {/* Parse errors */}
        {parseErrors?.length > 0 && (
          <div className="mt-2 p-3 rounded-xl
            bg-amber-50 dark:bg-amber-900/20
            border border-amber-200 dark:border-amber-700">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
              ⚠ Some rows were skipped due to errors:
            </p>
            <ul className="text-xs text-amber-600 dark:text-amber-500 space-y-0.5 max-h-24 overflow-y-auto">
              {parseErrors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          </div>
        )}
      </Field>
    </div>
  );
}