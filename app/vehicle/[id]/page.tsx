"use client";
import { useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Heart, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Nav } from "@/components/nav";
import { CompareTray } from "@/components/compare-tray";
import { getVehicle, VEHICLES } from "@/lib/data";
import { useCheckout, useCompare } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { formatINR, formatINRFull, formatKm } from "@/lib/utils";

export default function VehiclePage({
  params,
}: {
  params: { id: string };
}) {
  const vehicle = getVehicle(params.id);
  const router = useRouter();
  const { ids, toggle, wishlist, toggleWishlist } = useCompare();
  const startCheckout = useCheckout((s) => s.startCheckout);
  const currentUser = useAuth((s) => s.currentUser);
  const [activeImage, setActiveImage] = useState(0);

  if (!vehicle) return notFound();

  const similar = VEHICLES.filter(
    (v) => v.id !== vehicle.id && v.category === vehicle.category
  ).slice(0, 4);
  const isSelected = ids.includes(vehicle.id);
  const isWishlisted = wishlist.includes(vehicle.id);

  const onBuy = () => {
    startCheckout(vehicle.id);
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent("/checkout/documents")}`);
      return;
    }
    router.push("/checkout/documents");
  };

  return (
    <div className="min-h-screen">
      <Nav />

      <div className="mx-auto max-w-[1600px] px-6 py-8 md:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-bone-400 transition hover:text-amber"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="font-mono text-[11px] uppercase tracking-wider">
            Back to marketplace
          </span>
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          {/* Gallery */}
          <div>
            <motion.div
              key={activeImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="relative aspect-[4/3] overflow-hidden border border-ink-500 bg-ink-800"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vehicle.images[activeImage]}
                alt={vehicle.model}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-4 top-4 bg-ink-900/80 px-3 py-1.5 backdrop-blur">
                <p className="font-mono text-[10px] uppercase tracking-wider text-amber">
                  {vehicle.category}
                </p>
              </div>
              <button
                onClick={() => toggleWishlist(vehicle.id)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center bg-ink-900/80 backdrop-blur transition hover:text-amber"
              >
                <Heart
                  className="h-4 w-4"
                  strokeWidth={1.5}
                  fill={isWishlisted ? "#D4A574" : "none"}
                  stroke={isWishlisted ? "#D4A574" : "#F4F1EB"}
                />
              </button>
            </motion.div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {vehicle.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative aspect-[4/3] overflow-hidden border transition-colors ${
                    activeImage === i ? "border-amber" : "border-ink-500 hover:border-ink-400"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            <p className="label-amber label">{vehicle.brand}</p>
            <h1 className="mt-3 font-display text-5xl font-light leading-[0.95] text-bone-100 md:text-6xl">
              {vehicle.model}
            </h1>
            <p className="mt-3 font-mono text-sm text-bone-400">{vehicle.variant}</p>

            <div className="mt-8 flex items-baseline gap-4">
              <p className="font-display text-4xl text-amber tabular">
                {formatINRFull(vehicle.price)}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-wider text-bone-400">
                All inclusive
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-bone-300">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="font-mono text-xs">{vehicle.location}</span>
            </div>

            {/* Highlights */}
            <div className="mt-10 border-y border-ink-500 py-6">
              <p className="label mb-4">Highlights</p>
              <ul className="space-y-2.5">
                {vehicle.highlights.map((h) => (
                  <li key={h} className="flex items-baseline gap-3">
                    <span className="text-amber">—</span>
                    <span className="text-sm text-bone-100">{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key specs grid */}
            <div className="mt-8 grid grid-cols-3 gap-6">
              <DetailStat label="Year" value={vehicle.year.toString()} />
              <DetailStat label="KM Driven" value={formatKm(vehicle.kmDriven).replace(" km", "")} />
              <DetailStat label="Owners" value={vehicle.owners.toString()} />
              <DetailStat label="Fuel" value={vehicle.fuel} />
              <DetailStat label="Transmission" value={vehicle.transmission} />
              <DetailStat
                label="Engine"
                value={vehicle.engineCc > 0 ? `${vehicle.engineCc} cc` : "—"}
              />
            </div>

            {/* CTA */}
            <div className="mt-10 flex flex-col gap-3">
              <button
                onClick={onBuy}
                className="group flex items-center justify-center gap-3 bg-amber px-8 py-4 font-mono text-xs uppercase tracking-wider text-ink-900 transition hover:bg-amber-soft"
              >
                Acquire this vehicle
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
              </button>
              <button
                onClick={() => toggle(vehicle.id)}
                className="flex items-center justify-center gap-3 border border-ink-500 px-8 py-4 font-mono text-xs uppercase tracking-wider text-bone-100 transition hover:border-amber hover:text-amber"
              >
                <span className="check-square" data-checked={isSelected} />
                {isSelected ? "Added to comparison" : "Add to comparison"}
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        <section className="mt-20 grid gap-10 border-t border-ink-500 pt-12 md:grid-cols-[1fr_2fr]">
          <p className="label">On this machine</p>
          <p className="max-w-3xl font-display text-2xl font-light leading-relaxed text-bone-100 md:text-3xl">
            {vehicle.description}
          </p>
        </section>

        {/* Full specs table */}
        <section className="mt-20 border-t border-ink-500 pt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl text-bone-100">Specifications</h2>
            <p className="label tabular">12 attributes</p>
          </div>
          <div className="mt-8 grid gap-0 md:grid-cols-2">
            {[
              ["Brand", vehicle.brand],
              ["Model", vehicle.model],
              ["Variant", vehicle.variant],
              ["Year", vehicle.year.toString()],
              ["KM Driven", formatKm(vehicle.kmDriven)],
              ["Owners", vehicle.owners.toString()],
              ["Fuel Type", vehicle.fuel],
              ["Transmission", vehicle.transmission],
              ["Engine", vehicle.engineCc > 0 ? `${vehicle.engineCc} cc` : "Electric"],
              ["Mileage", vehicle.mileageKmpl > 0 ? `${vehicle.mileageKmpl} km/l` : "—"],
              ["Colour", vehicle.color],
              ["Insurance", vehicle.insurance],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between border-b border-ink-500 py-4"
              >
                <p className="font-mono text-[11px] uppercase tracking-wider text-bone-400">
                  {k}
                </p>
                <p className="font-mono text-sm text-bone-100 tabular">{v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Similar vehicles */}
        <section className="mt-20 border-t border-ink-500 pt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl text-bone-100">
              Similar <span className="italic text-amber">machines</span>
            </h2>
            <Link href="/" className="label transition hover:text-amber">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((s) => (
              <Link
                key={s.id}
                href={`/vehicle/${s.id}`}
                className="group block border border-ink-500 bg-ink-800 transition-colors hover:border-amber"
              >
                <div className="card-image-wrap relative aspect-[4/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.images[0]}
                    alt={s.model}
                    className="card-image h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <p className="label">{s.brand}</p>
                  <p className="mt-1 font-display text-lg text-bone-100">{s.model}</p>
                  <p className="mt-2 font-mono text-xs text-amber tabular">
                    {formatINR(s.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <CompareTray />
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label mb-1.5">{label}</p>
      <p className="font-display text-lg text-bone-100 tabular">{value}</p>
    </div>
  );
}
