"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  Box,
  CheckCircle2,
  Hourglass,
  RotateCcw,
  Truck,
  X,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import {
  useAgents,
  agentRevenue,
  getAgentForEmail,
  type Allotment,
  type AllotmentLine,
} from "@/lib/agents";
import { getVehicle } from "@/lib/data";
import { formatINRFull, formatINR, cn } from "@/lib/utils";

export default function AgentDashboardPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const agents = useAgents((s) => s.agents);
  const allotments = useAgents((s) => s.allotments);
  const markPickedUp = useAgents((s) => s.markPickedUp);
  const markSold = useAgents((s) => s.markSold);
  const markReturned = useAgents((s) => s.markReturned);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const agent = useMemo(
    () => getAgentForEmail(currentUser?.email, agents),
    [currentUser, agents]
  );

  const myAllotments = useMemo(
    () =>
      agent
        ? allotments
            .filter((al) => al.agentId === agent.id)
            .sort((a, b) => b.createdAt - a.createdAt)
        : [],
    [agent, allotments]
  );

  const revenue = useMemo(
    () => (agent ? agentRevenue(agent.id, allotments) : null),
    [agent, allotments]
  );

  // Sale capture modal state
  const [saleTarget, setSaleTarget] = useState<{
    allotmentId: string;
    vehicleId: string;
  } | null>(null);
  const [returnTarget, setReturnTarget] = useState<{
    allotmentId: string;
    vehicleId: string;
  } | null>(null);

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <Nav />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen">
        <Nav />
        <Empty
          label="No session"
          title="Please sign in"
          body="Agent dashboard is only available to onboarded resellers."
          ctaHref="/login"
          ctaLabel="Sign in"
        />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen">
        <Nav />
        <Empty
          label="Not an agent"
          title="This account is not an agent"
          body="Speak to your Meridian onboarding partner to enrol as a reseller."
          ctaHref="/"
          ctaLabel="Back to marketplace"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <section className="border-b border-ink-500">
        <div className="mx-auto max-w-[1600px] px-6 py-14 md:px-10 md:py-20">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="label-amber label">Agent · {agent.code}</p>
              <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
                {agent.name.split(" ")[0]}&apos;s <span className="italic">desk</span>
              </h1>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
                {agent.city} · {agent.region} · Commission {agent.commissionPct}%
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <StatusPill status={agent.status} />
              <Link href="/agent/statement" className="border border-amber px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-amber transition hover:bg-amber hover:text-ink-900">
                Commission statement →
              </Link>
            </div>
          </div>

          {revenue && (
            <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-5 md:gap-10">
              <Stat label="In field" value={revenue.inField.toString()} icon={<Truck className="h-3.5 w-3.5" />} />
              <Stat label="Sold" value={revenue.sold.toString()} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
              <Stat label="Gross sales" value={formatINR(revenue.grossSales)} icon={<Box className="h-3.5 w-3.5" />} />
              <Stat label="Commission earned" value={formatINR(revenue.commissionEarned)} icon={<Banknote className="h-3.5 w-3.5" />} />
              <Stat label="Pending payout" value={formatINR(revenue.commissionPending)} icon={<Hourglass className="h-3.5 w-3.5" />} accent />
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
        {myAllotments.length === 0 ? (
          <div className="border border-dashed border-ink-500 py-20 text-center">
            <p className="label-amber label">No stock</p>
            <h2 className="mt-3 font-display text-3xl text-bone-100">
              No vehicles allotted yet
            </h2>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
              Your yard manager will allot stock against your KYC.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {myAllotments.map((al, i) => (
              <AllotmentCard
                key={al.id}
                allotment={al}
                index={i}
                onPickedUp={(vid) => markPickedUp(al.id, vid)}
                onSell={(vid) => setSaleTarget({ allotmentId: al.id, vehicleId: vid })}
                onReturn={(vid) =>
                  setReturnTarget({ allotmentId: al.id, vehicleId: vid })
                }
              />
            ))}
          </div>
        )}
      </main>

      {saleTarget && (
        <SaleModal
          onClose={() => setSaleTarget(null)}
          onConfirm={(price, name, phone) => {
            markSold(saleTarget.allotmentId, saleTarget.vehicleId, price, name, phone);
            setSaleTarget(null);
          }}
        />
      )}

      {returnTarget && (
        <ReturnModal
          onClose={() => setReturnTarget(null)}
          onConfirm={(reason) => {
            markReturned(returnTarget.allotmentId, returnTarget.vehicleId, reason);
            setReturnTarget(null);
          }}
        />
      )}
    </div>
  );
}

