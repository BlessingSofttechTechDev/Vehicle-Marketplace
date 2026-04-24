"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useCheckout } from "@/lib/store";
import { getVehicle } from "@/lib/data";
import { formatINRFull, formatINR } from "@/lib/utils";

export default function AgreementStep() {
  const router = useRouter();
  const { vehicleId, acceptAgreement, agreementAccepted } = useCheckout();
  const vehicle = vehicleId ? getVehicle(vehicleId) : null;
  const [accepted, setAccepted] = useState(agreementAccepted);
  if (!vehicle) return null;

  const booking = Math.round(vehicle.price * 0.05);
  const remaining = vehicle.price - booking;

  const onNext = () => {
    acceptAgreement();
    router.push("/checkout/breakdown");
  };

  return (
    <div>
      <div className="max-w-2xl">
        <p className="label-amber label">Step three</p>
        <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
          The <span className="italic">agreement</span>.
        </h1>
        <p className="mt-6 text-bone-300">
          Before we reserve the vehicle, please read the following conditions carefully.
          This is a binding agreement between you and Meridian Motors Pvt. Ltd.
        </p>
      </div>

      {/* Paper-like agreement */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="paper mt-12 max-h-[60vh] overflow-y-auto p-10 md:p-14"
      >
        <div className="relative">
          <div className="flex items-baseline justify-between border-b border-ink-500/20 pb-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
              Agreement No. MER-{vehicle.id.slice(-6).toUpperCase()}
            </p>
            <p className="font-mono text-[10px] tabular text-ink-500">
              Dated: {new Date().toLocaleDateString("en-IN")}
            </p>
          </div>

          <h2 className="mt-8 font-display text-4xl text-ink-900">
            Booking &amp; Reservation
            <br />
            <span className="italic">Agreement</span>
          </h2>

          <div className="mt-10 space-y-6 font-display text-lg leading-relaxed text-ink-900">
            <p>
              This Agreement is entered into between the Purchaser and Meridian Motors
              Private Limited (&ldquo;the Seller&rdquo;) for the reservation of the vehicle described
              herein: <strong>{vehicle.year} {vehicle.brand} {vehicle.model} {vehicle.variant}</strong>,
              bearing a total consideration of <strong>{formatINRFull(vehicle.price)}</strong>.
            </p>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                Clause 1 — Booking Amount
              </p>
              <p className="mt-2">
                The Purchaser agrees to pay a booking amount equivalent to 5% of the total
                consideration — <strong>{formatINR(booking)}</strong> — as a non-refundable
                reservation fee, held against the vehicle for a period of five (5) calendar days.
              </p>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                Clause 2 — Completion of Payment
              </p>
              <p className="mt-2">
                The remaining balance of <strong>{formatINR(remaining)}</strong> must be
                remitted in full on or before the fifth (5th) day from the date of booking.
                On receipt, the Seller shall transfer registration and deliver the vehicle within
                seven business days.
              </p>
            </div>

            {/* The dramatic warning clause */}
            <div className="relative my-8 border-l-4 border-signal-red bg-signal-red/5 p-6">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-signal-red" strokeWidth={1.8} />
                <p className="font-mono text-[10px] uppercase tracking-wider text-signal-red">
                  Clause 3 — Forfeiture
                </p>
              </div>
              <p className="font-display text-xl leading-snug text-signal-red">
                If the remaining 95% payment is not completed within 5 days, the booking
                amount shall be forfeited in its entirety and is non-refundable under any
                circumstance.
              </p>
              <p className="mt-3 font-mono text-[11px] text-signal-red/80">
                This clause is non-negotiable and enforced without exception.
              </p>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                Clause 4 — Inspection &amp; Returns
              </p>
              <p className="mt-2">
                The Purchaser is entitled to a physical inspection upon delivery and a
                seven-day return window from the date of handover, subject to Meridian&apos;s
                inspection protocol and a nominal handling charge.
              </p>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                Clause 5 — Governing Law
              </p>
              <p className="mt-2">
                This Agreement shall be governed by the laws of the Republic of India and
                disputes shall be subject to the exclusive jurisdiction of the courts of Mumbai.
              </p>
            </div>
          </div>

          <div className="mt-12 border-t border-ink-500/20 pt-6 text-center">
            <p className="font-display text-2xl italic text-ink-900">Meridian Motors</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
              Mumbai · India
            </p>
          </div>
        </div>
      </motion.div>

      <label className="mt-8 flex cursor-pointer items-start gap-4 border border-ink-500 bg-ink-800 p-5">
        <span
          className="check-square mt-0.5"
          data-checked={accepted}
          onClick={() => setAccepted(!accepted)}
        />
        <input
          type="checkbox"
          className="sr-only"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <div>
          <p className="font-mono text-sm text-bone-100">
            I have read and agree to the terms of this Booking &amp; Reservation Agreement.
          </p>
          <p className="mt-1 font-mono text-[11px] text-bone-400">
            I specifically acknowledge Clause 3 on the forfeiture of the booking amount.
          </p>
        </div>
      </label>

      <div className="mt-10 flex items-center justify-between border-t border-ink-500 pt-8">
        <button
          onClick={() => router.back()}
          className="font-mono text-[11px] uppercase tracking-wider text-bone-400 transition hover:text-bone-100"
        >
          ← Back
        </button>
        <button
          disabled={!accepted}
          onClick={onNext}
          className="group flex items-center gap-3 bg-amber px-8 py-4 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition disabled:cursor-not-allowed disabled:bg-ink-500 disabled:text-bone-500 enabled:hover:bg-amber-soft"
        >
          Accept &amp; Continue
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-enabled:group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </button>
      </div>
    </div>
  );
}
