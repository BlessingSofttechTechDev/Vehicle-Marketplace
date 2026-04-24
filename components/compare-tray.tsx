"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { useCompare } from "@/lib/store";
import { getVehicle } from "@/lib/data";
import { formatINR } from "@/lib/utils";

export function CompareTray() {
  const { ids, remove, clear } = useCompare();

  return (
    <AnimatePresence>
      {ids.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-500 bg-ink-800/95 backdrop-blur-xl"
        >
          <div className="mx-auto flex max-w-[1600px] items-center gap-6 px-6 py-4 md:px-10">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs uppercase tracking-wider text-amber">
                Compare
              </span>
              <span className="font-mono text-[11px] text-bone-400 tabular">
                {ids.length}/3
              </span>
            </div>

            <div className="hairline hidden h-6 w-px bg-ink-500 md:block" />

            <div className="flex flex-1 items-center gap-3 overflow-x-auto">
              {ids.map((id) => {
                const v = getVehicle(id);
                if (!v) return null;
                return (
                  <div
                    key={id}
                    className="group flex shrink-0 items-center gap-3 border border-ink-500 py-1 pl-1 pr-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.images[0]}
                      alt={v.model}
                      className="h-10 w-14 object-cover"
                    />
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-bone-400">
                        {v.brand}
                      </p>
                      <p className="font-display text-sm leading-tight text-bone-100">
                        {v.model}
                      </p>
                    </div>
                    <p className="hidden font-mono text-[11px] text-amber tabular sm:block">
                      {formatINR(v.price)}
                    </p>
                    <button
                      onClick={() => remove(id)}
                      className="text-bone-400 transition hover:text-signal-red"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                );
              })}
              {Array.from({ length: 3 - ids.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="hidden h-12 w-32 shrink-0 border border-dashed border-ink-500 md:block"
                />
              ))}
            </div>

            <button
              onClick={clear}
              className="label hidden transition hover:text-signal-red md:inline"
            >
              Clear
            </button>

            <Link
              href="/compare"
              className={`group flex items-center gap-3 bg-amber px-6 py-3 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition-all ${
                ids.length < 2 ? "pointer-events-none opacity-40" : "hover:bg-amber-soft"
              }`}
            >
              Compare Now
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
