"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Activity, ShieldAlert, Search, Download } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import { isAdmin, useAcquisitions } from "@/lib/acquisitions";
import { useBanks } from "@/lib/banks";
import { useCollections } from "@/lib/collections";
import { useRefurb } from "@/lib/refurb";
import { useAgents } from "@/lib/agents";
import { useSales } from "@/lib/sales";
import { buildActivity, type ActivityEvent, type ActivityType } from "@/lib/activity";
import { downloadRows } from "@/lib/csv";
import { cn } from "@/lib/utils";

const TYPE_FILTERS: { key: "all" | ActivityType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "intake", label: "Intake" },
  { key: "valuation_approved", label: "Valuation" },
  { key: "settlement_paid", label: "Settled" },
  { key: "seizure_initiated", label: "Seizure" },
  { key: "refurb_completed", label: "Refurb" },
  { key: "agent_sale", label: "Agent sale" },
  { key: "lead_won", label: "Lead won" },
  { key: "acquisition", label: "Acquisition" },
];

export default function ActivityPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const intakes = useBanks((s) => s.intakes);
  const valuations = useBanks((s) => s.valuations);
  const borrowers = useCollections((s) => s.borrowers);
  const settlements = useCollections((s) => s.settlements);
  const seizures = useCollections((s) => s.seizures);
  const orders = useRefurb((s) => s.orders);
  const allotments = useAgents((s) => s.allotments);
  const leads = useSales((s) => s.leads);
  const acquisitions = useAcquisitions((s) => s.items);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const admin = isAdmin(currentUser?.email);

  const events = useMemo(
    () =>
      buildActivity({
        intakes, valuations, borrowers, settlements, seizures,
        orders, allotments, leads, acquisitions,
      }),
    [intakes, valuations, borrowers, settlements, seizures, orders, allotments, leads, acquisitions]
  );

  const [filter, setFilter] = useState<"all" | ActivityType>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filter !== "all") {
        if (filter === "valuation_approved" && !e.type.startsWith("valuation")) return false;
        if (filter === "settlement_paid" && !e.type.startsWith("settlement")) return false;
        if (filter === "seizure_initiated" && !e.type.startsWith("seizure")) return false;
        if (filter === "refurb_completed" && !e.type.startsWith("refurb")) return false;
        if (filter === "lead_won" && !e.type.startsWith("lead")) return false;
        if (
          ["intake", "agent_sale", "acquisition"].includes(filter) &&
          e.type !== filter
        ) return false;
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!e.title.toLowerCase().includes(q) && !e.detail.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [events, filter, query]);

  if (!mounted) return <div className="min-h-screen"><Nav /></div>;
  if (!currentUser || !admin) return <Forbidden />;

  return (
    <div className="min-h-screen">
      <Nav />
      <section className="border-b border-ink-500">
        <div className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
          <Link href="/admin" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-bone-400 hover:text-amber">
            <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />Back to admin
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <Activity className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Admin · Activity log</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            Operations <span className="italic">timeline</span>.
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
            Every meaningful event across intake, valuation, collection, refurb, agent, sales and customer flows.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-10 md:px-10 md:py-14">
        <div className="flex flex-wrap items-center gap-3">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition",
                filter === f.key ? "border-amber bg-amber text-ink-900" : "border-ink-500 text-bone-300 hover:border-amber hover:text-amber"
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 border border-ink-500 px-3 py-1.5">
            <Search className="h-3 w-3 text-bone-400" strokeWidth={1.5} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events"
              className="w-48 bg-transparent font-mono text-[11px] text-bone-100 placeholder:text-bone-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => downloadRows("meridian-activity", filtered, [
              { key: "at", label: "At", format: (r) => new Date(r.at).toISOString() },
              { key: "type", label: "Type" },
              { key: "title", label: "Title" },
              { key: "detail", label: "Detail" },
              { key: "vehicleId", label: "Vehicle" },
              { key: "tone", label: "Tone" },
            ])}
            className="flex items-center gap-2 border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 hover:border-amber hover:text-amber"
          >
            <Download className="h-3 w-3" strokeWidth={1.5} />Export CSV
          </button>
        </div>

        <section className="border border-ink-500 bg-ink-800">
          <div className="border-b border-ink-500 px-6 py-3 flex items-center justify-between">
            <p className="label-amber label">Timeline · {filtered.length} events</p>
          </div>
          <div className="divide-y divide-ink-500">
            {filtered.map((e) => <Row key={e.id} event={e} />)}
            {filtered.length === 0 && (
              <div className="px-6 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-bone-500">No events match.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Row({ event }: { event: ActivityEvent }) {
  const cls = {
    neutral: "border-bone-500/40 text-bone-300",
    ok: "border-signal-sage/40 text-signal-sage",
    warn: "border-amber/40 text-amber",
    danger: "border-signal-red/40 text-signal-red",
  }[event.tone];
  return (
    <Link href={event.href ?? "#"} className="grid gap-3 px-6 py-3 transition hover:bg-ink-700 md:grid-cols-[160px_140px_1fr] md:items-center">
      <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
        {new Date(event.at).toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
        })}
      </p>
      <span className={cn("inline-flex items-center justify-center border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider w-fit", cls)}>
        {event.type.replace(/_/g, " ")}
      </span>
      <div>
        <p className="font-mono text-[12px] text-bone-100">{event.title}</p>
        <p className="font-mono text-[11px] text-bone-400">{event.detail}</p>
      </div>
    </Link>
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