function AllotmentCard({
  allotment,
  index,
  onPickedUp,
  onSell,
  onReturn,
}: {
  allotment: Allotment;
  index: number;
  onPickedUp: (vehicleId: string) => void;
  onSell: (vehicleId: string) => void;
  onReturn: (vehicleId: string) => void;
}) {
  const created = new Date(allotment.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
      className="border border-ink-500 bg-ink-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-500 px-5 py-4">
        <div>
          <p className="label">Allotment</p>
          <p className="mt-1 font-mono text-[11px] text-amber">
            {allotment.id.toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <p className="label">Yard</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-bone-100">
            {allotment.yardCity}
          </p>
        </div>
        <div className="text-right">
          <p className="label">Created</p>
          <p className="mt-1 font-mono text-[11px] text-bone-300">{created}</p>
        </div>
        <div className="text-right">
          <p className="label">Lines</p>
          <p className="mt-1 font-mono text-[11px] text-bone-300">
            {allotment.lines.length}
          </p>
        </div>
      </div>

      <div className="divide-y divide-ink-500">
        {allotment.lines.map((ln) => (
          <LineRow
            key={ln.vehicleId}
            line={ln}
            onPickedUp={() => onPickedUp(ln.vehicleId)}
            onSell={() => onSell(ln.vehicleId)}
            onReturn={() => onReturn(ln.vehicleId)}
          />
        ))}
      </div>

      {allotment.notes && (
        <div className="border-t border-ink-500 px-5 py-3 font-mono text-[11px] text-bone-500">
          Note: {allotment.notes}
        </div>
      )}
    </motion.article>
  );
}

function LineRow({
  line,
  onPickedUp,
  onSell,
  onReturn,
}: {
  line: AllotmentLine;
  onPickedUp: () => void;
  onSell: () => void;
  onReturn: () => void;
}) {
  const v = getVehicle(line.vehicleId);
  if (!v) return null;
  return (
    <div className="grid gap-4 px-5 py-4 md:grid-cols-[80px_1fr_auto] md:items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={v.images[0]}
        alt={v.model}
        className="h-16 w-20 object-cover"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <LineStatusPill status={line.status} />
          <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
            {v.year} · {v.location}
          </p>
        </div>
        <p className="mt-2 font-display text-lg text-bone-100">
          {v.brand} {v.model}
          <span className="ml-2 font-sans text-xs text-bone-400">
            {v.variant}
          </span>
        </p>
        <p className="mt-1 font-mono text-[11px] text-bone-400">
          List {formatINRFull(v.price)}
          {line.soldPrice ? (
            <>
              {" · "}
              <span className="text-amber">
                Sold {formatINRFull(line.soldPrice)}
              </span>
              {line.commissionAmount !== undefined && (
                <>
                  {" · Commission "}
                  <span className={line.commissionPaid ? "text-signal-sage" : "text-amber"}>
                    {formatINRFull(line.commissionAmount)}
                    {line.commissionPaid ? " · paid" : " · pending"}
                  </span>
                </>
              )}
            </>
          ) : null}
        </p>
        {line.buyerName && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">
            Buyer: {line.buyerName} · {line.buyerPhone}
          </p>
        )}
        {line.returnReason && (
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-signal-red">
            Returned: {line.returnReason}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {line.status === "allotted" && (
          <button
            onClick={onPickedUp}
            className="border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 transition hover:border-amber hover:text-amber"
          >
            Pick up
          </button>
        )}
        {(line.status === "allotted" || line.status === "in_field") && (
          <>
            <button
              onClick={onSell}
              className="border border-amber bg-amber px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft"
            >
              Mark sold
            </button>
            <button
              onClick={onReturn}
              className="flex items-center gap-1 border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 transition hover:border-signal-red hover:text-signal-red"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
              Return
            </button>
          </>
        )}
        <Link
          href={`/vehicle/${v.id}`}
          className="font-mono text-[10px] uppercase tracking-wider text-bone-500 underline hover:text-amber"
        >
          View
        </Link>
      </div>
    </div>
  );
}

// ─── Modals ─────────────────────────────────────────────────────────

function SaleModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (price: number, name: string, phone: string) => void;
}) {
  const [price, setPrice] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const valid =
    Number(price) > 0 && name.trim().length >= 2 && phone.trim().length >= 6;

  return (
    <ModalShell title="Capture sale" onClose={onClose}>
      <div className="grid gap-3">
        <Field
          label="Sold price (₹)"
          value={price}
          onChange={setPrice}
          type="number"
          placeholder="e.g., 95000"
        />
        <Field
          label="Buyer name"
          value={name}
          onChange={setName}
          placeholder="Full name"
        />
        <Field
          label="Buyer phone"
          value={phone}
          onChange={setPhone}
          placeholder="+91 9xxxxxxxxx"
        />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300 transition hover:border-bone-100"
        >
          Cancel
        </button>
        <button
          disabled={!valid}
          onClick={() => onConfirm(Number(price), name.trim(), phone.trim())}
          className={cn(
            "border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition",
            valid
              ? "border-amber bg-amber text-ink-900 hover:bg-amber-soft"
              : "cursor-not-allowed border-ink-500 text-bone-500"
          )}
        >
          Confirm sale
        </button>
      </div>
    </ModalShell>
  );
}

function ReturnModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <ModalShell title="Return to yard" onClose={onClose}>
      <Field
        label="Reason"
        value={reason}
        onChange={setReason}
        placeholder="e.g., not sellable in territory"
      />
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300 transition hover:border-bone-100"
        >
          Cancel
        </button>
        <button
          disabled={reason.trim().length < 3}
          onClick={() => onConfirm(reason.trim())}
          className={cn(
            "border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition",
            reason.trim().length >= 3
              ? "border-signal-red bg-signal-red text-bone-100 hover:opacity-90"
              : "cursor-not-allowed border-ink-500 text-bone-500"
          )}
        >
          Confirm return
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-ink-500 bg-ink-800 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-ink-500 pb-4">
          <h3 className="font-display text-xl text-bone-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-bone-300 transition hover:text-amber"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-bone-100 outline-none focus:border-amber"
      />
    </label>
  );
}

// ─── Atoms ──────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="label flex items-center gap-1.5" style={{ fontSize: "9px" }}>
        {icon}
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-3xl tabular md:text-4xl",
          accent ? "text-amber" : "text-bone-100"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: "active" | "pending_kyc" | "suspended" }) {
  const map = {
    active: { label: "Active", color: "bg-signal-sage/15 text-signal-sage border-signal-sage/40" },
    pending_kyc: { label: "Pending KYC", color: "bg-amber/15 text-amber border-amber/40" },
    suspended: { label: "Suspended", color: "bg-signal-red/10 text-signal-red border-signal-red/40" },
  }[status];
  return (
    <span
      className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${map.color}`}
    >
      {map.label}
    </span>
  );
}

function LineStatusPill({ status }: { status: AllotmentLine["status"] }) {
  const map = {
    allotted: { label: "Allotted", color: "bg-bone-400/10 text-bone-300 border-bone-500/40" },
    in_field: { label: "In field", color: "bg-amber/15 text-amber border-amber/40" },
    sold: { label: "Sold", color: "bg-signal-sage/15 text-signal-sage border-signal-sage/40" },
    returned: { label: "Returned", color: "bg-signal-red/10 text-signal-red border-signal-red/40" },
  }[status];
  return (
    <span
      className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${map.color}`}
    >
      {map.label}
    </span>
  );
}

function Empty({
  label,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  label: string;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center md:px-10">
      <p className="label-amber label">{label}</p>
      <h1 className="mt-4 font-display text-4xl text-bone-100 md:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-bone-400">{body}</p>
      <Link
        href={ctaHref}
        className="mt-8 inline-block border border-amber bg-amber px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft"
      >
        {ctaLabel}
      </Link>
    </main>
  );
}
