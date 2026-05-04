"use client";
import { useRef, useState } from "react";
import { Upload, X, Building2, Plus, FileSpreadsheet, Check, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import {
  useUploads,
  normalizeSheet,
  type ParsedRow,
  CATEGORY_OPTIONS,
  inferCategory,
} from "@/lib/uploads";
import { cn } from "@/lib/utils";

type Step = "company" | "newCompany" | "file" | "preview" | "done";

export function UploadFlow({
  open,
  onClose,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  onComplete?: (batchId: string) => void;
}) {
  const companies = useUploads((s) => s.companies);
  const addCompany = useUploads((s) => s.addCompany);
  const ingestBatch = useUploads((s) => s.ingestBatch);

  const [step, setStep] = useState<Step>("company");
  const [companyMode, setCompanyMode] = useState<"existing" | "new">("existing");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [newCo, setNewCo] = useState({ name: "", shortName: "", code: "", contactEmail: "" });
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("company");
    setCompanyMode("existing");
    setSelectedCompanyId("");
    setNewCo({ name: "", shortName: "", code: "", contactEmail: "" });
    setFileName("");
    setRows([]);
    setError(null);
    setBatchId("");
  };

  const close = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  const continueFromCompanyStep = () => {
    setError(null);
    if (companyMode === "existing") {
      if (!selectedCompanyId) {
        setError("Pick a company.");
        return;
      }
      setStep("file");
    } else {
      setStep("newCompany");
    }
  };

  const submitNewCompany = async () => {
    if (!newCo.name.trim() || !newCo.shortName.trim() || !newCo.code.trim()) {
      setError("Name, short name, and code are required.");
      return;
    }
    setBusy(true);
    try {
      const c = await addCompany({
        name: newCo.name.trim(),
        shortName: newCo.shortName.trim(),
        code: newCo.code.trim(),
        contactEmail: newCo.contactEmail.trim() || undefined,
      });
      setSelectedCompanyId(c.id);
      setStep("file");
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save company.");
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" }) as unknown[][];
      const normalized = normalizeSheet(aoa);
      if (!normalized.length) {
        setError("No rows detected. Check that the first row contains headers.");
        return;
      }
      setRows(normalized);
      setStep("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to read file.");
    }
  };

  const confirmIngest = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await ingestBatch(selectedCompanyId, fileName, rows);
      setBatchId(result.batch.id);
      setStep("done");
      onComplete?.(result.batch.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to ingest batch.");
    } finally {
      setBusy(false);
    }
  };

  const previewGroups = rows.reduce<Record<string, number>>((acc, r) => {
    const cat = inferCategory(String(r.segment ?? ""), String(r.asset ?? ""));
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden border border-ink-500 bg-ink-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <Upload className="h-3.5 w-3.5 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Upload bank assets</p>
          </div>
          <button onClick={close} className="text-bone-400 hover:text-bone-100" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 border border-signal-red/40 bg-signal-red/10 px-3 py-2 font-mono text-[11px] text-signal-red">
              <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
              {error}
            </div>
          )}

          {step === "company" && (
            <div>
              <p className="font-display text-2xl text-bone-100">Which company is this for?</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-bone-400">
                Link this batch to an existing company or onboard a new one.
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <Tile
                  active={companyMode === "existing"}
                  onClick={() => setCompanyMode("existing")}
                  icon={<Building2 className="h-4 w-4" strokeWidth={1.5} />}
                  title="Current company"
                  desc={`Pick from ${companies.length} onboarded`}
                />
                <Tile
                  active={companyMode === "new"}
                  onClick={() => setCompanyMode("new")}
                  icon={<Plus className="h-4 w-4" strokeWidth={1.5} />}
                  title="New company"
                  desc="Onboard, then upload"
                />
              </div>

              {companyMode === "existing" && (
                <div className="mt-6">
                  <p className="label">Select company</p>
                  {companies.length === 0 ? (
                    <p className="mt-2 font-mono text-[11px] text-bone-500">
                      None onboarded yet. Pick &quot;New company&quot; above.
                    </p>
                  ) : (
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {companies.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCompanyId(c.id)}
                          className={cn(
                            "border px-3 py-2.5 text-left font-mono text-[11px] transition",
                            selectedCompanyId === c.id
                              ? "border-amber bg-amber/10 text-amber"
                              : "border-ink-500 text-bone-300 hover:border-amber/50"
                          )}
                        >
                          <p className="text-bone-100">{c.name}</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-bone-500">
                            {c.code} · {c.shortName}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={close} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300 hover:border-amber">
                  Cancel
                </button>
                <button
                  onClick={continueFromCompanyStep}
                  className="border border-amber bg-amber px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-900 hover:bg-amber-soft"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === "newCompany" && (
            <div>
              <p className="font-display text-2xl text-bone-100">New company</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-bone-400">
                One-time onboarding before the file upload.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Company name" value={newCo.name} onChange={(v) => setNewCo({ ...newCo, name: v })} placeholder="e.g., Kotak Mahindra Bank" />
                <Field label="Short name" value={newCo.shortName} onChange={(v) => setNewCo({ ...newCo, shortName: v })} placeholder="e.g., Kotak" />
                <Field label="Internal code" value={newCo.code} onChange={(v) => setNewCo({ ...newCo, code: v })} placeholder="e.g., BNK-KOTAK" />
                <Field label="Contact email" value={newCo.contactEmail} onChange={(v) => setNewCo({ ...newCo, contactEmail: v })} placeholder="auto.repo@kotak.com" />
              </div>
              <div className="mt-6 flex justify-between gap-3">
                <button onClick={() => setStep("company")} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300 hover:border-amber">
                  Back
                </button>
                <button
                  onClick={submitNewCompany}
                  disabled={busy}
                  className={cn(
                    "border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition",
                    busy
                      ? "cursor-wait border-ink-500 bg-ink-700 text-bone-500"
                      : "border-amber bg-amber text-ink-900 hover:bg-amber-soft"
                  )}
                >
                  {busy ? "Saving…" : "Save & continue"}
                </button>
              </div>
            </div>
          )}

          {step === "file" && (
            <div>
              <p className="font-display text-2xl text-bone-100">Upload Excel or CSV</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-bone-400">
                Expected columns: HP number, owner name, asset, registration, engine number, year, segment, location, etc.
              </p>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                className="mt-6 flex cursor-pointer flex-col items-center gap-3 border border-dashed border-ink-400 bg-ink-900/40 px-6 py-12 text-center transition hover:border-amber"
              >
                <FileSpreadsheet className="h-8 w-8 text-amber" strokeWidth={1.2} />
                <p className="font-mono text-[12px] text-bone-100">
                  {fileName || "Click to choose, or drop a file here"}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
                  .xlsx · .xls · .csv
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <div className="mt-6 flex justify-between gap-3">
                <button onClick={() => setStep("company")} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300 hover:border-amber">
                  Back
                </button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div>
              <p className="font-display text-2xl text-bone-100">Review &amp; confirm</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-bone-400">
                {rows.length} rows from {fileName}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-0 border border-ink-500 md:grid-cols-3 lg:grid-cols-6">
                {CATEGORY_OPTIONS.map((c) => (
                  <div key={c.value} className="border-b border-r border-ink-500 p-3 last:border-r-0">
                    <p className="label" style={{ fontSize: "9px" }}>{c.label}</p>
                    <p className="mt-1 font-display text-2xl text-bone-100 tabular">
                      {previewGroups[c.value] ?? 0}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 max-h-64 overflow-auto border border-ink-500">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-ink-900">
                    <tr className="border-b border-ink-500">
                      <Th>Owner</Th>
                      <Th>Asset</Th>
                      <Th>Reg #</Th>
                      <Th>HP #</Th>
                      <Th>Location</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 12).map((r, i) => (
                      <tr key={i} className="border-b border-ink-500 last:border-b-0">
                        <Td>{String(r.ownerName ?? "—")}</Td>
                        <Td>{String(r.asset ?? "—")}</Td>
                        <Td className="font-mono text-amber">{String(r.registrationNumber ?? "—")}</Td>
                        <Td>{String(r.hpNumber ?? "—")}</Td>
                        <Td>{String(r.location ?? "—")}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 12 && (
                  <p className="border-t border-ink-500 px-3 py-2 font-mono text-[10px] text-bone-500">
                    + {rows.length - 12} more
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-between gap-3">
                <button onClick={() => setStep("file")} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300 hover:border-amber">
                  Back
                </button>
                <button
                  onClick={confirmIngest}
                  disabled={busy}
                  className={cn(
                    "border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition",
                    busy
                      ? "cursor-wait border-ink-500 bg-ink-700 text-bone-500"
                      : "border-amber bg-amber text-ink-900 hover:bg-amber-soft"
                  )}
                >
                  {busy ? "Ingesting…" : "Confirm & ingest"}
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center border border-signal-sage bg-signal-sage/10">
                <Check className="h-5 w-5 text-signal-sage" strokeWidth={1.5} />
              </div>
              <p className="font-display text-2xl text-bone-100">Batch ingested</p>
              <p className="font-mono text-[11px] uppercase tracking-wider text-amber">{batchId}</p>
              <p className="font-mono text-[11px] text-bone-400">
                {rows.length} assets categorised, IDs assigned, ready for inspection.
              </p>
              <button
                onClick={close}
                className="mt-2 border border-amber bg-amber px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-900 hover:bg-amber-soft"
              >
                Open dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 border p-4 text-left transition",
        active ? "border-amber bg-amber/10" : "border-ink-500 hover:border-amber/50"
      )}
    >
      <div className={cn("text-amber")}>{icon}</div>
      <p className="font-mono text-[12px] text-bone-100">{title}</p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">{desc}</p>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-bone-100 outline-none focus:border-amber"
      />
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-bone-400">
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 font-mono text-[11px] text-bone-100", className)}>{children}</td>;
}
