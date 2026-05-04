"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  TrendingUp,
  Package,
  Users,
  Banknote,
  Search,
  Check,
  X,
  RotateCcw,
  Car,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  Inbox,
  Workflow,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { UploadsSection } from "@/components/uploads-section";
import { useAuth } from "@/lib/auth";
import {
  useAcquisitions,
  isAdmin,
  type Acquisition,
  type AcquisitionStatus,
} from "@/lib/acquisitions";
import { getVehicle, VEHICLES, PARTNER_ORGS, CATEGORY_LABELS } from "@/lib/data";
import { YARDS, getYardForEmail } from "@/lib/yards";
import { formatINRFull, formatINR, cn } from "@/lib/utils";
import { Warehouse } from "lucide-react";

type StatusFilter = "all" | AcquisitionStatus;

export default function AdminDashboardPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const items = useAcquisitions((s) => s.items);
  const setStatus = useAcquisitions((s) => s.setStatus);
  const remove = useAcquisitions((s) => s.remove);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => setMounted(true), []);

  const admin = isAdmin(currentUser?.email);
  const managerYard = getYardForEmail(currentUser?.email);
  const yardManager = !!managerYard;

  // Inventory scoped by role: super admin sees all; yard manager sees only their yard.
  const scopedVehicles = useMemo(() => {
    if (managerYard) return VEHICLES.filter((v) => v.yardCity === managerYard.city);
    return VEHICLES;
  }, [managerYard]);

  const scopedItems = useMemo(() => {
    if (!managerYard) return items;
    return items.filter((a) => {
      const v = getVehicle(a.vehicleId);
      return v?.yardCity === managerYard.city;
    });
  }, [items, managerYard]);

  const kpis = useMemo(() => {
    const owned = scopedItems.filter((a) => a.status === "owned");
    const reserved = scopedItems.filter((a) => a.status === "reserved");
    const revenue = scopedItems
      .filter((a) => a.status !== "cancelled")
      .reduce((s, a) => s + a.amountPaid, 0);
    const uniqueBuyers = new Set(scopedItems.map((a) => a.userEmail)).size;
    const gmv = owned.reduce((s, a) => s + a.priceAtAcquisition, 0);
    return {
      total: scopedItems.length,
      owned: owned.length,
      reserved: reserved.length,
      revenue,
      uniqueBuyers,
      gmv,
    };
  }, [scopedItems]);

  const rows = useMemo(() => {
    let rs = scopedItems.slice().sort((a, b) => b.acquiredAt - a.acquiredAt);
    if (filter !== "all") rs = rs.filter((a) => a.status === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rs = rs.filter((a) => {
        const v = getVehicle(a.vehicleId);
        return (
          a.bookingId.toLowerCase().includes(q) ||
          a.userEmail.toLowerCase().includes(q) ||
          a.userName.toLowerCase().includes(q) ||
          (v && `${v.brand} ${v.model}`.toLowerCase().includes(q))
        );
      });
    }
    return rs;
  }, [scopedItems, filter, query]);

  // What needs the operator's attention right now — counts pulled from the
  // same scoped data we already use for KPIs and pipeline.
  const attention = useMemo(() => {
    const awaitingInspection = scopedVehicles.filter(
      (v) =>
        v.status === "draft" ||
        (v.status === "pending_review" && v.inspectionDone === false)
    ).length;
    const readyToList = scopedVehicles.filter(
      (v) => v.status === "pending_review" && v.inspectionDone === true
    ).length;
    const reservedBookings = scopedItems.filter(
      (a) => a.status === "reserved"
    ).length;
    return { awaitingInspection, readyToList, reservedBookings };
  }, [scopedVehicles, scopedItems]);

  // Inventory KPIs scoped to viewer.
  const inventoryByCategory = useMemo(() => {
    const out: Record<string, number> = {};
    scopedVehicles.forEach((v) => {
      out[v.category] = (out[v.category] ?? 0) + 1;
    });
    return out;
  }, [scopedVehicles]);

  // Procurement → Valuation → Sales pipeline per yard.
  // Stage mapping:
  //   procurement: draft OR (pending_review AND not yet inspected)
  //   valuation:   pending_review AND inspected (priced / listing-ready)
  //   sales:       active (listed) + reserved + sold (from ledger)
  const yardPipelines = useMemo(() => {
    return YARDS.map((yard) => {
      const ofYard = VEHICLES.filter((v) => v.yardCity === yard.city);
      const procurement = ofYard.filter(
        (v) =>
          v.status === "draft" ||
          (v.status === "pending_review" && v.inspectionDone === false)
      ).length;
      const valuation = ofYard.filter(
        (v) => v.status === "pending_review" && v.inspectionDone === true
      ).length;
      const listed = ofYard.filter((v) => v.status === "active").length;
      const yardItems = items.filter(
        (a) => getVehicle(a.vehicleId)?.yardCity === yard.city
      );
      const reserved = yardItems.filter((a) => a.status === "reserved").length;
      const sold = yardItems.filter((a) => a.status === "owned");
      return {
        yard,
        total: ofYard.length,
        procurement,
        valuation,
        listed,
        reserved,
        sold: sold.length,
        gmv: sold.reduce((s, a) => s + a.priceAtAcquisition, 0),
      };
    });
  }, [items]);

  const visiblePipelines = useMemo(
    () =>
      managerYard
        ? yardPipelines.filter((p) => p.yard.id === managerYard.id)
        : yardPipelines,
    [yardPipelines, managerYard]
  );

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <Nav />
      </div>
    );
  }

  if (!currentUser) return <Unauthorised reason="unauthenticated" />;
  if (!admin && !yardManager)
    return <Unauthorised reason="forbidden" email={currentUser.email} />;

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="border-b border-ink-500">
        <div className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">
              {managerYard ? `Yard · ${managerYard.name}` : "Admin · Internal"}
            </p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            {managerYard ? (
              <>
                {managerYard.name} <span className="italic">yard</span>.
              </>
            ) : (
              <>
                Operations <span className="italic">dashboard</span>.
              </>
            )}
          </h1>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-bone-400">
            Signed in as {currentUser.email}
            {managerYard && ` · ${managerYard.region} region`}
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
        {/* Needs attention — what to do right now, pulled from live data */}
        <div className="border border-ink-500 bg-ink-800">
          <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
            <div className="flex items-center gap-3">
              <Inbox className="h-3.5 w-3.5 text-amber" strokeWidth={1.5} />
              <p className="label-amber label">Needs attention</p>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
              Click a card to handle it
            </p>
          </div>
          <div className="grid gap-0 md:grid-cols-3">
            <AttentionCard
              count={attention.awaitingInspection}
              label="Awaiting inspection"
              hint="New vehicles from bank intake, not yet inspected."
              cta="Open intake"
              href="/admin/intake"
            />
            <AttentionCard
              count={attention.readyToList}
              label="Ready to price &amp; list"
              hint="Inspected vehicles waiting on valuation."
              cta="Open valuation"
              href="/admin/valuation"
            />
            <AttentionCard
              count={attention.reservedBookings}
              label="Reserved bookings"
              hint="Buyers who paid 5%; chase or convert to owned."
              cta="Open ledger"
              href="#ledger"
              last
            />
          </div>
        </div>

        {/* Bank uploads pipeline */}
        {admin && (
          <div className="mt-10">
            <UploadsSection />
          </div>
        )}

        {/* Workflow modules — grouped so the IA reads like the actual flow */}
        {admin && (
          <div className="mt-10 border border-ink-500 bg-ink-800">
            <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <Workflow className="h-3.5 w-3.5 text-amber" strokeWidth={1.5} />
                <p className="label-amber label">Workflow &amp; tools</p>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
                Procurement &rarr; Sales &rarr; Operations
              </p>
            </div>
            <div className="grid gap-0 md:grid-cols-3">
              <ModuleGroup
                title="Procurement &amp; listing"
                subtitle="Get vehicles in, inspected, and ready to sell"
                items={[
                  { href: "/admin/intake", label: "Bank intake", desc: "Receive vehicle batches from partner banks." },
                  { href: "/admin/valuation", label: "Valuation", desc: "Inspect, price and prepare for listing." },
                  { href: "/admin/refurb", label: "Refurb", desc: "Track repair and reconditioning jobs." },
                ]}
              />
              <ModuleGroup
                title="Sales &amp; people"
                subtitle="Buyers, leads and field agents"
                items={[
                  { href: "/admin/leads", label: "Leads (LMS)", desc: "Manage buyer enquiries and follow-ups." },
                  { href: "/admin/agents", label: "Agents", desc: "Field staff, assignments and performance." },
                  { href: "/admin/users", label: "Users", desc: "Customer accounts and KYC." },
                ]}
              />
              <ModuleGroup
                title="Operations &amp; visibility"
                subtitle="Money, alerts, audit and reporting"
                items={[
                  { href: "/admin/collections", label: "Collections", desc: "Payments and outstanding dues." },
                  { href: "/admin/notifications", label: "Notifications", desc: "Outbound alerts to buyers and partners." },
                  { href: "/admin/activity", label: "Activity log", desc: "Full audit trail across the system." },
                  { href: "/admin/reports", label: "Reports", desc: "Exports and consolidated metrics." },
                  { href: "/bank", label: "Bank portal", desc: "Switch to the partner bank view." },
                ]}
                last
              />
            </div>
          </div>
        )}

        {/* KPI grid */}
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <KPI
            icon={<Package className="h-4 w-4" strokeWidth={1.5} />}
            label="Acquisitions"
            value={kpis.total.toString()}
            sub={`${kpis.owned} owned · ${kpis.reserved} reserved`}
          />
          <KPI
            icon={<Banknote className="h-4 w-4" strokeWidth={1.5} />}
            label="Revenue collected"
            value={formatINR(kpis.revenue)}
            sub="Across all bookings"
          />
          <KPI
            icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
            label="GMV (owned)"
            value={formatINR(kpis.gmv)}
            sub="Full-price value of owned units"
          />
          <KPI
            icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
            label="Unique buyers"
            value={kpis.uniqueBuyers.toString()}
            sub={
              managerYard
                ? `${scopedVehicles.length} listings in yard`
                : `${VEHICLES.length} listings · ${PARTNER_ORGS.length} partners`
            }
          />
        </div>

        {/* Procurement → Valuation → Sales pipeline */}
        <div className="mt-10 border border-ink-500 bg-ink-800">
          <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
            <div className="flex items-center gap-3">
              <Warehouse className="h-3.5 w-3.5 text-amber" strokeWidth={1.5} />
              <p className="label-amber label">
                Procurement &rarr; Valuation &rarr; Sales
                {managerYard ? ` · ${managerYard.name}` : " · by yard"}
              </p>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
              {visiblePipelines.length} {visiblePipelines.length === 1 ? "yard" : "yards"} · live cycle
            </p>
          </div>
          <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-3">
            {visiblePipelines.map((p, i) => (
              <YardPipelineCard key={p.yard.id} pipeline={p} index={i} />
            ))}
          </div>
        </div>

        {/* Inventory breakdown */}
        <div className="mt-10 border border-ink-500 bg-ink-800">
          <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
            <div className="flex items-center gap-3">
              <Car className="h-3.5 w-3.5 text-amber" strokeWidth={1.5} />
              <p className="label-amber label">
                {managerYard
                  ? `Inventory · ${managerYard.name} · by category`
                  : "Inventory · by category"}
              </p>
            </div>
            <Link
              href="/"
              className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-bone-400 transition hover:text-amber"
            >
              View marketplace
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-0 md:grid-cols-6">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <div
                key={key}
                className="border-b border-r border-ink-500 p-5 last:border-r-0 md:border-b-0"
              >
                <p className="label" style={{ fontSize: "9px" }}>
                  {label}
                </p>
                <p className="mt-2 font-display text-3xl text-bone-100 tabular">
                  {inventoryByCategory[key] ?? 0}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Acquisitions table */}
        <div id="ledger" className="mt-10 scroll-mt-8 border border-ink-500 bg-ink-800">
          <div className="flex flex-wrap items-center gap-4 border-b border-ink-500 px-6 py-4">
            <p className="label-amber label">Acquisitions ledger</p>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              {(["all", "reserved", "owned", "cancelled"] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition",
                    filter === f
                      ? "border-amber bg-amber text-ink-900"
                      : "border-ink-500 text-bone-300 hover:border-ink-400"
                  )}
                >
                  {f}
                </button>
              ))}
              <div className="flex items-center gap-2 border border-ink-500 px-3 py-1.5">
                <Search className="h-3 w-3 text-bone-400" strokeWidth={1.5} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="w-40 bg-transparent font-mono text-[11px] text-bone-100 placeholder:text-bone-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <p className="label">No matching acquisitions.</p>
              <p className="mt-2 text-sm text-bone-500">
                Complete a checkout flow to see entries here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink-500 bg-ink-900/50">
                    <Th>Booking</Th>
                    <Th>Buyer</Th>
                    <Th>Vehicle</Th>
                    <Th>Mode</Th>
                    <Th>Amount</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a, i) => (
                    <Row
                      key={a.bookingId}
                      acquisition={a}
                      index={i}
                      onMark={(s) => setStatus(a.bookingId, s)}
                      onDelete={() => {
                        if (confirm(`Delete booking ${a.bookingId}?`)) {
                          remove(a.bookingId);
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({
  acquisition,
  index,
  onMark,
  onDelete,
}: {
  acquisition: Acquisition;
  index: number;
  onMark: (s: AcquisitionStatus) => void;
  onDelete: () => void;
}) {
  const v = getVehicle(acquisition.vehicleId);
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.2) }}
      className="border-b border-ink-500 last:border-b-0 hover:bg-ink-900/40"
    >
      <Td>
        <span className="font-mono text-[11px] text-amber tabular">
          {acquisition.bookingId}
        </span>
      </Td>
      <Td>
        <p className="font-mono text-xs text-bone-100">{acquisition.userName}</p>
        <p className="font-mono text-[10px] text-bone-500">{acquisition.userEmail}</p>
      </Td>
      <Td>
        {v ? (
          <Link
            href={`/vehicle/${v.id}`}
            className="font-mono text-xs text-bone-100 transition hover:text-amber"
          >
            {v.brand} {v.model}
          </Link>
        ) : (
          <span className="font-mono text-xs text-bone-500">
            {acquisition.vehicleId} (removed)
          </span>
        )}
      </Td>
      <Td>
        <span className="font-mono text-[11px] uppercase tracking-wider text-bone-300">
          {acquisition.paymentMode === "full" ? "Full" : "5% Booking"}
        </span>
      </Td>
      <Td>
        <span className="font-mono text-xs text-bone-100 tabular">
          {formatINRFull(acquisition.amountPaid)}
        </span>
      </Td>
      <Td>
        <StatusBadge status={acquisition.status} />
      </Td>
      <Td>
        <span className="font-mono text-[11px] text-bone-400 tabular">
          {new Date(acquisition.acquiredAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
          })}
        </span>
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          {acquisition.status !== "owned" && (
            <IconBtn
              title="Mark as owned"
              onClick={() => onMark("owned")}
              icon={<Check className="h-3 w-3" strokeWidth={1.5} />}
              tone="sage"
            />
          )}
          {acquisition.status === "reserved" && (
            <IconBtn
              title="Cancel booking"
              onClick={() => onMark("cancelled")}
              icon={<X className="h-3 w-3" strokeWidth={1.5} />}
              tone="red"
            />
          )}
          {acquisition.status !== "reserved" && (
            <IconBtn
              title="Restore to reserved"
              onClick={() => onMark("reserved")}
              icon={<RotateCcw className="h-3 w-3" strokeWidth={1.5} />}
            />
          )}
          <IconBtn
            title="Delete"
            onClick={onDelete}
            icon={<X className="h-3 w-3" strokeWidth={1.5} />}
            tone="red"
          />
        </div>
      </Td>
    </motion.tr>
  );
}

