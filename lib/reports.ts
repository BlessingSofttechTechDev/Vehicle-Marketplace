"use client";
import { VEHICLES, getVehicle } from "./data";
import {
  BANKS,
  type Bank,
  type StockIntake,
  type Valuation,
  vehiclesForBank,
  valuationFor,
} from "./banks";
import { type Acquisition } from "./acquisitions";
import {
  type Agent,
  type Allotment,
  type AllotmentLine,
  agentRevenue,
} from "./agents";
import { type RepairOrder, repairCostFor } from "./refurb";
import { type Lead, type SalesRep, SALES_REPS } from "./sales";

// ─── Bank-wise report ──────────────────────────────────────────────

export interface BankRow {
  bank: Bank;
  intakeCount: number;
  vehicleCount: number;
  valued: number;
  pendingValuation: number;
  sold: number;
  recovered: number; // gross sales for bank's vehicles
  totalFloor: number;
}

export function bankReport(
  intakes: StockIntake[],
  valuations: Valuation[],
  acquisitions: Acquisition[]
): BankRow[] {
  return BANKS.map((bank) => {
    const vIds = vehiclesForBank(bank.id, intakes);
    const valued = vIds.filter((id) =>
      valuations.some((v) => v.vehicleId === id)
    ).length;
    const sold = acquisitions.filter(
      (a) => a.status === "owned" && vIds.includes(a.vehicleId)
    );
    const totalFloor = vIds.reduce(
      (s, id) => s + (valuationFor(id, valuations)?.floorPrice ?? 0),
      0
    );
    return {
      bank,
      intakeCount: intakes.filter((i) => i.bankId === bank.id).length,
      vehicleCount: vIds.length,
      valued,
      pendingValuation: vIds.length - valued,
      sold: sold.length,
      recovered: sold.reduce((s, a) => s + a.priceAtAcquisition, 0),
      totalFloor,
    };
  });
}

// ─── Agent-wise summary ────────────────────────────────────────────

export interface AgentRow {
  agent: Agent;
  inField: number;
  sold: number;
  grossSales: number;
  commissionEarned: number;
  commissionPending: number;
}

export function agentReport(agents: Agent[], allotments: Allotment[]): AgentRow[] {
  return agents.map((agent) => {
    const r = agentRevenue(agent.id, allotments);
    return {
      agent,
      inField: r.inField,
      sold: r.sold,
      grossSales: r.grossSales,
      commissionEarned: r.commissionEarned,
      commissionPending: r.commissionPending,
    };
  });
}

// ─── Direct sales (rep-wise) ───────────────────────────────────────

export interface SalesRepRow {
  rep: SalesRep;
  total: number;
  won: number;
  lost: number;
  inPipeline: number;
  conversionPct: number;
  revenue: number;
}

export function salesRepReport(leads: Lead[]): SalesRepRow[] {
  return SALES_REPS.map((rep) => {
    const mine = leads.filter((l) => l.repId === rep.id);
    const won = mine.filter((l) => l.status === "won");
    const lost = mine.filter((l) => l.status === "lost").length;
    const inPipe = mine.filter(
      (l) => l.status !== "won" && l.status !== "lost"
    ).length;
    const total = mine.length;
    const conversionPct = total === 0 ? 0 : Math.round((won.length / total) * 100);
    return {
      rep,
      total,
      won: won.length,
      lost,
      inPipeline: inPipe,
      conversionPct,
      revenue: won.reduce((s, l) => s + (l.finalPrice ?? 0), 0),
    };
  });
}

// ─── P&L ───────────────────────────────────────────────────────────

export interface PnL {
  revenue: number; // gross sales (acquisitions + agent sold + direct sales won)
  costs: {
    agentCommission: number; // earned (recognised whether paid or not)
    refurb: number;
    valuationFees: number; // mock: ₹1500 per valuation
    legalSeizure: number; // mock: ₹15000 per seizure initiated
  };
  totalCost: number;
  net: number;
}

const VALUATION_FEE = 1500;
const SEIZURE_FEE = 15000;

export function computePnL(args: {
  acquisitions: Acquisition[];
  allotments: Allotment[];
  leads: Lead[];
  orders: RepairOrder[];
  valuations: Valuation[];
  seizureCount: number;
}): PnL {
  const acqRev = args.acquisitions
    .filter((a) => a.status !== "cancelled")
    .reduce((s, a) => s + a.amountPaid, 0);
  const agentRev = args.allotments
    .flatMap((al) => al.lines)
    .filter((ln) => ln.status === "sold")
    .reduce((s, ln) => s + (ln.soldPrice ?? 0), 0);
  const directRev = args.leads
    .filter((l) => l.status === "won")
    .reduce((s, l) => s + (l.finalPrice ?? 0), 0);
  const revenue = acqRev + agentRev + directRev;

  const agentCommission = args.allotments
    .flatMap((al) => al.lines)
    .reduce((s, ln) => s + (ln.commissionAmount ?? 0), 0);
  const refurb = args.orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.totalCost, 0);
  const valuationFees = args.valuations.length * VALUATION_FEE;
  const legalSeizure = args.seizureCount * SEIZURE_FEE;

  const totalCost = agentCommission + refurb + valuationFees + legalSeizure;
  return {
    revenue,
    costs: { agentCommission, refurb, valuationFees, legalSeizure },
    totalCost,
    net: revenue - totalCost,
  };
}

