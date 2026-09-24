"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { embedURL } from "@/lib/video";
import type { Candidate } from "@/lib/types";

function Video({ candidate }: { candidate: Candidate }) {
  if (!candidate.videoURL) return null;
  if (candidate.videoType === "file") {
    return (
      <video controls preload="metadata" className="aspect-video w-full rounded-2xl bg-black" src={candidate.videoURL}>
        Tu navegador no puede reproducir este video.
      </video>
    );
  }
  const embed = embedURL(candidate.videoURL);
  if (embed) {
    return (
      <iframe
        src={embed}
        title={`Video de presentación de ${candidate.name}`}
        className="aspect-video w-full rounded-2xl bg-black"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    );
  }
  return (
    <a
      href={candidate.videoURL}
      target="_blank"
      rel="noopener noreferrer"
      className="glass flex items-center justify-between rounded-2xl px-5 py-4 transition hover:bg-white/10"
    >
      <span>Ver video de presentación</span>
      <span aria-hidden>↗</span>
    </a>
  );
}

function Block({ label, children, delay }: { label: string; children: ReactNode; delay: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="space-y-2"
    >
      <h3 className="label-hud text-neon">{label}</h3>
      <div className="whitespace-pre-line leading-relaxed text-paper/90">{children}</div>
    </motion.section>
  );
}

/** Ficha expandida del candidato ("perfil desbloqueado"). */
export function CandidateProfile({
  candidate,
  index,
  actions,
}: {
  candidate: Candidate;
  index: number;
  actions?: ReactNode;
}) {
  return (
    <article className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <motion.div
        layoutId={`photo-${candidate.id}`}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-t-3xl md:sticky md:top-0 md:aspect-auto md:h-full md:max-h-[92dvh] md:rounded-l-3xl md:rounded-tr-none"
      >
        <Avatar name={candidate.name} src={candidate.photoURL} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-plum via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-plum/60" />
        <span className="label-hud absolute left-4 top-4 rounded-md bg-void/70 px-2 py-1 text-neon backdrop-blur">
          P{String(index + 1).padStart(2, "0")} · Perfil desbloqueado
        </span>
      </motion.div>

      <div className="space-y-7 p-6 sm:p-8">
        <motion.header initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3 pr-10">
          <p className="label-hud text-magenta-soft">Semestre {String(candidate.semester).padStart(2, "0")}</p>
          <h2 className="text-3xl leading-tight sm:text-4xl">{candidate.name}</h2>
          {candidate.instagram && (
            <a
              href={`https://instagram.com/${candidate.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-sm ring-1 ring-white/10 transition hover:bg-magenta/30"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
              </svg>
              @{candidate.instagram}
            </a>
          )}
        </motion.header>

        <Block label="Motivación" delay={0.1}>
          {candidate.motivation}
        </Block>
        <Block label="Propuestas · Lo que aportaría" delay={0.2}>
          {candidate.contribution}
        </Block>
        {candidate.videoURL && (
          <Block label="Video de presentación" delay={0.3}>
            <Video candidate={candidate} />
          </Block>
        )}

        {actions && <div className="sticky bottom-0 -mx-6 bg-gradient-to-t from-plum via-plum/95 to-transparent px-6 pb-2 pt-6 sm:-mx-8 sm:px-8">{actions}</div>}
      </div>
    </article>
  );
}
