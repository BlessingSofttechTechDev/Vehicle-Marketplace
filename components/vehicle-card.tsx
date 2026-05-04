"use client";
import Link from "next/link";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useCompare } from "@/lib/store";
import { cn, formatINR, formatKm } from "@/lib/utils";
import type { Vehicle } from "@/lib/types";

export interface VehicleBadge {
  label: string;
  tone: "amber" | "sage" | "info";
}

export function VehicleCard({
  vehicle,
  index = 0,
  badge,
}: {
  vehicle: Vehicle;
  index?: number;
  badge?: VehicleBadge;
}) {
  const { ids, toggle, wishlist, toggleWishlist } = useCompare();
  const isSelected = ids.includes(vehicle.id);
  const isWishlisted = wishlist.includes(vehicle.id);
  const canAdd = ids.length < 3 || isSelected;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative border border-ink-500 bg-ink-800 transition-colors",
        isSelected && "border-amber"
      )}
    >
      <Link href={`/vehicle/${vehicle.id}`} className="block">
        <div className="card-image-wrap relative aspect-[4/3] overflow-hidden bg-ink-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vehicle.images[0]}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="card-image h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute left-3 top-3 flex items-center gap-1.5 bg-ink-900/80 px-2 py-1 backdrop-blur">
            <span className="h-1 w-1 rounded-full bg-amber" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-bone-100">
              {vehicle.category}
            </span>
          </div>
          {badge && (
            <div className={cn(
              "absolute right-3 bottom-3 border bg-ink-900/85 px-2 py-1 backdrop-blur font-mono text-[9px] uppercase tracking-wider",
              badge.tone === "amber" && "border-amber/50 text-amber",
              badge.tone === "sage" && "border-signal-sage/50 text-signal-sage",
              badge.tone === "info" && "border-bone-400/40 text-bone-200"
            )}>
              {badge.label}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-900/90 to-transparent" />
        </div>
      </Link>

      {/* wishlist button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          toggleWishlist(vehicle.id);
        }}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center bg-ink-900/80 text-bone-300 backdrop-blur transition hover:text-amber"
        aria-label="Add to wishlist"
      >
        <Heart
          className="h-3.5 w-3.5"
          strokeWidth={1.5}
          fill={isWishlisted ? "#D4A574" : "none"}
          stroke={isWishlisted ? "#D4A574" : "currentColor"}
        />
      </button>

      <div className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="label mb-1.5 truncate">{vehicle.brand}</p>
            <Link href={`/vehicle/${vehicle.id}`}>
              <h3 className="font-display text-xl leading-tight text-bone-100 transition-colors group-hover:text-amber-soft">
                {vehicle.model}
              </h3>
            </Link>
            <p className="mt-0.5 font-mono text-[11px] text-bone-400">
              {vehicle.variant}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg text-amber tabular">
              {formatINR(vehicle.price)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3 border-t border-ink-500 pt-4">
          <Stat label="Year" value={vehicle.year.toString()} />
          <Stat label="Fuel" value={vehicle.fuel} />
          <Stat label="Trans" value={vehicle.transmission} />
          <Stat label="KM" value={formatKm(vehicle.kmDriven).replace(" km", "")} />
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-ink-500 pt-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-bone-400">
            {vehicle.location}
          </p>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (canAdd) toggle(vehicle.id);
            }}
            disabled={!canAdd}
            className={cn(
              "group/cmp flex items-center gap-2 transition",
              !canAdd && "opacity-40"
            )}
          >
            <span
              className="check-square"
              data-checked={isSelected}
            />
            <span className="label group-hover/cmp:text-bone-100">Compare</span>
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label mb-1" style={{ fontSize: "9px" }}>
        {label}
      </p>
      <p className="truncate font-mono text-xs text-bone-100 tabular">{value}</p>
    </div>
  );
}
