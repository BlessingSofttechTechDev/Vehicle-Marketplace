"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Calendar, Receipt } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import { useAcquisitions, type Acquisition } from "@/lib/acquisitions";
import { getVehicle } from "@/lib/data";
import { formatINRFull } from "@/lib/utils";

export default function AcquisitionsPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const items = useAcquisitions((s) => s.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const mine = currentUser
    ? items
        .filter((a) => a.userEmail === currentUser.email.toLowerCase())
        .sort((a, b) => b.acquiredAt - a.acquiredAt)
    : [];

  const reservedCount = mine.filter((a) => a.status === "reserved").length;
  const ownedCount = mine.filter((a) => a.status === "owned").length;
  const totalSpent = mine
    .filter((a) => a.status !== "cancelled")
    .reduce((s, a) => s + a.amountPaid, 0);

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="border-b border-ink-500">
        <div className="mx-auto max-w-[1600px] px-6 py-14 md:px-10 md:py-20">
          <p className="label-amber label">Your garage</p>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            {currentUser ? (
              <>
                Welcome back, <span className="italic">{currentUser.name.split(" ")[0]}</span>.
              </>
            ) : (
              <>
                Sign in to see your <span className="italic">acquisitions</span>.
              </>
            )}
          </h1>
          {currentUser && mounted && (
            <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-10">
              <Stat label="Total" value={mine.length.toString()} />
              <Stat label="Owned" value={ownedCount.toString()} />
              <Stat label="Reserved" value={reservedCount.toString()} />
              <Stat label="Paid" value={formatINRFull(totalSpent)} />
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
        {!currentUser ? (
          <EmptyAuth />
        ) : !mounted ? null : mine.length === 0 ? (
          <EmptyGarage />
        ) : (
          <div className="grid gap-5">
            {mine.map((a, i) => (
              <AcquisitionRow key={a.bookingId} acquisition={a} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AcquisitionRow({
  acquisition,
  index,
}: {
  acquisition: Acquisition;
  index: number;
}) {
  const vehicle = getVehicle(acquisition.vehicleId);
  if (!vehicle) return null;
  const isReserved = acquisition.status === "reserved";
  const isCancelled = acquisition.status === "cancelled";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
      className="grid gap-6 border border-ink-500 bg-ink-800 p-5 md:grid-cols-[200px_1fr_auto] md:p-6"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={vehicle.images[0]}
        alt={vehicle.model}
        className="h-40 w-full object-cover md:h-32 md:w-[200px]"
      />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={acquisition.status} />
          <p className="font-mono text-[10px] uppercase tracking-wider text-bone-400">
            {acquisition.paymentMode === "full" ? "Paid in full" : "5% booking"}
          </p>
        </div>
        <p className="label mt-4">{vehicle.brand}</p>
        <h2 className="mt-1 font-display text-2xl text-bone-100">
          {vehicle.model}
          <span className="ml-2 font-sans text-sm text-bone-400">
            {vehicle.variant}
          </span>
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-bone-400">
          <span className="flex items-center gap-1.5">
            <Receipt className="h-3 w-3" strokeWidth={1.5} />
            <span className="text-amber">{acquisition.bookingId}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" strokeWidth={1.5} />
            {vehicle.location}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" strokeWidth={1.5} />
            {new Date(acquisition.acquiredAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-5 md:items-end">
        <div className="md:text-right">
          <p className="label">{isReserved ? "Paid now" : "Total"}</p>
          <p className="mt-1 font-display text-2xl text-amber tabular">
            {formatINRFull(acquisition.amountPaid)}
          </p>
          {isReserved && (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-signal-red">
              Balance {formatINRFull(acquisition.priceAtAcquisition - acquisition.amountPaid)}
            </p>
          )}
        </div>

        <Link
          href={`/vehicle/${vehicle.id}`}
          className="group flex items-center gap-2 border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300 transition hover:border-amber hover:text-amber"
        >
          View
          <ArrowRight
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            strokeWidth={1.5}
          />
        </Link>
      </div>

      {isCancelled && (
        <div className="col-span-full border-t border-ink-500 pt-4 font-mono text-[11px] text-bone-500">
          This booking was cancelled.
        </div>
      )}
    </motion.article>
  );
}

function StatusPill({ status }: { status: Acquisition["status"] }) {
  const map = {
    reserved: { label: "Reserved", color: "bg-amber/15 text-amber border-amber/40" },
    owned: { label: "Owned", color: "bg-signal-sage/15 text-signal-sage border-signal-sage/40" },
    cancelled: { label: "Cancelled", color: "bg-signal-red/10 text-signal-red border-signal-red/40" },
  }[status];
  return (
    <span
      className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${map.color}`}
    >
      {map.label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label" style={{ fontSize: "9px" }}>
        {label}
      </p>
      <p className="mt-2 font-display text-3xl text-bone-100 tabular md:text-4xl">
        {value}
      </p>
    </div>
  );
}

function EmptyAuth() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <p className="label-amber label">No session</p>
      <h2 className="mt-4 font-display text-4xl text-bone-100">
        Please sign in to view your garage.
      </h2>
      <Link
        href="/login"
        className="mt-8 border border-amber bg-amber px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft"
      >
        Sign in
      </Link>
    </div>
  );
}

function EmptyGarage() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <p className="label-amber label">Empty garage</p>
      <h2 className="mt-4 font-display text-4xl text-bone-100">
        No acquisitions <span className="italic">yet</span>.
      </h2>
      <p className="mt-3 max-w-md text-bone-400">
        Everything you acquire through Meridian appears here — reservations,
        full purchases, paperwork status.
      </p>
      <Link
        href="/"
        className="mt-8 border border-amber px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-amber transition hover:bg-amber hover:text-ink-900"
      >
        Browse marketplace
      </Link>
    </div>
  );
}
