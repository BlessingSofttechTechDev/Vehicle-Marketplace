"use client";
import { type StockIntake, type Valuation, getBank } from "./banks";
import {
  type Settlement,
  type Seizure,
  type Borrower,
} from "./collections";
import { type RepairOrder } from "./refurb";
import { type Allotment } from "./agents";
import { type Lead } from "./sales";
import { type Acquisition } from "./acquisitions";

export type ActivityType =
  | "intake"
  | "valuation_submitted"
  | "valuation_approved"
  | "settlement_proposed"
  | "settlement_agreed"
  | "settlement_paid"
  | "settlement_defaulted"
  | "seizure_initiated"
  | "seizure_custody"
  | "refurb_started"
  | "refurb_completed"
  | "allotment_created"
  | "agent_sale"
  | "agent_return"
  | "commission_paid"
  | "lead_created"
  | "lead_won"
  | "lead_lost"
  | "acquisition";

export interface ActivityEvent {
  id: string;
  at: number;
  type: ActivityType;
  title: string;
  detail: string;
  vehicleId?: string;
  href?: string;
  tone: "neutral" | "ok" | "warn" | "danger";
}

interface Args {
  intakes: StockIntake[];
  valuations: Valuation[];
  borrowers: Borrower[];
  settlements: Settlement[];
  seizures: Seizure[];
  orders: RepairOrder[];
  allotments: Allotment[];
  leads: Lead[];
  acquisitions: Acquisition[];
}

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function buildActivity(args: Args): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  // Intakes
  for (const i of args.intakes) {
    const bank = getBank(i.bankId);
    events.push({
      id: `act-${i.id}`,
      at: i.receivedAt,
      type: "intake",
      title: `${bank?.shortName ?? "Bank"} stock intake — ${i.vehicleIds.length} vehicles`,
      detail: `${i.reference} · yard ${i.yardCity}`,
      tone: "neutral",
      href: "/admin/intake",
    });
  }

  // Valuations
  for (const v of args.valuations) {
    events.push({
      id: `act-${v.id}-sub`,
      at: v.inspectedAt,
      type: "valuation_submitted",
      title: `Valuation captured for ${v.vehicleId}`,
      detail: `Floor ${fmt(v.floorPrice)} · list ${fmt(v.recommendedListPrice)} · ${v.photos.length} photo(s)`,
      vehicleId: v.vehicleId,
      tone: "neutral",
      href: "/admin/valuation",
    });
    if (v.status === "approved") {
      events.push({
        id: `act-${v.id}-app`,
        at: v.inspectedAt + 1,
        type: "valuation_approved",
        title: `Valuation approved · ${v.vehicleId}`,
        detail: `Listing-ready at ${fmt(v.recommendedListPrice)}`,
        vehicleId: v.vehicleId,
        tone: "ok",
        href: "/admin/valuation",
      });
    }
  }

  // Borrowers / settlements / seizures
  const borrowerMap = new Map(args.borrowers.map((b) => [b.id, b] as const));
  for (const s of args.settlements) {
    const b = borrowerMap.get(s.borrowerId);
    events.push({
      id: `act-${s.id}-prop`,
      at: s.createdAt,
      type: "settlement_proposed",
      title: `Settlement proposed · ${b?.name ?? s.borrowerId}`,
      detail: `${fmt(s.proposedAmount)} ${s.notes ? `· ${s.notes}` : ""}`,
      vehicleId: b?.vehicleId,
      tone: "warn",
      href: "/admin/collections",
    });
    if (s.status === "agreed" && s.agreedAmount) {
      events.push({
        id: `act-${s.id}-agree`,
        at: s.createdAt + 1,
        type: "settlement_agreed",
        title: `Settlement agreed · ${b?.name ?? s.borrowerId}`,
        detail: `${fmt(s.agreedAmount)} due ${s.dueDate ? new Date(s.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}`,
        vehicleId: b?.vehicleId,
        tone: "ok",
        href: "/admin/collections",
      });
    }
    if (s.status === "paid" && s.paidAt && s.paidAmount) {
      events.push({
        id: `act-${s.id}-paid`,
        at: s.paidAt,
        type: "settlement_paid",
        title: `Settlement paid · ${b?.name ?? s.borrowerId}`,
        detail: `${fmt(s.paidAmount)} recovered`,
        vehicleId: b?.vehicleId,
        tone: "ok",
        href: "/admin/collections",
      });
    }
    if (s.status === "defaulted") {
      events.push({
        id: `act-${s.id}-def`,
        at: s.createdAt + 2,
        type: "settlement_defaulted",
        title: `Settlement defaulted · ${b?.name ?? s.borrowerId}`,
        detail: "Auto-triggering seizure pipeline",
        vehicleId: b?.vehicleId,
        tone: "danger",
        href: "/admin/collections",
      });
    }
  }
  for (const z of args.seizures) {
    const b = borrowerMap.get(z.borrowerId);
    events.push({
      id: `act-${z.id}-init`,
      at: z.initiatedAt,
      type: "seizure_initiated",
      title: `Seizure initiated · ${b?.name ?? z.borrowerId}`,
      detail: `${z.legalRef}${z.court ? ` · ${z.court}` : ""}`,
      vehicleId: b?.vehicleId,
      tone: "danger",
      href: "/admin/collections",
    });
    if (z.custodyDate) {
      events.push({
        id: `act-${z.id}-cust`,
        at: z.custodyDate,
        type: "seizure_custody",
        title: `Custody taken · ${b?.name ?? z.borrowerId}`,
        detail: "Asset moved to recovery yard",
        vehicleId: b?.vehicleId,
        tone: "warn",
        href: "/admin/collections",
      });
    }
  }

  // Refurb
  for (const o of args.orders) {
    if (o.startedAt) {
      events.push({
        id: `act-${o.id}-start`,
        at: o.startedAt,
        type: "refurb_started",
        title: `Refurb started · ${o.vehicleId}`,
        detail: `${o.vendor} · ${fmt(o.totalCost)}`,
        vehicleId: o.vehicleId,
        tone: "neutral",
        href: "/admin/refurb",
      });
    }
    if (o.completedAt) {
      events.push({
        id: `act-${o.id}-done`,
        at: o.completedAt,
        type: "refurb_completed",
        title: `Refurb completed · ${o.vehicleId}`,
        detail: `${fmt(o.totalCost)} spent`,
        vehicleId: o.vehicleId,
        tone: "ok",
        href: "/admin/refurb",
      });
    }
  }

  // Allotments + agent sales
  for (const al of args.allotments) {
    events.push({
      id: `act-${al.id}-alloc`,
      at: al.createdAt,
      type: "allotment_created",
      title: `Allotment to agent · ${al.lines.length} vehicle(s)`,
      detail: `${al.id.toUpperCase()} · yard ${al.yardCity}`,
      tone: "neutral",
      href: "/admin/agents",
    });
    for (const ln of al.lines) {
      if (ln.status === "sold" && ln.soldAt) {
        events.push({
          id: `act-${al.id}-${ln.vehicleId}-sold`,
          at: ln.soldAt,
          type: "agent_sale",
          title: `Agent sale · ${ln.vehicleId}`,
          detail: `${ln.buyerName ?? "buyer"} · ${fmt(ln.soldPrice ?? 0)} · commission ${fmt(ln.commissionAmount ?? 0)}`,
          vehicleId: ln.vehicleId,
          tone: "ok",
          href: "/admin/agents",
        });
      }
      if (ln.status === "returned" && ln.returnedAt) {
        events.push({
          id: `act-${al.id}-${ln.vehicleId}-ret`,
          at: ln.returnedAt,
          type: "agent_return",
          title: `Agent return · ${ln.vehicleId}`,
          detail: ln.returnReason ?? "",
          vehicleId: ln.vehicleId,
          tone: "warn",
          href: "/admin/agents",
        });
      }
      if (ln.commissionPaid && ln.commissionPaidAt) {
        events.push({
          id: `act-${al.id}-${ln.vehicleId}-cp`,
          at: ln.commissionPaidAt,
          type: "commission_paid",
          title: `Commission paid · ${ln.vehicleId}`,
          detail: fmt(ln.commissionAmount ?? 0),
          vehicleId: ln.vehicleId,
          tone: "ok",
          href: "/admin/agents",
        });
      }
    }
  }

  // Leads
  for (const l of args.leads) {
    events.push({
      id: `act-${l.id}-new`,
      at: l.createdAt,
      type: "lead_created",
      title: `Lead created · ${l.customerName}`,
      detail: `Source ${l.source} · ${l.vehicleId}`,
      vehicleId: l.vehicleId,
      tone: "neutral",
      href: "/admin/leads",
    });
    if (l.status === "won") {
      events.push({
        id: `act-${l.id}-won`,
        at: l.updatedAt,
        type: "lead_won",
        title: `Lead won · ${l.customerName}`,
        detail: l.finalPrice ? fmt(l.finalPrice) : "",
        vehicleId: l.vehicleId,
        tone: "ok",
        href: "/admin/leads",
      });
    } else if (l.status === "lost") {
      events.push({
        id: `act-${l.id}-lost`,
        at: l.updatedAt,
        type: "lead_lost",
        title: `Lead lost · ${l.customerName}`,
        detail: l.lostReason ?? "",
        vehicleId: l.vehicleId,
        tone: "danger",
        href: "/admin/leads",
      });
    }
  }

  // Acquisitions (customer purchases)
  for (const a of args.acquisitions) {
    events.push({
      id: `act-acq-${a.bookingId}`,
      at: a.acquiredAt,
      type: "acquisition",
      title: `Customer ${a.status === "owned" ? "purchase" : a.status === "reserved" ? "reservation" : "cancellation"} · ${a.userName}`,
      detail: `${a.bookingId} · ${fmt(a.amountPaid)}`,
      vehicleId: a.vehicleId,
      tone: a.status === "cancelled" ? "danger" : a.status === "owned" ? "ok" : "neutral",
      href: "/admin",
    });
  }

  return events.sort((a, b) => b.at - a.at);
}
