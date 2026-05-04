"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Types ───────────────────────────────────────────────────────────

export type AgentStatus = "pending_kyc" | "active" | "suspended";

export interface AgentDocs {
  pan: boolean;
  aadhaar: boolean;
  bankAccount: boolean;
  agreementSigned: boolean;
}

export interface Agent {
  id: string;
  code: string; // human-readable (AGT-001)
  name: string;
  email: string;
  phone: string;
  city: string; // primary yard city
  region: string;
  commissionPct: number; // e.g., 5 = 5%
  status: AgentStatus;
  onboardedAt: string; // ISO
  docs: AgentDocs;
}

export type AllotmentLineStatus =
  | "allotted" // assigned, not yet picked from yard
  | "in_field" // picked up, agent has it
  | "sold"
  | "returned";

export interface AllotmentLine {
  vehicleId: string;
  status: AllotmentLineStatus;
  pickedUpAt?: number;
  // sale capture
  soldPrice?: number;
  buyerName?: string;
  buyerPhone?: string;
  soldAt?: number;
  // commission
  commissionAmount?: number;
  commissionPaid?: boolean;
  commissionPaidAt?: number;
  // return
  returnedAt?: number;
  returnReason?: string;
}

export interface Allotment {
  id: string;
  agentId: string;
  yardCity: string;
  createdAt: number;
  notes?: string;
  lines: AllotmentLine[];
}

// ─── Sample agents (seed) ────────────────────────────────────────────

const SEED_AGENTS: Agent[] = [
  {
    id: "agt-001",
    code: "AGT-001",
    name: "Rohit Sharma",
    email: "rohit@meridian.com",
    phone: "+91 98100 11122",
    city: "Lucknow",
    region: "North",
    commissionPct: 5,
    status: "active",
    onboardedAt: "2026-02-10",
    docs: { pan: true, aadhaar: true, bankAccount: true, agreementSigned: true },
  },
  {
    id: "agt-002",
    code: "AGT-002",
    name: "Priya Verma",
    email: "priya@meridian.com",
    phone: "+91 98201 33344",
    city: "Delhi NCR",
    region: "North",
    commissionPct: 6,
    status: "active",
    onboardedAt: "2026-03-04",
    docs: { pan: true, aadhaar: true, bankAccount: true, agreementSigned: true },
  },
  {
    id: "agt-003",
    code: "AGT-003",
    name: "Anil Kumar",
    email: "anil@meridian.com",
    phone: "+91 98300 55566",
    city: "Ranchi",
    region: "East",
    commissionPct: 4.5,
    status: "pending_kyc",
    onboardedAt: "2026-04-18",
    docs: { pan: true, aadhaar: true, bankAccount: false, agreementSigned: false },
  },
];

// Login credentials (kept here so auth.ts can include them in its allowlist).
export interface AgentCredential {
  email: string;
  password: string;
  name: string;
}

export const AGENT_CREDENTIALS: AgentCredential[] = SEED_AGENTS.map((a) => ({
  email: a.email,
  password: "agent123",
  name: a.name,
}));

// ─── Store ───────────────────────────────────────────────────────────

interface AgentsStore {
  agents: Agent[];
  allotments: Allotment[];

  // agent CRUD
  addAgent: (a: Omit<Agent, "id" | "code" | "onboardedAt">) => Agent;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  setAgentStatus: (id: string, status: AgentStatus) => void;

  // allotment lifecycle
  createAllotment: (
    agentId: string,
    yardCity: string,
    vehicleIds: string[],
    notes?: string
  ) => Allotment;
  markPickedUp: (allotmentId: string, vehicleId: string) => void;
  markSold: (
    allotmentId: string,
    vehicleId: string,
    soldPrice: number,
    buyerName: string,
    buyerPhone: string
  ) => void;
  markReturned: (
    allotmentId: string,
    vehicleId: string,
    reason: string
  ) => void;
  payCommission: (allotmentId: string, vehicleId: string) => void;
}

