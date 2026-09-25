"use client";

import { motion } from "motion/react";
import { useState } from "react";
import clsx from "clsx";
import { friendlyError } from "@/lib/auth";
import { saveSettings, setCandidateStatus } from "@/lib/data";
import { useElection } from "@/hooks/useElection";
import { formatBogota } from "@/lib/settings";
import type { Candidate, CandidateStatus } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CandidateProfile } from "@/components/experience/CandidateProfile";
import { Notice, PanelHeader, STATUS_LABEL } from "./ui";

const FILTERS: { id: CandidateStatus | "all"; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Pendientes" },
  { id: "approved", label: "Aprobados" },
  { id: "rejected", label: "Rechazados" },
];

export function CandidatesPanel({ candidates }: { candidates: Candidate[] }) {
  const { settings } = useElection();
  const [filter, setFilter] = useState<CandidateStatus | "all">("all");
  const [viewing, setViewing] = useState<Candidate | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = candidates.filter((c) => filter === "all" || c.status === filter);

  async function change(c: Candidate, status: CandidateStatus) {
    setBusy(c.id + status);
    setError(null);
    try {
      await setCandidateStatus(c.id, status);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  }

  function actions(c: Candidate) {
    return (
      <div className="flex flex-wrap gap-2">
        {c.status !== "approved" && (
          <Button size="sm" variant="neon" loading={busy === c.id + "approved"} onClick={() => change(c, "approved")}>
            Aprobar
          </Button>
        )}
        {c.status !== "rejected" && (
          <Button size="sm" variant="danger" loading={busy === c.id + "rejected"} onClick={() => change(c, "rejected")}>
            Rechazar
          </Button>
        )}
        {c.status !== "pending" && (
          <Button size="sm" variant="ghost" loading={busy === c.id + "pending"} onClick={() => change(c, "pending")}>
            Volver a pendiente
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      <PanelHeader kicker="Roster" title="Candidatos">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
          {FILTERS.map((f) => {
            const count = f.id === "all" ? candidates.length : candidates.filter((c) => c.status === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-sm ring-1 transition",
                  filter === f.id ? "bg-paper text-void ring-paper" : "ring-white/15 hover:bg-white/5",
                )}
              >
                {f.label} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </PanelHeader>

      <section className="glass mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
        <div className="max-w-xl space-y-1">
          <h2 className="text-lg">Publicar postulaciones al instante</h2>
          <p className="text-sm text-muted">
            {settings.autoApprove
              ? "Activado: cada postulación entra directo a la sala de candidatos. Puedes rechazar a alguien para quitarlo."
              : "Desactivado: las postulaciones quedan pendientes hasta que las apruebes aquí."}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <span className="text-sm">{settings.autoApprove ? "Al instante" : "Con revisión"}</span>
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={settings.autoApprove}
            onChange={(e) => saveSettings({ autoApprove: e.target.checked }).catch((err) => setError(friendlyError(err)))}
          />
          <span className="relative h-7 w-12 rounded-full bg-white/15 transition after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-paper after:transition peer-checked:bg-neon peer-checked:after:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-neon" />
        </label>
      </section>

      {error && <Notice tone="error">{error}</Notice>}

      {visible.length === 0 ? (
        <Notice>No hay candidatos en esta categoría.</Notice>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {visible.map((c, i) => (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass flex flex-col gap-4 rounded-3xl p-4"
            >
              <button onClick={() => setViewing(c)} className="flex items-center gap-4 text-left" aria-label={`Ver ficha de ${c.name}`}>
                <Avatar name={c.name} src={c.photoURL} className="h-20 w-16 shrink-0 rounded-xl" />
                <div className="min-w-0 space-y-1">
                  <span className={clsx("label-hud inline-block rounded-full px-2 py-0.5 text-[0.6rem] ring-1", STATUS_LABEL[c.status].className)}>
                    {STATUS_LABEL[c.status].text}
                  </span>
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted">
                    Sem. {c.semester} · {c.email}
                  </p>
                  {c.createdAt && <p className="text-xs text-muted">{formatBogota(c.createdAt)}</p>}
                </div>
              </button>
              <div className="mt-auto">{actions(c)}</div>
            </motion.li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} label="Ficha del candidato" className="sm:max-w-5xl">
        {viewing && (
          <CandidateProfile
            candidate={candidates.find((c) => c.id === viewing.id) ?? viewing}
            index={candidates.findIndex((c) => c.id === viewing.id)}
            actions={actions(candidates.find((c) => c.id === viewing.id) ?? viewing)}
          />
        )}
      </Modal>
    </div>
  );
}
