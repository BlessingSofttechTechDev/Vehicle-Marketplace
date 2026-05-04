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

const SEED_ACQUISITIONS: Acquisition[] = [
  {
    bookingId: "MER-2026-0411",
    vehicleId: "v-009",
    userEmail: "rohan.mehta@gmail.com",
    userName: "Rohan Mehta",
    paymentMode: "full",
    status: "owned",
    priceAtAcquisition: 2950000,
    amountPaid: 2850000,
    acquiredAt: Date.parse("2026-04-19"),
  },
  {
    bookingId: "MER-2026-0419",
    vehicleId: "v-013",
    userEmail: "customer@meridian.com",
    userName: "Meridian Customer",
    paymentMode: "full",
    status: "owned",
    priceAtAcquisition: 4450000,
    amountPaid: 4450000,
    acquiredAt: Date.parse("2026-04-21"),
  },
  {
    bookingId: "MER-2026-0422",
    vehicleId: "v-002",
    userEmail: "aryan.khurana@gmail.com",
    userName: "Aryan Khurana",
    paymentMode: "booking",
    status: "reserved",
    priceAtAcquisition: 12200000,
    amountPaid: 610000,
    acquiredAt: Date.parse("2026-04-22"),
  },
  {
    bookingId: "MER-2026-0424",
    vehicleId: "v-103",
    userEmail: "shreya.gupta@gmail.com",
    userName: "Shreya Gupta",
    paymentMode: "full",
    status: "owned",
    priceAtAcquisition: 650000,
    amountPaid: 650000,
    acquiredAt: Date.parse("2026-04-24"),
  },
  {
    bookingId: "MER-2026-0425",
    vehicleId: "v-204",
    userEmail: "deepak.singh@gmail.com",
    userName: "Deepak Singh",
    paymentMode: "booking",
    status: "reserved",
    priceAtAcquisition: 850000,
    amountPaid: 42500,
    acquiredAt: Date.parse("2026-04-25"),
  },
  {
    bookingId: "MER-2026-0426",
    vehicleId: "v-301",
    userEmail: "ironworks.ranchi@gmail.com",
    userName: "Ironworks Ranchi",
    paymentMode: "full",
    status: "owned",
    priceAtAcquisition: 1800000,
    amountPaid: 1800000,
    acquiredAt: Date.parse("2026-04-26"),
  },
  {
    bookingId: "MER-2026-0427",
    vehicleId: "v-303",
    userEmail: "bharat.builders@gmail.com",
    userName: "Bharat Builders",
    paymentMode: "booking",
    status: "reserved",
    priceAtAcquisition: 1200000,
    amountPaid: 60000,
    acquiredAt: Date.parse("2026-04-27"),
  },
  {
    bookingId: "MER-2026-0428",
    vehicleId: "v-007",
    userEmail: "customer@meridian.com",
    userName: "Meridian Customer",
    paymentMode: "booking",
    status: "reserved",
    priceAtAcquisition: 1650000,
    amountPaid: 82500,
    acquiredAt: Date.parse("2026-04-28"),
  },
  {
    bookingId: "MER-2026-0408",
    vehicleId: "v-008",
    userEmail: "suresh.pillai@gmail.com",
    userName: "Suresh Pillai",
    paymentMode: "booking",
    status: "cancelled",
    priceAtAcquisition: 1450000,
    amountPaid: 72500,
    acquiredAt: Date.parse("2026-04-08"),
  },
  {
    bookingId: "MER-2026-0429",
    vehicleId: "v-202",
    userEmail: "kabir.malhotra@gmail.com",
    userName: "Kabir Malhotra",
    paymentMode: "full",
    status: "owned",
    priceAtAcquisition: 480000,
    amountPaid: 480000,
    acquiredAt: Date.parse("2026-04-29"),
  },
];

export const useAcquisitions = create<AcquisitionsStore>()(
  persist(
    (set, get) => ({
      items: SEED_ACQUISITIONS,
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
      name: "meridian-acquisitions-v3",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      merge: (persisted, current) => {
        const p = persisted as Partial<AcquisitionsStore> | undefined;
        const items = p?.items?.length ? p.items : SEED_ACQUISITIONS;
        return { ...current, ...p, items };
      },
    }
  )
);
