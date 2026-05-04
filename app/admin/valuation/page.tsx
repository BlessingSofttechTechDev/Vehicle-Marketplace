"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, ShieldAlert, ChevronRight, Plus, X, Check } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/acquisitions";
import { useBanks, VALUERS, BANKS, getValuer, getBank, valuationFor, bankForVehicle, type Valuation, type ValuationPhoto } from "@/lib/banks";
import { getVehicle, VEHICLES } from "@/lib/data";
import { formatINRFull, formatINR, cn } from "@/lib/utils";

export default function ValuationPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const intakes = useBanks((s) => s.intakes);
  const valuations = useBanks((s) => s.valuations);
  const upsertValuation = useBanks((s) => s.upsertValuation);
  const approveValuation = useBanks((s) => s.approveValuation);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const admin = isAdmin(currentUser?.email);

  const intakeVehicleIds = useMemo(() => {
    const s = new Set<string>();
    intakes.forEach((i) => i.vehicleIds.forEach((id) => s.add(id)));
    return Array.from(s);
  }, [intakes]);

  const queue = useMemo(() => {
    return intakeVehicleIds.map((id) => ({
      vehicle: getVehicle(id),
      valuation: valuationFor(id, valuations),
      bankInfo: bankForVehicle(id, intakes),
    })).filter((x) => x.vehicle);
  }, [intakeVehicleIds, valuations, intakes]);

  const pending = queue.filter((q) => !q.valuation || q.valuation.status !== "approved");
  const done = queue.filter((q) => q.valuation && q.valuation.status === "approved");

  const [active, setActive] = useState<string | null>(null);

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
            <Camera className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Admin · Inspection & Valuation</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            Bank-approved <span className="italic">valuations</span>.
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
            Live snaps + floor pricing by panel valuer · gates listing on marketplace.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-6">
            <KPI label="Pending" value={pending.length.toString()} accent />
            <KPI label="Approved" value={done.length.toString()} />
            <KPI label="Valuers on panel" value={VALUERS.length.toString()} />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-10 px-6 py-10 md:px-10 md:py-14">
        <section className="border border-ink-500 bg-ink-800">
          <div className="border-b border-ink-500 px-6 py-4"><p className="label-amber label">Queue</p></div>
          {pending.length === 0 ? (
            <div className="px-6 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-bone-500">All bank stock has been valued.</div>
          ) : (
            <div className="divide-y divide-ink-500">
              {pending.map((q) => {
                const v = q.vehicle!;
                const bank = q.bankInfo?.bank;
                return (
                  <div key={v.id}>
                    <button onClick={() => setActive(active === v.id ? null : v.id)} className="grid w-full gap-3 px-6 py-4 text-left transition hover:bg-ink-700 md:grid-cols-[80px_1fr_1fr_1fr_auto] md:items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.images[0]} alt={v.model} className="h-14 w-20 object-cover" />
                      <div>
                        <p className="font-display text-base text-bone-100">{v.brand} {v.model}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">{v.id} · {v.year} · {v.yardCity}</p>
                      </div>
                      <div>
                        <p className="label">Bank</p>
                        <p className="mt-1 font-mono text-[11px] text-bone-100">{bank?.shortName ?? "—"}</p>
                      </div>
                      <div>
                        <p className="label">Valuation</p>
                        <p className="mt-1 font-mono text-[11px] text-bone-300">
                          {q.valuation ? `${q.valuation.status}` : "Not started"}
                        </p>
                      </div>
                      <ChevronRight className={cn("h-4 w-4 transition-transform", active === v.id && "rotate-90")} strokeWidth={1.5} />
                    </button>
                    {active === v.id && (
                      <ValuationForm vehicleId={v.id} bankId={bank?.id} existing={q.valuation} onSave={(payload) => { upsertValuation(v.id, payload); setActive(null); }} onApprove={() => { if (q.valuation) approveValuation(q.valuation.id); setActive(null); }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="border border-ink-500 bg-ink-800">
          <div className="border-b border-ink-500 px-6 py-4"><p className="label-amber label">Approved valuations</p></div>
          {done.length === 0 ? (
            <div className="px-6 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-bone-500">None yet.</div>
          ) : (
            <div className="divide-y divide-ink-500">
              {done.map((q) => {
                const v = q.vehicle!;
                const val = q.valuation!;
                const valuer = getValuer(val.valuerId);
                return (
                  <div key={v.id} className="grid gap-3 px-6 py-4 md:grid-cols-[80px_1fr_1fr_1fr_1fr]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.images[0]} alt={v.model} className="h-14 w-20 object-cover" />
                    <div>
                      <p className="font-display text-base text-bone-100">{v.brand} {v.model}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">{v.id} · {v.yardCity}</p>
                    </div>
                    <div>
                      <p className="label">Valuer</p>
                      <p className="mt-1 font-mono text-[11px] text-bone-100">{valuer?.name ?? val.valuerId}</p>
                    </div>
                    <div>
                      <p className="label">Floor / List</p>
                      <p className="mt-1 font-mono text-[11px] text-bone-100">{formatINR(val.floorPrice)} / {formatINR(val.recommendedListPrice)}</p>
                    </div>
                    <div>
                      <p className="label">Photos</p>
                      <div className="mt-1 flex gap-1.5">
                        {val.photos.slice(0, 4).map((p, idx) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={idx} src={p.url} alt={p.caption ?? ""} className="h-10 w-12 object-cover" />
                        ))}
                        {val.photos.length === 0 && <span className="font-mono text-[10px] text-bone-500">none</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ValuationForm({ vehicleId, bankId, existing, onSave, onApprove }: {
  vehicleId: string;
  bankId?: string;
  existing?: Valuation;
  onSave: (p: any) => void;
  onApprove: () => void;
}) {
  const v = getVehicle(vehicleId);
  const [valuerId, setValuerId] = useState(existing?.valuerId ?? VALUERS[0].id);
  const [floor, setFloor] = useState(existing?.floorPrice?.toString() ?? "");
  const [list, setList] = useState(existing?.recommendedListPrice?.toString() ?? (v?.price?.toString() ?? ""));
  const [marketRef, setMarketRef] = useState(existing?.marketReference ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [photos, setPhotos] = useState<ValuationPhoto[]>(existing?.photos ?? []);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCap, setPhotoCap] = useState("");

  const valid = Number(floor) > 0 && Number(list) > 0;

  const addPhoto = () => {
    if (!photoUrl.trim()) return;
    setPhotos((p) => [...p, { url: photoUrl.trim(), caption: photoCap.trim() || undefined, capturedAt: Date.now() }]);
    setPhotoUrl("");
    setPhotoCap("");
  };

  return (
    <div className="grid gap-4 border-t border-ink-500 bg-ink-900/40 px-6 py-5 md:grid-cols-2">
      <div className="grid gap-3">
        <Select label="Valuer (panel)" value={valuerId} onChange={setValuerId} options={VALUERS.map((x) => ({ value: x.id, label: `${x.name} · ${x.region}` }))} />
        <Field label="Floor price (₹)" value={floor} onChange={setFloor} type="number" />
        <Field label="Recommended list (₹)" value={list} onChange={setList} type="number" />
        <Field label="Market reference" value={marketRef} onChange={setMarketRef} placeholder="OBV, comps, etc." />
        <Field label="Inspection notes" value={notes} onChange={setNotes} placeholder="Body, engine, papers" />
      </div>
      <div className="grid gap-3">
        <p className="label">Live snaps</p>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, idx) => (
            <div key={idx} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="aspect-video w-full object-cover" />
              <button onClick={() => setPhotos((s) => s.filter((_, i) => i !== idx))} className="absolute right-1 top-1 bg-ink-900/80 p-0.5 text-bone-100">
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
              {p.caption && <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-bone-500">{p.caption}</p>}
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          <Field label="Photo URL" value={photoUrl} onChange={setPhotoUrl} placeholder="https://..." />
          <Field label="Caption" value={photoCap} onChange={setPhotoCap} />
          <button onClick={addPhoto} className="self-start border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 transition hover:border-amber hover:text-amber">
            <Plus className="mr-1 inline h-3 w-3" strokeWidth={2} />Add photo
          </button>
        </div>
      </div>
      <div className="md:col-span-2 flex items-center justify-end gap-3 border-t border-ink-500 pt-4">
        {existing && existing.status !== "approved" && (
          <button onClick={onApprove} className="border border-signal-sage bg-signal-sage/10 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-signal-sage transition hover:bg-signal-sage/20">
            <Check className="mr-1 inline h-3 w-3" strokeWidth={2} />Approve
          </button>
        )}
        <button
          disabled={!valid}
          onClick={() => onSave({ valuerId, bankId, floorPrice: Number(floor), recommendedListPrice: Number(list), marketReference: marketRef.trim() || undefined, notes: notes.trim() || undefined, photos, status: "submitted" })}
          className={cn("border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition", valid ? "border-amber bg-amber text-ink-900 hover:bg-amber-soft" : "cursor-not-allowed border-ink-500 text-bone-500")}
        >
          Save valuation
        </button>
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
