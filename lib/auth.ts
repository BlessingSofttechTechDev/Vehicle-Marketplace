"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface PublicUser {
  email: string;
  name: string;
}

interface DemoCredential {
  email: string;
  password: string;
  name: string;
}

export const DEMO_CREDENTIALS: { admin: DemoCredential; customer: DemoCredential } = {
  admin: {
    email: "admin@meridian.com",
    password: "meridian123",
    name: "Meridian Admin",
  },
  customer: {
    email: "customer@meridian.com",
    password: "customer123",
    name: "Meridian Customer",
  },
};

const ALLOWED = [DEMO_CREDENTIALS.admin, DEMO_CREDENTIALS.customer];

interface AuthStore {
  currentUser: PublicUser | null;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      currentUser: null,
      login: (email, password) => {
        const cleanEmail = email.trim().toLowerCase();
        const match = ALLOWED.find(
          (c) => c.email === cleanEmail && c.password === password
        );
        if (!match) {
          return { ok: false, error: "Invalid email or password." };
        }
        set({ currentUser: { name: match.name, email: match.email } });
        return { ok: true };
      },
      logout: () => set({ currentUser: null }),
    }),
    {
      name: "meridian-auth-v2",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
