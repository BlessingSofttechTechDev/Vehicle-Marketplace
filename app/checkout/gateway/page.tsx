"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Banknote, CreditCard, Loader2, Smartphone, Lock, Check } from "lucide-react";
import { useCheckout } from "@/lib/store";
import { getVehicle } from "@/lib/data";
import { formatINRFull } from "@/lib/utils";

type Method = "upi" | "card" | "netbanking";
type Stage = "select" | "processing" | "success";

export default function GatewayStep() {
  const router = useRouter();
  const { vehicleId, paymentMode, completeBooking } = useCheckout();
  const vehicle = vehicleId ? getVehicle(vehicleId) : null;
  const [method, setMethod] = useState<Method>("upi");
  const [stage, setStage] = useState<Stage>("select");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState({ number: "", name: "", exp: "", cvv: "" });

  if (!vehicle) return null;
  const isBooking = paymentMode === "booking";
  const amount = isBooking
    ? Math.round(vehicle.price * 0.05) + 2500 + 4500
    : vehicle.price + 9500 + 12000 + 4500;

  const submit = () => {
    setStage("processing");
    setTimeout(() => {
      setStage("success");
      completeBooking();
      setTimeout(() => router.push("/checkout/confirmation"), 1600);
    }, 2000);
  };

  return (
    <div>
      <div className="max-w-2xl">
        <p className="label-amber label">Gateway</p>
        <h1 className="mt-4 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
          The <span className="italic">transfer</span>.
        </h1>
        <p className="mt-6 text-bone-300">
          A secure environment. This is a demo — no actual payment is processed.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Gateway */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="border border-ink-500 bg-ink-800"
        >
          <div className="flex items-center justify-between border-b border-ink-500 px-8 py-5">
            <div className="flex items-center gap-3">
              <Lock className="h-3.5 w-3.5 text-signal-sage" strokeWidth={1.5} />
              <p className="font-mono text-[11px] uppercase tracking-wider text-bone-300">
                Secured by Meridian Pay
              </p>
            </div>
            <p className="font-mono text-[11px] text-bone-400 tabular">
              TXN · {Math.random().toString(36).slice(2, 8).toUpperCase()}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {stage === "select" && (
              <motion.div
                key="select"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8"
              >
                <p className="label mb-6">Select method</p>
                <div className="grid grid-cols-3 gap-3">
                  <MethodBtn
                    active={method === "upi"}
                    onClick={() => setMethod("upi")}
                    icon={<Smartphone className="h-4 w-4" strokeWidth={1.5} />}
                    label="UPI"
                  />
                  <MethodBtn
                    active={method === "card"}
                    onClick={() => setMethod("card")}
                    icon={<CreditCard className="h-4 w-4" strokeWidth={1.5} />}
                    label="Card"
                  />
                  <MethodBtn
                    active={method === "netbanking"}
                    onClick={() => setMethod("netbanking")}
                    icon={<Banknote className="h-4 w-4" strokeWidth={1.5} />}
                    label="Netbanking"
                  />
                </div>

                <div className="mt-8 border-t border-ink-500 pt-8">
                  {method === "upi" && (
                    <div>
                      <p className="label mb-3">UPI ID</p>
                      <input
                        type="text"
                        placeholder="yourname@upi"
                        value={upi}
                        onChange={(e) => setUpi(e.target.value)}
                        className="input-base font-mono"
                      />
                      <div className="mt-5 flex items-center gap-3">
                        {["GPay", "PhonePe", "Paytm", "BHIM"].map((a) => (
                          <button
                            key={a}
                            className="border border-ink-500 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-bone-300 transition hover:border-amber hover:text-amber"
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {method === "card" && (
                    <div className="space-y-4">
                      <div>
                        <p className="label mb-3">Card number</p>
                        <input
                          type="text"
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          value={card.number}
                          onChange={(e) => setCard({ ...card, number: e.target.value })}
                          className="input-base font-mono tabular"
                        />
                      </div>
                      <div>
                        <p className="label mb-3">Cardholder name</p>
                        <input
                          type="text"
                          placeholder="AS PRINTED ON CARD"
                          value={card.name}
                          onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })}
                          className="input-base font-mono uppercase"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="label mb-3">Expiry</p>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            maxLength={5}
                            value={card.exp}
                            onChange={(e) => setCard({ ...card, exp: e.target.value })}
                            className="input-base font-mono tabular"
                          />
                        </div>
                        <div>
                          <p className="label mb-3">CVV</p>
                          <input
                            type="password"
                            placeholder="•••"
                            maxLength={3}
                            value={card.cvv}
                            onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                            className="input-base font-mono tabular"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {method === "netbanking" && (
                    <div>
                      <p className="label mb-3">Bank</p>
                      <select className="input-base font-mono">
                        <option>HDFC Bank</option>
                        <option>ICICI Bank</option>
                        <option>State Bank of India</option>
                        <option>Axis Bank</option>
                        <option>Kotak Mahindra</option>
                      </select>
                      <p className="mt-4 font-mono text-[11px] text-bone-400">
                        You will be redirected to your bank&apos;s secure portal.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={submit}
                  className="group mt-10 flex w-full items-center justify-center gap-3 bg-amber py-4 font-mono text-xs uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft"
                >
                  Pay {formatINRFull(Math.round(amount))}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    strokeWidth={2}
                  />
                </button>
              </motion.div>
            )}

            {stage === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center p-16"
              >
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-amber" strokeWidth={1.2} />
                </div>
                <p className="mt-8 font-display text-2xl text-bone-100">Processing</p>
                <p className="mt-2 font-mono text-xs text-bone-400">
                  Do not close this window
                </p>
              </motion.div>
            )}

            {stage === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center justify-center p-16"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
                  className="flex h-16 w-16 items-center justify-center bg-signal-sage pulse-amber"
                >
                  <Check className="h-8 w-8 text-ink-900" strokeWidth={2.5} />
                </motion.div>
                <p className="mt-6 font-display text-3xl text-bone-100">
                  Payment successful
                </p>
                <p className="mt-2 font-mono text-xs text-bone-400">
                  Redirecting to confirmation…
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Summary */}
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="border border-ink-500 bg-ink-800 p-8"
        >
          <p className="label">You are paying for</p>
          <div className="mt-4 aspect-[4/3] overflow-hidden border border-ink-500">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={vehicle.images[0]} alt={vehicle.model} className="h-full w-full object-cover" />
          </div>
          <p className="mt-5 font-display text-2xl text-bone-100">
            {vehicle.brand} {vehicle.model}
          </p>
          <p className="mt-1 font-mono text-[11px] text-bone-400">
            {vehicle.variant} · {vehicle.year}
          </p>
          <div className="mt-6 border-t border-ink-500 pt-5">
            <p className="label">
              {isBooking ? "Reservation amount" : "Full payment"}
            </p>
            <p className="mt-2 font-display text-3xl text-amber tabular">
              {formatINRFull(Math.round(amount))}
            </p>
          </div>
          {isBooking && (
            <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-signal-red">
              Balance due in 5 days
            </p>
          )}
        </motion.aside>
      </div>
    </div>
  );
}

function MethodBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 border py-4 font-mono text-xs uppercase tracking-wider transition ${
        active
          ? "border-amber bg-amber/5 text-amber"
          : "border-ink-500 text-bone-300 hover:border-ink-400 hover:text-bone-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
