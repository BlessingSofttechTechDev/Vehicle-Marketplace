// Pure helpers + types used by both the client store (lib/uploads.ts)
// and the server actions (lib/uploads-actions.ts). This file has no
// "use client" / "use server" directive so both sides can import it.

import type { VehicleCategory } from "./types";

// ─── Types ──────────────────────────────────────────────────────────

export interface UploadCompany {
  id: string;
  code: string;
  name: string;
  shortName: string;
  contactEmail?: string;
  isExisting: boolean;
  addedAt: number;
}

export type InspectionStatus = "pending" | "ongoing" | "done";

export type ConditionRating = "good" | "needs_work" | "bad";

export interface InspectionLog {
  inspectorName: string;
  inspectedAt: number;
  engineCondition: ConditionRating;
  bodyCondition: ConditionRating;
  tyresCondition: ConditionRating;
  electricalsCondition: ConditionRating;
  documents: { rc: boolean; insurance: boolean; puc: boolean };
  workNeeded: string;
  notes: string;
}

export interface AssetPricing {
  listPrice: number;
  floorPrice?: number;
  location: string;
}

export interface BankAsset {
  id: string;
  batchId: string;
  groupId: string;
  category: VehicleCategory;

  hpNumber: string;
  hpDate?: string;
  ownerName: string;
  asset: string;
  registrationNumber: string;
  engineNumber: string;
  chassisDate?: string;
  yearOfManufacture?: number;
  orc?: string;
  state?: string;
  zone?: string;
  repoDate?: string;
  segment: string;
  photoUrl?: string;
  correctlyPlaced: boolean;
  location: string;
  contactPerson?: string;

  inspectionStatus: InspectionStatus;
  inspectionLog?: InspectionLog;
  pricing?: AssetPricing;
  listed: boolean;
  listedVehicleId?: string;
}

export interface BatchGroup {
  id: string;
  batchId: string;
  category: VehicleCategory;
  count: number;
}

export interface UploadBatch {
  id: string;
  companyId: string;
  uploadedAt: number;
  fileName: string;
  totalCount: number;
  groups: BatchGroup[];
}

export interface ListedVehicle {
  id: string;
  assetId: string;
  category: VehicleCategory;
  brand: string;
  model: string;
  year?: number;
  price: number;
  location: string;
  registrationNumber: string;
  photoUrl?: string;
  listedAt: number;
}

export interface ParsedRow {
  [field: string]: string | number | boolean | undefined;
}

// ─── Categorization ──────────────────────────────────────────────────

export const CATEGORY_OPTIONS: { value: VehicleCategory; label: string }[] = [
  { value: "car", label: "Car" },
  { value: "bike", label: "Bike" },
  { value: "commercial", label: "Commercial" },
  { value: "construction", label: "Construction" },
  { value: "three-wheeler", label: "3-Wheeler" },
  { value: "farm", label: "Farm" },
];

export function inferCategory(segment: string, asset: string): VehicleCategory {
  const t = `${segment} ${asset}`.toLowerCase();
  if (/\b(bike|two[\s-]?wheeler|2w|motorcycle|scooter|moped)\b/.test(t)) return "bike";
  if (/\b(three[\s-]?wheeler|3w|auto[\s-]?rickshaw|rickshaw|tuktuk)\b/.test(t)) return "three-wheeler";
  if (/\b(tractor|harvester|farm|combine|thresher|agri)\b/.test(t)) return "farm";
  if (/\b(jcb|excavator|loader|backhoe|crane|dozer|construction|earth\s?mover)\b/.test(t)) return "construction";
  if (/\b(truck|lcv|hcv|mcv|tipper|trailer|tempo|pickup|commercial|bus)\b/.test(t)) return "commercial";
  return "car";
}

// ─── ID helpers ──────────────────────────────────────────────────────

const pad = (n: number, w = 3) => n.toString().padStart(w, "0");

export function newBatchId(companyShortName: string, batchSeq: number): string {
  const sn = companyShortName.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
  return `BTH-${sn}-${pad(batchSeq)}`;
}

