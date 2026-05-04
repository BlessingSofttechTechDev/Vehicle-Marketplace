"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldAlert, Wrench, Plus, X, Trash2 } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/acquisitions";
import { useRefurb, type RepairOrder, type RepairItem } from "@/lib/refurb";
import { useBanks, valuationFor } from "@/lib/banks";
import { VEHICLES, getVehicle } from "@/lib/data";
import { formatINRFull, formatINR, cn } from "@/lib/utils";

export default function RefurbPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const orders = useRefurb((s) => s.orders);
  const addOrder = useRefurb((s) => s.addOrder);
  const setStatus = useRefurb((s) => s.setStatus);
  const removeOrder = useRefurb((s) => s.removeOrder);
  const valuations = useBanks((s) => s.valuations);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const admin = isAdmin(currentUser?.email);

  const [showForm, setShowForm] = useState(false);

  const kpi = useMemo(() => {
    const planned = orders.filter((o) => o.status === "planned").length;
    const inProgress = orders.filter((o) => o.status === "in_progress").length;
    const completed = orders.filter((o) => o.status === "completed");
    const totalSpent = completed.reduce((s, o) => s + o.totalCost, 0);
    return {
      planned,
      inProgress,
      completed: completed.length,
      totalSpent,
    };
  }, [orders]);

  if (!mounted) return <div className="min-h-screen"><Nav /></div>;
  if (!currentUser || !admin) return <Forbidden />;

  return (
    <div className="min-h-screen">
      <Nav />
      <section className="border-b border-ink-500">
        <div className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
          <Link href="/admin" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-bone-400 transition hover:text-amber">
            <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />Back to admin
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <Wrench className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Admin · Refurb</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            Repair before <span className="italic">listing</span>.
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
            Targeted work to lift listing price &amp; margin post-valuation.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
            <KPI label="Planned" value={kpi.planned.toString()} />
            <KPI label="In progress" value={kpi.inProgress.toString()} accent />
            <KPI label="Completed" value={kpi.completed.toString()} />
            <KPI label="Total spent" value={formatINR(kpi.totalSpent)} />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-10 px-6 py-10 md:px-10 md:py-14">
        <div className="flex justify-end">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 border border-amber bg-amber px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft">
            <Plus className="h-3 w-3" strokeWidth={2} />Add work order
          </button>
        </div>

        <section className="border border-ink-500 bg-ink-800">
          <div className="border-b border-ink-500 px-6 py-4"><p className="label-amber label">Work orders</p></div>
          <div className="divide-y divide-ink-500">
            {orders.map((o) => {
              const v = getVehicle(o.vehicleId);
              const val = valuationFor(o.vehicleId, valuations);
              return (
                <div key={o.id} className="grid gap-4 px-6 py-5 md:grid-cols-[80px_1fr_1.2fr_1fr_auto] md:items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {v ? <img src={v.images[0]} alt={v.model} className="h-14 w-20 object-cover" /> : <div className="h-14 w-20 bg-ink-700" />}
                  <div>
                    <p className="font-display text-base text-bone-100">{v ? `${v.brand} ${v.model}` : o.vehicleId}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">{v?.id} · {v?.yardCity}</p>
                    <div className="mt-2"><RepairStatusPill status={o.status} /></div>
                    {val && (
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-bone-500">
                        Floor {formatINR(val.floorPrice)} · List {formatINR(val.recommendedListPrice)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="label">Vendor</p>
                    <p className="mt-1 font-mono text-[11px] text-bone-100">{o.vendor}</p>
                    <ul className="mt-2 space-y-0.5 font-mono text-[10px] text-bone-400">
                      {o.items.map((it, idx) => <li key={idx}>· {it.desc} — {formatINRFull(it.cost)}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="label">Total</p>
                    <p className="mt-1 font-display text-xl text-amber tabular">{formatINRFull(o.totalCost)}</p>
                    {o.completedAt && <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">Completed {new Date(o.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {o.status === "planned" && (
                      <button onClick={() => setStatus(o.id, "in_progress")} className="border border-amber px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-amber transition hover:bg-amber hover:text-ink-900">Start</button>
                    )}
                    {o.status === "in_progress" && (
                      <button onClick={() => setStatus(o.id, "completed")} className="border border-signal-sage bg-signal-sage/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-sage transition hover:bg-signal-sage/20">Complete</button>
                    )}
                    {o.status !== "completed" && (
                      <button onClick={() => removeOrder(o.id)} className="border border-ink-500 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-bone-400 transition hover:border-signal-red hover:text-signal-red">
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {orders.length === 0 && <div className="px-6 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-bone-500">No work orders.</div>}
          </div>
        </section>
      </main>

      {showForm && <AddWorkOrder onClose={() => setShowForm(false)} onSave={(vid, vendor, items, notes) => { addOrder(vid, vendor, items, notes); setShowForm(false); }} />}
    </div>
  );
}

function RepairStatusPill({ status }: { status: RepairOrder["status"] }) {
  const map = {
    planned: { label: "Planned", cls: "bg-bone-400/10 text-bone-300 border-bone-500/40" },
    in_progress: { label: "In progress", cls: "bg-amber/15 text-amber border-amber/40" },
    completed: { label: "Completed", cls: "bg-signal-sage/15 text-signal-sage border-signal-sage/40" },
    cancelled: { label: "Cancelled", cls: "bg-signal-red/10 text-signal-red border-signal-red/40" },
  }[status];
  return <span className={`inline-block border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${map.cls}`}>{map.label}</span>;
}

function AddWorkOrder({ onClose, onSave }: { onClose: () => void; onSave: (vehicleId: string, vendor: string, items: RepairItem[], notes?: string) => void }) {
  const [vehicleId, setVehicleId] = useState(VEHICLES[0]?.id ?? "");
  const [vendor, setVendor] = useState("");
  const [items, setItems] = useState<RepairItem[]>([]);
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const total = items.reduce((s, i) => s + i.cost, 0);
  const valid = vehicleId && vendor.trim().length >= 2 && items.length > 0;

  const addItem = () => {
    if (!desc.trim() || Number(cost) <= 0) return;
    setItems((s) => [...s, { desc: desc.trim(), cost: Number(cost) }]);
    setDesc("");
    setCost("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl border border-ink-500 bg-ink-800 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-ink-500 pb-4">
          <h3 className="font-display text-xl text-bone-100">New work order</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-bone-300" /></button>
        </div>
        <div className="grid gap-4">
          <Select label="Vehicle" value={vehicleId} onChange={setVehicleId} options={VEHICLES.map((v) => ({ value: v.id, label: `${v.id} · ${v.brand} ${v.model} · ${v.yardCity}` }))} />
          <Field label="Vendor" value={vendor} onChange={setVendor} placeholder="e.g., Lucknow Commercial Works" />
          <Field label="Notes" value={notes} onChange={setNotes} placeholder="Optional" />
          <div className="border border-ink-500">
            <div className="border-b border-ink-500 px-3 py-2"><p className="label">Line items</p></div>
            <div className="divide-y divide-ink-500">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2 font-mono text-[11px] text-bone-200">
                  <span>{it.desc}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-amber">{formatINRFull(it.cost)}</span>
                    <button onClick={() => setItems((s) => s.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3 text-bone-400 hover:text-signal-red" /></button>
                  </span>
                </div>
              ))}
              {items.length === 0 && <div className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-bone-500">No items yet.</div>}
            </div>
            <div className="grid grid-cols-[1fr_140px_auto] gap-2 border-t border-ink-500 px-3 py-2">
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Item description" className="border border-ink-500 bg-ink-900 px-2 py-1.5 font-mono text-[11px] text-bone-100 outline-none focus:border-amber" />
              <input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost ₹" type="number" className="border border-ink-500 bg-ink-900 px-2 py-1.5 font-mono text-[11px] text-bone-100 outline-none focus:border-amber" />
              <button onClick={addItem} className="border border-amber bg-amber px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-900">Add</button>
            </div>
            <div className="border-t border-ink-500 px-3 py-2 text-right font-mono text-[11px] text-bone-100">
              Total: <span className="text-amber">{formatINRFull(total)}</span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300">Cancel</button>
          <button disabled={!valid} onClick={() => onSave(vehicleId, vendor.trim(), items, notes.trim() || undefined)} className={cn("border px-4 py-2 font-mono text-[11px] uppercase tracking-wider", valid ? "border-amber bg-amber text-ink-900" : "cursor-not-allowed border-ink-500 text-bone-500")}>Create order</button>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-ink-500 bg-ink-800 p-5">
      <p className="label">{label}</p>
      <p className={cn("mt-3 font-display text-3xl tabular", accent ? "text-amber" : "text-bone-100")}>{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-bone-100 outline-none focus:border-amber" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-bone-100 outline-none focus:border-amber">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Forbidden() {
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-32 text-center">
        <ShieldAlert className="h-10 w-10 text-signal-red" strokeWidth={1.2} />
        <p className="label-amber label mt-6">Admin only</p>
        <Link href="/" className="mt-8 border border-amber bg-amber px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-900">Back</Link>
      </div>
    </div>
  );
}
