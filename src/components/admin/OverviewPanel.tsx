"use client";

import { motion } from "motion/react";
import { useElection } from "@/hooks/useElection";
import { computePhase } from "@/lib/phase";
import { formatBogota } from "@/lib/settings";
import { Avatar } from "@/components/ui/Avatar";
import type { AdminData } from "./AdminApp";
import { Card, PanelHeader, StatTile } from "./ui";

const PHASE_LABEL = {
  convocatoria: "Fase 1 · Convocatoria",
  presentacion: "Fase 2 · Presentación de candidatos",
  votacion: "Fase 3 · Votación",
  escrutinio: "Votación cerrada · Resultados sin publicar",
  resultados: "Fase 4 · Resultados publicados",
};

export function OverviewPanel({ data }: { data: AdminData }) {
  const { settings } = useElection();
  const phase = computePhase(settings, new Date());
  const approved = data.candidates.filter((c) => c.status === "approved");
  const pending = data.candidates.filter((c) => c.status === "pending").length;
  const totalVotes = Object.values(data.tallies).reduce((a, b) => a + b, 0);
  const ranking = approved
    .map((c) => ({ ...c, votes: data.tallies[c.id] ?? 0 }))
    .sort((a, b) => b.votes - a.votes);
  const max = Math.max(1, ...ranking.map((r) => r.votes));

  return (
    <div className="space-y-6">
      <PanelHeader kicker="Centro de control" title="Resumen de la misión">
        <span className="label-hud rounded-full bg-magenta/20 px-3 py-1.5 text-paper ring-1 ring-magenta-hot">
          {PHASE_LABEL[phase]}
        </span>
      </PanelHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Postulaciones" value={data.candidates.length} hint={`${pending} pendientes de revisión`} />
        <StatTile label="Candidatos aprobados" value={approved.length} tone="magenta" />
        <StatTile label="Votos registrados" value={totalVotes} tone="neon" />
        <StatTile
          label="Participación"
          value={settings.eligibleVoters ? `${((totalVotes / settings.eligibleVoters) * 100).toFixed(1)}%` : "—"}
          hint={settings.eligibleVoters ? `de ${settings.eligibleVoters} estudiantes` : "Configura el total en Correos y acceso"}
        />
      </div>

      <Card>
        <h2 className="mb-4 text-lg">Línea de tiempo</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            ["Cierre de postulaciones", settings.applicationsClose],
            ["Apertura de votación", settings.votingStart],
            ["Cierre de votación", settings.votingEnd],
          ].map(([label, date]) => (
            <li key={label as string} className="rounded-2xl bg-white/5 p-4">
              <p className="label-hud text-muted">{label as string}</p>
              <p className="mt-1 font-medium">{formatBogota(date as Date)}</p>
            </li>
          ))}
        </ol>
        {settings.votingMode !== "auto" && (
          <p className="mt-3 text-sm text-magenta-soft">
            Modo manual activo: la votación está {settings.votingMode === "open" ? "abierta" : "cerrada"} sin importar las
            fechas.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-lg">Votos por candidato</h2>
        <p className="mb-5 text-sm text-muted">En tiempo real. Solo visible para administración.</p>
        {ranking.length === 0 ? (
          <p className="text-muted">Aún no hay candidatos aprobados.</p>
        ) : (
          <ul className="space-y-4">
            {ranking.map((c, i) => (
              <li key={c.id} className="flex items-center gap-4">
                <span className="label-hud w-6 text-muted">{String(i + 1).padStart(2, "0")}</span>
                <Avatar name={c.name} src={c.photoURL} className="h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate">{c.name}</span>
                    <span className="font-mono tabular-nums">
                      {c.votes} · {totalVotes ? ((c.votes / totalVotes) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-magenta to-magenta-hot"
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.votes / max) * 100}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
