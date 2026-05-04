"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Heart, MapPin, Building2, Camera, Wrench, FileText, Phone, X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Nav } from "@/components/nav";
import { CompareTray } from "@/components/compare-tray";
import { getVehicle, VEHICLES } from "@/lib/data";
import { useCheckout, useCompare } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useBanks, valuationFor, bankForVehicle, getValuer } from "@/lib/banks";
import { useRefurb } from "@/lib/refurb";
import { useDocuments, docsForVehicle, DOC_LABELS } from "@/lib/documents";
import { useSales } from "@/lib/sales";
import { formatINR, formatINRFull, formatKm, cn } from "@/lib/utils";

export default function VehiclePage({
  params,
}: {
  params: { id: string };
}) {
  const vehicle = getVehicle(params.id);
  const router = useRouter();
  const { ids, toggle, wishlist, toggleWishlist } = useCompare();
  const startCheckout = useCheckout((s) => s.startCheckout);
  const currentUser = useAuth((s) => s.currentUser);
  const [activeImage, setActiveImage] = useState(0);
  const [showLead, setShowLead] = useState(false);

  const intakes = useBanks((s) => s.intakes);
  const valuations = useBanks((s) => s.valuations);
  const orders = useRefurb((s) => s.orders);
  const docs = useDocuments((s) => s.docs);
  const addLead = useSales((s) => s.addLead);

  const bankInfo = useMemo(() => vehicle ? bankForVehicle(vehicle.id, intakes) : undefined, [vehicle, intakes]);
  const valuation = useMemo(() => vehicle ? valuationFor(vehicle.id, valuations) : undefined, [vehicle, valuations]);
  const valuer = valuation ? getValuer(valuation.valuerId) : undefined;
  const repairs = useMemo(() => vehicle ? orders.filter((o) => o.vehicleId === vehicle.id) : [], [orders, vehicle]);
  const vehicleDocs = useMemo(() => vehicle ? docsForVehicle(vehicle.id, docs) : [], [docs, vehicle]);

  if (!vehicle) return notFound();

  const similar = VEHICLES.filter(
    (v) => v.id !== vehicle.id && v.category === vehicle.category
  ).slice(0, 4);
  const isSelected = ids.includes(vehicle.id);
  const isWishlisted = wishlist.includes(vehicle.id);

  const onBuy = () => {
    startCheckout(vehicle.id);
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent("/checkout/documents")}`);
      return;
    }
    router.push("/checkout/documents");
  };

  return (
    <div className="min-h-screen">
      <Nav />

      <div className="mx-auto max-w-[1600px] px-6 py-8 md:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-bone-400 transition hover:text-amber"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="font-mono text-[11px] uppercase tracking-wider">
            Back to marketplace
          </span>
        </Link>

        {bankInfo && (
          <div className="mt-6 flex flex-wrap items-center gap-3 border border-amber/40 bg-amber/5 px-5 py-3">
            <Building2 className="h-3.5 w-3.5 text-amber" strokeWidth={1.5} />
            <p className="font-mono text-[11px] uppercase tracking-wider text-amber">
              Repossessed via {bankInfo.bank.shortName}
            </p>
            <span className="text-bone-500">·</span>
            <p className="font-mono text-[11px] text-bone-300">
              Intake {bankInfo.intake.reference}
            </p>
            {valuation && (
              <>
                <span className="text-bone-500">·</span>
                <p className="font-mono text-[11px] text-bone-300">
                  Valued by {valuer?.name ?? "panel valuer"} · floor {formatINR(valuation.floorPrice)}
                </p>
              </>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          {/* Gallery */}
          <div>
            <motion.div
              key={activeImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="relative aspect-[4/3] overflow-hidden border border-ink-500 bg-ink-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vehicle.images[activeImage]}
                alt={vehicle.model}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-4 top-4 bg-ink-900/80 px-3 py-1.5 backdrop-blur">
                <p className="font-mono text-[10px] uppercase tracking-wider text-amber">
                  {vehicle.category}
                </p>
              </div>
              <button
                onClick={() => toggleWishlist(vehicle.id)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center bg-ink-900/80 backdrop-blur transition hover:text-amber"
              >
                <Heart
                  className="h-4 w-4"
                  strokeWidth={1.5}
                  fill={isWishlisted ? "#D4A574" : "none"}
                  stroke={isWishlisted ? "#D4A574" : "#F4F1EB"}
                />
              </button>
            </motion.div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {vehicle.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative aspect-[4/3] overflow-hidden border transition-colors ${
                    activeImage === i ? "border-amber" : "border-ink-500 hover:border-ink-400"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <p className="label-amber label">{vehicle.brand}</p>
            <h1 className="mt-3 font-display text-5xl font-light leading-[0.95] text-bone-100 md:text-6xl">
              {vehicle.model}
            </h1>
            <p className="mt-3 font-mono text-sm text-bone-400">{vehicle.variant}</p>

            <div className="mt-8 flex items-baseline gap-4">
              <p className="font-display text-4xl text-amber tabular">
                {formatINRFull(vehicle.price)}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-wider text-bone-400">
                All inclusive
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-bone-300">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="font-mono text-xs">{vehicle.location}</span>
            </div>

            {/* Highlights */}
            <div className="mt-10 border-y border-ink-500 py-6">
              <p className="label mb-4">Highlights</p>
              <ul className="space-y-2.5">
                {vehicle.highlights.map((h) => (
                  <li key={h} className="flex items-baseline gap-3">
                    <span className="text-amber">—</span>
                    <span className="text-sm text-bone-100">{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key specs grid */}
            <div className="mt-8 grid grid-cols-3 gap-6">
              <DetailStat label="Year" value={vehicle.year.toString()} />
              <DetailStat label="KM Driven" value={formatKm(vehicle.kmDriven).replace(" km", "")} />
              <DetailStat label="Owners" value={vehicle.owners.toString()} />
              <DetailStat label="Fuel" value={vehicle.fuel} />
              <DetailStat label="Transmission" value={vehicle.transmission} />
              <DetailStat
                label="Engine"
                value={vehicle.engineCc > 0 ? `${vehicle.engineCc} cc` : "—"}
              />
            </div>

            {/* CTA */}
            <div className="mt-10 flex flex-col gap-3">
              <button
                onClick={onBuy}
                className="group flex items-center justify-center gap-3 bg-amber px-8 py-4 font-mono text-xs uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft"
              >
                Acquire this vehicle
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
              </button>
              <button
                onClick={() => toggle(vehicle.id)}
                className="flex items-center justify-center gap-3 border border-ink-500 px-8 py-4 font-mono text-xs uppercase tracking-wider text-bone-100 transition hover:border-amber hover:text-amber"
              >
                <span className="check-square" data-checked={isSelected} />
                {isSelected ? "Added to comparison" : "Add to comparison"}
              </button>
              <button
                onClick={() => setShowLead(true)}
                className="flex items-center justify-center gap-3 border border-ink-500 px-8 py-4 font-mono text-xs uppercase tracking-wider text-bone-300 transition hover:border-amber hover:text-amber"
              >
                <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />
                Talk to a sales rep
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <section className="mt-20 grid gap-10 border-t border-ink-500 pt-12 md:grid-cols-[1fr_2fr]">
          <p className="label">On this machine</p>
          <p className="max-w-3xl font-display text-2xl font-light leading-relaxed text-bone-100 md:text-3xl">
            {vehicle.description}
          </p>
        </section>

        {/* Full specs table */}
        <section className="mt-20 border-t border-ink-500 pt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl text-bone-100">Specifications</h2>
            <p className="label tabular">12 attributes</p>
          </div>
          <div className="mt-8 grid gap-0 md:grid-cols-2">
            {[
              ["Brand", vehicle.brand],
              ["Model", vehicle.model],
              ["Variant", vehicle.variant],
              ["Year", vehicle.year.toString()],
              ["KM Driven", formatKm(vehicle.kmDriven)],
              ["Owners", vehicle.owners.toString()],
              ["Fuel Type", vehicle.fuel],
              ["Transmission", vehicle.transmission],
              ["Engine", vehicle.engineCc > 0 ? `${vehicle.engineCc} cc` : "Electric"],
              ["Mileage", vehicle.mileageKmpl > 0 ? `${vehicle.mileageKmpl} km/l` : "—"],
              ["Colour", vehicle.color],
              ["Insurance", vehicle.insurance],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between border-b border-ink-500 py-4"
              >
                <p className="font-mono text-[11px] uppercase tracking-wider text-bone-400">
                  {k}
                </p>
                <p className="font-mono text-sm text-bone-100 tabular">{v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Valuation transcript */}
        {valuation && (
          <section className="mt-20 border-t border-ink-500 pt-12">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-3xl text-bone-100 flex items-center gap-3">
                <Camera className="h-5 w-5 text-amber" strokeWidth={1.5} />
                Bank-panel <span className="italic text-amber">valuation</span>
              </h2>
              <p className="label tabular">
                Floor {formatINR(valuation.floorPrice)} · List {formatINR(valuation.recommendedListPrice)}
              </p>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-[1fr_2fr]">
              <div className="space-y-3">
                <Detail label="Valuer" value={valuer?.name ?? valuation.valuerId} />
                <Detail label="Cert" value={valuer?.certNumber ?? "—"} />
                <Detail label="Inspected on" value={new Date(valuation.inspectedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
                {valuation.marketReference && <Detail label="Market reference" value={valuation.marketReference} />}
                <Detail label="Status" value={valuation.status} />
                {valuation.notes && (
                  <div>
                    <p className="label">Inspection notes</p>
                    <p className="mt-1 font-mono text-[11px] text-bone-300">{valuation.notes}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {valuation.photos.map((p, idx) => (
                  <div key={idx} className="border border-ink-500">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.caption ?? ""} className="aspect-video w-full object-cover" />
                    {p.caption && <p className="border-t border-ink-500 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-bone-400">{p.caption}</p>}
                  </div>
                ))}
                {valuation.photos.length === 0 && <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">No photos captured.</p>}
              </div>
            </div>
          </section>
        )}

        {/* Refurb history */}
        {repairs.length > 0 && (
          <section className="mt-20 border-t border-ink-500 pt-12">
            <h2 className="font-display text-3xl text-bone-100 flex items-center gap-3">
              <Wrench className="h-5 w-5 text-amber" strokeWidth={1.5} />
              Refurb <span className="italic text-amber">history</span>
            </h2>
            <div className="mt-6 divide-y divide-ink-500 border border-ink-500">
              {repairs.map((r) => (
                <div key={r.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_2fr_1fr]">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-amber">{r.status}</p>
                    <p className="mt-1 font-mono text-[11px] text-bone-100">{r.vendor}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">
                      {r.completedAt ? `Completed ${new Date(r.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : r.startedAt ? `Started ${new Date(r.startedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Planned"}
                    </p>
                  </div>
                  <ul className="space-y-1 font-mono text-[11px] text-bone-300">
                    {r.items.map((it, idx) => <li key={idx}>· {it.desc} — {formatINRFull(it.cost)}</li>)}
                  </ul>
                  <p className="font-display text-xl text-amber tabular md:text-right">{formatINRFull(r.totalCost)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Documents */}
        {vehicleDocs.length > 0 && (
          <section className="mt-20 border-t border-ink-500 pt-12">
            <h2 className="font-display text-3xl text-bone-100 flex items-center gap-3">
              <FileText className="h-5 w-5 text-amber" strokeWidth={1.5} />
              Document <span className="italic text-amber">vault</span>
            </h2>
            <div className="mt-6 divide-y divide-ink-500 border border-ink-500">
              {vehicleDocs.map((d) => (
                <div key={d.id} className="grid gap-3 px-5 py-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-amber">{DOC_LABELS[d.type]}</p>
                  <p className="font-mono text-[11px] text-bone-100">{d.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
                    {new Date(d.uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {d.uploadedBy ? ` · ${d.uploadedBy}` : ""}
                  </p>
                  <a href={d.url} target="_blank" rel="noreferrer" className="font-mono text-[10px] uppercase tracking-wider text-bone-300 hover:text-amber">View →</a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Similar vehicles */}
        <section className="mt-20 border-t border-ink-500 pt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl text-bone-100">
              Similar <span className="italic text-amber">machines</span>
            </h2>
            <Link href="/" className="label transition hover:text-amber">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((s) => (
              <Link
                key={s.id}
                href={`/vehicle/${s.id}`}
                className="group block border border-ink-500 bg-ink-800 transition-colors hover:border-amber"
              >
                <div className="card-image-wrap relative aspect-[4/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.images[0]}
                    alt={s.model}
                    className="card-image h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <p className="label">{s.brand}</p>
                  <p className="mt-1 font-display text-lg text-bone-100">{s.model}</p>
                  <p className="mt-2 font-mono text-xs text-amber tabular">
                    {formatINR(s.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {showLead && (
        <LeadModal
          onClose={() => setShowLead(false)}
          onSubmit={(name, phone) => {
            addLead(vehicle.id, name, phone, "web");
            setShowLead(false);
          }}
        />
      )}

      <CompareTray />
    </div>
  );
}

function LeadModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, phone: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const valid = name.trim().length >= 2 && phone.trim().length >= 6;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-ink-500 bg-ink-800 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-ink-500 pb-4">
          <h3 className="font-display text-xl text-bone-100">{done ? "Got it" : "Talk to a sales rep"}</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-bone-300" /></button>
        </div>
        {done ? (
          <div className="py-4">
            <Check className="h-10 w-10 text-signal-sage" strokeWidth={1.2} />
            <p className="mt-4 font-mono text-[12px] text-bone-100">A direct sales rep will reach you within one business hour.</p>
            <button onClick={onClose} className="mt-6 border border-amber bg-amber px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-900">Close</button>
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              <label className="block">
                <span className="label">Your name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-bone-100 outline-none focus:border-amber" placeholder="Full name" />
              </label>
              <label className="block">
                <span className="label">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-bone-100 outline-none focus:border-amber" placeholder="+91 9xxxxxxxxx" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={onClose} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300">Cancel</button>
              <button disabled={!valid} onClick={() => { onSubmit(name.trim(), phone.trim()); setDone(true); }} className={cn("border px-4 py-2 font-mono text-[11px] uppercase tracking-wider", valid ? "border-amber bg-amber text-ink-900" : "cursor-not-allowed border-ink-500 text-bone-500")}>Submit</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="mt-1 font-mono text-[11px] text-bone-100">{value}</p>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label mb-1.5">{label}</p>
      <p className="font-display text-lg text-bone-100 tabular">{value}</p>
    </div>
  );
}
