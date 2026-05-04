"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Borrower (debtor whose vehicle is being recovered) ────────────

export interface Borrower {
  id: string;
  vehicleId: string;
  bankId: string;
  name: string;
  phone: string;
  loanAccount: string;
  outstandingPrincipal: number;
  daysPastDue: number;
  city: string;
}

// ─── Settlement ────────────────────────────────────────────────────

export type SettlementStatus =
  | "proposed"
  | "agreed"
  | "paid"
  | "defaulted"
  | "cancelled";

export interface Settlement {
  id: string;
  borrowerId: string;
  proposedAmount: number;
  agreedAmount?: number;
  dueDate?: number; // ms
  status: SettlementStatus;
  paidAmount?: number;
  paidAt?: number;
  notes?: string;
  createdAt: number;
}

// ─── Seizure ───────────────────────────────────────────────────────

export type SeizureStatus =
  | "initiated"
  | "court_filed"
  | "custody_taken"
  | "closed";

export interface Seizure {
  id: string;
  borrowerId: string;
  legalRef: string;
  court?: string;
  initiatedAt: number;
  custodyDate?: number;
  status: SeizureStatus;
  notes?: string;
}

// ─── Seed ──────────────────────────────────────────────────────────

const SEED_BORROWERS: Borrower[] = [
  {
    id: "bor-001",
    vehicleId: "v-013",
    bankId: "bnk-hdfc",
    name: "Sandeep Yadav",
    phone: "+91 98115 11212",
    loanAccount: "HDFC-AL-0091233",
    outstandingPrincipal: 3850000,
    daysPastDue: 187,
    city: "Lucknow",
  },
  {
    id: "bor-002",
    vehicleId: "v-204",
    bankId: "bnk-hdfc",
    name: "Mahesh Tiwari",
    phone: "+91 98233 22321",
    loanAccount: "HDFC-CV-0014457",
    outstandingPrincipal: 680000,
    daysPastDue: 134,
    city: "Lucknow",
  },
  {
    id: "bor-003",
    vehicleId: "v-007",
    bankId: "bnk-icici",
    name: "Rakesh Aggarwal",
    phone: "+91 98910 33445",
    loanAccount: "ICICI-AL-558821",
    outstandingPrincipal: 1480000,
    daysPastDue: 92,
    city: "Delhi NCR",
  },
  {
    id: "bor-004",
    vehicleId: "v-303",
    bankId: "bnk-sbi",
    name: "Ravi Mahato",
    phone: "+91 99342 87766",
    loanAccount: "SBI-FAR-2200771",
    outstandingPrincipal: 1090000,
    daysPastDue: 215,
    city: "Ranchi",
  },
];

const SEED_SETTLEMENTS: Settlement[] = [
  {
    id: "stl-001",
    borrowerId: "bor-002",
    proposedAmount: 580000,
    agreedAmount: 600000,
    dueDate: Date.parse("2026-05-10"),
    status: "agreed",
    createdAt: Date.parse("2026-04-12"),
    notes: "Wife co-signed; cash plus DD by 10 May.",
  },
  {
    id: "stl-002",
    borrowerId: "bor-003",
    proposedAmount: 1250000,
    agreedAmount: 1300000,
    status: "paid",
    paidAmount: 1300000,
    paidAt: Date.parse("2026-04-22"),
    createdAt: Date.parse("2026-04-05"),
  },
  {
    id: "stl-003",
    borrowerId: "bor-001",
    proposedAmount: 3200000,
    status: "defaulted",
    createdAt: Date.parse("2026-03-19"),
    notes: "No response after final notice. Initiated seizure.",
  },
];

const SEED_SEIZURES: Seizure[] = [
  {
    id: "siz-001",
    borrowerId: "bor-001",
    legalRef: "ARC/HDFC/LKO/2026/118",
    court: "DRT Lucknow",
    initiatedAt: Date.parse("2026-04-02"),
    custodyDate: Date.parse("2026-04-15"),
    status: "custody_taken",
    notes: "Vehicle now in HDFC-Lucknow yard, ready for valuation cycle.",
  },
];

