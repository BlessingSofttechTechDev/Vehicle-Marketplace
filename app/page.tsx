"use client";
import { useMemo, useState } from "react";
import { Nav } from "@/components/nav";
import { FilterBar, DEFAULT_FILTERS, type Filters } from "@/components/filter-bar";
import { VehicleCard, type VehicleBadge } from "@/components/vehicle-card";
import { CompareTray } from "@/components/compare-tray";
import { VEHICLES } from "@/lib/data";
import { useBanks, valuationFor, bankForVehicle } from "@/lib/banks";
import { useAgents, allottedVehicleIds } from "@/lib/agents";
import { useCollections } from "@/lib/collections";
import { useRefurb } from "@/lib/refurb";

const DAY = 86400000;

const TICKER = [
  "New — Porsche 992 Carrera, Mumbai",
  "Consigned — BMW M3 Comp, Isle of Man Green",
  "Accepting — Rare Ducatis · Singer Commissions",
  "Verified — 96 listings this quarter",
  "Journal — The case for a Continental GT 650",
];

export default function HomePage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const intakes = useBanks((s) => s.intakes);
  const valuations = useBanks((s) => s.valuations);
  const allotments = useAgents((s) => s.allotments);
  const seizures = useCollections((s) => s.seizures);
  const orders = useRefurb((s) => s.orders);

  const heldByAgents = useMemo(() => allottedVehicleIds(allotments), [allotments]);

  const borrowers = useCollections((s) => s.borrowers);
  const underSeizure = useMemo(() => {
    const ids = new Set<string>();
    const activeIds = new Set<string>(
      seizures
        .filter((z) => z.status !== "closed")
        .map((z) => z.borrowerId)
    );
    for (const b of borrowers) {
      if (activeIds.has(b.id)) ids.add(b.vehicleId);
    }
    return ids;
  }, [seizures, borrowers]);

  const intakeIds = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of intakes) for (const id of i.vehicleIds) {
      if (!m.has(id)) m.set(id, i.receivedAt);
    }
    return m;
  }, [intakes]);

  const completedRefurb = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) {
      if (o.status === "completed" && o.completedAt) {
        const cur = m.get(o.vehicleId) ?? 0;
        if (o.completedAt > cur) m.set(o.vehicleId, o.completedAt);
      }
    }
    return m;
  }, [orders]);

  const results = useMemo(() => {
    let v = VEHICLES.slice();

    // Hide allotted-to-agents (in agent's hands)
    v = v.filter((x) => !heldByAgents.has(x.id));
    // Hide vehicles under active seizure
    v = v.filter((x) => !underSeizure.has(x.id));
    // Hide vehicles in bank intake without an approved valuation (not yet listing-ready)
    v = v.filter((x) => {
      if (!intakeIds.has(x.id)) return true; // not bank-tracked → keep
      const val = valuationFor(x.id, valuations);
      return val?.status === "approved";
    });

    if (filters.category !== "all") v = v.filter((x) => x.category === filters.category);
    v = v.filter((x) => x.price <= filters.priceMax);
    if (filters.years.length) v = v.filter((x) => filters.years.includes(x.year));
    if (filters.fuels.length) v = v.filter((x) => filters.fuels.includes(x.fuel));
    if (filters.transmissions.length)
      v = v.filter((x) => filters.transmissions.includes(x.transmission));
    if (filters.brands.length) v = v.filter((x) => filters.brands.includes(x.brand));
    switch (filters.sort) {
      case "price-asc":
        v.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        v.sort((a, b) => b.price - a.price);
        break;
      case "year-desc":
        v.sort((a, b) => b.year - a.year);
        break;
    }
    return v;
  }, [filters, heldByAgents, underSeizure, intakeIds, valuations]);

  const badgeFor = (id: string): VehicleBadge | undefined => {
    const ts = completedRefurb.get(id);
    if (ts && Date.now() - ts < 30 * DAY) return { label: "Refurbished", tone: "sage" };
    if (intakeIds.has(id)) {
      const info = bankForVehicle(id, intakes);
      if (info) return { label: `${info.bank.shortName} repo · valued`, tone: "amber" };
    }
    const newest = intakeIds.get(id);
    if (newest && Date.now() - newest < 14 * DAY) return { label: "Just listed", tone: "info" };
    return undefined;
  };

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Compact header — ticker + one-line headline */}
      <section className="relative overflow-hidden border-b border-ink-500">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-6 py-6 md:flex-row md:items-baseline md:justify-between md:px-10 md:py-8">
          <div className="flex items-baseline gap-4">
            <p className="label-amber label">Spring Index</p>
            <h1 className="font-display text-2xl font-light text-bone-100 md:text-3xl">
              The marketplace, <span className="italic text-amber">live</span>.
            </h1>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <Metric value="148" label="Listings" />
            <span className="h-8 w-px bg-ink-500" />
            <Metric value="96%" label="Verified" />
            <span className="h-8 w-px bg-ink-500 hidden md:block" />
            <Metric value="7d" label="Return" className="hidden md:block" />
          </div>
        </div>

        {/* Ticker marquee */}
        <div className="marquee-wrap border-t border-ink-500 py-3">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="mx-10 flex items-center gap-4 font-mono text-[11px] uppercase tracking-wider text-bone-400">
                <span className="h-1 w-1 rounded-full bg-amber" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <FilterBar filters={filters} onChange={setFilters} resultCount={results.length} />

      <main className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="label-amber label">No matches</p>
            <h2 className="mt-4 font-display text-4xl text-bone-100">
              Nothing in this specification yet.
            </h2>
            <p className="mt-3 max-w-md text-bone-400">
              Widen your filters, or tell us what you&apos;re looking for and we&apos;ll source it.
            </p>
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="mt-8 border border-amber px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-amber transition hover:bg-amber hover:text-ink-900"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((v, i) => (
              <VehicleCard key={v.id} vehicle={v} index={i} badge={badgeFor(v.id)} />
            ))}
          </div>
        )}
      </main>

      {/* Editorial footer */}
      <footer className="mt-20 border-t border-ink-500 pb-32">
        <div className="mx-auto max-w-[1600px] px-6 py-16 md:px-10">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <p className="font-display text-4xl italic text-bone-100">
                Meridian<span className="text-amber">.</span>
              </p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-bone-400">
                A collector&apos;s marketplace for pre-owned cars and bikes in India.
                Based in Mumbai. Operating since 2024.
              </p>
            </div>
            <FooterCol title="Marketplace" items={["Cars", "Bikes", "Wishlist", "Journal"]} />
            <FooterCol title="Company" items={["Inspection", "Sell", "Careers", "Press"]} />
          </div>
          <div className="mt-16 flex items-center justify-between border-t border-ink-500 pt-6 text-bone-400">
            <p className="font-mono text-[10px] uppercase tracking-wider">
              © 2026 Meridian Motors Pvt. Ltd.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider">
              Made with intent.
            </p>
          </div>
        </div>
      </footer>

      <CompareTray />
    </div>
  );
}

function Metric({
  value,
  label,
  className = "",
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="font-display text-xl text-bone-100 tabular md:text-2xl">{value}</p>
      <p className="label mt-0.5" style={{ fontSize: "9px" }}>{label}</p>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="label mb-4">{title}</p>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i}>
            <a href="#" className="text-sm text-bone-300 transition hover:text-amber">
              {i}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
