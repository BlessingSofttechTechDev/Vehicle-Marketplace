"use server";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import {
  newBatchId,
  rowToAsset,
  deriveAssetStatus,
  type ParsedRow,
  type BankAsset,
  type UploadBatch,
  type UploadCompany,
  type InspectionStatus,
  type InspectionLog,
  type AssetPricing,
  type AssetStatus,
  type ListedVehicle,
  type BatchGroup,
} from "./uploads-shared";

// ─── Reads ───────────────────────────────────────────────────────────

export async function getExistingAssetKeys(): Promise<{
  registrationNumbers: string[];
  engineNumbers: string[];
}> {
  const rows = await db
    .select({
      reg: schema.bankAssets.registrationNumber,
      eng: schema.bankAssets.engineNumber,
    })
    .from(schema.bankAssets);
  const reg = new Set<string>();
  const eng = new Set<string>();
  for (const r of rows) {
    if (r.reg) reg.add(r.reg.trim().toUpperCase().replace(/\s+/g, ""));
    if (r.eng) eng.add(r.eng.trim().toUpperCase().replace(/\s+/g, ""));
  }
  return { registrationNumbers: Array.from(reg), engineNumbers: Array.from(eng) };
}


export async function getAllUploadData(): Promise<{
  companies: UploadCompany[];
  batches: UploadBatch[];
  assets: BankAsset[];
  listed: ListedVehicle[];
}> {
  const [cRows, bRows, aRows, lRows] = await Promise.all([
    db.select().from(schema.companies),
    db.select().from(schema.uploadBatches),
    db.select().from(schema.bankAssets),
    db.select().from(schema.listings),
  ]);
  return {
    companies: cRows.map(rowToCompany),
    batches: bRows.map(rowToBatch),
    assets: aRows.map(rowToBankAsset),
    listed: lRows.map(rowToListed),
  };
}

// ─── Writes ──────────────────────────────────────────────────────────

export async function addCompanyAction(input: {
  code: string;
  name: string;
  shortName: string;
  contactEmail?: string;
  gstin?: string;
  address?: string;
  isExisting?: boolean;
}): Promise<UploadCompany> {
  const company: UploadCompany = {
    id: `co-${Date.now().toString(36)}`,
    code: input.code,
    name: input.name,
    shortName: input.shortName,
    contactEmail: input.contactEmail,
    gstin: input.gstin,
    address: input.address,
    isExisting: input.isExisting ?? false,
    addedAt: Date.now(),
  };
  await db.insert(schema.companies).values({
    id: company.id,
    code: company.code,
    name: company.name,
    shortName: company.shortName,
    contactEmail: company.contactEmail ?? null,
    gstin: company.gstin ?? null,
    address: company.address ?? null,
    isExisting: company.isExisting,
    addedAt: company.addedAt,
  });
  return company;
}

export async function ingestBatchAction(
  companyId: string,
  fileName: string,
  rows: ParsedRow[],
  skipIndexes: number[] = []
): Promise<{ batch: UploadBatch; assets: BankAsset[]; skippedCount: number }> {
  const co = (await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, companyId))
    .limit(1))[0];
  if (!co) throw new Error("Company not found");

  const existingForCo = await db
    .select()
    .from(schema.uploadBatches)
    .where(eq(schema.uploadBatches.companyId, companyId));
  const seq = existingForCo.length + 1;
  const batchId = newBatchId(co.shortName, seq);

  const skipSet = new Set(skipIndexes);
  const acceptedRows = rows.filter((_, i) => !skipSet.has(i));
  const skippedCount = rows.length - acceptedRows.length;
  if (acceptedRows.length === 0) {
    throw new Error("No rows to ingest after skipping flagged rows");
  }

  const groupCounter: Record<string, number> = {};
  const assets: BankAsset[] = acceptedRows.map((r, i) => rowToAsset(r, batchId, i + 1, groupCounter));

  const groupMap: Record<string, BatchGroup> = {};
  for (const a of assets) {
    if (!groupMap[a.groupId]) {
      groupMap[a.groupId] = { id: a.groupId, batchId, category: a.category, count: 0 };
    }
    groupMap[a.groupId].count += 1;
  }
  const batch: UploadBatch = {
    id: batchId,
    companyId,
    uploadedAt: Date.now(),
    fileName,
    totalCount: assets.length,
    groups: Object.values(groupMap),
  };

  await db.insert(schema.uploadBatches).values({
    id: batch.id,
    companyId: batch.companyId,
    uploadedAt: batch.uploadedAt,
    fileName: batch.fileName,
    totalCount: batch.totalCount,
    groups: batch.groups,
  });

  if (assets.length) {
    await db.insert(schema.bankAssets).values(assets.map(assetToRow));
  }

  return { batch, assets, skippedCount };
}

