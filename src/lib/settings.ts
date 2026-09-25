import type { Settings } from "./types";

/** Colombia no tiene horario de verano: todas las fechas se interpretan en UTC-5. */
export const TIMEZONE = "America/Bogota";
const BOGOTA_OFFSET = "-05:00";

/** "2026-10-15T00:00" (hora Bogotá) → Date */
export function fromBogotaInput(value: string): Date {
  return new Date(`${value}:00${BOGOTA_OFFSET}`);
}

/** Date → "2026-10-15T00:00" (hora Bogotá) para inputs datetime-local */
export function toBogotaInput(date: Date): string {
  const shifted = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 16);
}

export function formatBogota(date: Date, withTime = true): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "long",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

/** Valores usados si todavía no existe config/settings en Firestore. */
export const DEFAULT_SETTINGS: Settings = {
  electionName: "Misión Representante 2026",
  applicationsClose: fromBogotaInput("2026-10-15T00:00"),
  votingStart: fromBogotaInput("2026-10-26T08:00"),
  votingEnd: fromBogotaInput("2026-10-28T18:00"),
  votingMode: "auto",
  resultsPublished: false,
  seats: 2,
  allowAnyEmail: true,
  emailDomains: ["unbosque.edu.co"],
  restrictToRoll: false,
  eligibleVoters: 0,
};

/** ¿Este correo puede postularse y votar según la configuración? */
export function isAllowedEmail(email: string, settings: Settings): boolean {
  if (settings.allowAnyEmail) return /^[^\s@]+@[^\s@]+$/.test(email.trim());
  const domain = email.trim().toLowerCase().split("@")[1];
  return Boolean(domain) && settings.emailDomains.includes(domain);
}
