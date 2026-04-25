"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AcquisitionStatus = "reserved" | "owned" | "cancelled";

export interface Acquisition {
  bookingId: string;
  vehicleId: string;
  userEmail: string;
  userName: string;
  paymentMode: "full" | "booking";
  status: AcquisitionStatus;
  priceAtAcquisition: number;
  amountPaid: number;
  acquiredAt: number;
}

interface AcquisitionsStore {
  items: Acquisition[];
  add: (a: Acquisition) => void;
  setStatus: (bookingId: string, status: AcquisitionStatus) => void;
  remove: (bookingId: string) => void;
  forEmail: (email: string) => Acquisition[];
}

export const ADMIN_EMAILS = ["admin@meridian.com"];

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export const useAcquisitions = create<AcquisitionsStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (a) =>
        set((s) => {
          if (s.items.some((x) => x.bookingId === a.bookingId)) return s;
          return { items: [a, ...s.items] };
        }),
      setStatus: (bookingId, status) =>
        set((s) => ({
          items: s.items.map((x) =>
            x.bookingId === bookingId ? { ...x, status } : x
          ),
        })),
      remove: (bookingId) =>
        set((s) => ({ items: s.items.filter((x) => x.bookingId !== bookingId) })),
      forEmail: (email) => {
        const e = email.trim().toLowerCase();
        return get().items.filter((x) => x.userEmail === e);
      },
    }),
    {
      name: "meridian-acquisitions",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
