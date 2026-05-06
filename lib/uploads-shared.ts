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
  gstin?: string;
  address?: string;
  isExisting: boolean;
  addedAt: number;
}

export type InspectionStatus = "pending" | "ongoing" | "done";

export type AssetStatus =
  | "uploaded"
  | "inspecting"
  | "inspected"
  | "valuated"
  | "listed"
  | "reserved"
  | "sold"
  | "rejected";

export const ASSET_STATUS_ORDER: AssetStatus[] = [
  "uploaded",
  "inspecting",
  "inspected",
  "valuated",
  "listed",
  "reserved",
  "sold",
];

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

  status: AssetStatus;
  rejectedReason?: string;
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

export type RowSeverity = "ok" | "warn" | "error";

export interface RowIssue {
  field?: string;
  code:
    | "missing_required"
    | "duplicate_in_file"
    | "duplicate_in_db";
  message: string;
}

export interface RowValidation {
  index: number;
  severity: RowSeverity;
  issues: RowIssue[];
}

export const REQUIRED_FIELDS: { key: keyof ParsedRow; label: string }[] = [
  { key: "registrationNumber", label: "Registration #" },
  { key: "ownerName", label: "Owner name" },
  { key: "asset", label: "Asset" },
];

const cleanKey = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

export function validateRows(
  rows: ParsedRow[],
  existing: { registrationNumbers: Set<string>; engineNumbers: Set<string> }
): RowValidation[] {
  const regSeen = new Map<string, number[]>();
  const engSeen = new Map<string, number[]>();
  rows.forEach((r, i) => {
    const reg = cleanKey(r.registrationNumber);
    const eng = cleanKey(r.engineNumber);
    if (reg) (regSeen.get(reg) ?? regSeen.set(reg, []).get(reg)!).push(i);
    if (eng) (engSeen.get(eng) ?? engSeen.set(eng, []).get(eng)!).push(i);
  });

  return rows.map((r, i) => {
    const issues: RowIssue[] = [];

    for (const f of REQUIRED_FIELDS) {
      if (!String(r[f.key] ?? "").trim()) {
        issues.push({
          field: String(f.key),
          code: "missing_required",
          message: `${f.label} is required`,
        });
      }
    }

    const reg = cleanKey(r.registrationNumber);
    if (reg && (regSeen.get(reg)?.length ?? 0) > 1) {
      issues.push({
        field: "registrationNumber",
        code: "duplicate_in_file",
        message: `Reg# ${reg} appears multiple times in this file`,
      });
    }
    const eng = cleanKey(r.engineNumber);
    if (eng && (engSeen.get(eng)?.length ?? 0) > 1) {
      issues.push({
        field: "engineNumber",
        code: "duplicate_in_file",
        message: `Engine# ${eng} appears multiple times in this file`,
      });
    }
    if (reg && existing.registrationNumbers.has(reg)) {
      issues.push({
        field: "registrationNumber",
        code: "duplicate_in_db",
        message: `Reg# ${reg} already exists in another batch`,
      });
    }
    if (eng && existing.engineNumbers.has(eng)) {
      issues.push({
        field: "engineNumber",
        code: "duplicate_in_db",
        message: `Engine# ${eng} already exists in another batch`,
      });
    }

    const severity: RowSeverity = issues.some(
      (x) => x.code === "missing_required" || x.code === "duplicate_in_file"
    )
      ? "error"
      : issues.length
      ? "warn"
      : "ok";
    return { index: i, severity, issues };
  });
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

export function normalizeSheet(rows: unknown[][]): ParsedRow[] {
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
      if (typeof v === "string") o[key] = v.trim();
      else if (typeof v === "number" || typeof v === "boolean") o[key] = v;
      else o[key] = String(v);
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
    status: inspectionDone ? "inspected" : "uploaded",
  };
}

export function deriveAssetStatus(a: Pick<BankAsset, "listed" | "pricing" | "inspectionStatus" | "status">): AssetStatus {
  if (a.status === "rejected" || a.status === "reserved" || a.status === "sold") return a.status;
  if (a.listed) return "listed";
  if (a.pricing && a.inspectionStatus === "done") return "valuated";
  if (a.inspectionStatus === "done") return "inspected";
  if (a.inspectionStatus === "ongoing") return "inspecting";
  return "uploaded";
}
