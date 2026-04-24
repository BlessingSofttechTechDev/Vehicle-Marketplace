"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface StoredUser {
  email: string;
  name: string;
  passwordHash: string;
  createdAt: number;
}

export interface PublicUser {
  email: string;
  name: string;
}

// Trivial obfuscation — demo only, NOT cryptographic
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return `h${h.toString(36)}_${s.length}`;
}

interface AuthStore {
  users: StoredUser[];
  currentUser: PublicUser | null;
  register: (
    name: string,
    email: string,
    password: string
  ) => { ok: true } | { ok: false; error: string };
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      users: [],
      currentUser: null,
      register: (name, email, password) => {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !password || !name.trim()) {
          return { ok: false, error: "All fields are required." };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          return { ok: false, error: "Please enter a valid email." };
        }
        if (password.length < 6) {
          return { ok: false, error: "Password must be at least 6 characters." };
        }
        const existing = get().users.find((u) => u.email === cleanEmail);
        if (existing) {
          return { ok: false, error: "An account with this email already exists." };
        }
        const user: StoredUser = {
          name: name.trim(),
          email: cleanEmail,
          passwordHash: hash(password),
          createdAt: Date.now(),
        };
        set((s) => ({
          users: [...s.users, user],
          currentUser: { name: user.name, email: user.email },
        }));
        return { ok: true };
      },
      login: (email, password) => {
        const cleanEmail = email.trim().toLowerCase();
        const user = get().users.find((u) => u.email === cleanEmail);
        if (!user) {
          return { ok: false, error: "No account found with this email." };
        }
        if (user.passwordHash !== hash(password)) {
          return { ok: false, error: "Incorrect password." };
        }
        set({ currentUser: { name: user.name, email: user.email } });
        return { ok: true };
      },
      logout: () => set({ currentUser: null }),
    }),
    {
      name: "meridian-auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
