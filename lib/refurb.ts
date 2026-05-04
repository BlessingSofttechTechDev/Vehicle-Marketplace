"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type RepairStatus = "planned" | "in_progress" | "completed" | "cancelled";

export interface RepairItem {
  desc: string;
  cost: number;
}

export interface RepairOrder {
  id: string;
  vehicleId: string;
  vendor: string;
  items: RepairItem[];
  totalCost: number;
  status: RepairStatus;
  startedAt?: number;
  completedAt?: number;
  notes?: string;
  createdAt: number;
}

const SEED_ORDERS: RepairOrder[] = [
  {
    id: "ro-001",
    vehicleId: "v-204",
    vendor: "Lucknow Commercial Works",
    items: [
      { desc: "Clutch plate + assembly", cost: 18000 },
      { desc: "Tyres × 4 (recondition)", cost: 22000 },
      { desc: "Paint touch-up", cost: 9000 },
    ],
    totalCost: 49000,
    status: "completed",
    startedAt: Date.parse("2026-04-14"),
    completedAt: Date.parse("2026-04-21"),
    notes: "Lift expected to add ₹40-60k to listing price.",
    createdAt: Date.parse("2026-04-13"),
  },
  {
    id: "ro-002",
    vehicleId: "v-013",
    vendor: "NCR Auto Detail Studio",
    items: [
      { desc: "Detailing + ceramic coating", cost: 24000 },
      { desc: "Brake pads (front)", cost: 8500 },
      { desc: "AC gas + cabin filter", cost: 4200 },
    ],
    totalCost: 36700,
    status: "in_progress",
    startedAt: Date.parse("2026-04-26"),
    createdAt: Date.parse("2026-04-25"),
  },
  {
    id: "ro-003",
    vehicleId: "v-303",
    vendor: "Ranchi Tractor Repairs",
    items: [
      { desc: "Hydraulic seal kit", cost: 6500 },
      { desc: "PTO shaft check", cost: 1800 },
    ],
    totalCost: 8300,
    status: "planned",
    createdAt: Date.parse("2026-04-27"),
  },
];

interface RefurbStore {
  orders: RepairOrder[];
  addOrder: (
    vehicleId: string,
    vendor: string,
    items: RepairItem[],
    notes?: string
  ) => RepairOrder;
  setStatus: (orderId: string, status: RepairStatus) => void;
  removeOrder: (orderId: string) => void;
}

export const useRefurb = create<RefurbStore>()(
  persist(
    (set) => ({
      orders: SEED_ORDERS,

      addOrder: (vehicleId, vendor, items, notes) => {
        const order: RepairOrder = {
          id: `ro-${Date.now().toString(36)}`,
          vehicleId,
          vendor,
          items,
          totalCost: items.reduce((s, x) => s + x.cost, 0),
          status: "planned",
          notes,
          createdAt: Date.now(),
        };
        set((s) => ({ orders: [order, ...s.orders] }));
        return order;
      },

      setStatus: (orderId, status) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== orderId) return o;
            const patch: Partial<RepairOrder> = { status };
            if (status === "in_progress" && !o.startedAt) patch.startedAt = Date.now();
            if (status === "completed") patch.completedAt = Date.now();
            return { ...o, ...patch };
          }),
        })),

      removeOrder: (orderId) =>
        set((s) => ({ orders: s.orders.filter((o) => o.id !== orderId) })),
    }),
    {
      name: "meridian-refurb-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function repairCostFor(vehicleId: string, orders: RepairOrder[]): number {
  return orders
    .filter((o) => o.vehicleId === vehicleId && o.status !== "cancelled")
    .reduce((s, o) => s + o.totalCost, 0);
}
