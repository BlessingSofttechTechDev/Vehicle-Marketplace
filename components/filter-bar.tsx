"use client";
import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import type { VehicleCategory, FuelType, Transmission } from "@/lib/types";
import { BRANDS, CATEGORY_LABELS } from "@/lib/data";

export interface Filters {
  category: VehicleCategory | "all";
  priceMax: number;
  years: number[];
  fuels: FuelType[];
  transmissions: Transmission[];
  brands: string[];
  sort: "relevance" | "price-asc" | "price-desc" | "year-desc";
}

export const DEFAULT_FILTERS: Filters = {
  category: "all",
  priceMax: 30000000,
  years: [],
  fuels: [],
  transmissions: [],
  brands: [],
  sort: "relevance",
};

const CATEGORY_CHOICES: Array<{ value: Filters["category"]; label: string }> = [
  { value: "all", label: "Everything" },
  ...(Object.entries(CATEGORY_LABELS) as [VehicleCategory, string][]).map(
    ([value, label]) => ({ value, label })
  ),
];

export function FilterBar({
  filters,
  onChange,
  resultCount,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  resultCount: number;
}) {
  const [brandOpen, setBrandOpen] = useState(false);
  const hasActive =
    filters.years.length ||
    filters.fuels.length ||
    filters.transmissions.length ||
    filters.brands.length ||
    filters.priceMax < 30000000;

  return (
    <div className="sticky top-16 z-30 border-b border-ink-500 bg-ink-900/90 backdrop-blur-xl">
      <div className="mx-auto max-w-[1600px] px-6 py-4 md:px-10">
        {/* Category toggle + results count + sort */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <div className="flex items-center gap-0 overflow-x-auto border border-ink-500">
              {CATEGORY_CHOICES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => onChange({ ...filters, category: c.value })}
                  className={cn(
                    "shrink-0 px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors",
                    filters.category === c.value
                      ? "bg-amber text-ink-900"
                      : "text-bone-300 hover:text-bone-100"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="hidden font-mono text-[11px] text-bone-400 tabular md:block">
              <span className="text-bone-100">{resultCount}</span> listings
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="label">Sort by</label>
            <select
              value={filters.sort}
              onChange={(e) =>
                onChange({ ...filters, sort: e.target.value as Filters["sort"] })
              }
              className="bg-transparent font-mono text-[11px] uppercase tracking-wider text-bone-100 focus:outline-none"
            >
              <option value="relevance">Relevance</option>
              <option value="price-asc">Price — Low to High</option>
              <option value="price-desc">Price — High to Low</option>
              <option value="year-desc">Newest</option>
            </select>
          </div>
        </div>

        {/* Filter chips row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Price slider */}
          <div className="flex items-center gap-3 border border-ink-500 px-4 py-2.5">
            <span className="label">Max Price</span>
            <input
              type="range"
              min={50000}
              max={30000000}
              step={50000}
              value={filters.priceMax}
              onChange={(e) =>
                onChange({ ...filters, priceMax: +e.target.value })
              }
              className="w-32 accent-amber"
            />
            <span className="font-mono text-[11px] text-amber tabular">
              {formatINR(filters.priceMax)}
            </span>
          </div>

          <MultiSelect
            label="Fuel"
            options={["Petrol", "Diesel", "CNG", "Electric", "Hybrid"]}
            selected={filters.fuels}
            onChange={(v) => onChange({ ...filters, fuels: v as FuelType[] })}
          />
          <MultiSelect
            label="Transmission"
            options={["Manual", "Automatic", "DCT", "CVT"]}
            selected={filters.transmissions}
            onChange={(v) =>
              onChange({ ...filters, transmissions: v as Transmission[] })
            }
          />
          <MultiSelect
            label="Year"
            options={[2024, 2023, 2022, 2021, 2020].map(String)}
            selected={filters.years.map(String)}
            onChange={(v) => onChange({ ...filters, years: v.map(Number) })}
          />

          {/* Brand dropdown */}
          <div className="relative">
            <button
              onClick={() => setBrandOpen(!brandOpen)}
              className={cn(
                "flex items-center gap-2 border border-ink-500 px-4 py-2.5 transition-colors",
                filters.brands.length && "border-amber"
              )}
            >
              <span className="label">Brand</span>
              {filters.brands.length > 0 && (
                <span className="font-mono text-[11px] text-amber tabular">
                  {filters.brands.length}
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-bone-400" strokeWidth={1.5} />
            </button>
            {brandOpen && (
              <div className="absolute left-0 top-full z-40 mt-1 max-h-80 w-64 overflow-auto border border-ink-500 bg-ink-800 p-2 shadow-2xl">
                {BRANDS.map((b) => (
                  <label
                    key={b}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-ink-700"
                  >
                    <span
                      className="check-square"
                      data-checked={filters.brands.includes(b)}
                    />
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={filters.brands.includes(b)}
                      onChange={() => {
                        const next = filters.brands.includes(b)
                          ? filters.brands.filter((x) => x !== b)
                          : [...filters.brands, b];
                        onChange({ ...filters, brands: next });
                      }}
                    />
                    <span className="font-mono text-xs text-bone-100">{b}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {hasActive && (
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="flex items-center gap-1.5 px-2 py-2.5 text-bone-400 transition hover:text-signal-red"
            >
              <X className="h-3 w-3" strokeWidth={1.5} />
              <span className="label">Clear</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 border border-ink-500 px-4 py-2.5 transition-colors",
          selected.length && "border-amber"
        )}
      >
        <span className="label">{label}</span>
        {selected.length > 0 && (
          <span className="font-mono text-[11px] text-amber tabular">
            {selected.length}
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-bone-400" strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-56 border border-ink-500 bg-ink-800 p-2 shadow-2xl">
          {options.map((o) => (
            <label
              key={o}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-ink-700"
            >
              <span
                className="check-square"
                data-checked={selected.includes(o)}
              />
              <input
                type="checkbox"
                className="sr-only"
                checked={selected.includes(o)}
                onChange={() => {
                  onChange(
                    selected.includes(o)
                      ? selected.filter((x) => x !== o)
                      : [...selected, o]
                  );
                }}
              />
              <span className="font-mono text-xs text-bone-100">{o}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