export async function setInspectionStatusAction(
  assetId: string,
  status: InspectionStatus
): Promise<void> {
  const lifecycle: AssetStatus =
    status === "ongoing" ? "inspecting" : status === "done" ? "inspected" : "uploaded";
  await db
    .update(schema.bankAssets)
    .set({ inspectionStatus: status, status: lifecycle })
    .where(eq(schema.bankAssets.id, assetId));
}

export async function saveInspectionLogAction(
  assetId: string,
  log: InspectionLog
): Promise<void> {
  await db
    .update(schema.bankAssets)
    .set({ inspectionLog: log, inspectionStatus: "done", status: "inspected" })
    .where(eq(schema.bankAssets.id, assetId));
}

export async function savePricingAction(
  assetId: string,
  pricing: AssetPricing
): Promise<void> {
  await db
    .update(schema.bankAssets)
    .set({ pricing, status: "valuated" })
    .where(eq(schema.bankAssets.id, assetId));
}

export async function listToMarketplaceAction(assetId: string): Promise<ListedVehicle | null> {
  const a = (
    await db
      .select()
      .from(schema.bankAssets)
      .where(eq(schema.bankAssets.id, assetId))
      .limit(1)
  )[0];
  if (!a) return null;
  const pricing = a.pricing as AssetPricing | null;
  if (!pricing || a.inspectionStatus !== "done") return null;

  const parts = (a.asset ?? "").split(/\s+/).filter(Boolean);
  const brand = parts[0] ?? "Unknown";
  const model = parts.slice(1).join(" ") || a.segment || "—";
  const listedId = `lst-${Date.now().toString(36)}`;
  const listed: ListedVehicle = {
    id: listedId,
    assetId: a.id,
    category: a.category as ListedVehicle["category"],
    brand,
    model,
    year: a.yearOfManufacture ?? undefined,
    price: pricing.listPrice,
    location: pricing.location,
    registrationNumber: a.registrationNumber ?? "",
    photoUrl: a.photoUrl ?? undefined,
    listedAt: Date.now(),
  };

  await db.insert(schema.listings).values({
    id: listed.id,
    assetId: listed.assetId,
    category: listed.category,
    brand: listed.brand,
    model: listed.model,
    year: listed.year ?? null,
    price: listed.price,
    location: listed.location,
    registrationNumber: listed.registrationNumber || null,
    photoUrl: listed.photoUrl ?? null,
    listedAt: listed.listedAt,
  });
  await db
    .update(schema.bankAssets)
    .set({ listed: true, listedVehicleId: listedId, status: "listed" })
    .where(eq(schema.bankAssets.id, assetId));
  return listed;
}

export async function removeBatchAction(batchId: string): Promise<void> {
  await db.delete(schema.uploadBatches).where(eq(schema.uploadBatches.id, batchId));
}

export type AssetEditablePatch = Partial<
  Pick<
    BankAsset,
    | "ownerName"
    | "asset"
    | "registrationNumber"
    | "engineNumber"
    | "hpNumber"
    | "hpDate"
    | "yearOfManufacture"
    | "location"
    | "state"
    | "zone"
    | "segment"
    | "contactPerson"
    | "photoUrl"
    | "correctlyPlaced"
  >
>;

export async function updateAssetAction(
  assetId: string,
  patch: AssetEditablePatch
): Promise<BankAsset | null> {
  const update: Partial<typeof schema.bankAssets.$inferInsert> = {};
  if (patch.ownerName !== undefined) update.ownerName = patch.ownerName || null;
  if (patch.asset !== undefined) update.asset = patch.asset || null;
  if (patch.registrationNumber !== undefined) update.registrationNumber = patch.registrationNumber || null;
  if (patch.engineNumber !== undefined) update.engineNumber = patch.engineNumber || null;
  if (patch.hpNumber !== undefined) update.hpNumber = patch.hpNumber || null;
  if (patch.hpDate !== undefined) update.hpDate = patch.hpDate || null;
  if (patch.yearOfManufacture !== undefined) update.yearOfManufacture = patch.yearOfManufacture ?? null;
  if (patch.location !== undefined) update.location = patch.location || null;
  if (patch.state !== undefined) update.state = patch.state || null;
  if (patch.zone !== undefined) update.zone = patch.zone || null;
  if (patch.segment !== undefined) update.segment = patch.segment || null;
  if (patch.contactPerson !== undefined) update.contactPerson = patch.contactPerson || null;
  if (patch.photoUrl !== undefined) update.photoUrl = patch.photoUrl || null;
  if (patch.correctlyPlaced !== undefined) update.correctlyPlaced = patch.correctlyPlaced;

  if (Object.keys(update).length === 0) return null;

  await db
    .update(schema.bankAssets)
    .set(update)
    .where(eq(schema.bankAssets.id, assetId));

  const r = (
    await db.select().from(schema.bankAssets).where(eq(schema.bankAssets.id, assetId)).limit(1)
  )[0];
  return r ? rowToBankAsset(r) : null;
}

export async function softDeleteAssetAction(
  assetId: string,
  reason: string
): Promise<void> {
  await db
    .update(schema.bankAssets)
    .set({ status: "rejected", rejectedReason: reason || "Rejected" })
    .where(eq(schema.bankAssets.id, assetId));
}

