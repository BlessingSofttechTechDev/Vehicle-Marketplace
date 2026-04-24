"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { useCheckout } from "@/lib/store";
import { getVehicle } from "@/lib/data";
import { formatINRFull, formatINR } from "@/lib/utils";

export default function PaymentStep() {
  const router = useRouter();
  const { vehicleId, paymentMode, setPaymentMode } = useCheckout();
  const vehicle = vehicleId ? getVehicle(vehicleId) : null;
  if (!vehicle) return null;

  const booking = Math.round(vehicle.price * 0.05);
  const remaining = vehicle.price - booking;

  const onNext = () => {
    if (!paymentMode) return;
    router.push(paymentMode === "booking" ? "/checkout/agreement" : "/checkout/breakdown");
  };

  return (
    <div>
      <div className="max-w-2xl">
        <p className="label-amber label">Step two</p>
        <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
          Reserve, or <span className="italic">acquire</span>.
        </h1>
        <p className="mt-6 text-bone-300">
          Pay the full amount now and take delivery straight away, or hold the vehicle
          with a 5% non-refundable booking and complete payment within 5 days.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setPaymentMode("full")}
          className={`group relative text-left transition-colors ${
            paymentMode === "full"
              ? "border-amber bg-amber/5"
              : "border-ink-500 bg-ink-800 hover:border-ink-400"
          } border p-8`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center border border-amber/40 bg-amber/10">
              <Sparkles className="h-4 w-4 text-amber" strokeWidth={1.5} />
            </div>
            <span
              className={`check-square`}
              data-checked={paymentMode === "full"}
              style={{ borderRadius: "50%" }}
            />
          </div>
          <p className="label-amber label mt-10">Option A</p>
          <h2 className="mt-3 font-display text-4xl text-bone-100">Pay in full</h2>
          <p className="mt-3 text-sm text-bone-400">
            Instant ownership. Paperwork begins within 24 hours. Free delivery anywhere in India.
          </p>
          <div className="mt-10 border-t border-ink-500 pt-6">
            <p className="label">Amount now</p>
            <p className="mt-2 font-display text-3xl text-amber tabular">
              {formatINRFull(vehicle.price)}
            </p>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setPaymentMode("booking")}
          className={`group relative text-left transition-colors ${
            paymentMode === "booking"
              ? "border-amber bg-amber/5"
              : "border-ink-500 bg-ink-800 hover:border-ink-400"
          } border p-8`}
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center border border-ink-400">
              <Clock className="h-4 w-4 text-bone-300" strokeWidth={1.5} />
            </div>
            <span
              className="check-square"
              data-checked={paymentMode === "booking"}
              style={{ borderRadius: "50%" }}
            />
          </div>
          <p className="label mt-10">Option B</p>
          <h2 className="mt-3 font-display text-4xl text-bone-100">Reserve with 5%</h2>
          <p className="mt-3 text-sm text-bone-400">
            Hold the vehicle for 5 days. Booking fee is non-refundable — balance must be cleared within that window.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-6 border-t border-ink-500 pt-6">
            <div>
              <p className="label">Now (5%)</p>
              <p className="mt-2 font-display text-2xl text-amber tabular">
                {formatINR(booking)}
              </p>
            </div>
            <div>
              <p className="label">Later (95%)</p>
              <p className="mt-2 font-display text-2xl text-bone-300 tabular">
                {formatINR(remaining)}
              </p>
            </div>
          </div>
        </motion.button>
      </div>

      <div className="mt-16 flex items-center justify-between border-t border-ink-500 pt-8">
        <p className="font-mono text-[11px] uppercase tracking-wider text-bone-400">
          {paymentMode ? `Selected — Option ${paymentMode === "full" ? "A" : "B"}` : "No option selected"}
        </p>
        <button
          disabled={!paymentMode}
          onClick={onNext}
          className="group flex items-center gap-3 bg-amber px-8 py-4 font-mono text-[11px] uppercase tracking-wider text-ink-900 transition disabled:cursor-not-allowed disabled:bg-ink-500 disabled:text-bone-500 enabled:hover:bg-amber-soft"
        >
          Continue
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-enabled:group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </button>
      </div>
    </div>
  );
}
