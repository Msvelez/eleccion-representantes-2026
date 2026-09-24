import clsx from "clsx";
import type { ReactNode } from "react";

export function PanelHeader({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <span className="label-hud text-neon">{kicker}</span>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
      </div>
      {children}
    </header>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx("glass rounded-3xl p-5 sm:p-6", className)}>{children}</section>;
}

export function StatTile({ label, value, hint, tone = "paper" }: { label: string; value: ReactNode; hint?: string; tone?: "paper" | "neon" | "magenta" }) {
  return (
    <div className="glass hud rounded-2xl p-5">
      <p className="label-hud text-muted">{label}</p>
      <p
        className={clsx(
          "mt-3 text-4xl font-semibold tabular-nums",
          tone === "neon" && "text-neon",
          tone === "magenta" && "text-magenta-hot",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "ok" | "error"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-xl p-3 text-sm",
        tone === "info" && "bg-white/5 text-muted",
        tone === "ok" && "bg-neon/10 text-neon",
        tone === "error" && "bg-danger/10 text-danger",
      )}
    >
      {children}
    </p>
  );
}

export const STATUS_LABEL = {
  pending: { text: "Pendiente", className: "bg-magenta/20 text-magenta-soft ring-magenta/40" },
  approved: { text: "Aprobado", className: "bg-neon/15 text-neon ring-neon/40" },
  rejected: { text: "Rechazado", className: "bg-danger/15 text-danger ring-danger/40" },
} as const;
