"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Briefcase, Phone, X, ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import {
  useSales,
  getSalesRepForEmail,
  LEAD_STATUSES,
  type Lead,
  type LeadStatus,
} from "@/lib/sales";
import { getVehicle } from "@/lib/data";
import { formatINRFull, formatINR, cn } from "@/lib/utils";

export default function SalesPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const leads = useSales((s) => s.leads);
  const setStatus = useSales((s) => s.setStatus);
  const logActivity = useSales((s) => s.logActivity);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rep = getSalesRepForEmail(currentUser?.email);

  const myLeads = useMemo(() => {
    if (!rep) return [];
    return leads.filter((l) => l.repId === rep.id).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [leads, rep]);

  const kpi = useMemo(() => {
    const won = myLeads.filter((l) => l.status === "won");
    return {
      total: myLeads.length,
      pipeline: myLeads.filter((l) => l.status !== "won" && l.status !== "lost").length,
      won: won.length,
      revenue: won.reduce((s, l) => s + (l.finalPrice ?? 0), 0),
    };
  }, [myLeads]);

  const [activeLead, setActiveLead] = useState<string | null>(null);
  const [winFor, setWinFor] = useState<string | null>(null);
  const [lossFor, setLossFor] = useState<string | null>(null);

  if (!mounted) return <div className="min-h-screen"><Nav /></div>;

  if (!currentUser) {
    return (
      <div className="min-h-screen">
        <Nav />
        <Empty title="Sign in required" body="Sales dashboard is for direct sales reps." href="/login" cta="Sign in" />
      </div>
    );
  }

  if (!rep) {
    return (
      <div className="min-h-screen">
        <Nav />
        <Empty title="Not a sales rep" body={`${currentUser.email} is not enrolled as a direct sales rep.`} href="/" cta="Marketplace" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="border-b border-ink-500">
        <div className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
          <div className="flex items-center gap-3">
            <Briefcase className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Direct sales · {rep.code}</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            {rep.name.split(" ")[0]}&apos;s <span className="italic">pipeline</span>.
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
            {rep.region} region · {rep.phone}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
            <KPI label="Total leads" value={kpi.total.toString()} />
            <KPI label="In pipeline" value={kpi.pipeline.toString()} accent />
            <KPI label="Won" value={kpi.won.toString()} />
            <KPI label="Revenue" value={formatINR(kpi.revenue)} />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-10 px-6 py-10 md:px-10 md:py-14">
        {LEAD_STATUSES.filter((s) => s !== "won" && s !== "lost").map((s) => {
          const list = myLeads.filter((l) => l.status === s);
          if (list.length === 0) return null;
          return (
            <section key={s} className="border border-ink-500 bg-ink-800">
              <div className="flex items-center justify-between border-b border-ink-500 px-6 py-3">
                <p className="label-amber label">{s.replace("_", " ")} · {list.length}</p>
              </div>
              <div className="divide-y divide-ink-500">
                {list.map((l) => (
                  <LeadRow key={l.id} lead={l} active={activeLead === l.id} onToggle={() => setActiveLead(activeLead === l.id ? null : l.id)} onAdvance={(next) => setStatus(l.id, next)} onWin={() => setWinFor(l.id)} onLose={() => setLossFor(l.id)} onLog={(t) => logActivity(l.id, t)} />
                ))}
              </div>
            </section>
          );
        })}

        <section className="grid gap-5 md:grid-cols-2">
          <ResultColumn title="Won" leads={myLeads.filter((l) => l.status === "won")} accent="signal-sage" />
          <ResultColumn title="Lost" leads={myLeads.filter((l) => l.status === "lost")} accent="signal-red" />
        </section>
      </main>

      {winFor && <WinModal onClose={() => setWinFor(null)} onConfirm={(price) => { setStatus(winFor, "won", { finalPrice: price }); setWinFor(null); }} />}
      {lossFor && <LossModal onClose={() => setLossFor(null)} onConfirm={(reason) => { setStatus(lossFor, "lost", { lostReason: reason }); setLossFor(null); }} />}
    </div>
  );
}

function LeadRow({ lead, active, onToggle, onAdvance, onWin, onLose, onLog }: { lead: Lead; active: boolean; onToggle: () => void; onAdvance: (next: LeadStatus) => void; onWin: () => void; onLose: () => void; onLog: (t: string) => void }) {
  const v = getVehicle(lead.vehicleId);
  const next: LeadStatus | null = lead.status === "new" ? "contacted" : lead.status === "contacted" ? "test_drive" : lead.status === "test_drive" ? "negotiation" : null;
  const [activityText, setActivityText] = useState("");
  return (
    <div>
      <button onClick={onToggle} className="grid w-full gap-3 px-6 py-4 text-left transition hover:bg-ink-700 md:grid-cols-[80px_1fr_1fr_auto] md:items-center">
        {v ? <img src={v.images[0]} alt={v.model} className="h-14 w-20 object-cover" /> : <div className="h-14 w-20 bg-ink-700" />}
        <div>
          <p className="font-display text-base text-bone-100">{lead.customerName}</p>
          <p className="mt-1 font-mono text-[11px] text-bone-400 flex items-center gap-1.5"><Phone className="h-3 w-3" strokeWidth={1.5} />{lead.customerPhone}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">Source: {lead.source}</p>
        </div>
        <div>
          <p className="font-mono text-[11px] text-bone-100">{v ? `${v.brand} ${v.model}` : lead.vehicleId}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">{v ? `${v.yardCity} · ${formatINR(v.price)}` : ""}</p>
        </div>
        <ArrowRight className={cn("h-4 w-4 transition-transform", active && "rotate-90")} strokeWidth={1.5} />
      </button>
      {active && (
        <div className="grid gap-4 border-t border-ink-500 bg-ink-900/40 px-6 py-4 md:grid-cols-2">
          <div>
            <p className="label">Activity log</p>
            <ul className="mt-2 space-y-1 font-mono text-[11px] text-bone-300">
              {lead.activities.map((a, idx) => (
                <li key={idx}>
                  <span className="text-bone-500">{new Date(a.at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}:</span> {a.text}
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <input value={activityText} onChange={(e) => setActivityText(e.target.value)} placeholder="Log a note" className="border border-ink-500 bg-ink-900 px-2 py-1.5 font-mono text-[11px] text-bone-100 outline-none focus:border-amber" />
              <button disabled={!activityText.trim()} onClick={() => { onLog(activityText.trim()); setActivityText(""); }} className={cn("border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider", activityText.trim() ? "border-amber bg-amber text-ink-900" : "cursor-not-allowed border-ink-500 text-bone-500")}>Log</button>
            </div>
          </div>
          <div>
            <p className="label">Advance</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {next && <button onClick={() => onAdvance(next)} className="border border-amber bg-amber px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-900">→ {next.replace("_", " ")}</button>}
              <button onClick={onWin} className="border border-signal-sage bg-signal-sage/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-sage">Mark won</button>
              <button onClick={onLose} className="border border-signal-red px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-red">Mark lost</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultColumn({ title, leads, accent }: { title: string; leads: Lead[]; accent: string }) {
  return (
    <div className="border border-ink-500 bg-ink-800">
      <div className={`border-b border-ink-500 px-6 py-3 text-${accent}`}><p className="label">{title} · {leads.length}</p></div>
      <div className="divide-y divide-ink-500">
        {leads.map((l) => {
          const v = getVehicle(l.vehicleId);
          return (
            <div key={l.id} className="grid gap-2 px-6 py-3 md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-mono text-[11px] text-bone-100">{l.customerName} · {v?.brand} {v?.model}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
                  {l.status === "won" ? `Closed ${formatINRFull(l.finalPrice ?? 0)}` : l.lostReason}
                </p>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
                {new Date(l.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            </div>
          );
        })}
        {leads.length === 0 && <div className="px-6 py-6 text-center font-mono text-[10px] uppercase tracking-wider text-bone-500">None.</div>}
      </div>
    </div>
  );
}

function WinModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (p: number) => void }) {
  const [p, setP] = useState("");
  return (
    <Modal title="Mark won" onClose={onClose}>
      <Field label="Final price (₹)" value={p} onChange={setP} type="number" />
      <Buttons onClose={onClose} valid={Number(p) > 0} onConfirm={() => onConfirm(Number(p))} confirm="Confirm" />
    </Modal>
  );
}

function LossModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (r: string) => void }) {
  const [r, setR] = useState("");
  return (
    <Modal title="Mark lost" onClose={onClose}>
      <Field label="Reason" value={r} onChange={setR} placeholder="Bought competitor, budget, etc." />
      <Buttons onClose={onClose} valid={r.trim().length >= 2} onConfirm={() => onConfirm(r.trim())} confirm="Confirm" danger />
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-ink-500 bg-ink-800 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-ink-500 pb-4">
          <h3 className="font-display text-xl text-bone-100">{title}</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-bone-300" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Buttons({ onClose, valid, onConfirm, confirm, danger }: { onClose: () => void; valid: boolean; onConfirm: () => void; confirm: string; danger?: boolean }) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button onClick={onClose} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300">Cancel</button>
      <button disabled={!valid} onClick={onConfirm} className={cn("border px-4 py-2 font-mono text-[11px] uppercase tracking-wider", !valid ? "cursor-not-allowed border-ink-500 text-bone-500" : danger ? "border-signal-red bg-signal-red text-bone-100" : "border-amber bg-amber text-ink-900")}>{confirm}</button>
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

function KPI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-ink-500 bg-ink-800 p-5">
      <p className="label">{label}</p>
      <p className={cn("mt-3 font-display text-3xl tabular", accent ? "text-amber" : "text-bone-100")}>{value}</p>
    </div>
  );
}

function Empty({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center md:px-10">
      <h1 className="font-display text-4xl text-bone-100 md:text-5xl">{title}</h1>
      <p className="mt-3 text-bone-400">{body}</p>
      <Link href={href} className="mt-8 inline-block border border-amber bg-amber px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-900">{cta}</Link>
    </main>
  );
}
