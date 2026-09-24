import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { firebase } from "./firebase";

const EMAIL_KEY = "mision:emailForSignIn";

/**
 * Envía un enlace mágico al correo. Abrirlo confirma que la persona es dueña
 * del correo institucional (sin contraseñas).
 * @param returnTo ruta a la que volver tras confirmar, p. ej. "/?accion=votar&candidato=abc"
 */
export async function sendMagicLink(email: string, returnTo: string): Promise<void> {
  const { auth } = firebase();
  const normalized = email.trim().toLowerCase();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const url = `${window.location.origin}${basePath}/verificar/?next=${encodeURIComponent(returnTo)}`;
  await sendSignInLinkToEmail(auth, normalized, { url, handleCodeInApp: true });
  try {
    window.localStorage.setItem(EMAIL_KEY, normalized);
  } catch {
    /* almacenamiento no disponible: se pedirá el correo al volver */
  }
}

export function isMagicLink(href: string): boolean {
  return isSignInWithEmailLink(firebase().auth, href);
}

export function rememberedEmail(): string | null {
  try {
    return window.localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export async function completeMagicLink(email: string, href: string): Promise<void> {
  await signInWithEmailLink(firebase().auth, email.trim().toLowerCase(), href);
  try {
    window.localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* sin almacenamiento */
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(firebase().auth);
}

/** Traduce errores de Firebase a mensajes para personas. */
export function friendlyError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "permission-denied":
      "La acción no está permitida en este momento (fase cerrada, correo no habilitado o registro duplicado).",
    "auth/invalid-email": "Ese correo no parece válido.",
    "auth/invalid-action-code": "El enlace ya se usó o expiró. Solicita uno nuevo.",
    "auth/expired-action-code": "El enlace expiró. Solicita uno nuevo.",
    "auth/quota-exceeded": "Se alcanzó el límite de correos por hoy. Intenta más tarde.",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet e inténtalo otra vez.",
    "auth/operation-not-allowed":
      "El inicio con enlace por correo no está habilitado en Firebase Authentication (ver README).",
    "storage/unauthorized": "No fue posible subir el archivo (tamaño o formato no permitido).",
    unavailable: "El servicio no está disponible. Intenta de nuevo en unos segundos.",
  };
  if (map[code]) return map[code];
  if (error instanceof Error && error.message && !code) return error.message;
  return "Algo salió mal. Intenta de nuevo.";
}
