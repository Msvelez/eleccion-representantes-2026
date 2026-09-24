"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { friendlyError, signOut } from "@/lib/auth";
import { castVote, getOwnVote } from "@/lib/data";
import type { Candidate, Vote } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Celebration } from "./Celebration";
import { EmailGate } from "./EmailGate";

function VoteSuccess({ candidate }: { candidate: Candidate }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 py-6 text-center" role="status">
      <Celebration />
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 12 }}
        className="relative mx-auto h-28 w-28"
      >
        <div className="absolute inset-0 rounded-full bg-neon/30 motion-safe:animate-ping" />
        <div className="relative grid h-full w-full place-items-center rounded-full bg-neon text-5xl text-void shadow-[0_0_80px_-5px_rgb(15_236_15/0.9)]">
          ✓
        </div>
      </motion.div>
      <span className="label-hud text-neon">Voto confirmado</span>
      <h3 className="text-3xl sm:text-4xl">Tu voto ha sido registrado correctamente.</h3>
      <p className="mx-auto max-w-md text-muted">
        Elegiste a <strong className="font-medium text-paper">{candidate.name}</strong>. Gracias por hacer parte de la
        misión. Los resultados se publicarán al cierre de la votación.
      </p>
    </motion.div>
  );
}

function AlreadyVoted({ vote, candidates }: { vote: Vote; candidates: Candidate[] }) {
  const chosen = candidates.find((c) => c.id === vote.candidateId);
  return (
    <div className="space-y-4 py-4 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-neon/15 text-4xl text-neon ring-1 ring-neon/50">
        ✓
      </div>
      <h3 className="text-2xl">Ya registraste tu voto</h3>
      <p className="text-muted">
        El correo <strong className="font-medium text-paper">{vote.email}</strong> ya votó
        {chosen ? (
          <>
            {" "}
            por <strong className="font-medium text-paper">{chosen.name}</strong>
          </>
        ) : null}
        . Solo se permite un voto por correo.
      </p>
    </div>
  );
}

function ConfirmVote({
  user,
  candidate,
  candidates,
  onVoted,
}: {
  user: User & { email: string };
  candidate: Candidate;
  candidates: Candidate[];
  onVoted: () => void;
}) {
  const [existing, setExisting] = useState<Vote | null | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getOwnVote(user.email)
      .then((v) => alive && setExisting(v))
      .catch(() => alive && setExisting(null));
    return () => {
      alive = false;
    };
  }, [user.email]);

  if (existing === undefined) return <p className="label-hud p-8 text-center text-muted">Verificando tu registro…</p>;
  if (existing) return <AlreadyVoted vote={existing} candidates={candidates} />;

  async function confirm() {
    setSending(true);
    setError(null);
    try {
      await castVote(candidate.id);
      onVoted();
    } catch (err) {
      // Si ya existía un voto, las reglas lo rechazan: lo mostramos claramente.
      const again = await getOwnVote(user.email).catch(() => null);
      if (again) setExisting(again);
      else setError(friendlyError(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className="label-hud text-neon">Último paso · Confirmación</span>
        <h3 className="text-2xl sm:text-3xl">¿Confirmas tu voto?</h3>
      </div>
      <div className="glass hud flex items-center gap-4 rounded-2xl p-4">
        <Avatar name={candidate.name} src={candidate.photoURL} className="h-20 w-16 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="label-hud text-magenta-soft">Tu elección</p>
          <p className="truncate text-xl font-medium">{candidate.name}</p>
          <p className="text-sm text-muted">Semestre {candidate.semester}</p>
        </div>
      </div>
      <dl className="glass rounded-2xl p-4 text-sm">
        <dt className="label-hud text-muted">Correo que registra el voto</dt>
        <dd className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">{user.email}</span>
          <button onClick={() => signOut()} className="text-xs text-magenta-soft underline-offset-4 hover:underline">
            No soy yo
          </button>
        </dd>
      </dl>
      <p className="text-sm text-muted">El voto es único y no se puede cambiar después de confirmarlo.</p>
      {error && (
        <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <Button variant="neon" size="lg" className="w-full" loading={sending} onClick={confirm}>
        Confirmar voto por {candidate.name.split(" ")[0]}
      </Button>
    </div>
  );
}

/** Flujo: verificar correo institucional → comprobar voto previo → confirmar → celebración. */
export function VoteFlow({
  candidate,
  candidates,
  onVoted,
}: {
  candidate: Candidate;
  candidates: Candidate[];
  onVoted: () => void;
}) {
  const [done, setDone] = useState(false);
  if (done) return <VoteSuccess candidate={candidate} />;
  return (
    <EmailGate
      returnTo={`/?accion=votar&candidato=${encodeURIComponent(candidate.id)}`}
      title="Confirma tu correo institucional"
      description={`Para votar por ${candidate.name} te enviaremos un enlace de acceso. Así garantizamos un voto por estudiante.`}
    >
      {(user) => (
        <ConfirmVote
          user={user}
          candidate={candidate}
          candidates={candidates}
          onVoted={() => {
            setDone(true);
            onVoted();
          }}
        />
      )}
    </EmailGate>
  );
}