// ─── Store ─────────────────────────────────────────────────────────

interface CollectionsStore {
  borrowers: Borrower[];
  settlements: Settlement[];
  seizures: Seizure[];

  addBorrower: (b: Omit<Borrower, "id">) => Borrower;
  proposeSettlement: (
    borrowerId: string,
    proposedAmount: number,
    notes?: string
  ) => Settlement;
  agreeSettlement: (settlementId: string, agreedAmount: number, dueDate: number) => void;
  paySettlement: (settlementId: string, paidAmount: number) => void;
  defaultSettlement: (settlementId: string) => Seizure | null;
  initiateSeizure: (
    borrowerId: string,
    legalRef: string,
    court: string,
    notes?: string
  ) => Seizure;
  setSeizureStatus: (seizureId: string, status: SeizureStatus, custodyDate?: number) => void;
}

export const useCollections = create<CollectionsStore>()(
  persist(
    (set, get) => ({
      borrowers: SEED_BORROWERS,
      settlements: SEED_SETTLEMENTS,
      seizures: SEED_SEIZURES,

      addBorrower: (b) => {
        const borrower: Borrower = {
          ...b,
          id: `bor-${Date.now().toString(36)}`,
        };
        set((s) => ({ borrowers: [borrower, ...s.borrowers] }));
        return borrower;
      },

      proposeSettlement: (borrowerId, proposedAmount, notes) => {
        const stl: Settlement = {
          id: `stl-${Date.now().toString(36)}`,
          borrowerId,
          proposedAmount,
          status: "proposed",
          notes,
          createdAt: Date.now(),
        };
        set((s) => ({ settlements: [stl, ...s.settlements] }));
        return stl;
      },

      agreeSettlement: (settlementId, agreedAmount, dueDate) =>
        set((s) => ({
          settlements: s.settlements.map((x) =>
            x.id === settlementId
              ? { ...x, agreedAmount, dueDate, status: "agreed" }
              : x
          ),
        })),

      paySettlement: (settlementId, paidAmount) =>
        set((s) => ({
          settlements: s.settlements.map((x) =>
            x.id === settlementId
              ? { ...x, paidAmount, paidAt: Date.now(), status: "paid" }
              : x
          ),
        })),

      defaultSettlement: (settlementId) => {
        const stl = get().settlements.find((x) => x.id === settlementId);
        if (!stl) return null;
        set((s) => ({
          settlements: s.settlements.map((x) =>
            x.id === settlementId ? { ...x, status: "defaulted" } : x
          ),
        }));
        // Auto-trigger seizure
        return get().initiateSeizure(
          stl.borrowerId,
          `AUTO/${Date.now().toString(36).toUpperCase()}`,
          "TBD",
          "Auto-initiated on settlement default."
        );
      },

      initiateSeizure: (borrowerId, legalRef, court, notes) => {
        const sz: Seizure = {
          id: `siz-${Date.now().toString(36)}`,
          borrowerId,
          legalRef,
          court,
          initiatedAt: Date.now(),
          status: "initiated",
          notes,
        };
        set((s) => ({ seizures: [sz, ...s.seizures] }));
        return sz;
      },

      setSeizureStatus: (seizureId, status, custodyDate) =>
        set((s) => ({
          seizures: s.seizures.map((x) =>
            x.id === seizureId
              ? { ...x, status, custodyDate: custodyDate ?? x.custodyDate }
              : x
          ),
        })),
    }),
    {
      name: "meridian-collections-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ─── Helpers ───────────────────────────────────────────────────────

export function borrowerForVehicle(
  vehicleId: string,
  borrowers: Borrower[]
): Borrower | undefined {
  return borrowers.find((b) => b.vehicleId === vehicleId);
}

export function activeSettlement(
  borrowerId: string,
  settlements: Settlement[]
): Settlement | undefined {
  return settlements
    .filter((s) => s.borrowerId === borrowerId)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

export function seizureFor(
  borrowerId: string,
  seizures: Seizure[]
): Seizure | undefined {
  return seizures.find((s) => s.borrowerId === borrowerId);
}
