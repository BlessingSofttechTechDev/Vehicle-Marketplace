"use server";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import {
  newBatchId,
  rowToAsset,
  type ParsedRow,
  type BankAsset,
  type UploadBatch,
  type UploadCompany,
  type InspectionStatus,
  type InspectionLog,
  type AssetPricing,
  type ListedVehicle,
  type BatchGroup,
} from "./uploads-shared";

// ─── Reads ───────────────────────────────────────────────────────────

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
  isExisting?: boolean;
}): Promise<UploadCompany> {
  const company = {
    id: `co-${Date.now().toString(36)}`,
    code: input.code,
    name: input.name,
    shortName: input.shortName,
    contactEmail: input.contactEmail,
    isExisting: input.isExisting ?? false,
    addedAt: Date.now(),
  };
  await db.insert(schema.companies).values({
    id: company.id,
    code: company.code,
    name: company.name,
    shortName: company.shortName,
    contactEmail: company.contactEmail ?? null,
    isExisting: company.isExisting,
    addedAt: company.addedAt,
  });
  return company;
}

export async function ingestBatchAction(
  companyId: string,
  fileName: string,
  rows: ParsedRow[]
): Promise<{ batch: UploadBatch; assets: BankAsset[] }> {
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

  const groupCounter: Record<string, number> = {};
  const assets: BankAsset[] = rows.map((r, i) => rowToAsset(r, batchId, i + 1, groupCounter));

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

  return { batch, assets };
}

export async function setInspectionStatusAction(
  assetId: string,
  status: InspectionStatus
): Promise<void> {
  await db
    .update(schema.bankAssets)
    .set({ inspectionStatus: status })
    .where(eq(schema.bankAssets.id, assetId));
}

export async function saveInspectionLogAction(
  assetId: string,
  log: InspectionLog
): Promise<void> {
  await db
    .update(schema.bankAssets)
    .set({ inspectionLog: log, inspectionStatus: "done" })
    .where(eq(schema.bankAssets.id, assetId));
}

export async function savePricingAction(
  assetId: string,
  pricing: AssetPricing
): Promise<void> {
  await db
    .update(schema.bankAssets)
    .set({ pricing })
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
    .set({ listed: true, listedVehicleId: listedId })
    .where(eq(schema.bankAssets.id, assetId));
  return listed;
}

export async function removeBatchAction(batchId: string): Promise<void> {
  await db.delete(schema.uploadBatches).where(eq(schema.uploadBatches.id, batchId));
}

// ─── Row mappers ─────────────────────────────────────────────────────

function rowToCompany(r: typeof schema.companies.$inferSelect): UploadCompany {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    shortName: r.shortName,
    contactEmail: r.contactEmail ?? undefined,
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
    inspectionStatus: r.inspectionStatus as InspectionStatus,
    inspectionLog: (r.inspectionLog as InspectionLog | null) ?? undefined,
    pricing: (r.pricing as AssetPricing | null) ?? undefined,
    listed: r.listed,
    listedVehicleId: r.listedVehicleId ?? undefined,
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
  };
}
