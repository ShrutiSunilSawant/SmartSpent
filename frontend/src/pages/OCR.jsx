/**
 * OCR.jsx — Professional receipt & invoice scanner
 */
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, CheckCircle, Loader2, ReceiptText,
  Pencil, Save, Trash2, FileText, Image as ImageIcon,
  AlertCircle, ShieldCheck,
} from "lucide-react";
import { ocrApi, expenseApi } from "../services/api";

const CATEGORIES = [
  "Food","Transport","Entertainment","Shopping",
  "Health","Utilities","Travel","Education","Other",
];

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
      {label}
    </label>
    {children}
  </div>
);

const ConfidenceBadge = ({ value }) => {
  const color = value >= 70 ? "emerald" : value >= 40 ? "amber" : "red";
  const label = value >= 70 ? "High" : value >= 40 ? "Medium" : "Low";
  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold text-${color}-400`}>
      <ShieldCheck size={13} />
      {label} confidence · {value.toFixed(0)}%
    </div>
  );
};

export default function OCR() {
  const [preview, setPreview]     = useState(null);
  const [file, setFile]           = useState(null);
  const [isPdf, setIsPdf]         = useState(false);
  const [scanning, setScanning]   = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [form, setForm]           = useState(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState(null);
  const [warning, setWarning]     = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const f = acceptedFiles[0];
    if (!f) return;
    setOcrResult(null); setForm(null); setSaved(false);
    setError(null); setWarning(null);
    setFile(f);
    const pdf = f.type === "application/pdf";
    setIsPdf(pdf);
    if (!pdf) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg",".jpeg",".png",".webp",".bmp"], "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleScan = async () => {
    if (!file) return;
    setScanning(true); setError(null); setWarning(null);
    try {
      const data = await ocrApi.scan(file);
      if (data.error && !data.amount && !data.merchant) {
        setError(data.error); return;
      }
      if (data.error) setWarning(data.error);
      setOcrResult(data);
      setForm({
        amount:      data.amount ?? "",
        merchant:    data.merchant ?? "",
        date:        data.date ? new Date(data.date).toISOString().split("T")[0]
                               : new Date().toISOString().split("T")[0],
        category:    data.predicted_category ?? "Other",
        description: data.raw_text?.slice(0, 120) ?? "",
        currency:    "USD",
      });
    } catch (err) {
      setError(err.message || "Scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true); setError(null);
    try {
      await expenseApi.create({
        amount:      parseFloat(form.amount),
        merchant:    form.merchant,
        date:        form.date,
        category:    form.category,
        description: form.description,
        currency:    form.currency,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPreview(null); setFile(null); setIsPdf(false);
    setOcrResult(null); setForm(null);
    setSaved(false); setError(null); setWarning(null);
  };

  const updateField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}>
        <h1 className="text-2xl font-bold text-white font-display flex items-center gap-2">
          <ReceiptText size={22} className="text-brand-400" />
          Receipt & Invoice Scanner
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload a receipt or PDF invoice — AI extracts amount, merchant, and date automatically.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left panel ── */}
        <div className="space-y-4">

          {/* Drop zone */}
          <motion.div
            initial={{ opacity:0, scale:0.98 }} animate={{ opacity:1, scale:1 }}
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
              transition-all duration-200
              ${isDragActive
                ? "border-brand-400 bg-brand-500/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className={`p-4 rounded-2xl ${isDragActive ? "bg-brand-500/20" : "bg-white/5"}`}>
                <Upload size={28} className={isDragActive ? "text-brand-400" : "text-gray-500"} />
              </div>
              <div>
                <p className="text-white font-semibold">
                  {isDragActive ? "Drop it here!" : "Drag & drop a file"}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  or <span className="text-brand-400 underline underline-offset-2">browse files</span>
                </p>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <ImageIcon size={12} /> JPG, PNG, WEBP
                </span>
                <span className="text-gray-700">·</span>
                <span className="flex items-center gap-1 text-xs text-gray-600">
                  <FileText size={12} /> PDF Invoice
                </span>
                <span className="text-gray-700">·</span>
                <span className="text-xs text-gray-600">max 10 MB</span>
              </div>
            </div>
          </motion.div>

          {/* File preview */}
          <AnimatePresence>
            {(preview || isPdf) && (
              <motion.div
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02]"
              >
                {isPdf ? (
                  <div className="flex items-center gap-3 p-4">
                    <div className="p-3 rounded-xl bg-red-500/10">
                      <FileText size={24} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{file?.name}</p>
                      <p className="text-gray-500 text-xs">
                        {(file?.size / 1024).toFixed(0)} KB · PDF Invoice
                      </p>
                    </div>
                  </div>
                ) : (
                  <img
                    src={preview} alt="Receipt preview"
                    className="w-full max-h-72 object-contain"
                  />
                )}
                <button
                  onClick={handleReset}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40
                             text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scan button */}
          {file && !saved && (
            <motion.button
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              onClick={handleScan} disabled={scanning}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {scanning ? (
                <><Loader2 size={16} className="animate-spin" /> Scanning…</>
              ) : (
                <><ReceiptText size={16} /> Scan {isPdf ? "Invoice" : "Receipt"}</>
              )}
            </motion.button>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
            >
              <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Warning */}
          {warning && !error && (
            <motion.div
              initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
            >
              <AlertCircle size={15} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-amber-400 text-sm">{warning}</p>
            </motion.div>
          )}
        </div>

        {/* ── Right panel ── */}
        <AnimatePresence mode="wait">

          {/* Empty state */}
          {!ocrResult && !saved && !scanning && (
            <motion.div key="empty"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="glass-card flex flex-col items-center justify-center text-center
                         p-10 text-gray-600 space-y-3 min-h-[300px] rounded-2xl"
            >
              <ReceiptText size={40} className="text-gray-700" />
              <p className="text-sm">Upload and scan a receipt to see extracted fields here</p>
            </motion.div>
          )}

          {/* Scanning */}
          {scanning && (
            <motion.div key="scanning"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="glass-card flex flex-col items-center justify-center gap-4
                         min-h-[300px] rounded-2xl"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-brand-500/20 flex items-center justify-center">
                  <Loader2 size={28} className="animate-spin text-brand-400" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Scanning…</p>
                <p className="text-gray-500 text-xs mt-1">OpenCV → Tesseract → ML classifier</p>
              </div>
            </motion.div>
          )}

          {/* Success */}
          {saved && (
            <motion.div key="saved"
              initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
              className="glass-card flex flex-col items-center justify-center gap-4
                         min-h-[300px] rounded-2xl border border-emerald-500/30"
            >
              <div className="p-4 rounded-full bg-emerald-500/10">
                <CheckCircle size={40} className="text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">Expense Saved!</p>
                <p className="text-gray-400 text-sm mt-1">
                  {form?.merchant} · ${parseFloat(form?.amount || 0).toFixed(2)}
                </p>
              </div>
              <button onClick={handleReset} className="btn-primary mt-2">
                Scan Another
              </button>
            </motion.div>
          )}

          {/* Confirm form */}
          {form && !saved && (
            <motion.div key="form"
              initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
              className="glass-card p-6 space-y-4 rounded-2xl"
            >
              {/* Form header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Pencil size={14} className="text-brand-400" />
                  <span className="text-white font-semibold">Review & Confirm</span>
                </div>
                {ocrResult?.confidence !== undefined && (
                  <ConfidenceBadge value={ocrResult.confidence} />
                )}
              </div>

              <Field label="Amount ($)">
                <input type="number" step="0.01" value={form.amount}
                  onChange={e => updateField("amount", e.target.value)}
                  className="input-field text-lg font-bold" placeholder="0.00" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Merchant">
                  <input type="text" value={form.merchant}
                    onChange={e => updateField("merchant", e.target.value)}
                    className="input-field" placeholder="e.g. Starbucks" />
                </Field>
                <Field label="Date">
                  <input type="date" value={form.date}
                    onChange={e => updateField("date", e.target.value)}
                    className="input-field" />
                </Field>
              </div>

              <Field label="Category">
                <select value={form.category}
                  onChange={e => updateField("category", e.target.value)}
                  className="input-field">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <Field label="Description (optional)">
                <input type="text" value={form.description}
                  onChange={e => updateField("description", e.target.value)}
                  className="input-field" placeholder="Short note…" />
              </Field>

              <button
                onClick={handleSave}
                disabled={saving || !form.amount || !form.merchant}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
              >
                {saving ? (
                  <><Loader2 size={15} className="animate-spin" /> Saving…</>
                ) : (
                  <><Save size={15} /> Save Expense</>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Raw OCR debug */}
      <AnimatePresence>
        {ocrResult?.raw_text && (
          <motion.details
            initial={{ opacity:0 }} animate={{ opacity:1 }}
            className="glass-card p-4 rounded-2xl"
          >
            <summary className="text-sm text-gray-500 cursor-pointer select-none hover:text-gray-300 transition">
              Raw OCR text (debug)
            </summary>
            <pre className="mt-3 text-xs text-gray-500 whitespace-pre-wrap font-mono
                            bg-black/20 rounded-xl p-3 max-h-40 overflow-y-auto">
              {ocrResult.raw_text}
            </pre>
          </motion.details>
        )}
      </AnimatePresence>
    </div>
  );
}
