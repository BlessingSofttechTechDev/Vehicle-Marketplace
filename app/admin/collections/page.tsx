"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldAlert, Gavel, Phone, X } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/acquisitions";
import {
  useCollections,
  activeSettlement,
  seizureFor,
  type Settlement,
  type Seizure,
} from "@/lib/collections";
import { getBank } from "@/lib/banks";
import { getVehicle } from "@/lib/data";
import { formatINRFull, formatINR, cn } from "@/lib/utils";

export default function CollectionsPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const borrowers = useCollections((s) => s.borrowers);
  const settlements = useCollections((s) => s.settlements);
  const seizures = useCollections((s) => s.seizures);
  const proposeSettlement = useCollections((s) => s.proposeSettlement);
  const agreeSettlement = useCollections((s) => s.agreeSettlement);
  const paySettlement = useCollections((s) => s.paySettlement);
  const defaultSettlement = useCollections((s) => s.defaultSettlement);
  const initiateSeizure = useCollections((s) => s.initiateSeizure);
  const setSeizureStatus = useCollections((s) => s.setSeizureStatus);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const admin = isAdmin(currentUser?.email);

  const [proposeFor, setProposeFor] = useState<string | null>(null);
  const [agreeFor, setAgreeFor] = useState<string | null>(null);

  const kpi = useMemo(() => {
    const totalOutstanding = borrowers.reduce((s, b) => s + b.outstandingPrincipal, 0);
    const recovered = settlements
      .filter((x) => x.status === "paid")
      .reduce((s, x) => s + (x.paidAmount ?? 0), 0);
    return {
      borrowers: borrowers.length,
      paidCount: settlements.filter((x) => x.status === "paid").length,
      defaulted: settlements.filter((x) => x.status === "defaulted").length,
      seizureActive: seizures.filter((x) => x.status !== "closed").length,
      totalOutstanding,
      recovered,
    };
  }, [borrowers, settlements, seizures]);

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
            <Gavel className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Admin · Collections & Seizure</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            Settlement <span className="italic">vs.</span> seizure.
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
            Push borrowers to mutually-agreed settlement. Default → legal seizure pipeline.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-5">
            <KPI label="Borrowers" value={kpi.borrowers.toString()} />
            <KPI label="Outstanding" value={formatINR(kpi.totalOutstanding)} />
            <KPI label="Recovered" value={formatINR(kpi.recovered)} accent />
            <KPI label="Defaulted" value={kpi.defaulted.toString()} />
            <KPI label="Seizures live" value={kpi.seizureActive.toString()} />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-10 px-6 py-10 md:px-10 md:py-14">
        <section className="border border-ink-500 bg-ink-800">
          <div className="border-b border-ink-500 px-6 py-4"><p className="label-amber label">Borrower ledger</p></div>
          <div className="divide-y divide-ink-500">
            {borrowers.map((b) => {
              const stl = activeSettlement(b.id, settlements);
              const sz = seizureFor(b.id, seizures);
              const v = getVehicle(b.vehicleId);
              const bank = getBank(b.bankId);
              return (
                <div key={b.id} className="grid gap-4 px-6 py-5 md:grid-cols-[1.4fr_1.2fr_1.4fr_auto]">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-amber">{bank?.shortName} · {b.loanAccount}</p>
                    <p className="mt-1 font-display text-base text-bone-100">{b.name}</p>
                    <p className="font-mono text-[11px] text-bone-400 flex items-center gap-1.5">
                      <Phone className="h-3 w-3" strokeWidth={1.5} />{b.phone}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">{b.city} · {b.daysPastDue}d past due</p>
                  </div>
                  <div>
                    <p className="label">Asset</p>
                    {v ? (
                      <Link href={`/vehicle/${v.id}`} className="mt-1 block font-mono text-[11px] text-bone-100 hover:text-amber">
                        {v.brand} {v.model}
                      </Link>
                    ) : <p className="mt-1 font-mono text-[11px] text-bone-500">—</p>}
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">Outstanding {formatINRFull(b.outstandingPrincipal)}</p>
                  </div>
                  <div>
                    <p className="label">Status</p>
                    {stl ? <SettlementBlock stl={stl} /> : <p className="mt-1 font-mono text-[11px] text-bone-500">No settlement yet</p>}
                    {sz && <SeizureBlock sz={sz} />}
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    {!stl && (
                      <button onClick={() => setProposeFor(b.id)} className="border border-amber bg-amber px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft">Propose settlement</button>
                    )}
                    {stl?.status === "proposed" && (
                      <button onClick={() => setAgreeFor(stl.id)} className="border border-signal-sage bg-signal-sage/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-sage transition hover:bg-signal-sage/20">Agree</button>
                    )}
                    {stl?.status === "agreed" && (
                      <>
                        <button onClick={() => paySettlement(stl.id, stl.agreedAmount ?? stl.proposedAmount)} className="border border-signal-sage bg-signal-sage/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-sage transition hover:bg-signal-sage/20">Mark paid</button>
                        <button onClick={() => defaultSettlement(stl.id)} className="border border-signal-red px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-red transition hover:bg-signal-red/10">Default → seize</button>
                      </>
                    )}
                    {!sz && (stl?.status === "defaulted" || !stl) && (
                      <button onClick={() => initiateSeizure(b.id, `MAN/${Date.now().toString(36).toUpperCase()}`, "TBD", "Manual initiation")} className="border border-signal-red px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-red transition hover:bg-signal-red/10">Initiate seizure</button>
                    )}
                    {sz && sz.status !== "custody_taken" && sz.status !== "closed" && (
                      <button onClick={() => setSeizureStatus(sz.id, "custody_taken", Date.now())} className="border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 transition hover:border-amber hover:text-amber">Take custody</button>
                    )}
                    {sz && sz.status === "custody_taken" && (
                      <button onClick={() => setSeizureStatus(sz.id, "closed")} className="border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 transition hover:border-amber hover:text-amber">Close case</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {proposeFor && (
        <ProposeModal
          onClose={() => setProposeFor(null)}
          onConfirm={(amt, notes) => {
            proposeSettlement(proposeFor, amt, notes);
            setProposeFor(null);
          }}
        />
      )}
      {agreeFor && (() => {
        const stl = settlements.find((x) => x.id === agreeFor);
        return (
          <AgreeModal
            initialAmount={stl?.proposedAmount ?? 0}
            onClose={() => setAgreeFor(null)}
            onConfirm={(amt, due) => { agreeSettlement(agreeFor, amt, due); setAgreeFor(null); }}
          />
        );
      })()}
    </div>
  );
}

function SettlementBlock({ stl }: { stl: Settlement }) {
  const map: Record<Settlement["status"], { label: string; cls: string }> = {
    proposed:   { label: "Proposed",   cls: "bg-amber/15 text-amber border-amber/40" },
    agreed:     { label: "Agreed",     cls: "bg-signal-sage/15 text-signal-sage border-signal-sage/40" },
    paid:       { label: "Paid",       cls: "bg-signal-sage/15 text-signal-sage border-signal-sage/40" },
    defaulted:  { label: "Defaulted",  cls: "bg-signal-red/10 text-signal-red border-signal-red/40" },
    cancelled:  { label: "Cancelled",  cls: "bg-bone-400/10 text-bone-300 border-bone-500/40" },
  };
  const m = map[stl.status];
  return (
    <div className="mt-1">
      <span className={`inline-block border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${m.cls}`}>{m.label}</span>
      <p className="mt-1 font-mono text-[11px] text-bone-300">
        Proposed {formatINRFull(stl.proposedAmount)}
        {stl.agreedAmount ? ` · Agreed ${formatINRFull(stl.agreedAmount)}` : ""}
        {stl.paidAmount ? ` · Paid ${formatINRFull(stl.paidAmount)}` : ""}
      </p>
      {stl.dueDate && <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">Due {new Date(stl.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>}
      {stl.notes && <p className="mt-1 font-mono text-[10px] text-bone-500">{stl.notes}</p>}
    </div>
  );
}

function SeizureBlock({ sz }: { sz: Seizure }) {
  const map: Record<Seizure["status"], { label: string; cls: string }> = {
    initiated: { label: "Seizure initiated", cls: "bg-signal-red/10 text-signal-red border-signal-red/40" },
    court_filed: { label: "Court filed", cls: "bg-signal-red/15 text-signal-red border-signal-red/40" },
    custody_taken: { label: "Custody taken", cls: "bg-amber/15 text-amber border-amber/40" },
    closed: { label: "Closed", cls: "bg-bone-400/10 text-bone-300 border-bone-500/40" },
  };
  const m = map[sz.status];
  return (
    <div className="mt-2">
      <span className={`inline-block border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${m.cls}`}>{m.label}</span>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">{sz.legalRef}{sz.court ? ` · ${sz.court}` : ""}</p>
    </div>
  );
}

function ProposeModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (amt: number, notes?: string) => void }) {
  const [amt, setAmt] = useState("");
  const [notes, setNotes] = useState("");
  const valid = Number(amt) > 0;
  return (
    <ModalShell title="Propose settlement" onClose={onClose}>
      <div className="grid gap-3">
        <Field label="Proposed amount (₹)" value={amt} onChange={setAmt} type="number" />
        <Field label="Notes" value={notes} onChange={setNotes} placeholder="Terms, willingness, etc." />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300">Cancel</button>
        <button disabled={!valid} onClick={() => onConfirm(Number(amt), notes.trim() || undefined)} className={cn("border px-4 py-2 font-mono text-[11px] uppercase tracking-wider", valid ? "border-amber bg-amber text-ink-900" : "cursor-not-allowed border-ink-500 text-bone-500")}>Propose</button>
      </div>
    </ModalShell>
  );
}

function AgreeModal({ initialAmount, onClose, onConfirm }: { initialAmount: number; onClose: () => void; onConfirm: (amt: number, due: number) => void }) {
  const [amt, setAmt] = useState(initialAmount.toString());
  const [due, setDue] = useState("");
  const valid = Number(amt) > 0 && due.length === 10;
  return (
    <ModalShell title="Agree settlement" onClose={onClose}>
      <div className="grid gap-3">
        <Field label="Agreed amount (₹)" value={amt} onChange={setAmt} type="number" />
        <Field label="Due date (YYYY-MM-DD)" value={due} onChange={setDue} placeholder="2026-05-15" />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300">Cancel</button>
        <button disabled={!valid} onClick={() => onConfirm(Number(amt), Date.parse(due))} className={cn("border px-4 py-2 font-mono text-[11px] uppercase tracking-wider", valid ? "border-amber bg-amber text-ink-900" : "cursor-not-allowed border-ink-500 text-bone-500")}>Agree</button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-ink-500 bg-ink-800 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-ink-500 pb-4">
          <h3 className="font-display text-xl text-bone-100">{title}</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-bone-300" strokeWidth={1.5} /></button>
        </div>
        {children}
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
