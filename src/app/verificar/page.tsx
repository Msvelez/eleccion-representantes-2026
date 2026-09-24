"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { completeMagicLink, friendlyError, isMagicLink, rememberedEmail } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/TopBar";

type Status = "checking" | "need-email" | "signing" | "done" | "error";

/** Solo se permiten rutas internas como destino, para evitar redirecciones abiertas. */
function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get("next") ?? "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function VerifyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function finish(address: string) {
    setStatus("signing");
    try {
      await completeMagicLink(address, window.location.href);
      setStatus("done");
      window.setTimeout(() => router.replace(safeNext()), 900);
    } catch (err) {
      setError(friendlyError(err));
      setStatus("error");
    }
  }

  useEffect(() => {
    if (!isFirebaseConfigured || !isMagicLink(window.location.href)) {
      setError("Este enlace no es válido o ya fue utilizado.");
      setStatus("error");
      return;
    }
    const saved = rememberedEmail();
    if (saved) finish(saved);
    else setStatus("need-email");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass hud w-full max-w-md space-y-6 rounded-3xl p-6 sm:p-8"
      >
        <Logo />
        {(status === "checking" || status === "signing") && (
          <div className="space-y-3" role="status">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-[marquee_1.2s_linear_infinite] bg-neon" />
            </div>
            <p className="label-hud text-muted">Confirmando tu identidad…</p>
          </div>
        )}
        {status === "need-email" && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              finish(email);
            }}
          >
            <p>Abriste el enlace en otro dispositivo o navegador. Confirma tu correo para continuar.</p>
            <input
              type="email"
              required
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tuusuario@unbosque.edu.co"
              aria-label="Correo"
            />
            <Button type="submit" className="w-full">
              Confirmar
            </Button>
          </form>
        )}
        {status === "done" && (
          <p role="status" className="text-lg">
            <span className="text-neon">✓</span> Correo confirmado. Volviendo a la misión…
          </p>
        )}
        {status === "error" && (
          <div className="space-y-4" role="alert">
            <p className="text-danger">{error}</p>
            <Button variant="ghost" onClick={() => router.replace("/")}>
              Volver al inicio
            </Button>
          </div>
        )}
      </motion.div>
    </main>
  );
}