export function newGroupId(batchId: string, category: VehicleCategory): string {
  return `${batchId}-${category.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
}

export function newAssetId(groupId: string, seq: number): string {
  return `${groupId}-${pad(seq)}`;
}

// ─── Excel column mapping ────────────────────────────────────────────

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const FIELD_ALIASES: Record<string, string[]> = {
  hpNumber: ["hpnumber", "hpno", "hypothecationno", "hypothecationnumber"],
  hpDate: ["hpdate", "hypothecationdate"],
  ownerName: ["nameofowner", "ownername", "owner", "borrower", "borrowername"],
  asset: ["asset", "assetdescription", "assetdetails", "vehicle", "vehicledescription", "make", "makemodel"],
  registrationNumber: ["registrationnumber", "regnno", "regno", "registrationno", "vehicleregistrationnumber"],
  engineNumber: ["enginenumber", "engineno", "engno"],
  chassisDate: ["chassisdate", "chassisno", "chassisnumber"],
  yearOfManufacture: ["yearofmanufacturing", "yearofmanufacture", "manufactureyear", "yom", "year"],
  orc: ["orc"],
  state: ["state"],
  zone: ["zone", "region"],
  repoDate: ["repodate", "repossessiondate", "dateofrepossession"],
  segment: ["segment", "vehicletype", "category", "vehiclecategory"],
  photoUrl: ["photolink", "photourl", "vehiclephotograph", "vehiclephoto", "photographlink", "photo"],
  correctlyPlaced: ["correctlyplaced", "vehiclecorrectlyplaced", "placedcorrectly", "iscorrectlyplaced"],
  location: ["location", "yardlocation", "currentlocation"],
  contactPerson: ["contactperson", "contact", "contactname"],
  inspectionDone: ["inspectiondone", "inspected", "inspection"],
};

function mapHeader(header: string): string | null {
  const n = norm(header);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((a) => a === n)) return field;
  }
  return null;
}

export function normalizeSheet(rows: any[][]): ParsedRow[] {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => (h == null ? "" : String(h)));
  const fieldKeys = headers.map(mapHeader);
  const out: ParsedRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => c == null || c === "")) continue;
    const o: ParsedRow = {};
    for (let c = 0; c < headers.length; c++) {
      const key = fieldKeys[c];
      if (!key) continue;
      const v = row[c];
      if (v == null || v === "") continue;
      o[key] = typeof v === "string" ? v.trim() : v;
    }
    out.push(o);
  }
  return out;
}

const truthy = (v: unknown): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v ?? "").trim().toLowerCase();
  return ["yes", "y", "true", "1", "done", "ok"].includes(s);
};

export function rowToAsset(
  row: ParsedRow,
  batchId: string,
  seq: number,
  groupCounter: Record<string, number>
): BankAsset {
  const segment = String(row.segment ?? "").trim();
  const asset = String(row.asset ?? "").trim();
  const category = inferCategory(segment, asset);
  const groupId = newGroupId(batchId, category);
  groupCounter[groupId] = (groupCounter[groupId] ?? 0) + 1;
  const id = newAssetId(groupId, groupCounter[groupId]);
  const inspectionDone = truthy(row.inspectionDone);

  return {
    id,
    batchId,
    groupId,
    category,
    hpNumber: String(row.hpNumber ?? "").trim(),
    hpDate: row.hpDate ? String(row.hpDate) : undefined,
    ownerName: String(row.ownerName ?? "").trim(),
    asset,
    registrationNumber: String(row.registrationNumber ?? "").trim(),
    engineNumber: String(row.engineNumber ?? "").trim(),
    chassisDate: row.chassisDate ? String(row.chassisDate) : undefined,
    yearOfManufacture: row.yearOfManufacture
      ? Number(String(row.yearOfManufacture).match(/\d{4}/)?.[0] ?? row.yearOfManufacture)
      : undefined,
    orc: row.orc ? String(row.orc) : undefined,
    state: row.state ? String(row.state) : undefined,
    zone: row.zone ? String(row.zone) : undefined,
    repoDate: row.repoDate ? String(row.repoDate) : undefined,
    segment: segment || asset,
    photoUrl: row.photoUrl ? String(row.photoUrl) : undefined,
    correctlyPlaced: truthy(row.correctlyPlaced),
    location: String(row.location ?? "").trim(),
    contactPerson: row.contactPerson ? String(row.contactPerson) : undefined,
    inspectionStatus: inspectionDone ? "done" : "pending",
    listed: false,
  };
}
