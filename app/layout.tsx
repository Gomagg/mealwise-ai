import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MEALWISE AI — Eat Better. Spend Smarter. Waste Less.",
  description:
    "MEALWISE AI creates personalized meal plans, calculates grocery lists, and helps you eat better without overspending.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
