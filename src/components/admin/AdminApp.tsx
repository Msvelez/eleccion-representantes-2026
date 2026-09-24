"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { User } from "firebase/auth";
import { useElection } from "@/hooks/useElection";
import { isVerifiedUser, signOut } from "@/lib/auth";
import { isAdminEmail, watchAllCandidates, watchTallies } from "@/lib/data";
import { isFirebaseConfigured } from "@/lib/firebase";
import type { Candidate } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/TopBar";
import { EmailGate } from "@/components/experience/EmailGate";
import { OverviewPanel } from "./OverviewPanel";
import { CandidatesPanel } from "./CandidatesPanel";
import { AccessPanel, DatesPanel, VotingPanel } from "./SettingsPanels";
import { ExportPanel, ResultsPanel } from "./ResultsPanel";

const TABS = [
  { id: "resumen", label: "Resumen", icon: "◈" },
  { id: "candidatos", label: "Candidatos", icon: "◉" },
  { id: "fechas", label: "Fases y fechas", icon: "◷" },
  { id: "votacion", label: "Votación", icon: "▶" },
  { id: "resultados", label: "Ganadores", icon: "★" },
  { id: "exportar", label: "Exportar", icon: "⇩" },
  { id: "accesos", label: "Correos y acceso", icon: "✉" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export interface AdminData {
  candidates: Candidate[];
  tallies: Record<string, number>;
}

function Dashboard({ user }: { user: User & { email: string } }) {
  const [tab, setTab] = useState<TabId>("resumen");
  const [data, setData] = useState<AdminData>({ candidates: [], tallies: {} });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onError = (e: Error) => setError(e.message);
    const a = watchAllCandidates((candidates) => setData((d) => ({ ...d, candidates })), onError);
    const b = watchTallies((tallies) => setData((d) => ({ ...d, tallies })), onError);
    return () => {
      a();
      b();
    };
  }, []);

  const pending = data.candidates.filter((c) => c.status === "pending").length;

  return (
    <div className="mx-auto grid min-h-dvh max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-6 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]">
        <Logo />
        <nav aria-label="Secciones de administración" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <ul className="flex gap-2 lg:flex-col">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? "page" : undefined}
                  className={clsx(
                    "flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm transition",
                    tab === t.id ? "bg-magenta text-white" : "text-paper/70 hover:bg-white/5 hover:text-paper",
                  )}
                >
                  <span aria-hidden>{t.icon}</span>
                  {t.label}
                  {t.id === "candidatos" && pending > 0 && (
                    <span className="ml-auto rounded-full bg-neon px-2 text-xs font-medium text-void">{pending}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden space-y-2 text-xs text-muted lg:block">
          <p className="truncate">{user.email}</p>
          <button onClick={() => signOut()} className="underline-offset-4 hover:text-paper hover:underline">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 space-y-6">
        {error && (
          <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
            {error}
          </p>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "resumen" && <OverviewPanel data={data} />}
            {tab === "candidatos" && <CandidatesPanel candidates={data.candidates} />}
            {tab === "fechas" && <DatesPanel />}
            {tab === "votacion" && <VotingPanel />}
            {tab === "resultados" && <ResultsPanel data={data} />}
            {tab === "exportar" && <ExportPanel candidates={data.candidates} />}
            {tab === "accesos" && <AccessPanel />}
          </motion.div>
        </AnimatePresence>
        <button onClick={() => signOut()} className="text-xs text-muted underline-offset-4 hover:underline lg:hidden">
          Cerrar sesión ({user.email})
        </button>
      </main>
    </div>
  );
}

function AdminGuard({ user }: { user: User & { email: string } }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    isAdminEmail(user.email).then((ok) => alive && setAllowed(ok));
    return () => {
      alive = false;
    };
  }, [user.email]);

  if (allowed === null) return <Centered><p className="label-hud text-muted">Verificando credenciales…</p></Centered>;
  if (!allowed) {
    return (
      <Centered>
      <div className="space-y-4">
        <span className="label-hud text-danger">Acceso denegado</span>
        <p>
          <strong className="font-medium">{user.email}</strong> no está registrado como administrador.
        </p>
        <Button variant="ghost" onClick={() => signOut()}>
          Usar otro correo
        </Button>
      </div>
      </Centered>
    );
  }
  return <Dashboard user={user} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="glass hud w-full max-w-md space-y-6 rounded-3xl p-6 sm:p-8">
        <Logo />
        {children}
      </div>
    </div>
  );
}

/** /admin — acceso con enlace mágico + verificación en la colección "admins". */
export function AdminApp() {
  const { user } = useElection();

  if (!isFirebaseConfigured) {
    return <Centered><p className="text-muted">Firebase no está configurado (ver README).</p></Centered>;
  }

  if (isVerifiedUser(user)) {
    return <AdminGuard user={user as User & { email: string }} />;
  }

  return (
    <Centered>
      <EmailGate
        returnTo="/admin"
        institutional={false}
        title="Panel de administración"
        description="Ingresa con el correo registrado como administrador. Te enviaremos un enlace de acceso."
      >
        {(u) => <AdminGuard user={u} />}
      </EmailGate>
    </Centered>
  );
}
