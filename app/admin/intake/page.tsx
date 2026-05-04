"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, ShieldAlert, Plus, Check } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/acquisitions";
import {
  BANKS,
  getBank,
  useBanks,
  vehiclesForBank,
} from "@/lib/banks";
import { YARDS } from "@/lib/yards";
import { VEHICLES, getVehicle } from "@/lib/data";
import { formatINR, cn } from "@/lib/utils";

export default function IntakePage() {
  const currentUser = useAuth((s) => s.currentUser);
  const intakes = useBanks((s) => s.intakes);
  const addIntake = useBanks((s) => s.addIntake);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const admin = isAdmin(currentUser?.email);

  const [bankId, setBankId] = useState(BANKS[0]?.id ?? "");
  const [yardCity, setYardCity] = useState(YARDS[0]?.city ?? "");
  const [reference, setReference] = useState("");
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [ok, setOk] = useState<string | null>(null);

  // Vehicles in selected yard not yet attached to ANY intake
  const allIntakeVehicleIds = useMemo(() => {
    const s = new Set<string>();
    intakes.forEach((i) => i.vehicleIds.forEach((id) => s.add(id)));
    return s;
  }, [intakes]);

  const candidateVehicles = useMemo(() => {
    return VEHICLES.filter(
      (v) => v.yardCity === yardCity && !allIntakeVehicleIds.has(v.id)
    );
  }, [yardCity, allIntakeVehicleIds]);

  const toggle = (id: string) =>
    setPickedIds((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );

  const valid =
    bankId && yardCity && reference.trim().length >= 3 && pickedIds.length > 0;

  const submit = () => {
    if (!valid) return;
    const i = addIntake(bankId, yardCity, pickedIds, reference.trim(), notes.trim() || undefined);
    setOk(i.id.toUpperCase());
    setPickedIds([]);
    setReference("");
    setNotes("");
    setTimeout(() => setOk(null), 4000);
  };

  if (!mounted) return <div className="min-h-screen"><Nav /></div>;
  if (!currentUser || !admin) return <Forbidden />;

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="border-b border-ink-500">
        <div className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
          <Link href="/admin" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-bone-400 transition hover:text-amber">
            <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
            Back to admin
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <Building2 className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Admin · Bank stock intake</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            Bank <span className="italic">intake</span> register.
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
            Banks share yard-wise stock. Capture each batch here before valuation.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-10 px-6 py-10 md:px-10 md:py-14">
        {/* Existing batches */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
            <p className="label-amber label">Recent intakes</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
              {intakes.length} batch(es)
            </p>
          </div>
          <div className="divide-y divide-ink-500">
            {intakes.map((i) => {
              const bank = getBank(i.bankId);
              return (
                <div key={i.id} className="grid gap-3 px-6 py-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-amber">
                      {bank?.shortName} · {i.reference}
                    </p>
                    <p className="mt-1 font-display text-base text-bone-100">
                      {i.vehicleIds.length} vehicle(s)
                    </p>
                  </div>
                  <div>
                    <p className="label">Yard</p>
                    <p className="mt-1 font-mono text-[11px] text-bone-100">{i.yardCity}</p>
                  </div>
                  <div>
                    <p className="label">Received</p>
                    <p className="mt-1 font-mono text-[11px] text-bone-300">
                      {new Date(i.receivedAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-bone-500 md:text-right">
                    {i.notes ?? "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Compose new */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="flex items-center gap-3 border-b border-ink-500 px-6 py-4">
            <Plus className="h-3.5 w-3.5 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Register new intake</p>
          </div>
          <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
            <Select label="Bank" value={bankId} onChange={setBankId} options={BANKS.map((b) => ({ value: b.id, label: b.name }))} />
            <Select label="Yard" value={yardCity} onChange={(v) => { setYardCity(v); setPickedIds([]); }} options={YARDS.map((y) => ({ value: y.city, label: y.name }))} />
            <Field label="Bank batch reference" value={reference} onChange={setReference} placeholder="e.g., HDFC/LKO/APR26/B-118" />
            <div className="md:col-span-3">
              <Field label="Notes (optional)" value={notes} onChange={setNotes} placeholder="Context for ops team" />
            </div>
          </div>

          {candidateVehicles.length === 0 ? (
            <div className="border-t border-ink-500 px-6 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-bone-500">
              No untagged vehicles in this yard. Pick another yard or add stock.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-0 border-t border-ink-500 md:grid-cols-2 xl:grid-cols-3">
              {candidateVehicles.map((v) => {
                const picked = pickedIds.includes(v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() => toggle(v.id)}
                    className={cn("flex items-center gap-3 border-b border-r border-ink-500 px-4 py-3 text-left transition", picked ? "bg-amber/10" : "hover:bg-ink-700")}
                  >
                    <span className={cn("flex h-5 w-5 items-center justify-center border", picked ? "border-amber bg-amber text-ink-900" : "border-ink-500")}>
                      {picked && <Check className="h-3 w-3" strokeWidth={2} />}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.images[0]} alt={v.model} className="h-10 w-14 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[11px] text-bone-100">
                        {v.brand} {v.model}
                      </p>
                      <p className="truncate font-mono text-[10px] uppercase tracking-wider text-bone-500">
                        {v.id} · {formatINR(v.price)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-ink-500 px-6 py-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
              {pickedIds.length} selected
            </p>
            <div className="flex items-center gap-3">
              {ok && (
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-sage">
                  <Check className="h-3 w-3" strokeWidth={2} />
                  Intake {ok} created
                </span>
              )}
              <button
                onClick={submit}
                disabled={!valid}
                className={cn("border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition", valid ? "border-amber bg-amber text-ink-900 hover:bg-amber-soft" : "cursor-not-allowed border-ink-500 text-bone-500")}
              >
                Register intake
              </button>
            </div>
          </div>
        </section>

        {/* Bank stock summary */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="border-b border-ink-500 px-6 py-4"><p className="label-amber label">Stock by bank</p></div>
          <div className="grid grid-cols-1 gap-0 md:grid-cols-2 xl:grid-cols-4">
            {BANKS.map((b) => {
              const ids = vehiclesForBank(b.id, intakes);
              return (
                <div key={b.id} className="border-b border-r border-ink-500 px-5 py-4 last:border-r-0">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-amber">{b.shortName}</p>
                  <p className="mt-1 font-display text-2xl text-bone-100 tabular">{ids.length}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">vehicles in stock</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
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
        <h1 className="mt-4 font-display text-4xl text-bone-100">Restricted</h1>
        <Link href="/" className="mt-8 border border-amber bg-amber px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-900">Back</Link>
      </div>
    </div>
  );
}