export async function undoSoftDeleteAction(assetId: string): Promise<AssetStatus> {
  const r = (
    await db.select().from(schema.bankAssets).where(eq(schema.bankAssets.id, assetId)).limit(1)
  )[0];
  if (!r) throw new Error("Asset not found");
  const next = deriveAssetStatus({
    listed: r.listed,
    pricing: (r.pricing as AssetPricing | null) ?? undefined,
    inspectionStatus: r.inspectionStatus as InspectionStatus,
    status: "uploaded",
  });
  await db
    .update(schema.bankAssets)
    .set({ status: next, rejectedReason: null })
    .where(eq(schema.bankAssets.id, assetId));
  return next;
}

// ─── Row mappers ─────────────────────────────────────────────────────

function rowToCompany(r: typeof schema.companies.$inferSelect): UploadCompany {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    shortName: r.shortName,
    contactEmail: r.contactEmail ?? undefined,
    gstin: r.gstin ?? undefined,
    address: r.address ?? undefined,
    isExisting: r.isExisting,
    addedAt: r.addedAt,
  };
}

function rowToBatch(r: typeof schema.uploadBatches.$inferSelect): UploadBatch {
  return {
    id: r.id,
    companyId: r.companyId,
    uploadedAt: r.uploadedAt,
    fileName: r.fileName,
    totalCount: r.totalCount,
    groups: (r.groups ?? []) as BatchGroup[],
  };
}

function rowToBankAsset(r: typeof schema.bankAssets.$inferSelect): BankAsset {
  const inspectionStatus = r.inspectionStatus as InspectionStatus;
  const pricing = (r.pricing as AssetPricing | null) ?? undefined;
  const stored = r.status as AssetStatus;
  const status =
    stored === "uploaded" && (r.listed || pricing || inspectionStatus !== "pending")
      ? deriveAssetStatus({ listed: r.listed, pricing, inspectionStatus, status: stored })
      : stored;
  return {
    id: r.id,
    batchId: r.batchId,
    groupId: r.groupId,
    category: r.category as BankAsset["category"],
    hpNumber: r.hpNumber ?? "",
    hpDate: r.hpDate ?? undefined,
    ownerName: r.ownerName ?? "",
    asset: r.asset ?? "",
    registrationNumber: r.registrationNumber ?? "",
    engineNumber: r.engineNumber ?? "",
    chassisDate: r.chassisDate ?? undefined,
    yearOfManufacture: r.yearOfManufacture ?? undefined,
    orc: r.orc ?? undefined,
    state: r.state ?? undefined,
    zone: r.zone ?? undefined,
    repoDate: r.repoDate ?? undefined,
    segment: r.segment ?? "",
    photoUrl: r.photoUrl ?? undefined,
    correctlyPlaced: r.correctlyPlaced,
    location: r.location ?? "",
    contactPerson: r.contactPerson ?? undefined,
    inspectionStatus,
    inspectionLog: (r.inspectionLog as InspectionLog | null) ?? undefined,
    pricing,
    listed: r.listed,
    listedVehicleId: r.listedVehicleId ?? undefined,
    status,
    rejectedReason: r.rejectedReason ?? undefined,
  };
}

function rowToListed(r: typeof schema.listings.$inferSelect): ListedVehicle {
  return {
    id: r.id,
    assetId: r.assetId,
    category: r.category as ListedVehicle["category"],
    brand: r.brand,
    model: r.model,
    year: r.year ?? undefined,
    price: r.price,
    location: r.location,
    registrationNumber: r.registrationNumber ?? "",
    photoUrl: r.photoUrl ?? undefined,
    listedAt: r.listedAt,
  };
}

function assetToRow(a: BankAsset): typeof schema.bankAssets.$inferInsert {
  return {
    id: a.id,
    batchId: a.batchId,
    groupId: a.groupId,
    category: a.category,
    hpNumber: a.hpNumber || null,
    hpDate: a.hpDate ?? null,
    ownerName: a.ownerName || null,
    asset: a.asset || null,
    registrationNumber: a.registrationNumber || null,
    engineNumber: a.engineNumber || null,
    chassisDate: a.chassisDate ?? null,
    yearOfManufacture: a.yearOfManufacture ?? null,
    orc: a.orc ?? null,
    state: a.state ?? null,
    zone: a.zone ?? null,
    repoDate: a.repoDate ?? null,
    segment: a.segment || null,
    photoUrl: a.photoUrl ?? null,
    correctlyPlaced: a.correctlyPlaced,
    location: a.location || null,
    contactPerson: a.contactPerson ?? null,
    inspectionStatus: a.inspectionStatus,
    inspectionLog: a.inspectionLog ?? null,
    pricing: a.pricing ?? null,
    listed: a.listed,
    listedVehicleId: a.listedVehicleId ?? null,
    status: a.status,
    rejectedReason: a.rejectedReason ?? null,
  };
}