function StatusBadge({ status }: { status: AcquisitionStatus }) {
  const map = {
    reserved: { label: "Reserved", color: "text-amber border-amber/40 bg-amber/10" },
    owned: { label: "Owned", color: "text-signal-sage border-signal-sage/40 bg-signal-sage/10" },
    cancelled: { label: "Cancelled", color: "text-signal-red border-signal-red/40 bg-signal-red/10" },
  }[status];
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${map.color}`}
    >
      {map.label}
    </span>
  );
}

function YardPipelineCard({
  pipeline,
  index,
}: {
  pipeline: {
    yard: { id: string; name: string; region: string; managerEmail: string };
    total: number;
    procurement: number;
    valuation: number;
    listed: number;
    reserved: number;
    sold: number;
    gmv: number;
  };
  index: number;
}) {
  const { yard } = pipeline;
  const salesTotal = pipeline.listed + pipeline.reserved + pipeline.sold;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.2) }}
      className="border-b border-r border-ink-500 p-6 last:border-r-0 xl:[&:nth-child(3n)]:border-r-0 md:[&:nth-child(2n)]:border-r-0 xl:md:[&:nth-child(2n)]:border-r"
    >
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-display text-2xl text-bone-100">{yard.name}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">
            {yard.region} · {yard.managerEmail}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl text-bone-100 tabular">{pipeline.total}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
            units total
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-stretch gap-2">
        <Stage
          label="Procurement"
          value={pipeline.procurement}
          hint="awaiting inspection"
          tone="amber"
          href="/admin/intake"
        />
        <Arrow />
        <Stage
          label="Valuation"
          value={pipeline.valuation}
          hint="priced · listing"
          tone="bone"
          href="/admin/valuation"
        />
        <Arrow />
        <Stage
          label="Sales"
          value={salesTotal}
          hint={`${pipeline.listed}L · ${pipeline.reserved}R · ${pipeline.sold}S`}
          tone="sage"
          href="#ledger"
        />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-0 border-t border-ink-500 pt-4">
        <Metric label="Listed" value={pipeline.listed} />
        <Metric label="Reserved" value={pipeline.reserved} />
        <Metric label="Sold" value={pipeline.sold} />
        <Metric
          label="GMV"
          value={pipeline.gmv > 0 ? formatINR(pipeline.gmv) : "—"}
        />
      </div>
    </motion.div>
  );
}

function Stage({
  label,
  value,
  hint,
  tone,
  href,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "amber" | "bone" | "sage";
  href?: string;
}) {
  const colors = {
    amber: "border-amber/40 bg-amber/5 text-amber",
    bone: "border-bone-300/30 bg-bone-300/5 text-bone-100",
    sage: "border-signal-sage/40 bg-signal-sage/5 text-signal-sage",
  }[tone];
  const inner = (
    <>
      <p className="font-mono text-[9px] uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-bone-100 tabular">{value}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-bone-500">
        {hint}
      </p>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={`group flex-1 border ${colors} p-3 transition hover:bg-ink-700`}
      >
        {inner}
        <p className="mt-2 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-bone-500 opacity-0 transition group-hover:opacity-100">
          Open <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
        </p>
      </Link>
    );
  }
  return <div className={`flex-1 border ${colors} p-3`}>{inner}</div>;
}

function Arrow() {
  return (
    <div className="flex items-center text-bone-500">
      <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-bone-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-xs text-bone-100 tabular">{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-bone-400">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-5 py-3 align-top">{children}</td>;
}

function IconBtn({
  title,
  icon,
  onClick,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: "sage" | "red";
}) {
  const colors =
    tone === "sage"
      ? "hover:border-signal-sage hover:text-signal-sage"
      : tone === "red"
      ? "hover:border-signal-red hover:text-signal-red"
      : "hover:border-amber hover:text-amber";
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center border border-ink-500 text-bone-400 transition ${colors}`}
    >
      {icon}
    </button>
  );
}

