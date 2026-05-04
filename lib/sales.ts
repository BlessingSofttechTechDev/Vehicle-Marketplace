"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Sales reps (direct sales team) ─────────────────────────────────

export interface SalesRep {
  id: string;
  code: string; // SR-001
  name: string;
  email: string;
  phone: string;
  region: string;
}

export const SALES_REPS: SalesRep[] = [
  {
    id: "sr-001",
    code: "SR-001",
    name: "Vikram Saluja",
    email: "vikram@meridian.com",
    phone: "+91 99100 12121",
    region: "North",
  },
  {
    id: "sr-002",
    code: "SR-002",
    name: "Meera Pillai",
    email: "meera@meridian.com",
    phone: "+91 99830 33344",
    region: "West",
  },
];

export interface SalesRepCredential {
  email: string;
  password: string;
  name: string;
}

export const SALES_REP_CREDENTIALS: SalesRepCredential[] = SALES_REPS.map(
  (r) => ({ email: r.email, password: "sales123", name: r.name })
);

export function getSalesRep(id: string): SalesRep | undefined {
  return SALES_REPS.find((r) => r.id === id);
}

export function getSalesRepForEmail(
  email: string | undefined | null
): SalesRep | undefined {
  if (!email) return undefined;
  const e = email.trim().toLowerCase();
  return SALES_REPS.find((r) => r.email.toLowerCase() === e);
}

export function isSalesRepEmail(email: string | undefined | null): boolean {
  return !!getSalesRepForEmail(email);
}

// ─── Leads (LMS pipeline) ───────────────────────────────────────────

export type LeadStatus =
  | "new"
  | "contacted"
  | "test_drive"
  | "negotiation"
  | "won"
  | "lost";

export interface LeadActivity {
  at: number;
  text: string;
}

export interface Lead {
  id: string;
  vehicleId: string;
  customerName: string;
  customerPhone: string;
  source: "web" | "agent" | "walk_in" | "referral";
  status: LeadStatus;
  repId?: string;
  finalPrice?: number; // when won
  lostReason?: string; // when lost
  createdAt: number;
  updatedAt: number;
  activities: LeadActivity[];
}

const SEED_LEADS: Lead[] = [
  {
    id: "ld-001",
    vehicleId: "v-002",
    customerName: "Aryan Khurana",
    customerPhone: "+91 98991 11221",
    source: "web",
    status: "negotiation",
    repId: "sr-001",
    createdAt: Date.parse("2026-04-22"),
    updatedAt: Date.parse("2026-04-26"),
    activities: [
      { at: Date.parse("2026-04-22"), text: "Lead created from /vehicle page" },
      { at: Date.parse("2026-04-24"), text: "Test drive completed at Delhi yard" },
      { at: Date.parse("2026-04-26"), text: "Negotiating ₹1.18 Cr (list ₹1.22 Cr)" },
    ],
  },
  {
    id: "ld-002",
    vehicleId: "v-014",
    customerName: "Pooja Banerjee",
    customerPhone: "+91 98301 22455",
    source: "web",
    status: "test_drive",
    repId: "sr-002",
    createdAt: Date.parse("2026-04-25"),
    updatedAt: Date.parse("2026-04-27"),
    activities: [
      { at: Date.parse("2026-04-25"), text: "Inbound web inquiry" },
      { at: Date.parse("2026-04-27"), text: "Test drive scheduled 30-Apr 11:00" },
    ],
  },
  {
    id: "ld-003",
    vehicleId: "v-009",
    customerName: "Rohan Mehta",
    customerPhone: "+91 99020 88001",
    source: "referral",
    status: "won",
    repId: "sr-002",
    finalPrice: 2850000,
    createdAt: Date.parse("2026-04-10"),
    updatedAt: Date.parse("2026-04-19"),
    activities: [
      { at: Date.parse("2026-04-10"), text: "Referred by existing customer" },
      { at: Date.parse("2026-04-19"), text: "Closed at ₹28.5L" },
    ],
  },
  {
    id: "ld-004",
    vehicleId: "v-201",
    customerName: "Deepak Singh",
    customerPhone: "+91 98115 66773",
    source: "walk_in",
    status: "contacted",
    repId: "sr-001",
    createdAt: Date.parse("2026-04-26"),
    updatedAt: Date.parse("2026-04-28"),
    activities: [
      { at: Date.parse("2026-04-26"), text: "Walked into Delhi NCR yard" },
      { at: Date.parse("2026-04-28"), text: "Awaiting fleet decision from his employer" },
    ],
  },
  {
    id: "ld-005",
    vehicleId: "v-403",
    customerName: "Anita Naidu",
    customerPhone: "+91 99008 12348",
    source: "web",
    status: "new",
    createdAt: Date.parse("2026-04-28"),
    updatedAt: Date.parse("2026-04-28"),
    activities: [{ at: Date.parse("2026-04-28"), text: "Inbound web inquiry" }],
  },
  {
    id: "ld-006",
    vehicleId: "v-008",
    customerName: "Suresh Pillai",
    customerPhone: "+91 98404 99201",
    source: "web",
    status: "lost",
    repId: "sr-002",
    lostReason: "Bought competitor",
    createdAt: Date.parse("2026-04-05"),
    updatedAt: Date.parse("2026-04-15"),
    activities: [
      { at: Date.parse("2026-04-05"), text: "Inbound web inquiry" },
      { at: Date.parse("2026-04-15"), text: "Lost — went with Mahindra" },
    ],
  },
];

