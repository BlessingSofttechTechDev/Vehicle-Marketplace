"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldAlert, Users, Download, Search } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth, DEMO_CREDENTIALS } from "@/lib/auth";
import { isAdmin } from "@/lib/acquisitions";
import { YARD_MANAGERS, getYardById } from "@/lib/yards";
import { useAgents } from "@/lib/agents";
import { SALES_REPS } from "@/lib/sales";
import { downloadRows } from "@/lib/csv";
import { cn } from "@/lib/utils";

type Role = "admin" | "customer" | "yard_manager" | "agent" | "sales_rep";

interface UserRow {
  email: string;
  name: string;
  role: Role;
  region?: string;
  status: "active" | "pending_kyc" | "suspended" | "demo";
  password: string;
}

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  customer: "Customer",
  yard_manager: "Yard manager",
  agent: "Agent / reseller",
  sales_rep: "Sales rep",
};

export default function AdminUsersPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const agents = useAgents((s) => s.agents);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const admin = isAdmin(currentUser?.email);

  const users = useMemo<UserRow[]>(() => {
    const out: UserRow[] = [
      { email: DEMO_CREDENTIALS.admin.email, name: DEMO_CREDENTIALS.admin.name, role: "admin", status: "active", password: DEMO_CREDENTIALS.admin.password },
      { email: DEMO_CREDENTIALS.customer.email, name: DEMO_CREDENTIALS.customer.name, role: "customer", status: "demo", password: DEMO_CREDENTIALS.customer.password },
      ...YARD_MANAGERS.map<UserRow>((y) => ({
        email: y.email,
        name: y.name,
        role: "yard_manager",
        region: getYardById(y.yardId)?.region,
        status: "active",
        password: y.password,
      })),
      ...agents.map<UserRow>((a) => ({
        email: a.email,
        name: a.name,
        role: "agent",
        region: a.region,
        status: a.status,
        password: "agent123",
      })),
      ...SALES_REPS.map<UserRow>((r) => ({
        email: r.email,
        name: r.name,
        role: "sales_rep",
        region: r.region,
        status: "active",
        password: "sales123",
      })),
    ];
    return out;
  }, [agents]);

  const [filter, setFilter] = useState<"all" | Role>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    return users.filter((u) => {
      if (filter !== "all" && u.role !== filter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!u.email.toLowerCase().includes(q) && !u.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [users, filter, query]);

  const counts = useMemo(() => {
    return {
      admin: users.filter((u) => u.role === "admin").length,
      yard_manager: users.filter((u) => u.role === "yard_manager").length,
      agent: users.filter((u) => u.role === "agent").length,
      sales_rep: users.filter((u) => u.role === "sales_rep").length,
      customer: users.filter((u) => u.role === "customer").length,
    };
  }, [users]);

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
            <Users className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Admin · User directory</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            All <span className="italic">users</span>.
          </h1>
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-5">
            <KPI label="Admins" value={counts.admin.toString()} />
            <KPI label="Yard managers" value={counts.yard_manager.toString()} />
            <KPI label="Agents" value={counts.agent.toString()} accent />
            <KPI label="Sales reps" value={counts.sales_rep.toString()} />
            <KPI label="Customers" value={counts.customer.toString()} />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-10 md:px-10 md:py-14">
        <div className="flex flex-wrap items-center gap-3">
          {(["all", "admin", "yard_manager", "agent", "sales_rep", "customer"] as ("all" | Role)[]).map((r) => (
            <button key={r} onClick={() => setFilter(r)} className={cn("border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition", filter === r ? "border-amber bg-amber text-ink-900" : "border-ink-500 text-bone-300 hover:border-amber hover:text-amber")}>
              {r === "all" ? "All" : ROLE_LABEL[r]}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 border border-ink-500 px-3 py-1.5">
            <Search className="h-3 w-3 text-bone-400" strokeWidth={1.5} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Email or name" className="w-48 bg-transparent font-mono text-[11px] text-bone-100 placeholder:text-bone-500 focus:outline-none" />
          </div>
          <button onClick={() => downloadRows("meridian-users", visible, [
            { key: "email", label: "Email" },
            { key: "name", label: "Name" },
            { key: "role", label: "Role" },
            { key: "region", label: "Region" },
            { key: "status", label: "Status" },
          ])} className="flex items-center gap-2 border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 hover:border-amber hover:text-amber">
            <Download className="h-3 w-3" strokeWidth={1.5} />Export CSV
          </button>
        </div>

        <section className="border border-ink-500 bg-ink-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {["Email", "Name", "Role", "Region", "Status", "Demo password"].map((h) => (
                    <th key={h} className="border-b border-ink-500 px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-bone-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => (
                  <tr key={u.email} className="border-b border-ink-500">
                    <td className="px-4 py-3 font-mono text-[11px] text-bone-100">{u.email}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-bone-100">{u.name}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-bone-300">{ROLE_LABEL[u.role]}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-bone-300">{u.region ?? "—"}</td>
                    <td className="px-4 py-3"><StatusPill s={u.status} /></td>
                    <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-bone-500">{u.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatusPill({ s }: { s: UserRow["status"] }) {
  const map = {
    active: { label: "Active", cls: "bg-signal-sage/15 text-signal-sage border-signal-sage/40" },
    pending_kyc: { label: "Pending KYC", cls: "bg-amber/15 text-amber border-amber/40" },
    suspended: { label: "Suspended", cls: "bg-signal-red/10 text-signal-red border-signal-red/40" },
    demo: { label: "Demo", cls: "bg-bone-400/10 text-bone-300 border-bone-500/40" },
  }[s];
  return <span className={`inline-block border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${map.cls}`}>{map.label}</span>;
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
