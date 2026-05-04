"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type DocType =
  | "rc"
  | "insurance"
  | "puc"
  | "valuation_report"
  | "repair_invoice"
  | "agreement"
  | "kyc"
  | "other";

export const DOC_LABELS: Record<DocType, string> = {
  rc: "RC certificate",
  insurance: "Insurance",
  puc: "PUC",
  valuation_report: "Valuation report",
  repair_invoice: "Repair invoice",
  agreement: "Agreement / handover",
  kyc: "KYC",
  other: "Other",
};

export interface VehicleDoc {
  id: string;
  vehicleId: string;
  type: DocType;
  name: string;
  url: string; // mock URL or data:
  uploadedAt: number;
  uploadedBy?: string;
  notes?: string;
}

const SEED_DOCS: VehicleDoc[] = [
  {
    id: "doc-001",
    vehicleId: "v-013",
    type: "rc",
    name: "RC — UP32 BX 4789",
    url: "https://example.com/docs/v-013-rc.pdf",
    uploadedAt: Date.parse("2026-04-05"),
    uploadedBy: "lucknow@meridian.com",
  },
  {
    id: "doc-002",
    vehicleId: "v-013",
    type: "valuation_report",
    name: "Valuation report — VLN-001",
    url: "https://example.com/docs/v-013-valuation.pdf",
    uploadedAt: Date.parse("2026-04-08"),
    uploadedBy: "val-mehta",
  },
  {
    id: "doc-003",
    vehicleId: "v-204",
    type: "repair_invoice",
    name: "Lucknow Commercial Works — invoice",
    url: "https://example.com/docs/v-204-repair.pdf",
    uploadedAt: Date.parse("2026-04-21"),
    uploadedBy: "admin@meridian.com",
  },
  {
    id: "doc-004",
    vehicleId: "v-204",
    type: "valuation_report",
    name: "Valuation report — VLN-002",
    url: "https://example.com/docs/v-204-valuation.pdf",
    uploadedAt: Date.parse("2026-04-09"),
    uploadedBy: "val-mehta",
  },
  {
    id: "doc-005",
    vehicleId: "v-007",
    type: "agreement",
    name: "Mutual settlement agreement",
    url: "https://example.com/docs/v-007-settlement.pdf",
    uploadedAt: Date.parse("2026-04-22"),
    uploadedBy: "admin@meridian.com",
  },
];

interface DocsStore {
  docs: VehicleDoc[];
  addDoc: (d: Omit<VehicleDoc, "id" | "uploadedAt">) => VehicleDoc;
  removeDoc: (id: string) => void;
}

export const useDocuments = create<DocsStore>()(
  persist(
    (set) => ({
      docs: SEED_DOCS,
      addDoc: (d) => {
        const doc: VehicleDoc = {
          ...d,
          id: `doc-${Date.now().toString(36)}`,
          uploadedAt: Date.now(),
        };
        set((s) => ({ docs: [doc, ...s.docs] }));
        return doc;
      },
      removeDoc: (id) =>
        set((s) => ({ docs: s.docs.filter((x) => x.id !== id) })),
    }),
    {
      name: "meridian-docs-v1",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export function docsForVehicle(
  vehicleId: string,
  docs: VehicleDoc[]
): VehicleDoc[] {
  return docs
    .filter((d) => d.vehicleId === vehicleId)
    .sort((a, b) => b.uploadedAt - a.uploadedAt);
}
