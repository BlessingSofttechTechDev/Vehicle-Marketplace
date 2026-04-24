"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Download, Copy, Calendar, MapPin } from "lucide-react";
import { useCheckout } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useAcquisitions } from "@/lib/acquisitions";
import { getVehicle } from "@/lib/data";
import { formatINRFull } from "@/lib/utils";

export default function ConfirmationStep() {
  const { vehicleId, paymentMode, bookingId } = useCheckout();
  const currentUser = useAuth((s) => s.currentUser);
  const addAcquisition = useAcquisitions((s) => s.add);
  const vehicle = vehicleId ? getVehicle(vehicleId) : null;
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ d: 5, h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!vehicle || !bookingId || !paymentMode || !currentUser) return;
    const amountPaid =
      paymentMode === "booking"
        ? Math.round(vehicle.price * 0.05)
        : vehicle.price;
    addAcquisition({
      bookingId,
      vehicleId: vehicle.id,
      userEmail: currentUser.email,
      userName: currentUser.name,
      paymentMode,
      status: paymentMode === "booking" ? "reserved" : "owned",
      priceAtAcquisition: vehicle.price,
      amountPaid,
      acquiredAt: Date.now(),
    });
  }, [vehicle, bookingId, paymentMode, currentUser, addAcquisition]);

  useEffect(() => {
    if (paymentMode !== "booking") return;
    const end = Date.now() + 5 * 24 * 60 * 60 * 1000;
    const id = setInterval(() => {
      const diff = end - Date.now();
      const d = Math.floor(diff / (24 * 60 * 60 * 1000));
      const h = Math.floor((diff / (60 * 60 * 1000)) % 24);
      const m = Math.floor((diff / (60 * 1000)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft({ d, h, m, s });
    }, 1000);
    return () => clearInterval(id);
  }, [paymentMode]);

  if (!vehicle) return null;
  const isBooking = paymentMode === "booking";
  const displayId = bookingId || "MER-PENDING";

  const copy = () => {
    navigator.clipboard.writeText(displayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start gap-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex h-14 w-14 shrink-0 items-center justify-center bg-signal-sage"
          >
            <Check className="h-7 w-7 text-ink-900" strokeWidth={2.5} />
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="label-amber label">
              {isBooking ? "Reservation confirmed" : "Acquisition complete"}
            </p>
            <h1 className="mt-3 font-display text-5xl font-light leading-tight text-bone-100 md:text-6xl">
              {isBooking ? (
                <>
                  Your <span className="italic">{vehicle.model}</span>
                  <br />
                  is <span className="text-amber">held</span>.
                </>
              ) : (
                <>
                  Welcome to the <br />
                  <span className="italic">{vehicle.model}</span>.
                </>
              )}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-bone-300">
              {isBooking
                ? "We've taken the vehicle off the market and begun preparing it for handover. Complete the remaining payment within the next 5 days to finalise ownership."
                : "Registration transfer and logistics are underway. Our team will contact you within 24 hours to schedule inspection and delivery."}
            </p>
          </div>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          {/* Receipt */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="border border-ink-500 bg-ink-800"
          >
            <div className="border-b border-ink-500 p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="label">Booking reference</p>
                  <div className="mt-2 flex items-center gap-3">
                    <p className="font-mono text-2xl text-amber tabular">{displayId}</p>
                    <button
                      onClick={copy}
                      className="text-bone-400 transition hover:text-amber"
                      aria-label="Copy"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-signal-sage" strokeWidth={1.5} />
                      ) : (
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </div>
                <button className="flex items-center gap-2 border border-ink-500 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bone-300 transition hover:border-amber hover:text-amber">
                  <Download className="h-3 w-3" strokeWidth={1.5} />
                  Receipt
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="flex items-start gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vehicle.images[0]}
                  alt={vehicle.model}
                  className="h-24 w-32 object-cover"
                />
                <div>
                  <p className="label">{vehicle.brand}</p>
                  <p className="mt-2 font-display text-2xl text-bone-100">
                    {vehicle.model}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-bone-400">
                    {vehicle.variant} · {vehicle.year}
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-4 border-t border-ink-500 pt-6">
                <ReceiptRow label="Status" value={isBooking ? "Reserved · 5% paid" : "Owned"} amber />
                <ReceiptRow label="Total price" value={formatINRFull(vehicle.price)} />
                <ReceiptRow
                  label={isBooking ? "Paid now" : "Paid in full"}
                  value={formatINRFull(
                    isBooking ? Math.round(vehicle.price * 0.05) : vehicle.price
                  )}
                />
                {isBooking && (
                  <ReceiptRow
                    label="Remaining balance"
                    value={formatINRFull(Math.round(vehicle.price * 0.95))}
                    warning
                  />
                )}
              </div>
            </div>
          </motion.div>

          {/* Countdown / Next steps */}
          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-5"
          >
            {isBooking && (
              <div className="border border-signal-red/40 bg-signal-red/5 p-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-signal-red" />
                  <p className="font-mono text-[10px] uppercase tracking-wider text-signal-red">
                    Time to complete payment
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-2">
                  <CountdownCell value={timeLeft.d} label="Days" />
                  <CountdownCell value={timeLeft.h} label="Hours" />
                  <CountdownCell value={timeLeft.m} label="Mins" />
                  <CountdownCell value={timeLeft.s} label="Secs" />
                </div>
                <p className="mt-5 font-mono text-[11px] text-bone-300">
                  If not paid, booking amount is forfeited per agreement.
                </p>
              </div>
            )}

            <div className="border border-ink-500 bg-ink-800 p-6">
              <p className="label mb-4">What happens next</p>
              <ul className="space-y-4">
                <NextItem
                  icon={<Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  title="Inspection scheduling"
                  body="Our concierge will call within 24 hours to align on a delivery date."
                />
                <NextItem
                  icon={<MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />}
                  title="Delivery to your location"
                  body={`The vehicle ships from ${vehicle.location} on flat-bed. Complimentary pan-India.`}
                />
              </ul>
            </div>

            <Link
              href="/account/acquisitions"
              className="block border border-amber/60 bg-amber/5 p-6 transition hover:border-amber"
            >
              <p className="font-mono text-[11px] uppercase tracking-wider text-amber">
                My acquisitions
              </p>
              <p className="mt-2 font-display text-xl text-bone-100">
                View your garage →
              </p>
            </Link>

            <Link
              href="/"
              className="block border border-ink-500 bg-ink-800 p-6 transition hover:border-amber"
            >
              <p className="font-mono text-[11px] uppercase tracking-wider text-bone-400">
                Continue exploring
              </p>
              <p className="mt-2 font-display text-xl text-bone-100">
                Return to marketplace →
              </p>
            </Link>
          </motion.aside>
        </div>
      </motion.div>
    </div>
  );
}

function ReceiptRow({
  label,
  value,
  amber,
  warning,
}: {
  label: string;
  value: string;
  amber?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <p className="font-mono text-[11px] uppercase tracking-wider text-bone-400">{label}</p>
      <p
        className={`font-mono text-sm tabular ${
          amber ? "text-amber" : warning ? "text-signal-red" : "text-bone-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CountdownCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="border border-ink-500 bg-ink-900 p-3 text-center">
      <p className="font-display text-3xl text-bone-100 tabular">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-bone-400">
        {label}
      </p>
    </div>
  );
}

function NextItem({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-ink-500 text-amber">
        {icon}
      </div>
      <div>
        <p className="font-mono text-sm text-bone-100">{title}</p>
        <p className="mt-1 text-xs text-bone-400">{body}</p>
      </div>
    </li>
  );
}
