import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const SYMBOLS: Record<string, string> = {
  NGN: "₦", USD: "$", GBP: "£", EUR: "€", CAD: "CA$", AUD: "A$", GHS: "₵", KES: "KSh", ZAR: "R",
};

export function money(n: number, currency: string): string {
  const sym = SYMBOLS[currency] ?? currency + " ";
  const v = round2(n);
  return `${sym}${v.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: v % 1 === 0 ? 0 : 2 })}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function prettyDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function label(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
