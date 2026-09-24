"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useElection } from "@/hooks/useElection";
import { friendlyError } from "@/lib/auth";
import { downloadCSV } from "@/lib/csv";
import { getAllVotes, publishResults, unpublishResults } from "@/lib/data";
import { computePhase } from "@/lib/phase";
import { formatBogota } from "@/lib/settings";
import type { Candidate, Winner } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { AdminData } from "./AdminApp";
import { Card, Notice, PanelHeader, STATUS_LABEL } from "./ui";

const DEFAULT_ROLES = ["Principal", "Suplente"];

// ───────────── Ganadores ─────────────

export function ResultsPanel({ data }: { data: AdminData }) {
  const { settings } = useElection();
  const phase = computePhase(settings, new Date());
  const totalVotes = Object.values(data.tallies).reduce((a, b) => a + b, 0);

  const ranking = useMemo(
    () =>
      data.candidates
        .filter((c) => c.status === "approved")
        .map((c) => ({ candidate: c, votes: data.tallies[c.id] ?? 0 }))
        .sort((a, b) => b.votes - a.votes),
    [data],
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Sugerencia inicial: los N más votados.
  useEffect(() => {
    if (selected.length || !ranking.length) return;
    const top = ranking.slice(0, settings.seats).map((r) => r.candidate.id);
    setSelected(top);
    setRoles(Object.fromEntries(top.map((id, i) => [id, DEFAULT_ROLES[i] ?? ""])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranking, settings.seats]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function publish() {
    if (!selected.length) return setFeedback({ tone: "error", text: "Selecciona al menos un ganador." });
    if (phase === "votacion" && !window.confirm("La votación sigue abierta. Publicar resultados la cerrará. ¿Continuar?")) return;
    const winners: Winner[] = ranking
      .filter((r) => selected.includes(r.candidate.id))
      .map((r) => ({
        candidateId: r.candidate.id,
        name: r.candidate.name,
        semester: r.candidate.semester,
        photoURL: r.candidate.photoURL,
        votes: r.votes,
        percentage: totalVotes ? Math.round((r.votes / totalVotes) * 1000) / 10 : 0,
        role: roles[r.candidate.id]?.trim() ?? "",
      }));
    setBusy(true);
    try {
      await publishResults(winners, totalVotes);
      setFeedback({ tone: "ok", text: "¡Resultados publicados! La Fase 4 ya es visible para todos." });
    } catch (err) {
      setFeedback({ tone: "error", text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PanelHeader kicker="Fase 4" title="Configurar ganadores">
        {settings.resultsPublished ? (
          <Button variant="ghost" onClick={() => unpublishResults().then(() => setFeedback({ tone: "ok", text: "Resultados ocultos." }))}>
            Ocultar resultados
          </Button>
        ) : null}
      </PanelHeader>

      <Notice>
        Se sugieren los {settings.seats} más votados. Puedes ajustar la selección y el rol de cada ganador antes de publicar.
        Al publicar, la votación se cierra y el sitio muestra la pantalla de Representantes Elegidos.
      </Notice>

      <ul className="space-y-3">
        {ranking.map(({ candidate, votes }, i) => {
          const isSel = selected.includes(candidate.id);
          return (
            <li
              key={candidate.id}
              className={clsx("glass flex flex-wrap items-center gap-4 rounded-2xl p-4 transition", isSel && "ring-2 ring-neon/60")}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-4">
                <input type="checkbox" checked={isSel} onChange={() => toggle(candidate.id)} className="h-5 w-5 accent-[var(--color-neon)]" />
                <span className="label-hud w-6 text-muted">{String(i + 1).padStart(2, "0")}</span>
                <Avatar name={candidate.name} src={candidate.photoURL} className="h-12 w-12 shrink-0 rounded-full" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{candidate.name}</span>
                  <span className="text-sm text-muted">
                    {votes} votos · {totalVotes ? ((votes / totalVotes) * 100).toFixed(1) : "0.0"}%
                  </span>
                </span>
              </label>
              {isSel && (
                <input
                  className="field w-40 py-2 text-sm"
                  placeholder="Rol (opcional)"
                  aria-label={`Rol de ${candidate.name}`}
                  value={roles[candidate.id] ?? ""}
                  onChange={(e) => setRoles({ ...roles, [candidate.id]: e.target.value })}
                />
              )}
            </li>
          );
        })}
      </ul>

      {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
      <Button variant="neon" size="lg" onClick={publish} loading={busy} disabled={!ranking.length}>
        {settings.resultsPublished ? "Actualizar resultados publicados" : "Publicar resultados"}
      </Button>
    </div>
  );
}

// ───────────── Exportar ─────────────

const stamp = () => new Date().toISOString().slice(0, 10);

export function ExportPanel({ candidates }: { candidates: Candidate[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function exportCandidates() {
    downloadCSV(
      `candidatos-${stamp()}.csv`,
      candidates.map((c) => ({
        Nombre: c.name,
        Semestre: c.semester,
        Correo: c.email,
        Estado: STATUS_LABEL[c.status].text,
        Instagram: c.instagram ? `@${c.instagram}` : "",
        Motivación: c.motivation,
        Propuestas: c.contribution,
        Video: c.videoURL,
        Foto: c.photoURL,
        Fecha: c.createdAt ? formatBogota(c.createdAt) : "",
      })),
    );
  }

  async function exportVotes() {
    setBusy(true);
    setError(null);
    try {
      const votes = await getAllVotes();
      const names = Object.fromEntries(candidates.map((c) => [c.id, c.name]));
      downloadCSV(
        `votos-${stamp()}.csv`,
        votes
          .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0))
          .map((v) => ({
            Correo: v.email,
            Candidato: names[v.candidateId] ?? v.candidateId,
            Fecha: v.createdAt ? formatBogota(v.createdAt) : "",
          })),
      );
      if (!votes.length) setError("Aún no hay votos para exportar.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PanelHeader kicker="Datos" title="Exportar" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4">
          <p className="text-4xl" aria-hidden>◉</p>
          <h2 className="text-xl">Candidatos</h2>
          <p className="text-sm text-muted">Todas las postulaciones con su estado, textos y enlaces. Formato CSV (abre en Excel).</p>
          <Button onClick={exportCandidates} disabled={!candidates.length}>
            Descargar candidatos ({candidates.length})
          </Button>
        </Card>
        <Card className="space-y-4">
          <p className="text-4xl" aria-hidden>✓</p>
          <h2 className="text-xl">Votos</h2>
          <p className="text-sm text-muted">Correo, candidato elegido y hora de cada voto. Información sensible: manéjala con cuidado.</p>
          <Button onClick={exportVotes} loading={busy}>
            Descargar votos
          </Button>
        </Card>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  );
}