// ─── Store ──────────────────────────────────────────────────────────

interface SalesStore {
  leads: Lead[];

  addLead: (
    vehicleId: string,
    customerName: string,
    customerPhone: string,
    source: Lead["source"]
  ) => Lead;

  setStatus: (leadId: string, status: LeadStatus, extra?: { finalPrice?: number; lostReason?: string }) => void;
  assignRep: (leadId: string, repId: string) => void;
  logActivity: (leadId: string, text: string) => void;
}

export const useSales = create<SalesStore>()(
  persist(
    (set) => ({
      leads: SEED_LEADS,

      addLead: (vehicleId, customerName, customerPhone, source) => {
        const lead: Lead = {
          id: `ld-${Date.now().toString(36)}`,
          vehicleId,
          customerName,
          customerPhone,
          source,
          status: "new",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          activities: [{ at: Date.now(), text: `Lead created from ${source}` }],
        };
        set((s) => ({ leads: [lead, ...s.leads] }));
        return lead;
      },

      setStatus: (leadId, status, extra) =>
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id !== leadId
              ? l
              : {
                  ...l,
                  status,
                  finalPrice: extra?.finalPrice ?? l.finalPrice,
                  lostReason: extra?.lostReason ?? l.lostReason,
                  updatedAt: Date.now(),
                  activities: [
                    ...l.activities,
                    {
                      at: Date.now(),
                      text:
                        status === "won"
                          ? `Won at ₹${(extra?.finalPrice ?? 0).toLocaleString("en-IN")}`
                          : status === "lost"
                          ? `Lost: ${extra?.lostReason ?? "—"}`
                          : `Status → ${status}`,
                    },
                  ],
                }
          ),
        })),

      assignRep: (leadId, repId) =>
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id !== leadId
              ? l
              : {
                  ...l,
                  repId,
                  updatedAt: Date.now(),
                  activities: [
                    ...l.activities,
                    { at: Date.now(), text: `Assigned to ${repId}` },
                  ],
                }
          ),
        })),

      logActivity: (leadId, text) =>
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id !== leadId
              ? l
              : {
                  ...l,
                  updatedAt: Date.now(),
                  activities: [...l.activities, { at: Date.now(), text }],
                }
          ),
        })),
    }),
    {
      name: "meridian-sales-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "test_drive",
  "negotiation",
  "won",
  "lost",
];
