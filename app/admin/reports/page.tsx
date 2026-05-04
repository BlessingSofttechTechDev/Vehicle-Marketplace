"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldAlert, BarChart3, TrendingUp, TrendingDown, Download } from "lucide-react";
import { downloadRows } from "@/lib/csv";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import { isAdmin, useAcquisitions } from "@/lib/acquisitions";
import { useBanks } from "@/lib/banks";
import { useAgents } from "@/lib/agents";
import { useRefurb } from "@/lib/refurb";
import { useSales } from "@/lib/sales";
import { useCollections } from "@/lib/collections";
import {
  bankReport,
  agentReport,
  salesRepReport,
  computePnL,
  cashFlow,
  stockAging,
} from "@/lib/reports";
import { formatINRFull, formatINR, cn } from "@/lib/utils";

export default function ReportsPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const acquisitions = useAcquisitions((s) => s.items);
  const intakes = useBanks((s) => s.intakes);
  const valuations = useBanks((s) => s.valuations);
  const agents = useAgents((s) => s.agents);
  const allotments = useAgents((s) => s.allotments);
  const orders = useRefurb((s) => s.orders);
  const leads = useSales((s) => s.leads);
  const settlements = useCollections((s) => s.settlements);
  const seizures = useCollections((s) => s.seizures);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const admin = isAdmin(currentUser?.email);

  const banksRows = useMemo(() => bankReport(intakes, valuations, acquisitions), [intakes, valuations, acquisitions]);
  const agentsRows = useMemo(() => agentReport(agents, allotments), [agents, allotments]);
  const salesRows = useMemo(() => salesRepReport(leads), [leads]);
  const pnl = useMemo(() => computePnL({
    acquisitions, allotments, leads, orders, valuations,
    seizureCount: seizures.length,
  }), [acquisitions, allotments, leads, orders, valuations, seizures]);
  const paidSettlements = useMemo(
    () => settlements.filter((x) => x.status === "paid" && x.paidAt && x.paidAmount).map((x) => ({ paidAt: x.paidAt!, paidAmount: x.paidAmount! })),
    [settlements]
  );
  const flow = useMemo(() => cashFlow({ acquisitions, allotments, leads, orders, paidSettlements }), [acquisitions, allotments, leads, orders, paidSettlements]);
  const aging = useMemo(() => stockAging(intakes, acquisitions, allotments), [intakes, acquisitions, allotments]);

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
            <BarChart3 className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Admin · Reports & analytics</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            Operating <span className="italic">reports</span>.
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
            Bank, agent, direct sales, P&amp;L, cash flow, stock aging — derived live from operations.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-10 px-6 py-10 md:px-10 md:py-14">
        {/* P&L */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="border-b border-ink-500 px-6 py-4"><p className="label-amber label">P&amp;L (lifetime)</p></div>
          <div className="grid gap-0 md:grid-cols-4">
            <Block label="Revenue" value={formatINRFull(pnl.revenue)} accent="up" />
            <Block label="Costs" value={formatINRFull(pnl.totalCost)} accent="down" />
            <Block label="Net" value={formatINRFull(pnl.net)} accent={pnl.net >= 0 ? "up" : "down"} />
            <div className="border-l border-ink-500 px-6 py-5">
              <p className="label">Cost split</p>
              <div className="mt-2 space-y-1 font-mono text-[10px] uppercase tracking-wider text-bone-300">
                <div className="flex justify-between"><span>Agent commission</span><span>{formatINR(pnl.costs.agentCommission)}</span></div>
                <div className="flex justify-between"><span>Refurb</span><span>{formatINR(pnl.costs.refurb)}</span></div>
                <div className="flex justify-between"><span>Valuation fees</span><span>{formatINR(pnl.costs.valuationFees)}</span></div>
                <div className="flex justify-between"><span>Legal / seizure</span><span>{formatINR(pnl.costs.legalSeizure)}</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Bank-wise */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
            <p className="label-amber label">Bank-wise</p>
            <ExportBtn onClick={() => downloadRows("meridian-banks", banksRows.map((r) => ({
              code: r.bank.code, name: r.bank.shortName, intakeCount: r.intakeCount, vehicleCount: r.vehicleCount, valued: r.valued, pendingValuation: r.pendingValuation, sold: r.sold, recovered: r.recovered, totalFloor: r.totalFloor,
            })), [
              { key: "code", label: "Bank code" }, { key: "name", label: "Bank" }, { key: "intakeCount", label: "Intakes" },
              { key: "vehicleCount", label: "Vehicles" }, { key: "valued", label: "Valued" }, { key: "pendingValuation", label: "Pending" },
              { key: "sold", label: "Sold" }, { key: "recovered", label: "Recovered" }, { key: "totalFloor", label: "Floor total" },
            ])} />
          </div>
          <Table headers={["Bank", "Intakes", "Vehicles", "Valued", "Pending", "Sold", "Recovered", "Floor"]}>
            {banksRows.map((r) => (
              <tr key={r.bank.id} className="border-t border-ink-500">
                <td className="px-4 py-3 font-mono text-[11px] text-bone-100">{r.bank.shortName}<span className="ml-2 text-bone-500">{r.bank.code}</span></td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-300">{r.intakeCount}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-300">{r.vehicleCount}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-signal-sage">{r.valued}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-amber">{r.pendingValuation}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-300">{r.sold}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-100 tabular">{formatINR(r.recovered)}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-300 tabular">{formatINR(r.totalFloor)}</td>
              </tr>
            ))}
          </Table>
        </section>

        {/* Agent-wise */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
            <p className="label-amber label">Agent-wise</p>
            <ExportBtn onClick={() => downloadRows("meridian-agents", agentsRows.map((r) => ({
              code: r.agent.code, name: r.agent.name, city: r.agent.city, region: r.agent.region, commissionPct: r.agent.commissionPct,
              inField: r.inField, sold: r.sold, grossSales: r.grossSales, commissionEarned: r.commissionEarned, commissionPending: r.commissionPending,
            })), [
              { key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "city", label: "City" }, { key: "region", label: "Region" },
              { key: "commissionPct", label: "Commission %" }, { key: "inField", label: "In field" }, { key: "sold", label: "Sold" },
              { key: "grossSales", label: "Gross sales" }, { key: "commissionEarned", label: "Earned" }, { key: "commissionPending", label: "Pending" },
            ])} />
          </div>
          <Table headers={["Agent", "City", "In field", "Sold", "Gross sales", "Earned", "Pending"]}>
            {agentsRows.map((r) => (
              <tr key={r.agent.id} className="border-t border-ink-500">
                <td className="px-4 py-3 font-mono text-[11px] text-bone-100">{r.agent.code} · {r.agent.name}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-300">{r.agent.city}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-300">{r.inField}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-300">{r.sold}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-100 tabular">{formatINR(r.grossSales)}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-100 tabular">{formatINR(r.commissionEarned)}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-amber tabular">{formatINR(r.commissionPending)}</td>
              </tr>
            ))}
          </Table>
        </section>

        {/* Direct sales */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
            <p className="label-amber label">Direct sales team</p>
            <ExportBtn onClick={() => downloadRows("meridian-sales-reps", salesRows.map((r) => ({
              code: r.rep.code, name: r.rep.name, region: r.rep.region, total: r.total, inPipeline: r.inPipeline,
              won: r.won, lost: r.lost, conversionPct: r.conversionPct, revenue: r.revenue,
            })), [
              { key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "region", label: "Region" }, { key: "total", label: "Total" },
              { key: "inPipeline", label: "Pipeline" }, { key: "won", label: "Won" }, { key: "lost", label: "Lost" },
              { key: "conversionPct", label: "Conversion %" }, { key: "revenue", label: "Revenue" },
            ])} />
          </div>
          <Table headers={["Rep", "Region", "Total", "Pipeline", "Won", "Lost", "Conversion", "Revenue"]}>
            {salesRows.map((r) => (
              <tr key={r.rep.id} className="border-t border-ink-500">
                <td className="px-4 py-3 font-mono text-[11px] text-bone-100">{r.rep.code} · {r.rep.name}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-300">{r.rep.region}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-300">{r.total}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-amber">{r.inPipeline}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-signal-sage">{r.won}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-signal-red">{r.lost}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-100">{r.conversionPct}%</td>
                <td className="px-4 py-3 font-mono text-[11px] text-bone-100 tabular">{formatINR(r.revenue)}</td>
              </tr>
            ))}
          </Table>
        </section>

        {/* Cash flow */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
            <p className="label-amber label">Cash flow (monthly)</p>
            <ExportBtn onClick={() => downloadRows("meridian-cash-flow", flow, [
              { key: "month", label: "Month" }, { key: "inflow", label: "Inflow" }, { key: "outflow", label: "Outflow" }, { key: "net", label: "Net" },
            ])} />
          </div>
          {flow.length === 0 ? (
            <div className="px-6 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-bone-500">No cash movements yet.</div>
          ) : (
            <Table headers={["Month", "Inflow", "Outflow", "Net"]}>
              {flow.map((r) => (
                <tr key={r.month} className="border-t border-ink-500">
                  <td className="px-4 py-3 font-mono text-[11px] text-bone-100">{r.month}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-signal-sage tabular">+{formatINR(r.inflow)}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-signal-red tabular">-{formatINR(r.outflow)}</td>
                  <td className={cn("px-4 py-3 font-mono text-[11px] tabular", r.net >= 0 ? "text-bone-100" : "text-signal-red")}>{formatINR(r.net)}</td>
                </tr>
              ))}
            </Table>
          )}
        </section>

        {/* Stock aging */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="border-b border-ink-500 px-6 py-4"><p className="label-amber label">Stock aging (intake-tracked)</p></div>
          <div className="grid grid-cols-2 gap-0 md:grid-cols-4">
            {aging.map((b) => (
              <div key={b.label} className="border-b border-r border-ink-500 px-5 py-4">
                <p className="label">{b.label}</p>
                <p className="mt-2 font-display text-3xl text-bone-100 tabular">{b.count}</p>
              </div>
            ))}
          </div>
          <p className="border-t border-ink-500 px-6 py-3 font-mono text-[10px] uppercase tracking-wider text-bone-500">
            Aged from bank intake date · drives valuation/refurb prioritisation.
          </p>
        </section>
      </main>
    </div>
  );
}

function Block({ label, value, accent }: { label: string; value: string; accent?: "up" | "down" }) {
  const Icon = accent === "down" ? TrendingDown : TrendingUp;
  return (
    <div className="border-r border-ink-500 px-6 py-5 last:border-r-0">
      <p className="label flex items-center gap-1.5"><Icon className={cn("h-3 w-3", accent === "down" ? "text-signal-red" : "text-signal-sage")} strokeWidth={1.5} />{label}</p>
      <p className={cn("mt-3 font-display text-4xl tabular", accent === "down" ? "text-signal-red" : "text-bone-100")}>{value}</p>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-bone-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ExportBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 hover:border-amber hover:text-amber">
      <Download className="h-3 w-3" strokeWidth={1.5} />Export CSV
    </button>
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
