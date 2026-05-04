"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Banks ──────────────────────────────────────────────────────────

export interface Bank {
  id: string;
  code: string; // BNK-001
  name: string;
  shortName: string;
  panelValuerIds: string[];
  contactEmail: string;
  onboardedAt: string;
}

export const BANKS: Bank[] = [
  {
    id: "bnk-hdfc",
    code: "BNK-HDFC",
    name: "HDFC Bank — Auto Loans",
    shortName: "HDFC",
    panelValuerIds: ["val-mehta", "val-iyer"],
    contactEmail: "auto.repo@hdfc.example",
    onboardedAt: "2025-08-12",
  },
  {
    id: "bnk-icici",
    code: "BNK-ICICI",
    name: "ICICI Bank Vehicle Finance",
    shortName: "ICICI",
    panelValuerIds: ["val-mehta"],
    contactEmail: "vehicle.recovery@icici.example",
    onboardedAt: "2025-09-03",
  },
  {
    id: "bnk-sbi",
    code: "BNK-SBI",
    name: "State Bank of India — SBI Wheels",
    shortName: "SBI",
    panelValuerIds: ["val-kapoor"],
    contactEmail: "wheels@sbi.example",
    onboardedAt: "2025-11-18",
  },
  {
    id: "bnk-axis",
    code: "BNK-AXIS",
    name: "Axis Bank Auto Finance",
    shortName: "Axis",
    panelValuerIds: ["val-iyer", "val-kapoor"],
    contactEmail: "auto.npa@axis.example",
    onboardedAt: "2026-01-09",
  },
];

export function getBank(id: string): Bank | undefined {
  return BANKS.find((b) => b.id === id);
}

// ─── Valuers ────────────────────────────────────────────────────────

export interface Valuer {
  id: string;
  name: string;
  region: string;
  panelOf: string[]; // bank ids
  certNumber: string;
}

export const VALUERS: Valuer[] = [
  {
    id: "val-mehta",
    name: "Capt. Rajiv Mehta",
    region: "North",
    panelOf: ["bnk-hdfc", "bnk-icici"],
    certNumber: "IBBI/RV/M&P/2021/01147",
  },
  {
    id: "val-kapoor",
    name: "Suresh Kapoor",
    region: "East",
    panelOf: ["bnk-sbi", "bnk-axis"],
    certNumber: "IBBI/RV/M&P/2022/02238",
  },
  {
    id: "val-iyer",
    name: "Anjali Iyer",
    region: "West",
    panelOf: ["bnk-hdfc", "bnk-axis"],
    certNumber: "IBBI/RV/M&P/2020/00872",
  },
];

export function getValuer(id: string): Valuer | undefined {
  return VALUERS.find((v) => v.id === id);
}

// ─── Stock intake batches ───────────────────────────────────────────

export interface StockIntake {
  id: string;
  bankId: string;
  yardCity: string;
  vehicleIds: string[];
  receivedAt: number; // ms
  reference: string; // bank's batch ref
  notes?: string;
}

// ─── Valuation records ──────────────────────────────────────────────

export interface ValuationPhoto {
  url: string;
  caption?: string;
  capturedAt: number;
}

export interface Valuation {
  id: string;
  vehicleId: string;
  valuerId: string;
  bankId?: string;
  inspectedAt: number;
  floorPrice: number; // bank floor
  recommendedListPrice: number; // for marketplace
  marketReference?: string; // e.g., "OBV equivalent ₹6.4L"
  photos: ValuationPhoto[];
  notes?: string;
  status: "draft" | "submitted" | "approved";
}

// ─── Seed data ──────────────────────────────────────────────────────

