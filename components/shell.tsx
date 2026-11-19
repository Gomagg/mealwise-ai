"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, CalendarRange, Sparkles, BookOpen, ShoppingBasket, ChartLine,
  PackageOpen, Users, Wallet, Settings, MessageCircle, Menu, X, Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plans", label: "My Meal Plans", icon: CalendarRange },
  { href: "/planner", label: "AI Meal Planner", icon: Sparkles },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/grocery", label: "Grocery Lists", icon: ShoppingBasket },
  { href: "/nutrition", label: "Nutrition Tracker", icon: ChartLine },
  { href: "/pantry", label: "Pantry", icon: PackageOpen },
  { href: "/household", label: "Family & Household", icon: Users },
  { href: "/budget", label: "Budget Insights", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ name, plan }: { name: string; plan: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const content = (
    <div className="flex h-full flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-700 text-white">
          <Leaf size={18} />
        </span>
        <span>
          <span className="block text-sm font-bold tracking-tight text-forest-950">MEALWISE AI</span>
          <span className="block text-[10px] font-medium uppercase tracking-widest text-forest-500">Eat well · spend less</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-forest-700 text-white" : "text-forest-700 hover:bg-forest-50"
              )}
            >
              <Icon size={17} className={active ? "text-lime-accent" : "text-forest-400"} />
              {label}
            </Link>
          );
        })}
        <Link
          href="/assistant"
          onClick={() => setOpen(false)}
          className={cn(
            "mt-3 flex items-center gap-3 rounded-xl border border-forest-100 px-3 py-2.5 text-sm font-medium",
            pathname.startsWith("/assistant") ? "bg-forest-700 text-white" : "text-forest-700 hover:bg-forest-50"
          )}
        >
          <MessageCircle size={17} className="text-lime-accent" />
          AI Food Assistant
        </Link>
      </nav>
      <div className="border-t border-forest-100 p-4">
        <p className="truncate text-sm font-semibold text-forest-900">{name}</p>
        <p className="text-xs capitalize text-forest-500">{plan.replace("_", " ")} plan</p>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-xl border border-forest-200 bg-white p-2.5 shadow-card lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>
      <aside className="hidden w-64 shrink-0 border-r border-forest-100 bg-white lg:block">{content}</aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-forest-950/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 p-2 text-forest-500" aria-label="Close navigation">
              <X size={18} />
            </button>
            {content}
          </div>
        </div>
      ) : null}
    </>
  );
}
