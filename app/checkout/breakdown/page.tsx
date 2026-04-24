"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useCheckout } from "@/lib/store";
import { getVehicle } from "@/lib/data";
import { formatINRFull } from "@/lib/utils";

export default function BreakdownStep() {
  const router = useRouter();
  const { vehicleId, paymentMode } = useCheckout();
  const vehicle = vehicleId ? getVehicle(vehicleId) : null;
  if (!vehicle) return null;

  const isBooking = paymentMode === "booking";
  const base = vehicle.price;
  const booking = Math.round(base * 0.05);
  const processing = isBooking ? 2500 : 9500;
  const roadside = 12000;
  const gst = Math.round((isBooking ? booking : base) * 0.18) / 10; // stylised
  const inspection = 4500;
  const amountNow = isBooking ? booking + processing + inspection : base + processing + roadside + inspection;
  const remaining = isBooking ? base - booking + roadside : 0;

  const rows = isBooking
    ? [
        { label: "Booking amount (5%, non-refundable)", value: booking, highlight: true },
        { label: "Inspection & handover", value: inspection },
        { label: "Processing fee", value: processing },
      ]
    : [
        { label: "Vehicle price", value: base, highlight: true },
        { label: "Inspection & handover", value: inspection },
        { label: "Roadside assistance (1 yr)", value: roadside },
        { label: "Processing fee", value: processing },
      ];

  return (
    <div>
      <div className="max-w-2xl">
        <p className="label-amber label">Step {isBooking ? "four" : "three"}</p>
        <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
          The <span className="italic">ledger</span>.
        </h1>
        <p className="mt-6 text-bone-300">
          A full breakdown before you proceed to the gateway. No surprises, no hidden fees.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[2fr_1fr]">
        {/* Breakdown table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="border border-ink-500 bg-ink-800"
        >
          <div className="border-b border-ink-500 px-8 py-5">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="label">Invoice · Pro forma</p>
                <p className="mt-2 font-display text-xl text-bone-100">
                  {vehicle.year} {vehicle.brand} {vehicle.model}
                </p>
              </div>
              <p className="font-mono text-[11px] tabular text-bone-400">
                {new Date().toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>
          <div className="px-8">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-baseline justify-between border-b border-ink-500 py-5"
              >
                <p
                  className={`font-mono text-sm ${
                    r.highlight ? "text-bone-100" : "text-bone-400"
                  }`}
                >
                  {r.label}
                </p>
                <p
                  className={`font-mono text-sm tabular ${
                    r.highlight ? "text-bone-100" : "text-bone-300"
                  }`}
                >
                  {formatINRFull(r.value)}
                </p>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-b border-ink-500 py-5">
              <p className="font-mono text-sm text-bone-400">GST (applicable)</p>
              <p className="font-mono text-sm text-bone-300 tabular">
                {formatINRFull(Math.round(gst))}
              </p>
            </div>
          </div>
          <div className="bg-ink-900 px-8 py-8">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="label-amber label">Total payable now</p>
                <p className="mt-1 font-mono text-[11px] text-bone-400">
                  Inclusive of all fees and taxes
                </p>
              </div>
              <p className="font-display text-4xl text-amber tabular md:text-5xl">
                {formatINRFull(Math.round(amountNow + gst))}
              </p>
            </div>
            {isBooking && (
              <div className="mt-6 flex items-baseline justify-between border-t border-ink-500 pt-5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-bone-400">
                  Remaining due within 5 days
                </p>
                <p className="font-mono text-sm text-signal-red tabular">
                  {formatINRFull(remaining)}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Right side — guarantees */}
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-5"
        >
          <div className="border border-ink-500 bg-ink-800 p-6">
            <ShieldCheck className="h-5 w-5 text-amber" strokeWidth={1.5} />
            <p className="mt-4 font-display text-xl text-bone-100">
              200-point inspection
            </p>
            <p className="mt-2 text-sm text-bone-400">
              Every vehicle is inspected by our workshop before it reaches the listing.
            </p>
          </div>
          <div className="border border-ink-500 bg-ink-800 p-6">
            <p className="font-display text-xl text-bone-100">7-day return</p>
            <p className="mt-2 text-sm text-bone-400">
              Not what you expected? Return within a week of delivery. Subject to handling fee.
            </p>
          </div>
          <div className="border border-ink-500 bg-ink-800 p-6">
            <p className="font-display text-xl text-bone-100">RTO paperwork</p>
            <p className="mt-2 text-sm text-bone-400">
              We handle transfer of ownership and insurance endorsement on your behalf.
            </p>
          </div>
        </motion.aside>
      </div>

      <div className="mt-12 flex items-center justify-between border-t border-ink-500 pt-8">
        <button
          onClick={() => router.back()}
          className="font-mono text-[11px] uppercase tracking-wider text-bone-400 transition hover:text-bone-100"
        >
          ← Back
        </button>
        <button
          onClick={() => router.push("/checkout/gateway")}
          className="group flex items-center gap-3 bg-amber px-8 py-4 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft"
        >
          Proceed to payment
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </button>
      </div>
    </div>
  );
}
