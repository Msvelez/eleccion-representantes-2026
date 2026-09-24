"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { useElection } from "@/hooks/useElection";
import {
  friendlyError,
  isVerifiedUser,
  microsoftEnabled,
  sendMagicLink,
  signInWithMicrosoft,
  signOut,
} from "@/lib/auth";
import { isInstitutionalEmail } from "@/lib/settings";
import { Button } from "@/components/ui/Button";

interface EmailGateProps {
  /** Ruta a la que regresa el enlace mágico. */
  returnTo: string;
  /** Exigir dominio institucional (postulación y voto). */
  institutional?: boolean;
  title: string;
  description: string;
  children: (user: User & { email: string }) => ReactNode;
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="h-5 w-5" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

/**
 * Confirma la identidad con la cuenta Microsoft institucional o con un enlace mágico enviado al correo.
 * Solo cuando el correo está verificado muestra el contenido protegido.
 */
export function EmailGate({ returnTo, institutional = true, title, description, children }: EmailGateProps) {
  const { user, authLoading, settings } = useElection();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [showEmail, setShowEmail] = useState(!microsoftEnabled);

  if (authLoading) {
    return <div className="grid place-items-center p-10 label-hud text-muted">Cargando…</div>;
  }

  if (isVerifiedUser(user)) {
    if (institutional && !isInstitutionalEmail(user.email, settings)) {
      return (
        <div className="space-y-4 p-2 text-center">
          <p className="text-lg">
            Entraste como <strong className="font-medium">{user.email}</strong>, pero no es un correo institucional
            permitido.
          </p>
          <Button variant="ghost" onClick={() => signOut()}>
            Usar otro correo
          </Button>
        </div>
      );
    }
    return <>{children(user)}</>;
  }

  const domains = settings.emailDomains.map((d) => `@${d}`).join(" o ");

  async function microsoft() {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithMicrosoft();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSigningIn(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Escribe un correo válido.");
      return;
    }
    if (institutional && !isInstitutionalEmail(value, settings)) {
      setError(`Usa tu correo institucional (${domains}).`);
      return;
    }
    setSending(true);
    try {
      await sendMagicLink(value, returnTo);
      setSentTo(value);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {sentTo ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="space-y-5 text-center"
          role="status"
        >
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-neon/10 text-4xl ring-1 ring-neon/50 motion-safe:animate-float">
            ✉️
          </div>
          <h3 className="text-2xl">Revisa tu bandeja de entrada</h3>
          <p className="text-muted">
            Enviamos un enlace de acceso a <strong className="font-medium text-paper">{sentTo}</strong>. Ábrelo en este
            mismo navegador para continuar. Esta pantalla se actualizará sola.
          </p>
          <div className="glass mx-auto max-w-md rounded-2xl p-4 text-left text-sm">
            <p className="label-hud mb-2 text-neon">¿No lo ves? Puede tardar unos minutos</p>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>
                Busca en <strong className="font-medium text-paper">Correo no deseado</strong> y en la pestaña{" "}
                <strong className="font-medium text-paper">Otros</strong> de Outlook.
              </li>
              <li>
                Lo envía <strong className="font-medium text-paper">noreply@{process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "firebaseapp.com"}</strong>
              </li>
              <li>Si está en no deseado, márcalo como seguro y abre el enlace desde ahí.</li>
            </ul>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSentTo(null)}>
              Usar otro correo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={sending}
              onClick={async () => {
                setSending(true);
                try {
                  await sendMagicLink(sentTo, returnTo);
                } catch (err) {
                  setError(friendlyError(err));
                } finally {
                  setSending(false);
                }
              }}
            >
              Reenviar enlace
            </Button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={submit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <span className="label-hud text-neon">Verificación de identidad</span>
            <h3 className="text-2xl sm:text-3xl">{title}</h3>
            <p className="text-muted">{description}</p>
          </div>
          {microsoftEnabled && (
            <div className="space-y-3">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                loading={signingIn}
                onClick={microsoft}
                className="w-full bg-paper! text-void! hover:bg-mist!"
              >
                <MicrosoftLogo />
                Entrar con mi cuenta de la universidad
              </Button>
              <p className="text-center text-xs text-muted">
                Usa tu correo y contraseña de Outlook institucional (@{settings.emailDomains[0]}).
              </p>
              {!showEmail && (
                <button
                  type="button"
                  onClick={() => setShowEmail(true)}
                  className="mx-auto block text-xs text-muted underline-offset-4 hover:text-paper hover:underline"
                >
                  ¿Problemas? Recibir un enlace por correo
                </button>
              )}
            </div>
          )}
          {microsoftEnabled && showEmail && (
            <div className="flex items-center gap-3 text-xs text-muted" aria-hidden>
              <span className="h-px flex-1 bg-white/10" />o recibe un enlace por correo
              <span className="h-px flex-1 bg-white/10" />
            </div>
          )}
          {showEmail && (
          <>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Correo {institutional ? "institucional" : ""}</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={institutional ? `tuusuario@${settings.emailDomains[0]}` : "tu@correo.com"}
              className="field"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "email-error" : undefined}
            />
          </label>
          <Button type="submit" variant={microsoftEnabled ? "ghost" : "primary"} loading={sending} className="w-full sm:w-auto">
            Enviarme el enlace de acceso
          </Button>
          </>
          )}
          {error && (
            <p id="email-error" role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </motion.form>
      )}
    </AnimatePresence>
  );
}
