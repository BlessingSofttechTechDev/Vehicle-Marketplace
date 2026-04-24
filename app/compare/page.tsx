"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { motion } from "framer-motion";
import { Nav } from "@/components/nav";
import { useCheckout, useCompare } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { getVehicle } from "@/lib/data";
import { formatINRFull, formatKm } from "@/lib/utils";
import type { Vehicle } from "@/lib/types";

type Direction = "higher-better" | "lower-better" | "neutral";

const ROWS: Array<{
  key: keyof Vehicle | string;
  label: string;
  direction: Direction;
  format?: (v: Vehicle) => string;
  value: (v: Vehicle) => number | string;
}> = [
  { key: "price", label: "Price", direction: "lower-better", format: (v) => formatINRFull(v.price), value: (v) => v.price },
  { key: "year", label: "Year", direction: "higher-better", format: (v) => v.year.toString(), value: (v) => v.year },
  { key: "kmDriven", label: "KM Driven", direction: "lower-better", format: (v) => formatKm(v.kmDriven), value: (v) => v.kmDriven },
  { key: "owners", label: "Owners", direction: "lower-better", format: (v) => v.owners.toString(), value: (v) => v.owners },
  { key: "fuel", label: "Fuel", direction: "neutral", format: (v) => v.fuel, value: (v) => v.fuel },
  { key: "transmission", label: "Transmission", direction: "neutral", format: (v) => v.transmission, value: (v) => v.transmission },
  { key: "engineCc", label: "Engine", direction: "higher-better", format: (v) => (v.engineCc > 0 ? `${v.engineCc} cc` : "Electric"), value: (v) => v.engineCc },
  { key: "mileageKmpl", label: "Mileage", direction: "higher-better", format: (v) => (v.mileageKmpl > 0 ? `${v.mileageKmpl} km/l` : "—"), value: (v) => v.mileageKmpl },
  { key: "insurance", label: "Insurance", direction: "neutral", format: (v) => v.insurance, value: (v) => v.insurance },
  { key: "location", label: "Location", direction: "neutral", format: (v) => v.location, value: (v) => v.location },
];

export default function ComparePage() {
  const { ids, remove, clear } = useCompare();
  const startCheckout = useCheckout((s) => s.startCheckout);
  const currentUser = useAuth((s) => s.currentUser);
  const router = useRouter();
  const vehicles = ids.map((id) => getVehicle(id)).filter(Boolean) as Vehicle[];

  const onBuy = (id: string) => {
    startCheckout(id);
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent("/checkout/documents")}`);
      return;
    }
    router.push("/checkout/documents");
  };

  if (vehicles.length === 0) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="label-amber label">Nothing to compare</p>
          <h1 className="mt-4 font-display text-5xl text-bone-100">
            Select a machine, then another.
          </h1>
          <p className="mt-4 max-w-md text-bone-400">
            Add up to three vehicles from the marketplace and we&apos;ll place them side by side.
          </p>
          <Link
            href="/"
            className="mt-10 inline-flex items-center gap-3 border border-amber px-8 py-4 font-mono text-xs uppercase tracking-wider text-amber transition hover:bg-amber hover:text-ink-900"
          >
            Browse marketplace
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <Nav />

      <div className="mx-auto max-w-[1600px] px-6 py-8 md:px-10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-bone-400 transition hover:text-amber"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="font-mono text-[11px] uppercase tracking-wider">Back</span>
          </Link>
          <button
            onClick={clear}
            className="font-mono text-[11px] uppercase tracking-wider text-bone-400 transition hover:text-signal-red"
          >
            Clear all
          </button>
        </div>

        <div className="mt-6 flex items-baseline justify-between gap-6">
          <div>
            <p className="label-amber label">Comparison</p>
            <h1 className="mt-3 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
              Side by <span className="italic">side</span>.
            </h1>
          </div>
          <p className="hidden font-mono text-[11px] uppercase tracking-wider text-bone-400 md:block tabular">
            {vehicles.length} vehicles · {ROWS.length} attributes
          </p>
        </div>

        {/* Columns */}
        <div
          className="mt-12 grid gap-4"
          style={{ gridTemplateColumns: `160px repeat(${vehicles.length}, 1fr)` }}
        >
          {/* Header row */}
          <div />
          {vehicles.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative border border-ink-500 bg-ink-800"
            >
              <button
                onClick={() => remove(v.id)}
                className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center bg-ink-900/80 text-bone-300 backdrop-blur transition hover:text-signal-red"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <div className="relative aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.images[0]} alt={v.model} className="h-full w-full object-cover" />
              </div>
              <div className="p-5">
                <p className="label">{v.brand}</p>
                <h3 className="mt-2 font-display text-2xl text-bone-100">{v.model}</h3>
                <p className="mt-1 font-mono text-[11px] text-bone-400">{v.variant}</p>
                <p className="mt-4 font-display text-2xl text-amber tabular">
                  {formatINRFull(v.price)}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Spec rows */}
          {ROWS.map((row, rowIdx) => {
            const values = vehicles.map((v) => row.value(v));
            const numericValues = values.filter((x) => typeof x === "number") as number[];
            const best =
              row.direction === "higher-better"
                ? Math.max(...numericValues)
                : row.direction === "lower-better"
                  ? Math.min(...numericValues)
                  : null;
            const worst =
              row.direction === "higher-better"
                ? Math.min(...numericValues)
                : row.direction === "lower-better"
                  ? Math.max(...numericValues)
                  : null;
            const allSame = numericValues.every((v) => v === numericValues[0]);

            return (
              <div key={row.label} className="contents">
                <div className="flex items-center border-b border-ink-500 py-4 pl-2">
                  <p className="label">{row.label}</p>
                </div>
                {vehicles.map((v, i) => {
                  const val = row.value(v);
                  const isBest = !allSame && best !== null && val === best;
                  const isWorst = !allSame && worst !== null && val === worst;
                  return (
                    <motion.div
                      key={v.id + row.label}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 + rowIdx * 0.02 + i * 0.01 }}
                      className={`flex items-center justify-between border-b border-ink-500 px-5 py-4 ${
                        isBest ? "bg-signal-sage/[0.06]" : isWorst ? "bg-signal-red/[0.04]" : ""
                      }`}
                    >
                      <p
                        className={`font-mono text-sm tabular ${
                          isBest ? "text-signal-sage" : isWorst ? "text-signal-red/80" : "text-bone-100"
                        }`}
                      >
                        {row.format ? row.format(v) : val}
                      </p>
                      {isBest && (
                        <span className="font-mono text-[9px] uppercase tracking-wider text-signal-sage">
                          Best
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            );
          })}

          {/* CTA row */}
          <div />
          {vehicles.map((v) => (
            <button
              key={v.id + "cta"}
              onClick={() => onBuy(v.id)}
              className="group mt-4 flex items-center justify-center gap-3 bg-amber px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft"
            >
              Acquire {v.brand}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-12 flex flex-wrap items-center gap-6 border-t border-ink-500 pt-6">
          <p className="label">Legend</p>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 bg-signal-sage/40" />
            <span className="font-mono text-[11px] text-bone-400">Best in comparison</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 bg-signal-red/30" />
            <span className="font-mono text-[11px] text-bone-400">Lowest in comparison</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 bg-ink-500" />
            <span className="font-mono text-[11px] text-bone-400">Non-comparable attribute</span>
          </div>
        </div>
      </div>
    </div>
  );
}
