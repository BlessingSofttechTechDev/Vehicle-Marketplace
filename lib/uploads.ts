"use client";
import { create } from "zustand";

import {
  type UploadCompany,
  type UploadBatch,
  type BankAsset,
  type ListedVehicle,
  type ParsedRow,
  type InspectionStatus,
  type InspectionLog,
  type AssetPricing,
} from "./uploads-shared";

import {
  getAllUploadData,
  addCompanyAction,
  ingestBatchAction,
  setInspectionStatusAction,
  saveInspectionLogAction,
  savePricingAction,
  listToMarketplaceAction,
  removeBatchAction,
  updateAssetAction,
  softDeleteAssetAction,
  undoSoftDeleteAction,
  type AssetEditablePatch,
} from "./uploads-actions";

export type { AssetEditablePatch };

// Re-export shared types & helpers so existing imports from "@/lib/uploads"
// keep working unchanged.
export {
  CATEGORY_OPTIONS,
  inferCategory,
  newAssetId,
  newBatchId,
  newGroupId,
  normalizeSheet,
  rowToAsset,
  validateRows,
  REQUIRED_FIELDS,
  ASSET_STATUS_ORDER,
  deriveAssetStatus,
} from "./uploads-shared";
export type {
  AssetPricing,
  AssetStatus,
  BankAsset,
  BatchGroup,
  ConditionRating,
  InspectionLog,
  InspectionStatus,
  ListedVehicle,
  ParsedRow,
  RowIssue,
  RowSeverity,
  RowValidation,
  UploadBatch,
  UploadCompany,
} from "./uploads-shared";


interface UploadsStore {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  companies: UploadCompany[];
  batches: UploadBatch[];
  assets: BankAsset[];
  listed: ListedVehicle[];

  init: () => Promise<void>;
  refresh: () => Promise<void>;

  addCompany: (
    c: Omit<UploadCompany, "id" | "addedAt" | "isExisting"> & { isExisting?: boolean }
  ) => Promise<UploadCompany>;
  ingestBatch: (
    companyId: string,
    fileName: string,
    rows: ParsedRow[],
    skipIndexes?: number[]
  ) => Promise<{ batch: UploadBatch; assets: BankAsset[]; skippedCount: number }>;
  setInspectionStatus: (assetId: string, status: InspectionStatus) => Promise<void>;
  saveInspectionLog: (assetId: string, log: InspectionLog) => Promise<void>;
  savePricing: (assetId: string, pricing: AssetPricing) => Promise<void>;
  listToMarketplace: (assetId: string) => Promise<ListedVehicle | null>;
  removeBatch: (batchId: string) => Promise<void>;
  updateAsset: (assetId: string, patch: AssetEditablePatch) => Promise<void>;
  softDeleteAsset: (assetId: string, reason: string) => Promise<void>;
  undoSoftDelete: (assetId: string) => Promise<void>;
}

export const useUploads = create<UploadsStore>((set, get) => ({
  loaded: false,
  loading: false,
  error: null,
  companies: [],
  batches: [],
  assets: [],
  listed: [],

  init: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: null });
    try {
      const data = await getAllUploadData();
      set({
        companies: data.companies.sort((a, b) => b.addedAt - a.addedAt),
        batches: data.batches.sort((a, b) => b.uploadedAt - a.uploadedAt),
        assets: data.assets,
        listed: data.listed.sort((a, b) => b.listedAt - a.listedAt),
        loaded: true,
        loading: false,
      });
    } catch (e: unknown) {
      set({ loading: false, error: e instanceof Error ? e.message : "Failed to load data" });
    }
  },

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getAllUploadData();
      set({
        companies: data.companies.sort((a, b) => b.addedAt - a.addedAt),
        batches: data.batches.sort((a, b) => b.uploadedAt - a.uploadedAt),
        assets: data.assets,
        listed: data.listed.sort((a, b) => b.listedAt - a.listedAt),
        loaded: true,
        loading: false,
      });
    } catch (e: unknown) {
      set({ loading: false, error: e instanceof Error ? e.message : "Failed to refresh" });
    }
  },

  addCompany: async (c) => {
    const company = await addCompanyAction({
      code: c.code,
      name: c.name,
      shortName: c.shortName,
      contactEmail: c.contactEmail,
      isExisting: c.isExisting,
    });
    set((s) => ({ companies: [company, ...s.companies] }));
    return company;
  },

  ingestBatch: async (companyId, fileName, rows, skipIndexes = []) => {
    const result = await ingestBatchAction(companyId, fileName, rows, skipIndexes);
    set((s) => ({
      batches: [result.batch, ...s.batches],
      assets: [...result.assets, ...s.assets],
    }));
    return result;
  },

  setInspectionStatus: async (assetId, status) => {
    await setInspectionStatusAction(assetId, status);
    set((s) => ({
      assets: s.assets.map((a) => (a.id === assetId ? { ...a, inspectionStatus: status } : a)),
    }));
  },

  saveInspectionLog: async (assetId, log) => {
    await saveInspectionLogAction(assetId, log);
    set((s) => ({
      assets: s.assets.map((a) =>
        a.id === assetId ? { ...a, inspectionLog: log, inspectionStatus: "done" } : a
      ),
    }));
  },

  savePricing: async (assetId, pricing) => {
    await savePricingAction(assetId, pricing);
    set((s) => ({
      assets: s.assets.map((a) => (a.id === assetId ? { ...a, pricing } : a)),
    }));
  },

  listToMarketplace: async (assetId) => {
    const lv = await listToMarketplaceAction(assetId);
    if (!lv) return null;
    set((s) => ({
      listed: [lv, ...s.listed],
      assets: s.assets.map((x) =>
        x.id === assetId ? { ...x, listed: true, listedVehicleId: lv.id } : x
      ),
    }));
    return lv;
  },

  removeBatch: async (batchId) => {
    await removeBatchAction(batchId);
    set((s) => ({
      batches: s.batches.filter((b) => b.id !== batchId),
      assets: s.assets.filter((a) => a.batchId !== batchId),
    }));
  },

  updateAsset: async (assetId, patch) => {
    const updated = await updateAssetAction(assetId, patch);
    if (!updated) return;
    set((s) => ({
      assets: s.assets.map((a) => (a.id === assetId ? updated : a)),
    }));
  },

  softDeleteAsset: async (assetId, reason) => {
    await softDeleteAssetAction(assetId, reason);
    set((s) => ({
      assets: s.assets.map((a) =>
        a.id === assetId ? { ...a, status: "rejected", rejectedReason: reason || "Rejected" } : a
      ),
    }));
  },

  undoSoftDelete: async (assetId) => {
    const next = await undoSoftDeleteAction(assetId);
    set((s) => ({
      assets: s.assets.map((a) =>
        a.id === assetId ? { ...a, status: next, rejectedReason: undefined } : a
      ),
    }));
  },
}));
