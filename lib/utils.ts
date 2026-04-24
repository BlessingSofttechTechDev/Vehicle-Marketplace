import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(n: number): string {
  // Indian number formatting (lakh/crore)
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function formatINRFull(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function formatKm(n: number): string {
  return `${n.toLocaleString("en-IN")} km`;
}
