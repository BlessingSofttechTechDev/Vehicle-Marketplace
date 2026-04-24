// ─── PRD §3.1 — six supported categories ───
export type VehicleCategory =
  | "car"
  | "bike"
  | "commercial"
  | "construction"
  | "three-wheeler"
  | "farm";

export type FuelType = "Petrol" | "Diesel" | "CNG" | "Electric" | "Hybrid";

export type Transmission = "Manual" | "Automatic" | "DCT" | "CVT" | "NA";

export type HypothecationStatus = "clear" | "hypothecated";

export type VehicleStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "reserved"
  | "sold"
  | "rejected";

export interface Vehicle {
  id: string;
  slug: string;
  brand: string;
  model: string;
  variant: string;
  category: VehicleCategory;
  year: number;
  price: number; // selling price, INR
  kmDriven: number;
  fuel: FuelType;
  transmission: Transmission;
  engineCc: number; // 0 = electric / N/A
  mileageKmpl: number; // 0 = N/A
  owners: number; // owner serial per PRD
  insurance: string; // display text
  location: string; // short label, kept for cards/compare
  color: string;
  images: string[];
  highlights: string[];
  description: string;

  // ─── PRD Phase 1 fields ───
  registrationNumber?: string; // masked, e.g., "MH02 •• 1234"
  registrationState?: string;
  insuranceValidTill?: string; // ISO date
  pucValidTill?: string;
  hypothecation?: HypothecationStatus;
  hypothecationBank?: string;
  yardCity?: string;
  yardAddress?: string;
  odometerPhoto?: string;
  odometerReadingKm?: number;
  rcVerified?: boolean;
  inspectionDone?: boolean;
  status?: VehicleStatus;
  partnerOrgId?: string;
  partnerOrgName?: string;
  contractFloorPrice?: number; // internal — margin = price - contractFloorPrice
}

export interface PartnerOrg {
  id: string;
  name: string;
  gstin: string;
  category: "fleet_leasing" | "logistics" | "construction" | "mobility" | "agri" | "consignment";
  city: string;
  adaContractRef: string;
  onboardedAt: string; // ISO
  vehicleCount: number;
}

export interface CheckoutState {
  vehicleId: string | null;
  documents: {
    pan: boolean;
    aadhaar: boolean;
    license: boolean;
  };
  paymentMode: "full" | "booking" | null;
  agreementAccepted: boolean;
  bookingId: string | null;
}
