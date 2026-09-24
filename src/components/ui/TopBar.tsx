"use client";

import Link from "next/link";
import clsx from "clsx";
import { useElection } from "@/hooks/useElection";
import { PHASE_STEPS, phaseStepIndex } from "@/lib/phase";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="Misión Representante, inicio">
      <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-magenta shadow-[0_0_30px_-4px_rgb(209_0_101/0.9)] transition group-hover:rotate-6">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="white" strokeWidth="2" aria-hidden>
          <path d="M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7l7-4z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight sm:text-base">Misión Representante</span>
        <span className="label-hud block text-[0.58rem] text-muted">Creación Digital · UnBosque</span>
      </span>
    </Link>
  );
}

/** Barra de progreso de la "misión": las 4 fases como niveles. */
export function PhaseTrack() {
  const { phase } = useElection();
  const current = phaseStepIndex(phase);
  return (
    <nav aria-label="Fases del proceso">
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {PHASE_STEPS.map((step, i) => {
          const state = i < current ? "done" : i === current ? "active" : "locked";
          return (
            <li key={step.id} className="flex items-center gap-1.5 sm:gap-2">
              <span
                aria-current={state === "active" ? "step" : undefined}
                className={clsx(
                  "label-hud flex items-center gap-1.5 rounded-full px-2 py-1 text-[0.6rem] transition sm:px-3",
                  state === "active" && "bg-magenta/20 text-paper ring-1 ring-magenta-hot",
                  state === "done" && "text-neon",
                  state === "locked" && "text-white/30",
                )}
              >
                <span aria-hidden>{state === "done" ? "✓" : step.level}</span>
                <span className={clsx(state === "active" ? "inline" : "hidden lg:inline")}>{step.label}</span>
                <span className="sr-only">
                  {state === "done" ? " (completada)" : state === "locked" ? " (bloqueada)" : " (actual)"}
                </span>
              </span>
              {i < PHASE_STEPS.length - 1 && (
                <span className={clsx("h-px w-3 sm:w-6", i < current ? "bg-neon" : "bg-white/15")} aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-void/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo />
        <PhaseTrack />
      </div>
    </header>
  );
}
