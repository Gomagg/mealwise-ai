import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "lime" | "amber" | "gray" | "red" }) {
  const tones = {
    green: "bg-forest-50 text-forest-700",
    lime: "bg-lime-soft text-forest-800",
    amber: "bg-amber-50 text-amber-800",
    gray: "bg-forest-50/70 text-forest-600",
    red: "bg-red-50 text-red-700",
  };
  return <span className={cn("pill", tones[tone])}>{children}</span>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("card p-5", className)}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-forest-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-forest-950">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-forest-500">{hint}</p> : null}
    </div>
  );
}

export function Empty({ title, body, cta, href }: { title: string; body: string; cta?: string; href?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lime-soft text-2xl">🥗</div>
      <h3 className="text-base font-semibold text-forest-900">{title}</h3>
      <p className="max-w-sm text-sm text-forest-600">{body}</p>
      {cta && href ? (
        <Link href={href} className="btn-primary mt-1">
          {cta}
        </Link>
      ) : null}
    </div>
  );
}

export function Progress({ value, tone = "forest" }: { value: number; tone?: "forest" | "lime" | "amber" }) {
  const colors = { forest: "bg-forest-600", lime: "bg-lime-accent", amber: "bg-amber-400" };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-forest-100">
      <div className={cn("h-full rounded-full", colors[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="h-section">{title}</h2>
        {sub ? <p className="muted mt-0.5">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}
