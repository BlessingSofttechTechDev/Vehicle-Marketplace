"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Download, ShieldAlert } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import { isAdmin, useAcquisitions } from "@/lib/acquisitions";
import { BANKS, useBanks, valuationFor, vehiclesForBank, getBank } from "@/lib/banks";
import { useCollections } from "@/lib/collections";
import { getVehicle } from "@/lib/data";
import { downloadRows } from "@/lib/csv";
import { formatINR, formatINRFull, cn } from "@/lib/utils";

export default function BankPortalPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const intakes = useBanks((s) => s.intakes);
  const valuations = useBanks((s) => s.valuations);
  const acquisitions = useAcquisitions((s) => s.items);
  const settlements = useCollections((s) => s.settlements);
  const borrowers = useCollections((s) => s.borrowers);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const admin = isAdmin(currentUser?.email);

  const [bankId, setBankId] = useState(BANKS[0]?.id ?? "");
  const bank = getBank(bankId);

  const summary = useMemo(() => {
    if (!bank) return null;
    const ids = vehiclesForBank(bank.id, intakes);
    const rows = ids.map((id) => {
      const v = getVehicle(id);
      const val = valuationFor(id, valuations);
      const acq = acquisitions.find((a) => a.vehicleId === id && a.status !== "cancelled");
      const borrower = borrowers.find((b) => b.vehicleId === id && b.bankId === bank.id);
      const settle = borrower ? settlements.filter((s) => s.borrowerId === borrower.id).sort((a, b) => b.createdAt - a.createdAt)[0] : undefined;
      const stage =
        acq?.status === "owned" ? "Sold" :
        acq?.status === "reserved" ? "Reserved" :
        v?.status === "active" ? "Listed" :
        val?.status === "approved" ? "Listing-ready" :
        val ? "Valuation submitted" : "Awaiting valuation";
      return {
        id,
        name: v ? `${v.brand} ${v.model}` : id,
        yard: v?.yardCity ?? "—",
        floor: val?.floorPrice ?? 0,
        list: val?.recommendedListPrice ?? v?.price ?? 0,
        sale: acq?.priceAtAcquisition ?? 0,
        stage,
        settlementStatus: settle?.status ?? null,
        recovered:
          settle?.status === "paid" ? settle.paidAmount ?? 0 :
          acq?.status === "owned" ? acq.priceAtAcquisition :
          0,
      };
    });
    const totals = {
      stock: rows.length,
      valued: rows.filter((r) => r.floor > 0).length,
      sold: rows.filter((r) => r.stage === "Sold").length,
      grossList: rows.reduce((s, r) => s + r.list, 0),
      grossFloor: rows.reduce((s, r) => s + r.floor, 0),
      recovered: rows.reduce((s, r) => s + r.recovered, 0),
    };
    return { rows, totals };
  }, [bank, intakes, valuations, acquisitions, settlements, borrowers]);

  if (!mounted) return <div className="min-h-screen"><Nav /></div>;
  if (!currentUser || !admin) return <Forbidden />;

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="border-b border-ink-500">
        <div className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Bank portal · read-only</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            What the <span className="italic">bank</span> sees.
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
            Live view of stock + recovery against the bank&apos;s panel valuations.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {BANKS.map((b) => (
              <button key={b.id} onClick={() => setBankId(b.id)} className={cn("border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition", bankId === b.id ? "border-amber bg-amber text-ink-900" : "border-ink-500 text-bone-300 hover:border-amber hover:text-amber")}>
                {b.shortName}
              </button>
            ))}
          </div>

          {summary && (
            <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-6">
              <KPI label="Stock" value={summary.totals.stock.toString()} />
              <KPI label="Valued" value={summary.totals.valued.toString()} />
              <KPI label="Sold" value={summary.totals.sold.toString()} />
              <KPI label="Floor total" value={formatINR(summary.totals.grossFloor)} />
              <KPI label="List total" value={formatINR(summary.totals.grossList)} />
              <KPI label="Recovered" value={formatINR(summary.totals.recovered)} accent />
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-10 md:px-10 md:py-14">
        {bank && (
          <section className="border border-ink-500 bg-ink-800">
            <div className="border-b border-ink-500 px-6 py-4">
              <p className="label">Panel</p>
              <p className="mt-1 font-mono text-[11px] text-bone-100">{bank.name} · {bank.contactEmail} · onboarded {bank.onboardedAt}</p>
            </div>
            <div className="divide-y divide-ink-500">
              {summary?.rows.map((r) => (
                <div key={r.id} className="grid gap-3 px-6 py-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
                  <Link href={`/vehicle/${r.id}`} className="font-mono text-[11px] text-bone-100 hover:text-amber">{r.id} · {r.name}</Link>
                  <p className="font-mono text-[11px] text-bone-300">{r.yard}</p>
                  <p className="font-mono text-[11px] text-bone-300 tabular">Floor {formatINRFull(r.floor)} / List {formatINRFull(r.list)}</p>
                  <p className="font-mono text-[11px] text-bone-100">{r.stage}</p>
                  <p className={cn("font-mono text-[11px] tabular", r.recovered > 0 ? "text-signal-sage" : "text-bone-500")}>
                    {r.recovered > 0 ? formatINRFull(r.recovered) : "—"}
                  </p>
                </div>
              ))}
              {summary?.rows.length === 0 && (
                <div className="px-6 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-bone-500">No stock for this bank yet.</div>
              )}
            </div>
            <div className="border-t border-ink-500 px-6 py-3 flex items-center justify-end">
              <button
                onClick={() =>
                  summary &&
                  downloadRows(`meridian-bank-${bank.shortName}`, summary.rows, [
                    { key: "id", label: "Vehicle" },
                    { key: "name", label: "Name" },
                    { key: "yard", label: "Yard" },
                    { key: "floor", label: "Floor" },
                    { key: "list", label: "List" },
                    { key: "stage", label: "Stage" },
                    { key: "recovered", label: "Recovered" },
                  ])
                }
                className="flex items-center gap-2 border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 hover:border-amber hover:text-amber"
              >
                <Download className="h-3 w-3" strokeWidth={1.5} />Export CSV
              </button>
            </div>
          </section>
        )}
      </main>
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
