"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/lib/store";

export default function CheckoutIndex() {
  const router = useRouter();
  const vehicleId = useCheckout((s) => s.vehicleId);
  useEffect(() => {
    router.replace(vehicleId ? "/checkout/documents" : "/");
  }, [router, vehicleId]);
  return null;
}
