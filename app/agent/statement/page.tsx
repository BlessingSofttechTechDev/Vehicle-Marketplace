"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import { useAgents, getAgentForEmail, agentRevenue } from "@/lib/agents";
import { getVehicle } from "@/lib/data";
import { downloadRows } from "@/lib/csv";
import { formatINRFull, formatINR } from "@/lib/utils";

export default function AgentStatementPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const agents = useAgents((s) => s.agents);
  const allotments = useAgents((s) => s.allotments);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const agent = getAgentForEmail(currentUser?.email, agents);

  const lines = useMemo(() => {
    if (!agent) return [];
    return allotments
      .filter((al) => al.agentId === agent.id)
      .flatMap((al) =>
        al.lines
          .filter((ln) => ln.status === "sold")
          .map((ln) => {
            const v = getVehicle(ln.vehicleId);
            return {
              allotmentId: al.id,
              vehicleId: ln.vehicleId,
              vehicleName: v ? `${v.brand} ${v.model}` : ln.vehicleId,
              soldAt: ln.soldAt ?? 0,
              soldPrice: ln.soldPrice ?? 0,
              buyerName: ln.buyerName ?? "",
              buyerPhone: ln.buyerPhone ?? "",
              commissionAmount: ln.commissionAmount ?? 0,
              commissionPaid: ln.commissionPaid ?? false,
              commissionPaidAt: ln.commissionPaidAt ?? 0,
            };
          })
      )
      .sort((a, b) => b.soldAt - a.soldAt);
  }, [agent, allotments]);

  const revenue = useMemo(
    () => (agent ? agentRevenue(agent.id, allotments) : null),
    [agent, allotments]
  );

  if (!mounted) return <div className="min-h-screen"><Nav /></div>;

  if (!currentUser || !agent) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="font-display text-4xl text-bone-100">Agent statement</h1>
          <p className="mt-3 text-bone-400">Sign in as an agent to view your commission statement.</p>
          <Link href="/login" className="mt-8 inline-block border border-amber bg-amber px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-900">Sign in</Link>
        </main>
      </div>
    );
  }

  const generated = new Date();

  return (
    <div className="min-h-screen">
      <div className="print:hidden"><Nav /></div>
      <section className="border-b border-ink-500 print:border-none">
        <div className="mx-auto max-w-[1100px] px-6 py-8 md:px-10 md:py-10">
          <div className="flex items-center justify-between print:hidden">
            <Link href="/agent" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-bone-400 hover:text-amber">
              <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />Back to dashboard
            </Link>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="flex items-center gap-2 border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 hover:border-amber hover:text-amber">
                <Printer className="h-3 w-3" strokeWidth={1.5} />Print / save PDF
              </button>
              <button onClick={() => downloadRows(`statement-${agent.code}`, lines, [
                { key: "soldAt", label: "Sold at", format: (r) => new Date(r.soldAt).toLocaleString("en-IN") },
                { key: "vehicleId", label: "Vehicle ID" },
                { key: "vehicleName", label: "Vehicle" },
                { key: "buyerName", label: "Buyer" },
                { key: "buyerPhone", label: "Phone" },
                { key: "soldPrice", label: "Sold price" },
                { key: "commissionAmount", label: "Commission" },
                { key: "commissionPaid", label: "Paid" },
              ])} className="flex items-center gap-2 border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 hover:border-amber hover:text-amber">
                <Download className="h-3 w-3" strokeWidth={1.5} />CSV
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1100px] px-6 py-10 md:px-10 print:py-6">
        <div className="border border-ink-500 bg-ink-800 p-8 print:border-none print:bg-white print:p-0 print:text-black">
          <div className="flex items-start justify-between border-b border-ink-500 pb-6 print:border-black">
            <div>
              <p className="label-amber label">Meridian · Agent commission statement</p>
              <h1 className="mt-3 font-display text-4xl text-bone-100 print:text-3xl print:text-black">Statement of {agent.code}</h1>
              <p className="mt-1 font-mono text-[11px] text-bone-400 print:text-black">{agent.name} · {agent.email} · {agent.phone}</p>
              <p className="font-mono text-[11px] text-bone-400 print:text-black">{agent.city}, {agent.region} · Commission rate {agent.commissionPct}%</p>
            </div>
            <div className="text-right">
              <p className="label">Generated</p>
              <p className="mt-1 font-mono text-[11px] text-bone-100 print:text-black">{generated.toLocaleString("en-IN")}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500 print:text-black">All-time</p>
            </div>
          </div>

          {revenue && (
            <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
              <Stat label="Sold" value={revenue.sold.toString()} />
              <Stat label="Gross sales" value={formatINR(revenue.grossSales)} />
              <Stat label="Earned" value={formatINR(revenue.commissionEarned)} />
              <Stat label="Pending" value={formatINR(revenue.commissionPending)} />
            </div>
          )}

          <div className="mt-8 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {["Date", "Vehicle", "Buyer", "Sold price", "Commission", "Status"].map((h) => (
                    <th key={h} className="border-b border-ink-500 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-bone-500 print:border-black print:text-black">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={`${l.allotmentId}-${l.vehicleId}-${idx}`} className="border-b border-ink-500 print:border-black">
                    <td className="px-3 py-2 font-mono text-[11px] text-bone-300 print:text-black">{l.soldAt ? new Date(l.soldAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-bone-100 print:text-black">{l.vehicleName} <span className="text-bone-500 print:text-black">{l.vehicleId}</span></td>
                    <td className="px-3 py-2 font-mono text-[11px] text-bone-100 print:text-black">{l.buyerName}<br /><span className="font-mono text-[10px] text-bone-500 print:text-black">{l.buyerPhone}</span></td>
                    <td className="px-3 py-2 font-mono text-[11px] text-bone-100 tabular print:text-black">{formatINRFull(l.soldPrice)}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-amber tabular">{formatINRFull(l.commissionAmount)}</td>
                    <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider">{l.commissionPaid ? <span className="text-signal-sage print:text-black">Paid</span> : <span className="text-amber">Pending</span>}</td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center font-mono text-[11px] uppercase tracking-wider text-bone-500 print:text-black">No closed sales yet.</td></tr>
                )}
              </tbody>
              {revenue && lines.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-amber">
                    <td colSpan={3} className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-100 print:text-black">Totals</td>
                    <td className="px-3 py-2 font-mono text-[11px] tabular text-bone-100 print:text-black">{formatINRFull(revenue.grossSales)}</td>
                    <td className="px-3 py-2 font-mono text-[11px] tabular text-amber">{formatINRFull(revenue.commissionEarned)}</td>
                    <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-bone-100 print:text-black">{formatINRFull(revenue.commissionReceived)} paid · {formatINRFull(revenue.commissionPending)} due</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <p className="mt-8 font-mono text-[10px] uppercase tracking-wider text-bone-500 print:text-black">
            This statement is auto-generated and reflects activity recorded against your agent code at the time of generation.
          </p>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="mt-1 font-display text-2xl text-bone-100 tabular print:text-black">{value}</p>
    </div>
  );
}
