// Generate a 100-row sample bank-asset CSV matching lib/uploads.ts header aliases.
// Run: node scripts/generate-sample-sheet.mjs
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const HEADERS = [
  "HP Number",
  "HP Date",
  "Name of Owner",
  "Asset",
  "Registration Number",
  "Engine Number",
  "Chassis Date",
  "Year of Manufacturing",
  "ORC",
  "State",
  "Zone",
  "Repo Date",
  "Segment",
  "Photo Link",
  "Correctly Placed",
  "Location",
  "Contact Person",
  "Inspection Done",
];

const SEGMENTS = [
  { segment: "Car", assets: ["Maruti Suzuki Swift VXi", "Hyundai i20 Sportz", "Honda City ZX", "Tata Nexon XZ", "Kia Seltos HTK", "Mahindra XUV300 W6", "Toyota Glanza V", "Renault Kwid RXT", "Skoda Slavia Active", "Volkswagen Virtus Comfortline"] },
  { segment: "Two Wheeler", assets: ["Hero Splendor Plus", "Bajaj Pulsar 150", "Honda Activa 6G", "TVS Jupiter ZX", "Royal Enfield Classic 350", "Yamaha FZ-S V3", "Suzuki Access 125", "KTM Duke 200", "Bajaj CT 100", "Hero HF Deluxe"] },
  { segment: "Three Wheeler", assets: ["Bajaj RE Auto Rickshaw", "Piaggio Ape City", "Mahindra Alfa Plus", "TVS King Deluxe", "Atul Gemini DZ"] },
  { segment: "Commercial", assets: ["Tata Ace Gold", "Mahindra Bolero Pickup", "Ashok Leyland Dost+", "Eicher Pro 2049", "Bharat Benz 1217C", "Tata 407 Pickup", "Tata LPT 1109 Truck", "Mahindra Jeeto Plus"] },
  { segment: "Construction", assets: ["JCB 3DX Backhoe Loader", "Tata Hitachi EX 200 Excavator", "Caterpillar 424B Loader", "L&T Komatsu PC 130 Excavator", "Volvo EC210B Excavator"] },
  { segment: "Farm", assets: ["Mahindra 575 DI Tractor", "Sonalika DI 745 III Tractor", "John Deere 5050D Tractor", "Massey Ferguson 1035 DI", "Eicher 380 Super DI Tractor", "Kubota MU4501 Tractor"] },
];

const STATE_ZONES = [
  ["MH", "Maharashtra", "West"],
  ["DL", "Delhi", "North"],
  ["KA", "Karnataka", "South"],
  ["TN", "Tamil Nadu", "South"],
  ["GJ", "Gujarat", "West"],
  ["UP", "Uttar Pradesh", "North"],
  ["WB", "West Bengal", "East"],
  ["RJ", "Rajasthan", "North"],
  ["TS", "Telangana", "South"],
  ["KL", "Kerala", "South"],
  ["PB", "Punjab", "North"],
  ["HR", "Haryana", "North"],
  ["MP", "Madhya Pradesh", "Central"],
  ["AP", "Andhra Pradesh", "South"],
  ["BR", "Bihar", "East"],
];

const CITIES = {
  MH: ["Mumbai", "Pune", "Nashik", "Nagpur"],
  DL: ["New Delhi", "Dwarka", "Rohini"],
  KA: ["Bengaluru", "Mysuru", "Hubli"],
  TN: ["Chennai", "Coimbatore", "Madurai"],
  GJ: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  UP: ["Lucknow", "Noida", "Kanpur", "Varanasi"],
  WB: ["Kolkata", "Howrah", "Siliguri"],
  RJ: ["Jaipur", "Jodhpur", "Udaipur"],
  TS: ["Hyderabad", "Warangal"],
  KL: ["Kochi", "Trivandrum", "Calicut"],
  PB: ["Ludhiana", "Amritsar", "Mohali"],
  HR: ["Gurugram", "Faridabad", "Panipat"],
  MP: ["Indore", "Bhopal", "Gwalior"],
  AP: ["Vijayawada", "Visakhapatnam"],
  BR: ["Patna", "Gaya"],
};