// ─── Cash flow (monthly) ───────────────────────────────────────────

export interface CashRow {
  month: string; // "2026-04"
  inflow: number;
  outflow: number;
  net: number;
}

export function cashFlow(args: {
  acquisitions: Acquisition[];
  allotments: Allotment[];
  leads: Lead[];
  orders: RepairOrder[];
  paidSettlements: { paidAt: number; paidAmount: number }[];
}): CashRow[] {
  const buckets = new Map<string, { inflow: number; outflow: number }>();
  const bucket = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const inflow = (ts: number, amt: number) => {
    const k = bucket(ts);
    const cur = buckets.get(k) ?? { inflow: 0, outflow: 0 };
    cur.inflow += amt;
    buckets.set(k, cur);
  };
  const outflow = (ts: number, amt: number) => {
    const k = bucket(ts);
    const cur = buckets.get(k) ?? { inflow: 0, outflow: 0 };
    cur.outflow += amt;
    buckets.set(k, cur);
  };

  // Inflows
  args.acquisitions
    .filter((a) => a.status !== "cancelled")
    .forEach((a) => inflow(a.acquiredAt, a.amountPaid));
  args.allotments.forEach((al) =>
    al.lines.forEach((ln) => {
      if (ln.status === "sold" && ln.soldAt && ln.soldPrice)
        inflow(ln.soldAt, ln.soldPrice);
    })
  );
  args.leads
    .filter((l) => l.status === "won" && l.finalPrice)
    .forEach((l) => inflow(l.updatedAt, l.finalPrice ?? 0));
  args.paidSettlements.forEach((p) => inflow(p.paidAt, p.paidAmount));

  // Outflows
  args.allotments.forEach((al) =>
    al.lines.forEach((ln) => {
      if (ln.commissionPaid && ln.commissionPaidAt && ln.commissionAmount)
        outflow(ln.commissionPaidAt, ln.commissionAmount);
    })
  );
  args.orders.forEach((o) => {
    if (o.status === "completed" && o.completedAt)
      outflow(o.completedAt, o.totalCost);
  });

  return Array.from(buckets.entries())
    .map(([month, v]) => ({
      month,
      inflow: v.inflow,
      outflow: v.outflow,
      net: v.inflow - v.outflow,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// ─── Stock aging ───────────────────────────────────────────────────

export interface AgeBucket {
  label: string;
  count: number;
}

export function stockAging(
  intakes: StockIntake[],
  acquisitions: Acquisition[],
  allotments: Allotment[]
): AgeBucket[] {
  const soldVehicleIds = new Set<string>([
    ...acquisitions.filter((a) => a.status !== "cancelled").map((a) => a.vehicleId),
    ...allotments
      .flatMap((al) => al.lines)
      .filter((ln) => ln.status === "sold")
      .map((ln) => ln.vehicleId),
  ]);

  const intakeMap = new Map<string, number>();
  for (const i of intakes) {
    for (const id of i.vehicleIds) intakeMap.set(id, i.receivedAt);
  }

  const now = Date.now();
  const buckets: Record<string, number> = {
    "0-30d": 0,
    "31-60d": 0,
    "61-90d": 0,
    "90d+": 0,
  };

  for (const v of VEHICLES) {
    if (soldVehicleIds.has(v.id)) continue;
    const start = intakeMap.get(v.id) ?? null;
    if (!start) continue; // only age intake-tracked stock for this report
    const days = Math.floor((now - start) / 86400000);
    if (days <= 30) buckets["0-30d"]++;
    else if (days <= 60) buckets["31-60d"]++;
    else if (days <= 90) buckets["61-90d"]++;
    else buckets["90d+"]++;
  }

  return Object.entries(buckets).map(([label, count]) => ({ label, count }));
}

// ─── Margin per vehicle (used in reports / valuation views) ────────

export function marginFor(
  vehicleId: string,
  valuations: Valuation[],
  orders: RepairOrder[]
): { listPrice: number; floor: number; refurb: number; expectedMargin: number } {
  const v = getVehicle(vehicleId);
  const val = valuationFor(vehicleId, valuations);
  const listPrice = v?.price ?? 0;
  const floor = val?.floorPrice ?? v?.contractFloorPrice ?? 0;
  const refurb = repairCostFor(vehicleId, orders);
  return {
    listPrice,
    floor,
    refurb,
    expectedMargin: listPrice - floor - refurb,
  };
}
