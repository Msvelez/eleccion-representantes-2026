import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  OAuthProvider,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
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

/** Inicio de sesión con Google (Gmail): entra al instante, sin esperar ningún correo. */
export const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === "true";

export async function signInWithGoogle(): Promise<void> {
  const { auth } = firebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if ((error as { code?: string }).code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

/**
 * Inicio de sesión con la cuenta Microsoft de la universidad (Outlook institucional).
 * La app registrada en Microsoft Entra es de un solo inquilino: solo cuentas de ese
 * directorio pueden entrar, así que el correo que entrega Microsoft es confiable.
 */
export const microsoftTenant = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID || "";
export const microsoftEnabled = Boolean(microsoftTenant);

export async function signInWithMicrosoft(): Promise<void> {
  const { auth } = firebase();
  const provider = new OAuthProvider("microsoft.com");
  provider.setCustomParameters({ tenant: microsoftTenant, prompt: "select_account" });
  provider.addScope("email");
  provider.addScope("profile");
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    // Algunos navegadores móviles bloquean ventanas emergentes: probamos con redirección.
    if ((error as { code?: string }).code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

/** Sesión con correo comprobado: por Google, por enlace mágico o por la cuenta Microsoft institucional. */
export function isVerifiedUser(user: User | null): user is User & { email: string } {
  if (!user?.email) return false;
  return user.emailVerified || user.providerData.some((p) => p.providerId === "microsoft.com");
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
      "Este método de acceso no está habilitado en Firebase Authentication (ver README).",
    "auth/popup-closed-by-user": "Cerraste la ventana de inicio de sesión antes de terminar. Intenta de nuevo.",
    "auth/cancelled-popup-request": "Cerraste la ventana de inicio de sesión antes de terminar. Intenta de nuevo.",
    "auth/account-exists-with-different-credential":
      "Este correo ya entró antes con enlace por correo. Usa esa misma opción para continuar.",
    "auth/unauthorized-domain": "Este sitio no está autorizado en Firebase Authentication (dominios autorizados).",
    "storage/unauthorized": "No fue posible subir el archivo (tamaño o formato no permitido).",
    unavailable: "El servicio no está disponible. Intenta de nuevo en unos segundos.",
  };
  if (map[code]) return map[code];
  if (error instanceof Error && error.message && !code) return error.message;
  return "Algo salió mal. Intenta de nuevo.";
}
