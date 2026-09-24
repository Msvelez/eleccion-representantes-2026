"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useElection } from "@/hooks/useElection";
import { useApprovedCandidates } from "@/hooks/useCandidates";
import { useUrlAction } from "@/hooks/useUrlAction";
import { getOwnVote } from "@/lib/data";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import { Modal } from "@/components/ui/Modal";
import { CandidateCard } from "./CandidateCard";
import { CandidateProfile } from "./CandidateProfile";
import { VoteFlow } from "./VoteFlow";

const COLS_DESKTOP = 3;

export function Votacion() {
  const { settings, user } = useElection();
  const { candidates, loading } = useApprovedCandidates();
  const { action, candidate: candidateParam } = useUrlAction();
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<"closed" | "profile" | "vote">("closed");
  const [hasVoted, setHasVoted] = useState(false);
  const tileRefs = useRef<(HTMLLIElement | null)[]>([]);

  const current = candidates[active];

  // Retoma el voto tras volver del enlace de verificación.
  useEffect(() => {
    if (action !== "votar" || !candidateParam || !candidates.length) return;
    const idx = candidates.findIndex((c) => c.id === candidateParam);
    if (idx >= 0) {
      setActive(idx);
      setMode("vote");
    }
  }, [action, candidateParam, candidates]);

  useEffect(() => {
    if (!user?.email || !user.emailVerified) return setHasVoted(false);
    getOwnVote(user.email)
      .then((v) => setHasVoted(Boolean(v)))
      .catch(() => setHasVoted(false));
  }, [user]);

  function onKeyDown(e: React.KeyboardEvent) {
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: COLS_DESKTOP,
      ArrowUp: -COLS_DESKTOP,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = Math.min(candidates.length - 1, Math.max(0, active + moves[e.key]));
    setActive(next);
    tileRefs.current[next]?.querySelector("button")?.focus();
  }

  return (
    <section className="mx-auto max-w-7xl space-y-10 px-4 pb-24 pt-10 sm:px-6">
      <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-neon/10 px-3 py-1.5 ring-1 ring-neon/40">
            <span className="h-2 w-2 rounded-full bg-neon motion-safe:animate-pulse" />
            <span className="label-hud text-neon">Nivel 03 · Votación abierta</span>
          </span>
          <h1 className="text-[clamp(2.2rem,6vw,4.5rem)] leading-[1.05]">
            Elige al próximo <span className="text-gradient">representante</span>
          </h1>
          <p className="max-w-xl text-muted">
            Explora el roster, abre cada perfil y elige a tu candidato. Tienes un voto por correo institucional.
          </p>
          {hasVoted && (
            <p className="label-hud inline-flex items-center gap-2 rounded-full bg-neon px-3 py-1.5 text-void">
              ✓ Ya registraste tu voto
            </p>
          )}
        </motion.div>
        {settings.votingMode === "auto" && (
          <div className="w-full max-w-md">
            <Countdown target={settings.votingEnd} title="La votación cierra en" />
          </div>
        )}
      </header>

      {loading && <p className="label-hud text-muted">Cargando roster…</p>}
      {!loading && candidates.length === 0 && (
        <p className="glass rounded-2xl p-6 text-muted">Todavía no hay candidatos aprobados para votar.</p>
      )}

      {current && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          {/* Vitrina del personaje activo (escritorio) */}
          <div className="hidden lg:block">
            <div className="glass hud sticky top-28 overflow-hidden rounded-3xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
                >
                  <div className="relative aspect-[3/4]">
                    <Avatar name={current.name} src={current.photoURL} className="absolute inset-0 h-full w-full" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-plum/80" />
                    <span className="label-hud absolute left-4 top-4 rounded-md bg-void/70 px-2 py-1 text-neon">
                      P{String(active + 1).padStart(2, "0")} · Seleccionado
                    </span>
                  </div>
                  <div className="flex flex-col justify-between gap-6 p-6">
                    <div className="space-y-3">
                      <p className="label-hud text-magenta-soft">Semestre {String(current.semester).padStart(2, "0")}</p>
                      <h2 className="text-3xl leading-tight">{current.name}</h2>
                      <p className="line-clamp-6 text-sm leading-relaxed text-paper/80">{current.contribution}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="ghost" onClick={() => setMode("profile")}>
                        Ver perfil
                      </Button>
                      <Button onClick={() => setMode("vote")} disabled={hasVoted}>
                        {hasVoted ? "Ya votaste" : "Votar"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Roster de selección */}
          <div className="space-y-4">
            <p className="label-hud hidden text-muted lg:block">Usa ← → ↑ ↓ para recorrer el roster</p>
            <ul
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
              onKeyDown={onKeyDown}
              aria-label="Candidatos"
            >
              {candidates.map((c, i) => (
                <motion.li
                  key={c.id}
                  ref={(el) => {
                    tileRefs.current[i] = el;
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 220, damping: 20 }}
                >
                  <CandidateCard
                    candidate={c}
                    index={i}
                    compact
                    active={i === active}
                    onFocus={() => setActive(i)}
                    onSelect={() => {
                      setActive(i);
                      setMode("profile");
                    }}
                  />
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Modal
        open={mode !== "closed" && Boolean(current)}
        onClose={() => setMode("closed")}
        label={mode === "vote" ? "Confirmar voto" : `Perfil de ${current?.name ?? ""}`}
        className={mode === "vote" ? "sm:max-w-lg" : "sm:max-w-5xl"}
      >
        {current && mode === "profile" && (
          <CandidateProfile
            candidate={current}
            index={active}
            actions={
              <Button size="lg" className="w-full" onClick={() => setMode("vote")} disabled={hasVoted}>
                {hasVoted ? "Ya registraste tu voto" : `Votar por ${current.name.split(" ")[0]}`}
              </Button>
            }
          />
        )}
        {current && mode === "vote" && (
          <div className="p-6 sm:p-8">
            <VoteFlow candidate={current} candidates={candidates} onVoted={() => setHasVoted(true)} />
          </div>
        )}
      </Modal>
    </section>
  );
}
