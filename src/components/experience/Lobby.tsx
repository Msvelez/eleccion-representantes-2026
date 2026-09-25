"use client";

import { motion } from "motion/react";
import { useElection } from "@/hooks/useElection";
import { useApprovedCandidates } from "@/hooks/useCandidates";
import { formatBogota } from "@/lib/settings";
import { Roster } from "./Roster";

/** Espacio libre al final de la sala: invita a postularse. */
function OpenSlot({ onJoin, first }: { onJoin: () => void; first: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onJoin}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="group grid aspect-[3/4] w-full place-items-center rounded-2xl border-2 border-dashed border-white/15 text-center transition hover:border-magenta-hot hover:bg-magenta/10"
    >
      <span className="space-y-3 px-4">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/5 text-3xl text-muted ring-1 ring-white/10 transition group-hover:bg-magenta group-hover:text-white">
          +
        </span>
        <span className="block font-medium">{first ? "Sé la primera persona" : "¿Y tú?"}</span>
        <span className="label-hud block text-[0.6rem] text-muted">Entrar a la sala</span>
      </span>
    </motion.button>
  );
}

/**
 * Sala de candidatos: cada postulación aparece aquí en vivo, como un personaje
 * listo esperando el inicio de la votación.
 */
export function Lobby({ onJoin }: { onJoin: () => void }) {
  const { settings } = useElection();
  const { candidates, loading } = useApprovedCandidates();

  return (
    <section id="sala" aria-labelledby="sala-title" className="mt-24 scroll-mt-24 space-y-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-neon" />
            </span>
            <span className="label-hud text-neon">Sala de espera · En vivo</span>
          </span>
          <h2 id="sala-title" className="text-4xl sm:text-5xl">
            Sala de <span className="text-gradient">candidatos</span>
          </h2>
          <p className="max-w-xl text-muted">
            Cada persona que se postula entra aquí al instante. Toca una tarjeta para conocer su motivación y sus
            propuestas.
          </p>
        </div>

        <div className="glass hud flex items-center gap-5 rounded-2xl px-6 py-4 [--hud-color:var(--color-neon)]">
          <p className="text-5xl font-semibold tabular-nums text-magenta-hot" aria-live="polite">
            {loading ? "–" : candidates.length}
          </p>
          <div>
            <p className="font-medium">{candidates.length === 1 ? "candidato listo" : "candidatos listos"}</p>
            <p className="label-hud mt-1 text-[0.62rem] text-muted">
              Votación: {formatBogota(settings.votingStart)}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="label-hud text-muted">Abriendo la sala…</p>
      ) : (
        <Roster
          candidates={candidates}
          badge="Listo"
          idle
          trailing={<OpenSlot onJoin={onJoin} first={candidates.length === 0} />}
        />
      )}
    </section>
  );
}
