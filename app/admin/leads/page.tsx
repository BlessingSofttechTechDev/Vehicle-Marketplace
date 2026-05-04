"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldAlert, Users, Plus, X, Download } from "lucide-react";
import { downloadRows } from "@/lib/csv";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/acquisitions";
import {
  useSales,
  SALES_REPS,
  getSalesRep,
  LEAD_STATUSES,
  type Lead,
  type LeadStatus,
} from "@/lib/sales";
import { VEHICLES, getVehicle } from "@/lib/data";
import { formatINR, cn } from "@/lib/utils";

export default function AdminLeadsPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const leads = useSales((s) => s.leads);
  const addLead = useSales((s) => s.addLead);
  const assignRep = useSales((s) => s.assignRep);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const admin = isAdmin(currentUser?.email);

  const [showForm, setShowForm] = useState(false);

  const grouped = useMemo(() => {
    const out: Record<LeadStatus, Lead[]> = {
      new: [], contacted: [], test_drive: [], negotiation: [], won: [], lost: [],
    };
    for (const l of leads) out[l.status].push(l);
    return out;
  }, [leads]);

  const kpi = useMemo(() => {
    const total = leads.length;
    const won = leads.filter((l) => l.status === "won");
    const inPipe = leads.filter((l) => l.status !== "won" && l.status !== "lost").length;
    const conversion = total === 0 ? 0 : Math.round((won.length / total) * 100);
    const revenue = won.reduce((s, l) => s + (l.finalPrice ?? 0), 0);
    return { total, won: won.length, inPipe, conversion, revenue };
  }, [leads]);

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
            <Users className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Admin · LMS (Lead Management)</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            Lead <span className="italic">funnel</span>.
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
            All inbound &amp; rep-captured leads, assignable across the direct sales team.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-5">
            <KPI label="Total" value={kpi.total.toString()} />
            <KPI label="In pipeline" value={kpi.inPipe.toString()} accent />
            <KPI label="Won" value={kpi.won.toString()} />
            <KPI label="Conversion" value={`${kpi.conversion}%`} />
            <KPI label="Revenue" value={formatINR(kpi.revenue)} />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-10 md:px-10 md:py-14">
        <div className="flex justify-end gap-2">
          <button onClick={() => downloadRows("meridian-leads", leads, [
            { key: "id", label: "ID" }, { key: "vehicleId", label: "Vehicle" }, { key: "customerName", label: "Customer" },
            { key: "customerPhone", label: "Phone" }, { key: "source", label: "Source" }, { key: "status", label: "Status" },
            { key: "repId", label: "Rep" }, { key: "finalPrice", label: "Final price" }, { key: "lostReason", label: "Lost reason" },
            { key: "createdAt", label: "Created", format: (r) => new Date(r.createdAt).toISOString() },
            { key: "updatedAt", label: "Updated", format: (r) => new Date(r.updatedAt).toISOString() },
          ])} className="flex items-center gap-2 border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 hover:border-amber hover:text-amber">
            <Download className="h-3 w-3" strokeWidth={1.5} />Export CSV
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 border border-amber bg-amber px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft">
            <Plus className="h-3 w-3" strokeWidth={2} />New lead
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {LEAD_STATUSES.map((s) => (
            <Column key={s} status={s} leads={grouped[s]} onAssign={assignRep} />
          ))}
        </div>
      </main>

      {showForm && <NewLead onClose={() => setShowForm(false)} onSave={(vid, name, phone, source) => { addLead(vid, name, phone, source); setShowForm(false); }} />}
    </div>
  );
}

function Column({ status, leads, onAssign }: { status: LeadStatus; leads: Lead[]; onAssign: (leadId: string, repId: string) => void }) {
  return (
    <div className="border border-ink-500 bg-ink-800">
      <div className="flex items-center justify-between border-b border-ink-500 px-4 py-3">
        <p className={`label-amber label`}>{status.replace("_", " ")}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">{leads.length}</p>
      </div>
      <div className="divide-y divide-ink-500">
        {leads.map((l) => {
          const v = getVehicle(l.vehicleId);
          const rep = l.repId ? getSalesRep(l.repId) : null;
          return (
            <div key={l.id} className="px-4 py-3">
              <p className="font-mono text-[11px] text-bone-100">{l.customerName}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">{l.customerPhone} · {l.source}</p>
              {v && <p className="mt-1 font-mono text-[10px] text-bone-400">{v.brand} {v.model}</p>}
              {l.status === "won" && l.finalPrice && <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-signal-sage">Won {formatINR(l.finalPrice)}</p>}
              {l.status === "lost" && <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-signal-red">{l.lostReason ?? "—"}</p>}
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={l.repId ?? ""}
                  onChange={(e) => e.target.value && onAssign(l.id, e.target.value)}
                  className="flex-1 border border-ink-500 bg-ink-900 px-2 py-1 font-mono text-[10px] text-bone-100 outline-none focus:border-amber"
                >
                  <option value="">{rep ? `→ ${rep.code}` : "Unassigned"}</option>
                  {SALES_REPS.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
                </select>
              </div>
            </div>
          );
        })}
        {leads.length === 0 && <div className="px-4 py-6 text-center font-mono text-[10px] uppercase tracking-wider text-bone-500">—</div>}
      </div>
    </div>
  );
}

function NewLead({ onClose, onSave }: { onClose: () => void; onSave: (vid: string, name: string, phone: string, source: Lead["source"]) => void }) {
  const [vid, setVid] = useState(VEHICLES[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState<Lead["source"]>("web");
  const valid = vid && name.trim().length >= 2 && phone.trim().length >= 6;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-ink-500 bg-ink-800 p-6">
        <div className="mb-5 flex items-center justify-between border-b border-ink-500 pb-4">
          <h3 className="font-display text-xl text-bone-100">New lead</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-bone-300" /></button>
        </div>
        <div className="grid gap-3">
          <Select label="Vehicle" value={vid} onChange={setVid} options={VEHICLES.map((v) => ({ value: v.id, label: `${v.id} · ${v.brand} ${v.model}` }))} />
          <Field label="Customer name" value={name} onChange={setName} />
          <Field label="Phone" value={phone} onChange={setPhone} />
          <Select label="Source" value={source} onChange={(v) => setSource(v as Lead["source"])} options={[{ value: "web", label: "Web" }, { value: "agent", label: "Agent" }, { value: "walk_in", label: "Walk-in" }, { value: "referral", label: "Referral" }]} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300">Cancel</button>
          <button disabled={!valid} onClick={() => onSave(vid, name.trim(), phone.trim(), source)} className={cn("border px-4 py-2 font-mono text-[11px] uppercase tracking-wider", valid ? "border-amber bg-amber text-ink-900" : "cursor-not-allowed border-ink-500 text-bone-500")}>Create</button>
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
