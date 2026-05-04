export interface Yard {
  id: string;
  name: string;
  city: string; // must match Vehicle.yardCity exactly
  region: string;
  managerEmail: string;
}

export const YARDS: Yard[] = [
  {
    id: "y-lko",
    name: "Lucknow",
    city: "Lucknow",
    region: "North",
    managerEmail: "lucknow@meridian.com",
  },
  {
    id: "y-delncr",
    name: "Delhi NCR",
    city: "Delhi NCR",
    region: "North",
    managerEmail: "delhi-ncr@meridian.com",
  },
  {
    id: "y-ran",
    name: "Ranchi",
    city: "Ranchi",
    region: "East",
    managerEmail: "ranchi@meridian.com",
  },
];

export interface YardManagerCredential {
  email: string;
  password: string;
  name: string;
  yardId: string;
}

export const YARD_MANAGERS: YardManagerCredential[] = [
  {
    email: "lucknow@meridian.com",
    password: "yard123",
    name: "Lucknow Yard Manager",
    yardId: "y-lko",
  },
  {
    email: "delhi-ncr@meridian.com",
    password: "yard123",
    name: "Delhi NCR Yard Manager",
    yardId: "y-delncr",
  },
  {
    email: "ranchi@meridian.com",
    password: "yard123",
    name: "Ranchi Yard Manager",
    yardId: "y-ran",
  },
];

export function getYardById(id: string): Yard | undefined {
  return YARDS.find((y) => y.id === id);
}

export function getYardForEmail(
  email: string | undefined | null
): Yard | undefined {
  if (!email) return undefined;
  const e = email.trim().toLowerCase();
  const m = YARD_MANAGERS.find((x) => x.email === e);
  return m ? getYardById(m.yardId) : undefined;
}

export function isYardManager(email: string | undefined | null): boolean {
  return getYardForEmail(email) !== undefined;
}
