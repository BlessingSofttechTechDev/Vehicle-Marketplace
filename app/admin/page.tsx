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
} from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import {
  useAcquisitions,
  isAdmin,
  type Acquisition,
  type AcquisitionStatus,
} from "@/lib/acquisitions";
import { getVehicle, VEHICLES, PARTNER_ORGS, CATEGORY_LABELS } from "@/lib/data";
import { formatINRFull, formatINR, cn } from "@/lib/utils";

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

  const kpis = useMemo(() => {
    const owned = items.filter((a) => a.status === "owned");
    const reserved = items.filter((a) => a.status === "reserved");
    const revenue = items
      .filter((a) => a.status !== "cancelled")
      .reduce((s, a) => s + a.amountPaid, 0);
    const uniqueBuyers = new Set(items.map((a) => a.userEmail)).size;
    const gmv = owned.reduce((s, a) => s + a.priceAtAcquisition, 0);
    return {
      total: items.length,
      owned: owned.length,
      reserved: reserved.length,
      revenue,
      uniqueBuyers,
      gmv,
    };
  }, [items]);

  const rows = useMemo(() => {
    let rs = items.slice().sort((a, b) => b.acquiredAt - a.acquiredAt);
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
  }, [items, filter, query]);

  // Inventory KPIs (from data, not acquisitions)
  const inventoryByCategory = useMemo(() => {
    const out: Record<string, number> = {};
    VEHICLES.forEach((v) => {
      out[v.category] = (out[v.category] ?? 0) + 1;
    });
    return out;
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <Nav />
      </div>
    );
  }

  if (!currentUser) return <Unauthorised reason="unauthenticated" />;
  if (!admin) return <Unauthorised reason="forbidden" email={currentUser.email} />;

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="border-b border-ink-500">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-6 py-10 md:flex-row md:items-baseline md:justify-between md:px-10 md:py-14">
          <div>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-4 w-4 text-amber" strokeWidth={1.5} />
              <p className="label-amber label">Admin · Internal</p>
            </div>
            <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
              Operations <span className="italic">dashboard</span>.
            </h1>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-bone-400">
              Signed in as {currentUser.email}
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
        {/* KPI grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
            sub={`${VEHICLES.length} listings · ${PARTNER_ORGS.length} partners`}
          />
        </div>

        {/* Inventory breakdown */}
        <div className="mt-10 border border-ink-500 bg-ink-800">
          <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
            <div className="flex items-center gap-3">
              <Car className="h-3.5 w-3.5 text-amber" strokeWidth={1.5} />
              <p className="label-amber label">Inventory · by category</p>
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
        <div className="mt-10 border border-ink-500 bg-ink-800">
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
