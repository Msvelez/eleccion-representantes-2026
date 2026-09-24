import type { Phase, Settings } from "./types";

/**
 * Determina la fase activa a partir de la configuración y la hora actual.
 * Es la misma lógica que aplican las reglas de Firestore, así que la interfaz
 * y el servidor siempre coinciden.
 */
export function computePhase(settings: Settings, now: Date): Phase {
  if (settings.resultsPublished) return "resultados";
  if (settings.votingMode === "open") return "votacion";
  if (settings.votingMode === "closed") return "escrutinio";

  const t = now.getTime();
  if (t < settings.applicationsClose.getTime()) return "convocatoria";
  if (t < settings.votingStart.getTime()) return "presentacion";
  if (t < settings.votingEnd.getTime()) return "votacion";
  return "escrutinio";
}

/** Próximo instante en el que la fase cambia sola (para el contador). */
export function nextTransition(settings: Settings, phase: Phase): Date | null {
  if (settings.votingMode !== "auto") return null;
  if (phase === "convocatoria") return settings.applicationsClose;
  if (phase === "presentacion") return settings.votingStart;
  if (phase === "votacion") return settings.votingEnd;
  return null;
}

export const PHASE_STEPS: { id: Phase; level: string; label: string }[] = [
  { id: "convocatoria", level: "01", label: "Convocatoria" },
  { id: "presentacion", level: "02", label: "Candidatos" },
  { id: "votacion", level: "03", label: "Votación" },
  { id: "resultados", level: "04", label: "Resultados" },
];

export function phaseStepIndex(phase: Phase): number {
  if (phase === "escrutinio") return 3;
  return PHASE_STEPS.findIndex((s) => s.id === phase);
}

export const PHASES: Phase[] = ["convocatoria", "presentacion", "votacion", "escrutinio", "resultados"];