const FIRST_NAMES = ["Rahul", "Priya", "Amit", "Sneha", "Vikas", "Pooja", "Rajesh", "Anjali", "Manoj", "Kavita", "Suresh", "Neha", "Arjun", "Divya", "Sandeep", "Meera", "Karan", "Ritu", "Vivek", "Shruti", "Mohit", "Anita", "Nikhil", "Sunita", "Deepak", "Asha", "Pankaj", "Geeta", "Naveen", "Lakshmi"];
const LAST_NAMES = ["Sharma", "Verma", "Patel", "Reddy", "Kumar", "Singh", "Mehta", "Iyer", "Nair", "Das", "Gupta", "Joshi", "Shah", "Pillai", "Rao", "Khan", "Pandey", "Mishra", "Yadav", "Choudhary"];

const HP_BANKS = ["HDFCB", "ICICIB", "AXISB", "KMBL", "SBINB", "INDB", "YESB"];

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const pad = (n, w = 2) => String(n).padStart(w, "0");

function isoDate(yMin, yMax) {
  const y = yMin + rand(yMax - yMin + 1);
  const m = 1 + rand(12);
  const d = 1 + rand(28);
  return `${y}-${pad(m)}-${pad(d)}`;
}

function regNumber(stateCode) {
  const dist = pad(1 + rand(95));
  const letters = String.fromCharCode(65 + rand(26)) + String.fromCharCode(65 + rand(26));
  const num = pad(1000 + rand(9000), 4);
  return `${stateCode}${dist} ${letters} ${num}`;
}

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const rows = [HEADERS];
const TARGET = 100;

// Distribute roughly: 35 cars, 25 bikes, 8 3W, 18 commercial, 7 construction, 7 farm
const distribution = [
  { idx: 0, count: 35 },
  { idx: 1, count: 25 },
  { idx: 2, count: 8 },
  { idx: 3, count: 18 },
  { idx: 4, count: 7 },
  { idx: 5, count: 7 },
];

let n = 0;
for (const { idx, count } of distribution) {
  const seg = SEGMENTS[idx];
  for (let i = 0; i < count; i++) {
    n++;
    const [stateCode, stateName, zone] = pick(STATE_ZONES);
    const city = pick(CITIES[stateCode]);
    const owner = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const asset = pick(seg.assets);
    const yom = 2014 + rand(11);
    const hpNo = `HP-${pick(HP_BANKS)}-${pad(100000 + n, 6)}`;
    const hpDate = isoDate(yom, yom + 2);
    const chassisDate = isoDate(yom, yom);
    const repoDate = isoDate(2024, 2026);
    const reg = regNumber(stateCode);
    const engineNo = `EN${String.fromCharCode(65 + rand(26))}${rand(10)}${rand(10)}${pad(rand(99999), 5)}`;
    const orc = `ORC-${stateCode}-${pad(10000 + rand(89999), 5)}`;
    const photo = `https://images.example.com/assets/${reg.replace(/\s+/g, "")}.jpg`;
    const placed = Math.random() < 0.85 ? "Yes" : "No";
    const yardLoc = `Yard ${String.fromCharCode(65 + rand(5))}, ${city}`;
    const contact = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} (+91 9${pad(rand(999999999), 9)})`;
    const inspected = Math.random() < 0.2 ? "Yes" : "No";

    rows.push([
      hpNo,
      hpDate,
      owner,
      asset,
      reg,
      engineNo,
      chassisDate,
      yom,
      orc,
      stateName,
      zone,
      repoDate,
      seg.segment,
      photo,
      placed,
      yardLoc,
      contact,
      inspected,
    ]);
  }
}

const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
const out = join(__dirname, "..", "sample-bank-assets.csv");
writeFileSync(out, csv);
console.log(`Wrote ${rows.length - 1} rows to ${out}`);