function KPI({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border border-ink-500 bg-ink-800 p-6">
      <div className="flex items-center gap-2 text-amber">
        {icon}
        <p className="label">{label}</p>
      </div>
      <p className="mt-4 font-display text-4xl text-bone-100 tabular">{value}</p>
      {sub && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-bone-500">
          {sub}
        </p>
      )}
    </div>
  );
}

function Unauthorised({
  reason,
  email,
}: {
  reason: "unauthenticated" | "forbidden";
  email?: string;
}) {
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-32 text-center">
        <ShieldAlert className="h-10 w-10 text-signal-red" strokeWidth={1.2} />
        <p className="label-amber label mt-6">Access denied</p>
        <h1 className="mt-4 font-display text-4xl text-bone-100">
          {reason === "unauthenticated" ? "Sign in required" : "Not an admin"}
        </h1>
        <p className="mt-4 text-bone-400">
          {reason === "unauthenticated"
            ? "The admin dashboard is restricted to internal users. Please sign in with an admin account."
            : `The account ${email} is not authorised for admin access.`}
        </p>
        <div className="mt-8 flex gap-3">
          {reason === "unauthenticated" && (
            <Link
              href="/login"
              className="border border-amber bg-amber px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/"
            className="border border-ink-500 px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-bone-300 transition hover:border-amber hover:text-amber"
          >
            Return to marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}

function AttentionCard({
  count,
  label,
  hint,
  cta,
  href,
  last,
}: {
  count: number;
  label: string;
  hint: string;
  cta: string;
  href: string;
  last?: boolean;
}) {
  const empty = count === 0;
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-3 border-b border-r border-ink-500 p-6 transition hover:bg-ink-700 md:border-b-0",
        last && "md:border-r-0"
      )}
    >
      <div className="flex items-baseline justify-between">
        <p
          className={cn(
            "font-display text-5xl tabular",
            empty ? "text-bone-500" : "text-amber"
          )}
        >
          {count}
        </p>
        <ArrowUpRight
          className="h-4 w-4 text-bone-500 transition group-hover:text-amber"
          strokeWidth={1.5}
        />
      </div>
      <div>
        <p className="label">{label}</p>
        <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-bone-400">
          {hint}
        </p>
      </div>
      <p className="mt-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 transition group-hover:text-amber">
        {cta}
        <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
      </p>
    </Link>
  );
}

function ModuleGroup({
  title,
  subtitle,
  items,
  last,
}: {
  title: string;
  subtitle: string;
  items: { href: string; label: string; desc: string }[];
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-r border-ink-500 p-6 md:border-b-0",
        last && "md:border-r-0"
      )}
    >
      <div>
        <p className="label-amber label">{title}</p>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-bone-400">
          {subtitle}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="group flex items-start justify-between gap-3 border border-transparent px-3 py-2.5 transition hover:border-ink-500 hover:bg-ink-900/50"
          >
            <div className="flex-1">
              <p className="font-mono text-[12px] text-bone-100 transition group-hover:text-amber">
                {it.label}
              </p>
              <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-bone-500">
                {it.desc}
              </p>
            </div>
            <ArrowUpRight
              className="mt-0.5 h-3.5 w-3.5 text-bone-500 transition group-hover:text-amber"
              strokeWidth={1.5}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
