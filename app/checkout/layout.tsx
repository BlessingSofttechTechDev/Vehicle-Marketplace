"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useCheckout } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { getVehicle } from "@/lib/data";
import { formatINRFull } from "@/lib/utils";

const STEPS = [
  { slug: "documents", label: "Documents" },
  { slug: "payment", label: "Payment" },
  { slug: "agreement", label: "Agreement" },
  { slug: "breakdown", label: "Breakdown" },
  { slug: "gateway", label: "Gateway" },
  { slug: "confirmation", label: "Confirmation" },
];

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { vehicleId, paymentMode } = useCheckout();
  const currentUser = useAuth((s) => s.currentUser);
  const vehicle = vehicleId ? getVehicle(vehicleId) : null;
  const current = STEPS.findIndex((s) => pathname.endsWith(s.slug));

  useEffect(() => {
    if (!currentUser) {
      const next = encodeURIComponent(
        vehicleId ? `/vehicle/${vehicleId}` : pathname
      );
      router.replace(`/login?next=${next}`);
      return;
    }
    if (!vehicleId && pathname !== "/checkout") {
      router.replace("/");
    }
  }, [vehicleId, pathname, router, currentUser]);

  // Steps rendered depends on payment mode (agreement only for booking)
  const visibleSteps = STEPS.filter(
    (s) => !(s.slug === "agreement" && paymentMode === "full")
  );

  if (!vehicle) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-sm text-bone-400">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Minimal checkout nav */}
      <header className="sticky top-0 z-40 border-b border-ink-500 bg-ink-900/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 md:px-10">
          <Link
            href={`/vehicle/${vehicle.id}`}
            className="flex items-center gap-2 text-bone-400 transition hover:text-amber"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="font-mono text-[11px] uppercase tracking-wider">Abort</span>
          </Link>
          <Link href="/" className="font-display text-xl text-bone-100">
            Meridian
          </Link>
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-bone-400">
                {vehicle.brand} · {vehicle.year}
              </p>
              <p className="font-mono text-xs text-amber tabular">
                {formatINRFull(vehicle.price)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="border-b border-ink-500">
        <div className="mx-auto max-w-[1400px] px-6 py-6 md:px-10">
          <div className="flex items-center gap-1 overflow-x-auto">
            {visibleSteps.map((step, i) => {
              const isCurrent = pathname.endsWith(step.slug);
              const isPast = current > STEPS.findIndex((s) => s.slug === step.slug);
              return (
                <div key={step.slug} className="flex items-center gap-1">
                  <div
                    className={`flex items-center gap-3 px-3 py-2 transition ${
                      isCurrent
                        ? "text-amber"
                        : isPast
                          ? "text-bone-300"
                          : "text-bone-500"
                    }`}
                  >
                    <span className="font-mono text-[10px] tabular">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider">
                      {step.label}
                    </span>
                  </div>
                  {i < visibleSteps.length - 1 && (
                    <span className="h-px w-6 bg-ink-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-6 py-12 md:px-10 md:py-16">
        {children}
      </main>
    </div>
  );
}
