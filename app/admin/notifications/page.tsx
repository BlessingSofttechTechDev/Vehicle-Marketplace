"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, ShieldAlert, Check, AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { Nav } from "@/components/nav";
import { useAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/acquisitions";
import { useBanks } from "@/lib/banks";
import { useCollections } from "@/lib/collections";
import { useRefurb } from "@/lib/refurb";
import { useAgents } from "@/lib/agents";
import { useSales } from "@/lib/sales";
import { buildAlerts, useNotifications, type AlertItem } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const currentUser = useAuth((s) => s.currentUser);
  const intakes = useBanks((s) => s.intakes);
  const valuations = useBanks((s) => s.valuations);
  const borrowers = useCollections((s) => s.borrowers);
  const settlements = useCollections((s) => s.settlements);
  const orders = useRefurb((s) => s.orders);
  const allotments = useAgents((s) => s.allotments);
  const leads = useSales((s) => s.leads);
  const read = useNotifications((s) => s.read);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const markRead = useNotifications((s) => s.markRead);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const admin = isAdmin(currentUser?.email);

  const alerts = useMemo(
    () =>
      buildAlerts({
        intakes, valuations, borrowers, settlements, orders, allotments, leads,
      }),
    [intakes, valuations, borrowers, settlements, orders, allotments, leads]
  );

  const unread = alerts.filter((a) => !read[a.id]);
  const counts = {
    urgent: alerts.filter((a) => a.severity === "urgent").length,
    warn: alerts.filter((a) => a.severity === "warn").length,
    info: alerts.filter((a) => a.severity === "info").length,
  };

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
            <Bell className="h-4 w-4 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Admin · Notifications</p>
          </div>
          <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
            Action <span className="italic">inbox</span>.
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-bone-400">
            Derived live from operations · {unread.length} unread of {alerts.length}.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-5">
            <KPI label="Urgent" value={counts.urgent.toString()} accent="signal-red" />
            <KPI label="Warning" value={counts.warn.toString()} accent="amber" />
            <KPI label="Info" value={counts.info.toString()} accent="bone-100" />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-10 md:px-10 md:py-14">
        <div className="flex items-center justify-end">
          <button
            onClick={() => markAllRead(alerts.map((a) => a.id))}
            className="flex items-center gap-2 border border-ink-500 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-300 hover:border-amber hover:text-amber"
          >
            <Check className="h-3 w-3" strokeWidth={2} />Mark all read
          </button>
        </div>

        <section className="border border-ink-500 bg-ink-800">
          {alerts.length === 0 ? (
            <div className="px-6 py-12 text-center font-mono text-[11px] uppercase tracking-wider text-bone-500">All clear · no actions needed.</div>
          ) : (
            <div className="divide-y divide-ink-500">
              {alerts.map((a) => (
                <AlertRow key={a.id} alert={a} isRead={!!read[a.id]} onMarkRead={() => markRead(a.id)} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function AlertRow({ alert, isRead, onMarkRead }: { alert: AlertItem; isRead: boolean; onMarkRead: () => void }) {
  const Icon = alert.severity === "urgent" ? AlertOctagon : alert.severity === "warn" ? AlertTriangle : Info;
  const tone = alert.severity === "urgent" ? "text-signal-red" : alert.severity === "warn" ? "text-amber" : "text-bone-300";
  return (
    <div className={cn("grid items-start gap-4 px-6 py-4 md:grid-cols-[40px_1fr_auto]", isRead && "opacity-60")}>
      <Icon className={cn("h-5 w-5", tone)} strokeWidth={1.5} />
      <Link href={alert.href} onClick={onMarkRead}>
        <p className="font-mono text-[12px] text-bone-100">{alert.title}</p>
        <p className="mt-1 font-mono text-[11px] text-bone-400">{alert.detail}</p>
      </Link>
      {!isRead && (
        <button onClick={onMarkRead} className="flex items-center gap-1 border border-ink-500 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-bone-400 hover:border-amber hover:text-amber">
          <Check className="h-3 w-3" />Mark read
        </button>
      )}
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="border border-ink-500 bg-ink-800 p-5">
      <p className="label">{label}</p>
      <p className={cn("mt-3 font-display text-3xl tabular", `text-${accent}`)}>{value}</p>
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