const photo = (id: string, caption?: string): ValuationPhoto => ({
  url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`,
  caption,
  capturedAt: Date.now() - 86400000 * 7,
});

const SEED_INTAKES: StockIntake[] = [
  {
    id: "in-001",
    bankId: "bnk-hdfc",
    yardCity: "Lucknow",
    vehicleIds: ["v-013", "v-204", "v-205"],
    receivedAt: Date.parse("2026-04-04"),
    reference: "HDFC/LKO/APR26/B-117",
    notes: "Auto-loan repos, 6m delinquent.",
  },
  {
    id: "in-002",
    bankId: "bnk-icici",
    yardCity: "Delhi NCR",
    vehicleIds: ["v-007", "v-010", "v-202"],
    receivedAt: Date.parse("2026-04-12"),
    reference: "ICICI/DEL/APR26/047",
  },
  {
    id: "in-003",
    bankId: "bnk-sbi",
    yardCity: "Ranchi",
    vehicleIds: ["v-303", "v-304", "v-305"],
    receivedAt: Date.parse("2026-04-19"),
    reference: "SBI/RNC/Q1FY27/22",
    notes: "Tractor + farm equipment batch.",
  },
];

const SEED_VALUATIONS: Valuation[] = [
  {
    id: "vln-001",
    vehicleId: "v-013",
    valuerId: "val-mehta",
    bankId: "bnk-hdfc",
    inspectedAt: Date.parse("2026-04-08"),
    floorPrice: 4150000,
    recommendedListPrice: 4450000,
    marketReference: "OBV ₹4.3L · 2 comps in NCR",
    photos: [
      photo("1494976388531-d1058494cdd8", "Front 3/4 — odometer captured"),
      photo("1492144534655-ae79c964c9d7", "Engine bay"),
      photo("1503376780353-7e6692767b70", "Interior, 28k km"),
    ],
    notes: "Minor scuff on rear bumper. RC clean. Insurance lapsed 14d.",
    status: "approved",
  },
  {
    id: "vln-002",
    vehicleId: "v-204",
    valuerId: "val-mehta",
    bankId: "bnk-hdfc",
    inspectedAt: Date.parse("2026-04-09"),
    floorPrice: 720000,
    recommendedListPrice: 850000,
    marketReference: "Wholesale ₹6.8L",
    photos: [
      photo("1565043589221-1a6fd9ae45c7", "Cabin LHS"),
      photo("1485827404703-89b55fcc595e", "Underbody"),
    ],
    notes: "Clutch likely needs work. Tyre tread 60%.",
    status: "approved",
  },
  {
    id: "vln-003",
    vehicleId: "v-303",
    valuerId: "val-kapoor",
    bankId: "bnk-sbi",
    inspectedAt: Date.parse("2026-04-21"),
    floorPrice: 1100000,
    recommendedListPrice: 1200000,
    photos: [photo("1605559424843-9e4c228bf1c2", "Tractor full body")],
    status: "submitted",
  },
];

// ─── Store ──────────────────────────────────────────────────────────

interface BanksStore {
  intakes: StockIntake[];
  valuations: Valuation[];

  addIntake: (
    bankId: string,
    yardCity: string,
    vehicleIds: string[],
    reference: string,
    notes?: string
  ) => StockIntake;

  upsertValuation: (
    vehicleId: string,
    patch: Omit<Valuation, "id" | "vehicleId" | "inspectedAt" | "photos" | "status"> & {
      photos?: ValuationPhoto[];
      status?: Valuation["status"];
    }
  ) => Valuation;

  addPhoto: (vehicleId: string, photo: ValuationPhoto) => void;
  approveValuation: (valuationId: string) => void;
}

export const useBanks = create<BanksStore>()(
  persist(
    (set, get) => ({
      intakes: SEED_INTAKES,
      valuations: SEED_VALUATIONS,

      addIntake: (bankId, yardCity, vehicleIds, reference, notes) => {
        const intake: StockIntake = {
          id: `in-${Date.now().toString(36)}`,
          bankId,
          yardCity,
          vehicleIds,
          receivedAt: Date.now(),
          reference,
          notes,
        };
        set((s) => ({ intakes: [intake, ...s.intakes] }));
        return intake;
      },

      upsertValuation: (vehicleId, patch) => {
        const existing = get().valuations.find((v) => v.vehicleId === vehicleId);
        if (existing) {
          const updated: Valuation = {
            ...existing,
            ...patch,
            photos: patch.photos ?? existing.photos,
            status: patch.status ?? existing.status,
            inspectedAt: Date.now(),
          };
          set((s) => ({
            valuations: s.valuations.map((v) =>
              v.id === existing.id ? updated : v
            ),
          }));
          return updated;
        }
        const created: Valuation = {
          id: `vln-${Date.now().toString(36)}`,
          vehicleId,
          inspectedAt: Date.now(),
          photos: patch.photos ?? [],
          status: patch.status ?? "submitted",
          ...patch,
        } as Valuation;
        set((s) => ({ valuations: [created, ...s.valuations] }));
        return created;
      },

      addPhoto: (vehicleId, p) =>
        set((s) => ({
          valuations: s.valuations.map((v) =>
            v.vehicleId === vehicleId
              ? { ...v, photos: [...v.photos, p] }
              : v
          ),
        })),

      approveValuation: (valuationId) =>
        set((s) => ({
          valuations: s.valuations.map((v) =>
            v.id === valuationId ? { ...v, status: "approved" } : v
          ),
        })),
    }),
    {
      name: "meridian-banks-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ─── Helpers ────────────────────────────────────────────────────────

export function valuationFor(
  vehicleId: string,
  valuations: Valuation[]
): Valuation | undefined {
  return valuations.find((v) => v.vehicleId === vehicleId);
}

export function bankForVehicle(
  vehicleId: string,
  intakes: StockIntake[]
): { bank: Bank; intake: StockIntake } | undefined {
  for (const intake of intakes) {
    if (intake.vehicleIds.includes(vehicleId)) {
      const bank = getBank(intake.bankId);
      if (bank) return { bank, intake };
    }
  }
  return undefined;
}

export function vehiclesForBank(
  bankId: string,
  intakes: StockIntake[]
): string[] {
  const ids: string[] = [];
  for (const i of intakes) {
    if (i.bankId === bankId) ids.push(...i.vehicleIds);
  }
  return ids;
}
