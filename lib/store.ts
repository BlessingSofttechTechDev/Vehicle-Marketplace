"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface CompareStore {
  ids: string[];
  wishlist: string[];
  toggle: (id: string) => void;
  toggleWishlist: (id: string) => void;
  clear: () => void;
  remove: (id: string) => void;
}

export const useCompare = create<CompareStore>()(
  persist(
    (set, get) => ({
      ids: [],
      wishlist: [],
      toggle: (id) => {
        const { ids } = get();
        if (ids.includes(id)) {
          set({ ids: ids.filter((x) => x !== id) });
        } else if (ids.length < 3) {
          set({ ids: [...ids, id] });
        }
      },
      toggleWishlist: (id) => {
        const { wishlist } = get();
        set({
          wishlist: wishlist.includes(id)
            ? wishlist.filter((x) => x !== id)
            : [...wishlist, id],
        });
      },
      clear: () => set({ ids: [] }),
      remove: (id) => set({ ids: get().ids.filter((x) => x !== id) }),
    }),
    {
      name: "meridian-compare",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface CheckoutStore {
  vehicleId: string | null;
  documents: { pan: boolean; aadhaar: boolean; license: boolean };
  paymentMode: "full" | "booking" | null;
  agreementAccepted: boolean;
  bookingId: string | null;
  startCheckout: (vehicleId: string) => void;
  setDocument: (doc: "pan" | "aadhaar" | "license", v: boolean) => void;
  setPaymentMode: (m: "full" | "booking") => void;
  acceptAgreement: () => void;
  completeBooking: () => void;
  reset: () => void;
}

const initialCheckout = {
  vehicleId: null,
  documents: { pan: false, aadhaar: false, license: false },
  paymentMode: null,
  agreementAccepted: false,
  bookingId: null,
};

export const useCheckout = create<CheckoutStore>()((set) => ({
  ...initialCheckout,
  startCheckout: (vehicleId) => set({ ...initialCheckout, vehicleId }),
  setDocument: (doc, v) =>
    set((s) => ({ documents: { ...s.documents, [doc]: v } })),
  setPaymentMode: (paymentMode) => set({ paymentMode }),
  acceptAgreement: () => set({ agreementAccepted: true }),
  completeBooking: () =>
    set({
      bookingId: `MER-${Date.now().toString(36).toUpperCase()}`,
    }),
  reset: () => set(initialCheckout),
}));
