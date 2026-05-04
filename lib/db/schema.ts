import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  contactEmail: text("contact_email"),
  isExisting: boolean("is_existing").notNull().default(false),
  addedAt: bigint("added_at", { mode: "number" }).notNull(),
});

export const uploadBatches = pgTable("upload_batches", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  uploadedAt: bigint("uploaded_at", { mode: "number" }).notNull(),
  fileName: text("file_name").notNull(),
  totalCount: integer("total_count").notNull(),
  groups: jsonb("groups").notNull(),
});

export const bankAssets = pgTable("bank_assets", {
  id: text("id").primaryKey(),
  batchId: text("batch_id")
    .notNull()
    .references(() => uploadBatches.id, { onDelete: "cascade" }),
  groupId: text("group_id").notNull(),
  category: text("category").notNull(),

  hpNumber: text("hp_number"),
  hpDate: text("hp_date"),
  ownerName: text("owner_name"),
  asset: text("asset"),
  registrationNumber: text("registration_number"),
  engineNumber: text("engine_number"),
  chassisDate: text("chassis_date"),
  yearOfManufacture: integer("year_of_manufacture"),
  orc: text("orc"),
  state: text("state"),
  zone: text("zone"),
  repoDate: text("repo_date"),
  segment: text("segment"),
  photoUrl: text("photo_url"),
  correctlyPlaced: boolean("correctly_placed").notNull().default(false),
  location: text("location"),
  contactPerson: text("contact_person"),

  inspectionStatus: text("inspection_status").notNull().default("pending"),
  inspectionLog: jsonb("inspection_log"),
  pricing: jsonb("pricing"),
  listed: boolean("listed").notNull().default(false),
  listedVehicleId: text("listed_vehicle_id"),
});

export const listings = pgTable("listings", {
  id: text("id").primaryKey(),
  assetId: text("asset_id")
    .notNull()
    .references(() => bankAssets.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  price: bigint("price", { mode: "number" }).notNull(),
  location: text("location").notNull(),
  registrationNumber: text("registration_number"),
  photoUrl: text("photo_url"),
  listedAt: bigint("listed_at", { mode: "number" }).notNull(),
});

export type CompanyRow = typeof companies.$inferSelect;
export type UploadBatchRow = typeof uploadBatches.$inferSelect;
export type BankAssetRow = typeof bankAssets.$inferSelect;
export type ListingRow = typeof listings.$inferSelect;
