"use client";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Upload,
  Trash2,
  ClipboardCheck,
  IndianRupee,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  Pencil,
  RotateCcw,
} from "lucide-react";
import {
  useUploads,
  CATEGORY_OPTIONS,
  type BankAsset,
  type AssetStatus,
  type InspectionStatus,
  type ConditionRating,
  type InspectionLog,
  type AssetPricing,
  type AssetEditablePatch,
} from "@/lib/uploads";
import { formatINR, cn } from "@/lib/utils";
import { UploadFlow } from "@/components/upload-flow";

export function UploadsSection() {
  const companies = useUploads((s) => s.companies);
  const batches = useUploads((s) => s.batches);
  const assets = useUploads((s) => s.assets);
  const removeBatch = useUploads((s) => s.removeBatch);
  const setInspectionStatus = useUploads((s) => s.setInspectionStatus);
  const saveInspectionLog = useUploads((s) => s.saveInspectionLog);
  const savePricing = useUploads((s) => s.savePricing);
  const listToMarketplace = useUploads((s) => s.listToMarketplace);
  const updateAsset = useUploads((s) => s.updateAsset);
  const softDeleteAsset = useUploads((s) => s.softDeleteAsset);
  const undoSoftDelete = useUploads((s) => s.undoSoftDelete);

  const [open, setOpen] = useState(false);
  const [openBatch, setOpenBatch] = useState<string | null>(null);
  const [inspectAsset, setInspectAsset] = useState<BankAsset | null>(null);
  const [priceAsset, setPriceAsset] = useState<BankAsset | null>(null);
  const [editAsset, setEditAsset] = useState<BankAsset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<BankAsset | null>(null);

  const totals = useMemo(() => {
    const inspected = assets.filter((a) => a.inspectionStatus === "done").length;
    const priced = assets.filter((a) => !!a.pricing).length;
    const listed = assets.filter((a) => a.listed).length;
    return { total: assets.length, inspected, priced, listed };
  }, [assets]);

  const assetsByBatch = useMemo(() => {
    const m: Record<string, BankAsset[]> = {};
    for (const a of assets) (m[a.batchId] ??= []).push(a);
    return m;
  }, [assets]);

  return (
    <>
      <div className="border border-ink-500 bg-ink-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <Upload className="h-3.5 w-3.5 text-amber" strokeWidth={1.5} />
            <p className="label-amber label">Bank uploads &middot; assets pipeline</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
              {totals.total} assets &middot; {totals.inspected} inspected &middot; {totals.priced} priced &middot; {totals.listed} listed
            </p>
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 border border-amber bg-amber px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft"
            >
              <Upload className="h-3 w-3" strokeWidth={1.5} />
              Upload
            </button>
          </div>
        </div>

        {batches.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="label">No uploads yet</p>
            <p className="font-mono text-[11px] text-bone-500">
              Click <span className="text-amber">Upload</span> to ingest a bank Excel/CSV.
            </p>
          </div>
        ) : (
          <div>
            {batches.map((b) => {
              const co = companies.find((c) => c.id === b.companyId);
              const isOpen = openBatch === b.id;
              const batchAssets = assetsByBatch[b.id] ?? [];
              return (
                <div key={b.id} className="border-b border-ink-500 last:border-b-0">
                  <button
                    onClick={() => setOpenBatch(isOpen ? null : b.id)}
                    className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-ink-700"
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-amber" strokeWidth={1.5} />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-bone-400" strokeWidth={1.5} />
                      )}
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-wider text-amber">
                          {b.id}
                        </p>
                        <p className="mt-0.5 font-display text-base text-bone-100">
                          {co?.name ?? "Unknown company"} &middot; {b.totalCount} assets
                        </p>
                        <p className="mt-1 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider text-bone-500">
                          {b.groups.map((g) => (
                            <span key={g.id} className="border border-ink-500 px-1.5 py-0.5">
                              {g.category} &middot; {g.count}
                            </span>
                          ))}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
                        {new Date(b.uploadedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-bone-500">
                        {b.fileName}
                      </p>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-ink-500">
                      {CATEGORY_OPTIONS.map((cat) => {
                        const inCat = batchAssets.filter((a) => a.category === cat.value);
                        if (inCat.length === 0) return null;
                        const groupId = inCat[0].groupId;
                        return (
                          <div key={cat.value} className="border-b border-ink-500 last:border-b-0">
                            <div className="flex items-center justify-between bg-ink-900/50 px-6 py-2">
                              <p className="font-mono text-[10px] uppercase tracking-wider text-amber">
                                {groupId} &middot; {cat.label}
                              </p>
                              <p className="font-mono text-[10px] uppercase tracking-wider text-bone-500">
                                {inCat.length} {inCat.length === 1 ? "vehicle" : "vehicles"}
                              </p>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="border-b border-ink-500 bg-ink-900/40">
                                    <Th>ID / Status</Th>
                                    <Th>Owner</Th>
                                    <Th>Asset</Th>
                                    <Th>Reg #</Th>
                                    <Th>Engine #</Th>
                                    <Th>Year</Th>
                                    <Th>HP #</Th>
                                    <Th>Location</Th>
                                    <Th>Placed</Th>
                                    <Th>Inspection</Th>
                                    <Th>Price</Th>
                                    <Th>Actions</Th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inCat.map((a) => (
                                    <AssetRow
                                      key={a.id}
                                      asset={a}
                                      onSetStatus={(s) => setInspectionStatus(a.id, s)}
                                      onOpenInspect={() => setInspectAsset(a)}
                                      onOpenPrice={() => setPriceAsset(a)}
                                      onList={() => listToMarketplace(a.id)}
                                      onEdit={() => setEditAsset(a)}
                                      onDelete={() => setDeleteAsset(a)}
                                      onUndoDelete={() => undoSoftDelete(a.id)}
                                    />
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-end border-t border-ink-500 px-6 py-3">
                        <button
                          onClick={() => {
                            if (confirm(`Delete batch ${b.id} and all its assets?`)) removeBatch(b.id);
                          }}
                          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-400 hover:text-signal-red"
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                          Delete batch
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <UploadFlow open={open} onClose={() => setOpen(false)} onComplete={(b) => setOpenBatch(b)} />

      {inspectAsset && (
        <InspectionModal
          asset={inspectAsset}
          onClose={() => setInspectAsset(null)}
          onSave={(log) => {
            saveInspectionLog(inspectAsset.id, log);
            setInspectAsset(null);
          }}
        />
      )}

      {priceAsset && (
        <PricingModal
          asset={priceAsset}
          onClose={() => setPriceAsset(null)}
          onSave={(p) => {
            savePricing(priceAsset.id, p);
            setPriceAsset(null);
          }}
        />
      )}

      {editAsset && (
        <EditAssetModal
          asset={editAsset}
          onClose={() => setEditAsset(null)}
          onSave={async (patch) => {
            await updateAsset(editAsset.id, patch);
            setEditAsset(null);
          }}
        />
      )}

      {deleteAsset && (
        <DeleteAssetModal
          asset={deleteAsset}
          onClose={() => setDeleteAsset(null)}
          onConfirm={async (reason) => {
            await softDeleteAsset(deleteAsset.id, reason);
            setDeleteAsset(null);
          }}
        />
      )}
    </>
  );
}

function AssetRow({
  asset,
  onSetStatus,
  onOpenInspect,
  onOpenPrice,
  onList,
  onEdit,
  onDelete,
  onUndoDelete,
}: {
  asset: BankAsset;
  onSetStatus: (s: InspectionStatus) => void;
  onOpenInspect: () => void;
  onOpenPrice: () => void;
  onList: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUndoDelete: () => void;
}) {
  const isRejected = asset.status === "rejected";
  return (
    <tr className={cn(
      "border-b border-ink-500 last:border-b-0 align-top hover:bg-ink-900/40",
      isRejected && "opacity-50"
    )}>
      <Td>
        <span className="font-mono text-[10px] text-amber">{asset.id}</span>
        <div className="mt-1">
          <StatusBadge status={asset.status} />
        </div>
        {isRejected && asset.rejectedReason && (
          <p className="mt-1 max-w-[140px] text-[9px] text-bone-500">{asset.rejectedReason}</p>
        )}
      </Td>
      <Td>{asset.ownerName || "—"}</Td>
      <Td>
        <div className="flex items-center gap-2">
          {asset.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.photoUrl} alt="" className="h-8 w-12 object-cover" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
          ) : (
            <span className="flex h-8 w-12 items-center justify-center bg-ink-700 text-bone-500">
              <ImageIcon className="h-3 w-3" strokeWidth={1.5} />
            </span>
          )}
          <span className="text-bone-100">{asset.asset || asset.segment || "—"}</span>
        </div>
      </Td>
      <Td className="text-amber">{asset.registrationNumber || "—"}</Td>
      <Td>{asset.engineNumber || "—"}</Td>
      <Td className="tabular">{asset.yearOfManufacture ?? "—"}</Td>
      <Td>{asset.hpNumber || "—"}</Td>
      <Td>
        <span>{asset.location || "—"}</span>
        {asset.state && <span className="block text-[10px] text-bone-500">{asset.state}{asset.zone ? ` · ${asset.zone}` : ""}</span>}
      </Td>
      <Td>
        {asset.correctlyPlaced ? (
          <span className="border border-signal-sage/40 bg-signal-sage/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-signal-sage">Yes</span>
        ) : (
          <span className="border border-signal-red/40 bg-signal-red/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-signal-red">No</span>
        )}
      </Td>
      <Td>
        <select
          value={asset.inspectionStatus}
          onChange={(e) => onSetStatus(e.target.value as InspectionStatus)}
          className={cn(
            "border bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-wider outline-none focus:border-amber",
            asset.inspectionStatus === "done"
              ? "border-signal-sage/40 text-signal-sage"
              : asset.inspectionStatus === "ongoing"
              ? "border-amber/40 text-amber"
              : "border-ink-500 text-bone-300"
          )}
        >
          <option value="pending">Pending</option>
          <option value="ongoing">Ongoing</option>
          <option value="done">Done</option>
        </select>
        {asset.inspectionLog && (
          <p className="mt-1 text-[9px] uppercase tracking-wider text-bone-500">
            Logged {new Date(asset.inspectionLog.inspectedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        )}
      </Td>
      <Td>
        {asset.pricing ? (
          <span className="text-bone-100 tabular">{formatINR(asset.pricing.listPrice)}</span>
        ) : (
          <span className="text-bone-500">—</span>
        )}
        {asset.pricing && (
          <p className="text-[9px] uppercase tracking-wider text-bone-500">{asset.pricing.location}</p>
        )}
      </Td>
      <Td>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            title="Inspector log"
            onClick={onOpenInspect}
            className="flex h-7 w-7 items-center justify-center border border-ink-500 text-bone-400 transition hover:border-amber hover:text-amber"
          >
            <ClipboardCheck className="h-3 w-3" strokeWidth={1.5} />
          </button>
          <button
            title="Set price"
            onClick={onOpenPrice}
            disabled={asset.inspectionStatus !== "done"}
            className={cn(
              "flex h-7 w-7 items-center justify-center border transition",
              asset.inspectionStatus === "done"
                ? "border-ink-500 text-bone-400 hover:border-amber hover:text-amber"
                : "cursor-not-allowed border-ink-500 text-bone-500 opacity-50"
            )}
          >
            <IndianRupee className="h-3 w-3" strokeWidth={1.5} />
          </button>
          {asset.listed ? (
            <span className="flex items-center gap-1 border border-signal-sage/40 bg-signal-sage/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-signal-sage">
              <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
              Listed
            </span>
          ) : (
            <button
              title="List on marketplace"
              onClick={onList}
              disabled={!asset.pricing || asset.inspectionStatus !== "done" || isRejected}
              className={cn(
                "flex h-7 items-center gap-1 border px-2 transition",
                asset.pricing && asset.inspectionStatus === "done" && !isRejected
                  ? "border-amber bg-amber/10 text-amber hover:bg-amber/20"
                  : "cursor-not-allowed border-ink-500 text-bone-500 opacity-50"
              )}
            >
              <Sparkles className="h-3 w-3" strokeWidth={1.5} />
              <span className="font-mono text-[9px] uppercase tracking-wider">List</span>
            </button>
          )}
          <button
            title="Edit row"
            onClick={onEdit}
            disabled={isRejected}
            className={cn(
              "flex h-7 w-7 items-center justify-center border transition",
              isRejected
                ? "cursor-not-allowed border-ink-500 text-bone-500 opacity-50"
                : "border-ink-500 text-bone-400 hover:border-amber hover:text-amber"
            )}
          >
            <Pencil className="h-3 w-3" strokeWidth={1.5} />
          </button>
          {isRejected ? (
            <button
              title="Restore row"
              onClick={onUndoDelete}
              className="flex h-7 w-7 items-center justify-center border border-signal-sage/40 text-signal-sage transition hover:bg-signal-sage/10"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
            </button>
          ) : (
            <button
              title="Reject / soft-delete"
              onClick={onDelete}
              disabled={asset.listed}
              className={cn(
                "flex h-7 w-7 items-center justify-center border transition",
                asset.listed
                  ? "cursor-not-allowed border-ink-500 text-bone-500 opacity-50"
                  : "border-ink-500 text-bone-400 hover:border-signal-red hover:text-signal-red"
              )}
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </Td>
    </tr>
  );
}

function StatusBadge({ status }: { status: AssetStatus }) {
  const map: Record<AssetStatus, { label: string; cls: string }> = {
    uploaded: { label: "Uploaded", cls: "border-ink-500 text-bone-400" },
    inspecting: { label: "Inspecting", cls: "border-amber/40 bg-amber/5 text-amber" },
    inspected: { label: "Inspected", cls: "border-signal-sage/40 bg-signal-sage/5 text-signal-sage" },
    valuated: { label: "Valuated", cls: "border-amber/40 bg-amber/10 text-amber" },
    listed: { label: "Listed", cls: "border-signal-sage/60 bg-signal-sage/10 text-signal-sage" },
    reserved: { label: "Reserved", cls: "border-amber/60 bg-amber/15 text-amber" },
    sold: { label: "Sold", cls: "border-bone-500/40 bg-ink-700 text-bone-300" },
    rejected: { label: "Rejected", cls: "border-signal-red/40 bg-signal-red/10 text-signal-red" },
  };
  const m = map[status] ?? map.uploaded;
  return (
    <span className={cn("border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", m.cls)}>
      {m.label}
    </span>
  );
}

function InspectionModal({
  asset,
  onClose,
  onSave,
}: {
  asset: BankAsset;
  onClose: () => void;
  onSave: (log: InspectionLog) => void;
}) {
  const initial: InspectionLog = asset.inspectionLog ?? {
    inspectorName: "",
    inspectedAt: Date.now(),
    engineCondition: "good",
    bodyCondition: "good",
    tyresCondition: "good",
    electricalsCondition: "good",
    documents: { rc: false, insurance: false, puc: false },
    workNeeded: "",
    notes: "",
  };
  const [log, setLog] = useState<InspectionLog>(initial);

  return (
    <Modal title={`Inspector log · ${asset.id}`} onClose={onClose}>
      <div className="grid gap-4">
        <Field
          label="Inspector name"
          value={log.inspectorName}
          onChange={(v) => setLog({ ...log, inspectorName: v })}
          placeholder="e.g., Capt. Rajiv Mehta"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <RatingField label="Engine" value={log.engineCondition} onChange={(v) => setLog({ ...log, engineCondition: v })} />
          <RatingField label="Body" value={log.bodyCondition} onChange={(v) => setLog({ ...log, bodyCondition: v })} />
          <RatingField label="Tyres" value={log.tyresCondition} onChange={(v) => setLog({ ...log, tyresCondition: v })} />
          <RatingField label="Electricals" value={log.electricalsCondition} onChange={(v) => setLog({ ...log, electricalsCondition: v })} />
        </div>
        <div>
          <p className="label">Documents present</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {(["rc", "insurance", "puc"] as const).map((d) => (
              <label key={d} className="flex cursor-pointer items-center gap-2 border border-ink-500 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-bone-300">
                <input
                  type="checkbox"
                  checked={log.documents[d]}
                  onChange={(e) => setLog({ ...log, documents: { ...log.documents, [d]: e.target.checked } })}
                />
                {d}
              </label>
            ))}
          </div>
        </div>
        <Field
          label="Work needed"
          value={log.workNeeded}
          onChange={(v) => setLog({ ...log, workNeeded: v })}
          placeholder="e.g., clutch replacement, dent rear bumper"
          textarea
        />
        <Field
          label="Notes"
          value={log.notes}
          onChange={(v) => setLog({ ...log, notes: v })}
          placeholder="Any other observations"
          textarea
        />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300 hover:border-amber">
          Cancel
        </button>
        <button
          onClick={() => onSave({ ...log, inspectedAt: Date.now() })}
          className="border border-amber bg-amber px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-900 hover:bg-amber-soft"
        >
          Save &amp; mark done
        </button>
      </div>
    </Modal>
  );
}

function PricingModal({
  asset,
  onClose,
  onSave,
}: {
  asset: BankAsset;
  onClose: () => void;
  onSave: (p: AssetPricing) => void;
}) {
  const [listPrice, setListPrice] = useState(asset.pricing?.listPrice?.toString() ?? "");
  const [floorPrice, setFloorPrice] = useState(asset.pricing?.floorPrice?.toString() ?? "");
  const [location, setLocation] = useState(asset.pricing?.location ?? asset.location ?? "");

  const valid = Number(listPrice) > 0 && location.trim().length > 0;

  return (
    <Modal title={`Pricing · ${asset.id}`} onClose={onClose}>
      <div className="grid gap-4">
        <Field label="List price (INR)" value={listPrice} onChange={setListPrice} placeholder="e.g., 450000" />
        <Field label="Floor price (optional)" value={floorPrice} onChange={setFloorPrice} placeholder="Internal margin floor" />
        <Field label="Location" value={location} onChange={setLocation} placeholder="e.g., Mumbai, MH" />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300 hover:border-amber">
          Cancel
        </button>
        <button
          onClick={() =>
            onSave({
              listPrice: Number(listPrice),
              floorPrice: floorPrice ? Number(floorPrice) : undefined,
              location: location.trim(),
            })
          }
          disabled={!valid}
          className={cn(
            "border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition",
            valid
              ? "border-amber bg-amber text-ink-900 hover:bg-amber-soft"
              : "cursor-not-allowed border-ink-500 text-bone-500"
          )}
        >
          Save price
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-ink-500 bg-ink-800 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <p className="label-amber label">{title}</p>
          <button onClick={onClose} className="text-bone-400 hover:text-bone-100">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RatingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ConditionRating;
  onChange: (v: ConditionRating) => void;
}) {
  const opts: { v: ConditionRating; l: string; c: string }[] = [
    { v: "good", l: "Good", c: "border-signal-sage/40 text-signal-sage" },
    { v: "needs_work", l: "Needs work", c: "border-amber/40 text-amber" },
    { v: "bad", l: "Bad", c: "border-signal-red/40 text-signal-red" },
  ];
  return (
    <div>
      <p className="label">{label}</p>
      <div className="mt-2 flex gap-2">
        {opts.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={cn(
              "flex-1 border px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider transition",
              value === o.v ? `${o.c} bg-amber/5` : "border-ink-500 text-bone-400 hover:border-ink-400"
            )}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="mt-1 w-full border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-bone-100 outline-none focus:border-amber"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full border border-ink-500 bg-ink-900 px-3 py-2 font-mono text-sm text-bone-100 outline-none focus:border-amber"
        />
      )}
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-bone-400">{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-3 font-mono text-[11px] text-bone-100", className)}>{children}</td>;
}

function EditAssetModal({
  asset,
  onClose,
  onSave,
}: {
  asset: BankAsset;
  onClose: () => void;
  onSave: (patch: AssetEditablePatch) => Promise<void> | void;
}) {
  const [form, setForm] = useState({
    ownerName: asset.ownerName ?? "",
    asset: asset.asset ?? "",
    registrationNumber: asset.registrationNumber ?? "",
    engineNumber: asset.engineNumber ?? "",
    hpNumber: asset.hpNumber ?? "",
    yearOfManufacture: asset.yearOfManufacture?.toString() ?? "",
    location: asset.location ?? "",
    state: asset.state ?? "",
    zone: asset.zone ?? "",
    segment: asset.segment ?? "",
    contactPerson: asset.contactPerson ?? "",
    photoUrl: asset.photoUrl ?? "",
    correctlyPlaced: asset.correctlyPlaced,
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const patch: AssetEditablePatch = {
        ownerName: form.ownerName.trim(),
        asset: form.asset.trim(),
        registrationNumber: form.registrationNumber.trim(),
        engineNumber: form.engineNumber.trim(),
        hpNumber: form.hpNumber.trim(),
        yearOfManufacture: form.yearOfManufacture
          ? Number(form.yearOfManufacture.match(/\d{4}/)?.[0] ?? form.yearOfManufacture)
          : undefined,
        location: form.location.trim(),
        state: form.state.trim(),
        zone: form.zone.trim(),
        segment: form.segment.trim(),
        contactPerson: form.contactPerson.trim(),
        photoUrl: form.photoUrl.trim(),
        correctlyPlaced: form.correctlyPlaced,
      };
      await onSave(patch);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Edit · ${asset.id}`} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Owner name" value={form.ownerName} onChange={(v) => setForm({ ...form, ownerName: v })} />
        <Field label="Asset" value={form.asset} onChange={(v) => setForm({ ...form, asset: v })} />
        <Field label="Registration #" value={form.registrationNumber} onChange={(v) => setForm({ ...form, registrationNumber: v })} />
        <Field label="Engine #" value={form.engineNumber} onChange={(v) => setForm({ ...form, engineNumber: v })} />
        <Field label="HP #" value={form.hpNumber} onChange={(v) => setForm({ ...form, hpNumber: v })} />
        <Field label="Year of manufacture" value={form.yearOfManufacture} onChange={(v) => setForm({ ...form, yearOfManufacture: v })} placeholder="e.g., 2019" />
        <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
        <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
        <Field label="Zone" value={form.zone} onChange={(v) => setForm({ ...form, zone: v })} />
        <Field label="Segment" value={form.segment} onChange={(v) => setForm({ ...form, segment: v })} />
        <Field label="Contact person" value={form.contactPerson} onChange={(v) => setForm({ ...form, contactPerson: v })} />
        <Field label="Photo URL" value={form.photoUrl} onChange={(v) => setForm({ ...form, photoUrl: v })} />
      </div>
      <label className="mt-4 flex items-center gap-2 font-mono text-[11px] text-bone-300">
        <input
          type="checkbox"
          checked={form.correctlyPlaced}
          onChange={(e) => setForm({ ...form, correctlyPlaced: e.target.checked })}
        />
        Vehicle correctly placed at location
      </label>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300 hover:border-amber">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className={cn(
            "border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition",
            busy
              ? "cursor-wait border-ink-500 bg-ink-700 text-bone-500"
              : "border-amber bg-amber text-ink-900 hover:bg-amber-soft"
          )}
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}

function DeleteAssetModal({
  asset,
  onClose,
  onConfirm,
}: {
  asset: BankAsset;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Reject · ${asset.id}`} onClose={onClose}>
      <p className="font-mono text-[11px] text-bone-300">
        This soft-deletes the row. It stays in DB with status <span className="text-signal-red">rejected</span> and can be restored.
      </p>
      <div className="mt-4">
        <Field label="Reason (shown on the row)" value={reason} onChange={setReason} placeholder="e.g., duplicate of MH04 1234, paperwork mismatch" />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300 hover:border-amber">
          Cancel
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm(reason.trim());
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className={cn(
            "border px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition",
            busy
              ? "cursor-wait border-ink-500 bg-ink-700 text-bone-500"
              : "border-signal-red bg-signal-red/10 text-signal-red hover:bg-signal-red/20"
          )}
        >
          {busy ? "Rejecting…" : "Reject row"}
        </button>
      </div>
    </Modal>
  );
}