const nextAgentCode = (agents: Agent[]) => {
  const max = agents.reduce((m, a) => {
    const n = parseInt(a.code.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `AGT-${String(max + 1).padStart(3, "0")}`;
};

export const useAgents = create<AgentsStore>()(
  persist(
    (set, get) => ({
      agents: SEED_AGENTS,
      allotments: [],

      addAgent: (input) => {
        const code = nextAgentCode(get().agents);
        const agent: Agent = {
          ...input,
          id: `agt-${Date.now().toString(36)}`,
          code,
          onboardedAt: new Date().toISOString().slice(0, 10),
        };
        set((s) => ({ agents: [agent, ...s.agents] }));
        return agent;
      },

      updateAgent: (id, patch) =>
        set((s) => ({
          agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      setAgentStatus: (id, status) =>
        set((s) => ({
          agents: s.agents.map((a) => (a.id === id ? { ...a, status } : a)),
        })),

      createAllotment: (agentId, yardCity, vehicleIds, notes) => {
        const allotment: Allotment = {
          id: `alt-${Date.now().toString(36)}`,
          agentId,
          yardCity,
          createdAt: Date.now(),
          notes,
          lines: vehicleIds.map((vehicleId) => ({
            vehicleId,
            status: "allotted",
          })),
        };
        set((s) => ({ allotments: [allotment, ...s.allotments] }));
        return allotment;
      },

      markPickedUp: (allotmentId, vehicleId) =>
        set((s) => ({
          allotments: s.allotments.map((al) =>
            al.id !== allotmentId
              ? al
              : {
                  ...al,
                  lines: al.lines.map((ln) =>
                    ln.vehicleId === vehicleId
                      ? { ...ln, status: "in_field", pickedUpAt: Date.now() }
                      : ln
                  ),
                }
          ),
        })),

      markSold: (allotmentId, vehicleId, soldPrice, buyerName, buyerPhone) => {
        const { agents, allotments } = get();
        const al = allotments.find((x) => x.id === allotmentId);
        if (!al) return;
        const agent = agents.find((a) => a.id === al.agentId);
        const pct = agent?.commissionPct ?? 0;
        const commissionAmount = Math.round((soldPrice * pct) / 100);
        set({
          allotments: allotments.map((a) =>
            a.id !== allotmentId
              ? a
              : {
                  ...a,
                  lines: a.lines.map((ln) =>
                    ln.vehicleId === vehicleId
                      ? {
                          ...ln,
                          status: "sold",
                          soldPrice,
                          buyerName,
                          buyerPhone,
                          soldAt: Date.now(),
                          commissionAmount,
                          commissionPaid: false,
                        }
                      : ln
                  ),
                }
          ),
        });
      },

      markReturned: (allotmentId, vehicleId, reason) =>
        set((s) => ({
          allotments: s.allotments.map((al) =>
            al.id !== allotmentId
              ? al
              : {
                  ...al,
                  lines: al.lines.map((ln) =>
                    ln.vehicleId === vehicleId
                      ? {
                          ...ln,
                          status: "returned",
                          returnedAt: Date.now(),
                          returnReason: reason,
                        }
                      : ln
                  ),
                }
          ),
        })),

      payCommission: (allotmentId, vehicleId) =>
        set((s) => ({
          allotments: s.allotments.map((al) =>
            al.id !== allotmentId
              ? al
              : {
                  ...al,
                  lines: al.lines.map((ln) =>
                    ln.vehicleId === vehicleId
                      ? {
                          ...ln,
                          commissionPaid: true,
                          commissionPaidAt: Date.now(),
                        }
                      : ln
                  ),
                }
          ),
        })),
    }),
    {
      name: "meridian-agents-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ─── Helpers ─────────────────────────────────────────────────────────

export function getAgent(id: string, agents: Agent[]): Agent | undefined {
  return agents.find((a) => a.id === id);
}

export function getAgentForEmail(
  email: string | undefined | null,
  agents: Agent[]
): Agent | undefined {
  if (!email) return undefined;
  const e = email.trim().toLowerCase();
  return agents.find((a) => a.email.toLowerCase() === e);
}

// Static role check (uses the seeded credential list — covers the demo logins).
export function isAgentEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return AGENT_CREDENTIALS.some((c) => c.email === e);
}

export interface AgentRevenue {
  inField: number; // count: allotted + in_field
  sold: number; // count
  returned: number; // count
  grossSales: number; // sum of soldPrice
  commissionEarned: number;
  commissionReceived: number;
  commissionPending: number;
}

export function agentRevenue(
  agentId: string,
  allotments: Allotment[]
): AgentRevenue {
  const lines = allotments
    .filter((al) => al.agentId === agentId)
    .flatMap((al) => al.lines);

  const inField = lines.filter(
    (ln) => ln.status === "allotted" || ln.status === "in_field"
  ).length;
  const sold = lines.filter((ln) => ln.status === "sold").length;
  const returned = lines.filter((ln) => ln.status === "returned").length;
  const grossSales = lines.reduce((s, ln) => s + (ln.soldPrice ?? 0), 0);
  const commissionEarned = lines.reduce(
    (s, ln) => s + (ln.commissionAmount ?? 0),
    0
  );
  const commissionReceived = lines.reduce(
    (s, ln) => (ln.commissionPaid ? s + (ln.commissionAmount ?? 0) : s),
    0
  );
  return {
    inField,
    sold,
    returned,
    grossSales,
    commissionEarned,
    commissionReceived,
    commissionPending: commissionEarned - commissionReceived,
  };
}

// Vehicles currently held by ANY agent (allotted or in_field) — useful for
// hiding from the public marketplace later.
export function allottedVehicleIds(allotments: Allotment[]): Set<string> {
  const out = new Set<string>();
  for (const al of allotments) {
    for (const ln of al.lines) {
      if (ln.status === "allotted" || ln.status === "in_field") {
        out.add(ln.vehicleId);
      }
    }
  }
  return out;
}
