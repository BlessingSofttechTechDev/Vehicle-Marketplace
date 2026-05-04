"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type StockIntake, type Valuation, valuationFor, getBank } from "./banks";
import { type Settlement, type Borrower } from "./collections";
import { type RepairOrder } from "./refurb";
import { type Allotment, type AllotmentLine } from "./agents";
import { type Lead } from "./sales";

export type AlertSeverity = "info" | "warn" | "urgent";

export interface AlertItem {
  id: string;
  at: number; // ms — when this condition first becomes meaningful (mostly "now-ish")
  severity: AlertSeverity;
  title: string;
  detail: string;
  href: string;
}

interface Args {
  intakes: StockIntake[];
  valuations: Valuation[];
  borrowers: Borrower[];
  settlements: Settlement[];
  orders: RepairOrder[];
  allotments: Allotment[];
  leads: Lead[];
}

const DAY = 86400000;

export function buildAlerts(args: Args, nowMs: number = Date.now()): AlertItem[] {
  const alerts: AlertItem[] = [];

  // Settlements due within 7 days
  for (const s of args.settlements) {
    if (s.status === "agreed" && s.dueDate) {
      const days = Math.round((s.dueDate - nowMs) / DAY);
      if (days <= 7) {
        const b = args.borrowers.find((x) => x.id === s.borrowerId);
        alerts.push({
          id: `al-${s.id}-due`,
          at: s.dueDate,
          severity: days < 0 ? "urgent" : "warn",
          title: days < 0 ? `Settlement overdue · ${b?.name ?? s.borrowerId}` : `Settlement due in ${days}d · ${b?.name ?? s.borrowerId}`,
          detail: `₹${(s.agreedAmount ?? s.proposedAmount).toLocaleString("en-IN")}`,
          href: "/admin/collections",
        });
      }
    }
  }

  // Vehicles awaiting valuation
  const allTrackedIds = new Set<string>();
  args.intakes.forEach((i) => i.vehicleIds.forEach((id) => allTrackedIds.add(id)));
  let pendingValuation = 0;
  allTrackedIds.forEach((id) => {
    const v = valuationFor(id, args.valuations);
    if (!v || v.status !== "approved") pendingValuation++;
  });
  if (pendingValuation > 0) {
    alerts.push({
      id: `al-val-pending`,
      at: nowMs,
      severity: pendingValuation > 5 ? "warn" : "info",
      title: `${pendingValuation} vehicle(s) await valuation`,
      detail: "Inspection + photo capture pending",
      href: "/admin/valuation",
    });
  }

  // Pending agent commission payouts
  let pendingCommission = 0;
  let pendingValue = 0;
  for (const al of args.allotments) {
    for (const ln of al.lines) {
      if (ln.status === "sold" && !ln.commissionPaid && ln.commissionAmount) {
        pendingCommission++;
        pendingValue += ln.commissionAmount;
      }
    }
  }
  if (pendingCommission > 0) {
    alerts.push({
      id: `al-commission-pending`,
      at: nowMs,
      severity: "warn",
      title: `${pendingCommission} commission payout(s) pending`,
      detail: `₹${pendingValue.toLocaleString("en-IN")} unsettled`,
      href: "/admin/agents",
    });
  }

  // Refurb completed but vehicle not yet relisted (heuristic: completed ≥1d ago)
  for (const o of args.orders) {
    if (o.status === "completed" && o.completedAt && nowMs - o.completedAt < 14 * DAY) {
      alerts.push({
        id: `al-${o.id}-relist`,
        at: o.completedAt,
        severity: "info",
        title: `Refurb completed · ${o.vehicleId}`,
        detail: `${o.vendor} · review for relist with new pricing`,
        href: "/admin/refurb",
      });
    }
  }

  // Stale leads — in pipeline >7d without status change
  for (const l of args.leads) {
    if (l.status === "won" || l.status === "lost") continue;
    const days = Math.round((nowMs - l.updatedAt) / DAY);
    if (days >= 7) {
      alerts.push({
        id: `al-${l.id}-stale`,
        at: l.updatedAt,
        severity: days >= 14 ? "urgent" : "warn",
        title: `Stale lead (${days}d) · ${l.customerName}`,
        detail: `${l.status.replace("_", " ")} since ${new Date(l.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        href: "/admin/leads",
      });
    }
  }

  return alerts.sort((a, b) => sevRank(b.severity) - sevRank(a.severity));
}

function sevRank(s: AlertSeverity): number {
  return s === "urgent" ? 3 : s === "warn" ? 2 : 1;
}

// Read state — track which alert IDs the user has seen.
interface NotifStore {
  read: Record<string, true>;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
}

export const useNotifications = create<NotifStore>()(
  persist(
    (set) => ({
      read: {},
      markRead: (id) =>
        set((s) => ({ read: { ...s.read, [id]: true } })),
      markAllRead: (ids) =>
        set((s) => ({
          read: { ...s.read, ...Object.fromEntries(ids.map((id) => [id, true])) },
        })),
    }),
    {
      name: "meridian-notif-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
