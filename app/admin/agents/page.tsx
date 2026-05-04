"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldAlert,
  Users,
  UserPlus,
  Banknote,
  Truck,
  Plus,
  ArrowLeft,
  Check,
  Download,
} from "lucide-react";
import { downloadRows } from "@/lib/csv";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/acquisitions";
import {
  useAgents,
  agentRevenue,
  allottedVehicleIds,
  type Agent,
} from "@/lib/agents";
import { VEHICLES, getVehicle } from "@/lib/data";
import { YARDS } from "@/lib/yards";
import { formatINRFull, formatINR, cn } from "@/lib/utils";

export default function AdminAgentsPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const agents = useAgents((s) => s.agents);
  const allotments = useAgents((s) => s.allotments);
  const addAgent = useAgents((s) => s.addAgent);
  const setAgentStatus = useAgents((s) => s.setAgentStatus);
  const createAllotment = useAgents((s) => s.createAllotment);
  const payCommission = useAgents((s) => s.payCommission);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const admin = isAdmin(currentUser?.email);

  // ─── Onboard form ─────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState(YARDS[0]?.city ?? "");
  const [region, setRegion] = useState(YARDS[0]?.region ?? "North");
  const [commissionPct, setCommissionPct] = useState("5");
  const [onboardOk, setOnboardOk] = useState<string | null>(null);

  const onboardValid =
    name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    phone.trim().length >= 6 &&
    Number(commissionPct) > 0 &&
    Number(commissionPct) <= 25;

  const submitOnboard = () => {
    if (!onboardValid) return;
    const a = addAgent({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      city: city.trim(),
      region: region.trim(),
      commissionPct: Number(commissionPct),
      status: "pending_kyc",
      docs: { pan: false, aadhaar: false, bankAccount: false, agreementSigned: false },
    });
    setOnboardOk(a.code);
    setName("");
    setEmail("");
    setPhone("");
    setCommissionPct("5");
    setTimeout(() => setOnboardOk(null), 4000);
  };

  // ─── Allotment composer ───────────────────────────────
  const [allotAgentId, setAllotAgentId] = useState<string>(agents[0]?.id ?? "");
  const [pickedVehicleIds, setPickedVehicleIds] = useState<string[]>([]);
  const [allotNotes, setAllotNotes] = useState("");
  const [allotOk, setAllotOk] = useState<string | null>(null);

  // Keep allotment selector valid as agents change.
  useEffect(() => {
    if (!allotAgentId && agents[0]) setAllotAgentId(agents[0].id);
  }, [agents, allotAgentId]);

  const allotAgent = agents.find((a) => a.id === allotAgentId);

  const heldIds = useMemo(() => allottedVehicleIds(allotments), [allotments]);

  const availableVehicles = useMemo(() => {
    if (!allotAgent) return [];
    return VEHICLES.filter(
      (v) =>
        v.yardCity === allotAgent.city &&
        v.status === "active" &&
        !heldIds.has(v.id)
    );
  }, [allotAgent, heldIds]);

  const togglePicked = (id: string) =>
    setPickedVehicleIds((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );

  const submitAllot = () => {
    if (!allotAgent || pickedVehicleIds.length === 0) return;
    const al = createAllotment(
      allotAgent.id,
      allotAgent.city,
      pickedVehicleIds,
      allotNotes.trim() || undefined
    );
    setAllotOk(al.id.toUpperCase());
    setPickedVehicleIds([]);
    setAllotNotes("");
    setTimeout(() => setAllotOk(null), 4000);
  };

  // ─── Pending payouts ──────────────────────────────────
  const pendingPayouts = useMemo(() => {
    return allotments.flatMap((al) =>
      al.lines
        .filter(
          (ln) =>
            ln.status === "sold" &&
            ln.commissionAmount !== undefined &&
            !ln.commissionPaid
        )
        .map((ln) => ({ allotment: al, line: ln }))
    );
  }, [allotments]);

  const totalPending = pendingPayouts.reduce(
    (s, p) => s + (p.line.commissionAmount ?? 0),
    0
  );

  // ─── Aggregate KPIs ───────────────────────────────────
  const kpis = useMemo(() => {
    const active = agents.filter((a) => a.status === "active").length;
    let inField = 0;
    let sold = 0;
    let grossSales = 0;
    let commissionEarned = 0;
    for (const al of allotments) {
      for (const ln of al.lines) {
        if (ln.status === "allotted" || ln.status === "in_field") inField++;
        if (ln.status === "sold") {
          sold++;
          grossSales += ln.soldPrice ?? 0;
          commissionEarned += ln.commissionAmount ?? 0;
        }
      }
    }
    return { active, inField, sold, grossSales, commissionEarned };
  }, [agents, allotments]);

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
        <div className="mx-auto max-w-[1600px] px-6 py-10 md:px-10 md:py-14">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-bone-400 transition hover:text-amber"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
            Back to admin
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <Users className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Admin · Agents & Resellers</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            Reseller <span className="italic">network</span>.
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
            Onboard agents, allot stock, and settle commissions.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-10 px-6 py-10 md:px-10 md:py-14">
        {/* KPIs */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          <KPI label="Active agents" value={kpis.active.toString()} />
          <KPI label="In field" value={kpis.inField.toString()} />
          <KPI label="Sold" value={kpis.sold.toString()} />
          <KPI label="Gross sales" value={formatINR(kpis.grossSales)} />
          <KPI label="Commission earned" value={formatINR(kpis.commissionEarned)} accent />
        </div>

        {/* Agents list */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
            <p className="label-amber label">Agents</p>
            <div className="flex items-center gap-3">
              <button onClick={() => downloadRows("meridian-agent-roster", agents.map((a) => {
                const r = agentRevenue(a.id, allotments);
                return { code: a.code, name: a.name, email: a.email, phone: a.phone, city: a.city, region: a.region, commissionPct: a.commissionPct, status: a.status, inField: r.inField, sold: r.sold, grossSales: r.grossSales, commissionEarned: r.commissionEarned, commissionPending: r.commissionPending };
              }), [
                { key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" },
                { key: "city", label: "City" }, { key: "region", label: "Region" }, { key: "commissionPct", label: "Commission %" }, { key: "status", label: "Status" },
                { key: "inField", label: "In field" }, { key: "sold", label: "Sold" }, { key: "grossSales", label: "Gross sales" },
                { key: "commissionEarned", label: "Earned" }, { key: "commissionPending", label: "Pending" },
              ])} className="flex items-center gap-2 border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 hover:border-amber hover:text-amber">
                <Download className="h-3 w-3" strokeWidth={1.5} />Export CSV
              </button>
              <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
                {agents.length} total
              </p>
            </div>
          </div>
          <div className="divide-y divide-ink-500">
            {agents.map((a) => {
              const r = agentRevenue(a.id, allotments);
              return (
                <div
                  key={a.id}
                  className="grid gap-4 px-6 py-4 md:grid-cols-[1.4fr_1fr_2fr_auto] md:items-center"
                >
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-amber">
                      {a.code}
                    </p>
                    <p className="mt-1 font-display text-lg text-bone-100">
                      {a.name}
                    </p>
                    <p className="font-mono text-[11px] text-bone-400">
                      {a.email} · {a.phone}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-bone-300">
                      {a.city}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">
                      {a.region} · Commission {a.commissionPct}%
                    </p>
                    <div className="mt-2">
                      <StatusPill status={a.status} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <Mini label="In field" value={r.inField.toString()} />
                    <Mini label="Sold" value={r.sold.toString()} />
                    <Mini label="GMV" value={formatINR(r.grossSales)} />
                    <Mini
                      label="Pending"
                      value={formatINR(r.commissionPending)}
                      accent={r.commissionPending > 0}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {a.status !== "active" && (
                      <button
                        onClick={() => setAgentStatus(a.id, "active")}
                        className="border border-signal-sage bg-signal-sage/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-sage transition hover:bg-signal-sage/20"
                      >
                        Activate
                      </button>
                    )}
                    {a.status === "active" && (
                      <button
                        onClick={() => setAgentStatus(a.id, "suspended")}
                        className="border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 transition hover:border-signal-red hover:text-signal-red"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Onboard form */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="flex items-center gap-3 border-b border-ink-500 px-6 py-4">
            <UserPlus className="h-3.5 w-3.5 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Onboard new agent</p>
          </div>
          <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
            <Field label="Name" value={name} onChange={setName} placeholder="Full name" />
            <Field label="Email (login)" value={email} onChange={setEmail} placeholder="agent@example.com" />
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="+91 9xxxxxxxxx" />
            <Select
              label="Yard city"
              value={city}
              onChange={(v) => {
                setCity(v);
                const y = YARDS.find((x) => x.city === v);
                if (y) setRegion(y.region);
              }}
              options={YARDS.map((y) => ({ value: y.city, label: `${y.name} · ${y.region}` }))}
            />
            <Field label="Region" value={region} onChange={setRegion} />
            <Field
              label="Commission %"
              value={commissionPct}
              onChange={setCommissionPct}
              type="number"
              placeholder="5"
            />
          </div>
          <div className="flex items-center justify-between border-t border-ink-500 px-6 py-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
              KYC starts as pending. Activate after PAN, Aadhaar, bank & agreement.
            </p>
            <div className="flex items-center gap-3">
              {onboardOk && (
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-sage">
                  <Check className="h-3 w-3" strokeWidth={2} />
                  Onboarded {onboardOk}
                </span>
              )}
              <button
                onClick={submitOnboard}
                disabled={!onboardValid}
                className={cn(
                  "border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition",
                  onboardValid
                    ? "border-amber bg-amber text-ink-900 hover:bg-amber-soft"
                    : "cursor-not-allowed border-ink-500 text-bone-500"
                )}
              >
                Onboard agent
              </button>
            </div>
          </div>
        </section>

        {/* Allot vehicles */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="flex items-center gap-3 border-b border-ink-500 px-6 py-4">
            <Truck className="h-3.5 w-3.5 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Allot vehicles to agent</p>
          </div>
          <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
            <Select
              label="Agent"
              value={allotAgentId}
              onChange={(v) => {
                setAllotAgentId(v);
                setPickedVehicleIds([]);
              }}
              options={agents.map((a) => ({
                value: a.id,
                label: `${a.code} · ${a.name} · ${a.city}`,
              }))}
            />
            <Field
              label="Notes (optional)"
              value={allotNotes}
              onChange={setAllotNotes}
              placeholder="e.g., for weekend mela"
            />
            <div className="flex items-end">
              <p className="font-mono text-[11px] uppercase tracking-wider text-bone-400">
                Available stock in{" "}
                <span className="text-bone-100">{allotAgent?.city ?? "—"}</span>
                {": "}
                <span className="text-amber">{availableVehicles.length}</span>
              </p>
            </div>
          </div>

          {availableVehicles.length === 0 ? (
            <div className="border-t border-ink-500 px-6 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-bone-500">
              No active stock available in this yard.
            </div>
          ) : (
            <div className="border-t border-ink-500">
              <div className="grid grid-cols-1 gap-0 md:grid-cols-2 xl:grid-cols-3">
                {availableVehicles.map((v) => {
                  const picked = pickedVehicleIds.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => togglePicked(v.id)}
                      className={cn(
                        "flex items-center gap-3 border-b border-r border-ink-500 px-4 py-3 text-left transition",
                        picked
                          ? "bg-amber/10 hover:bg-amber/15"
                          : "hover:bg-ink-700"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center border",
                          picked
                            ? "border-amber bg-amber text-ink-900"
                            : "border-ink-500"
                        )}
                      >
                        {picked && <Check className="h-3 w-3" strokeWidth={2} />}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.images[0]}
                        alt={v.model}
                        className="h-12 w-16 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[11px] text-bone-100">
                          {v.brand} {v.model}
                        </p>
                        <p className="truncate font-mono text-[10px] uppercase tracking-wider text-bone-500">
                          {v.year} · {formatINRFull(v.price)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-ink-500 px-6 py-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
              {pickedVehicleIds.length} vehicle(s) selected
            </p>
            <div className="flex items-center gap-3">
              {allotOk && (
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-sage">
                  <Check className="h-3 w-3" strokeWidth={2} />
                  Allotment {allotOk} created
                </span>
              )}
              <button
                onClick={submitAllot}
                disabled={!allotAgent || pickedVehicleIds.length === 0}
                className={cn(
                  "flex items-center gap-2 border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition",
                  allotAgent && pickedVehicleIds.length > 0
                    ? "border-amber bg-amber text-ink-900 hover:bg-amber-soft"
                    : "cursor-not-allowed border-ink-500 text-bone-500"
                )}
              >
                <Plus className="h-3 w-3" strokeWidth={2} />
                Create allotment
              </button>
            </div>
          </div>
        </section>

        {/* Pending payouts */}
        <section className="border border-ink-500 bg-ink-800">
          <div className="flex items-center justify-between border-b border-ink-500 px-6 py-4">
            <div className="flex items-center gap-3">
              <Banknote className="h-3.5 w-3.5 text-amber" strokeWidth={1.5} />
              <p className="label-amber label">Commission settlements</p>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-bone-300">
              Pending total: <span className="text-amber">{formatINRFull(totalPending)}</span>
            </p>
          </div>
          {pendingPayouts.length === 0 ? (
            <div className="px-6 py-10 text-center font-mono text-[11px] uppercase tracking-wider text-bone-500">
              No pending commission payouts.
            </div>
          ) : (
            <div className="divide-y divide-ink-500">
              {pendingPayouts.map(({ allotment, line }) => {
                const v = getVehicle(line.vehicleId);
                const a = agents.find((x) => x.id === allotment.agentId);
                return (
                  <div
                    key={`${allotment.id}-${line.vehicleId}`}
                    className="grid gap-4 px-6 py-4 md:grid-cols-[1.5fr_2fr_1fr_auto] md:items-center"
                  >
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-amber">
                        {a?.code} · {a?.name}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-bone-400">
                        {allotment.id.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="font-display text-base text-bone-100">
                        {v ? `${v.brand} ${v.model}` : line.vehicleId}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-bone-400">
                        Sold {formatINRFull(line.soldPrice ?? 0)} ·{" "}
                        {a?.commissionPct}% commission
                      </p>
                      {line.buyerName && (
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-bone-500">
                          Buyer: {line.buyerName} · {line.buyerPhone}
                        </p>
                      )}
                    </div>
                    <div className="md:text-right">
                      <p className="label">Commission</p>
                      <p className="mt-1 font-display text-2xl text-amber tabular">
                        {formatINRFull(line.commissionAmount ?? 0)}
                      </p>
                    </div>
                    <button
                      onClick={() => payCommission(allotment.id, line.vehicleId)}
                      className="border border-signal-sage bg-signal-sage/10 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-signal-sage transition hover:bg-signal-sage/20"
                    >
                      Mark paid
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ─── Atoms ──────────────────────────────────────────────────────────

function KPI({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-ink-500 bg-ink-800 p-6">
      <p className="label">{label}</p>
      <p
        className={cn(
          "mt-4 font-display text-4xl tabular",
          accent ? "text-amber" : "text-bone-100"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="label" style={{ fontSize: "9px" }}>
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-sm tabular",
          accent ? "text-amber" : "text-bone-100"
        )}
      >
        {value}
      </p>
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

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-bone-100 outline-none focus:border-amber"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusPill({ status }: { status: Agent["status"] }) {
  const map = {
    active: { label: "Active", color: "bg-signal-sage/15 text-signal-sage border-signal-sage/40" },
    pending_kyc: { label: "Pending KYC", color: "bg-amber/15 text-amber border-amber/40" },
    suspended: { label: "Suspended", color: "bg-signal-red/10 text-signal-red border-signal-red/40" },
  }[status];
  return (
    <span
      className={`inline-block border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${map.color}`}
    >
      {map.label}
    </span>
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
            ? "The agent admin module is restricted to internal users."
            : `The account ${email} is not authorised for this module.`}
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
