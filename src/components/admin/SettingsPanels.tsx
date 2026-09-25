"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useElection } from "@/hooks/useElection";
import { friendlyError } from "@/lib/auth";
import { countRoll, importRoll, resetElection, saveSettings } from "@/lib/data";
import { computePhase } from "@/lib/phase";
import { fromBogotaInput, toBogotaInput } from "@/lib/settings";
import type { Settings, VotingMode } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, Notice, PanelHeader } from "./ui";

type Feedback = { tone: "ok" | "error"; text: string } | null;

async function save(patch: Partial<Settings>, setFeedback: (f: Feedback) => void, okText = "Cambios guardados.") {
  try {
    await saveSettings(patch);
    setFeedback({ tone: "ok", text: okText });
  } catch (err) {
    setFeedback({ tone: "error", text: friendlyError(err) });
  }
}

// ───────────── Fechas ─────────────

export function DatesPanel() {
  const { settings } = useElection();
  const [form, setForm] = useState(() => ({
    electionName: settings.electionName,
    applicationsClose: toBogotaInput(settings.applicationsClose),
    votingStart: toBogotaInput(settings.votingStart),
    votingEnd: toBogotaInput(settings.votingEnd),
    seats: settings.seats,
  }));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const close = fromBogotaInput(form.applicationsClose);
    const start = fromBogotaInput(form.votingStart);
    const end = fromBogotaInput(form.votingEnd);
    if (!(close <= start && start < end)) {
      setFeedback({ tone: "error", text: "El orden debe ser: cierre de postulaciones ≤ apertura de votación < cierre de votación." });
      return;
    }
    setSaving(true);
    await save(
      { electionName: form.electionName.trim(), applicationsClose: close, votingStart: start, votingEnd: end, seats: Math.max(1, form.seats) },
      setFeedback,
      "Fechas guardadas. La plataforma cambiará de fase automáticamente.",
    );
    setSaving(false);
  }

  const fields = [
    { key: "applicationsClose", label: "Cierre de postulaciones", hint: "Fase 1 → Fase 2. Ej.: 15 de octubre, 00:00 (se puede postular todo el 14)." },
    { key: "votingStart", label: "Apertura de votación", hint: "Fase 2 → Fase 3." },
    { key: "votingEnd", label: "Cierre de votación", hint: "Fase 3 → escrutinio." },
  ] as const;

  return (
    <div>
      <PanelHeader kicker="Configuración" title="Fases y fechas" />
      <form onSubmit={submit} className="space-y-6">
        <Card className="space-y-5">
          <p className="text-sm text-muted">
            Todas las horas se interpretan en hora de Colombia (UTC−5). La fase visible se calcula sola con estas fechas; no
            hace falta tocar el código.
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {fields.map((f, i) => (
              <label key={f.key} className="block space-y-2">
                <span className="label-hud text-neon">Fase {i + 1} → {i + 2}</span>
                <span className="block text-sm font-medium">{f.label}</span>
                <input
                  type="datetime-local"
                  className="field"
                  required
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
                <span className="block text-xs text-muted">{f.hint}</span>
              </label>
            ))}
          </div>
        </Card>
        <Card className="grid gap-5 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Nombre de la elección</span>
            <input className="field" value={form.electionName} onChange={(e) => setForm({ ...form, electionName: e.target.value })} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Número de representantes a elegir</span>
            <input
              type="number"
              min={1}
              max={10}
              className="field"
              value={form.seats}
              onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
            />
          </label>
        </Card>
        {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
        <Button type="submit" loading={saving}>
          Guardar fechas
        </Button>
      </form>
    </div>
  );
}

// ───────────── Control de votación ─────────────

const MODES: { id: VotingMode; title: string; text: string; icon: string }[] = [
  { id: "auto", title: "Automático", text: "La votación abre y cierra según las fechas configuradas.", icon: "◷" },
  { id: "open", title: "Activar votación", text: "Abre la votación ya, ignorando las fechas.", icon: "▶" },
  { id: "closed", title: "Cerrar votación", text: "Cierra la votación ya. Nadie más puede votar.", icon: "■" },
];

export function VotingPanel() {
  const { settings } = useElection();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState<VotingMode | null>(null);

  async function setMode(mode: VotingMode) {
    if (mode === "closed" && !window.confirm("¿Cerrar la votación ahora? Los estudiantes ya no podrán votar.")) return;
    setPending(mode);
    await save({ votingMode: mode }, setFeedback, "Modo de votación actualizado.");
    setPending(null);
  }

  return (
    <div>
      <PanelHeader kicker="Control" title="Votación" />
      {settings.resultsPublished && (
        <div className="mb-4">
          <Notice>Los resultados están publicados: la votación permanece cerrada. Despublícalos en Ganadores para reabrir.</Notice>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {MODES.map((m) => {
          const active = settings.votingMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              disabled={active || pending !== null}
              aria-pressed={active}
              className={clsx(
                "glass hud rounded-3xl p-6 text-left transition",
                active ? "ring-2 ring-magenta-hot [--hud-color:var(--color-neon)]" : "hover:-translate-y-1 hover:bg-white/10",
              )}
            >
              <span className="text-3xl text-magenta-hot" aria-hidden>
                {m.icon}
              </span>
              <p className="mt-4 text-lg font-medium">{m.title}</p>
              <p className="mt-1 text-sm text-muted">{m.text}</p>
              {active && <p className="label-hud mt-4 text-neon">● Activo</p>}
              {pending === m.id && <p className="label-hud mt-4 text-muted">Guardando…</p>}
            </button>
          );
        })}
      </div>
      {feedback && (
        <div className="mt-4">
          <Notice tone={feedback.tone}>{feedback.text}</Notice>
        </div>
      )}
      <ResetCard />
    </div>
  );
}

/** Borra los datos de una prueba (votos, conteos, resultados y opcionalmente postulaciones). */
function ResetCard() {
  const { settings } = useElection();
  const votingNow = computePhase(settings, new Date()) === "votacion";
  const [removeCandidates, setRemoveCandidates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function reset() {
    const what = removeCandidates ? "los votos, los resultados y TODAS las postulaciones" : "los votos y los resultados";
    if (!window.confirm(`Se borrarán ${what}. Esto no se puede deshacer. ¿Continuar?`)) return;
    setBusy(true);
    setFeedback(null);
    try {
      const { votes, candidates } = await resetElection(removeCandidates);
      setFeedback({
        tone: "ok",
        text: `Elección reiniciada: ${votes} votos borrados${
          removeCandidates ? ` y ${candidates} postulaciones` : ""
        }. La página vuelve a la fase que corresponda según las fechas.`,
      });
    } catch (err) {
      setFeedback({ tone: "error", text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-8 space-y-4 ring-1 ring-danger/30">
      <div className="space-y-1">
        <h2 className="text-lg">Reiniciar elección</h2>
        <p className="text-sm text-muted">
          Úsalo después de una prueba: borra todos los votos, los conteos y los resultados publicados, y la página vuelve a
          la fase que corresponda según las fechas. No se puede usar con la votación abierta.
        </p>
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={removeCandidates}
          onChange={(e) => setRemoveCandidates(e.target.checked)}
          className="h-5 w-5 accent-[var(--color-danger)]"
        />
        Borrar también todas las postulaciones (la sala de candidatos queda vacía)
      </label>
      {votingNow && <Notice tone="error">La votación está abierta: ciérrala antes de reiniciar.</Notice>}
      {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
      <Button variant="danger" onClick={reset} loading={busy} disabled={votingNow}>
        Reiniciar elección
      </Button>
    </Card>
  );
}

// ───────────── Correos institucionales y padrón ─────────────

export function AccessPanel() {
  const { settings } = useElection();
  const [domains, setDomains] = useState(settings.emailDomains.join(", "));
  const [eligible, setEligible] = useState(settings.eligibleVoters);
  const [rollText, setRollText] = useState("");
  const [rollCount, setRollCount] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    countRoll().then(setRollCount).catch(() => setRollCount(null));
  }, []);

  async function saveDomains(e: React.FormEvent) {
    e.preventDefault();
    const list = domains
      .split(/[,\s]+/)
      .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean);
    if (!list.length) return setFeedback({ tone: "error", text: "Agrega al menos un dominio." });
    await save({ emailDomains: list, eligibleVoters: Math.max(0, eligible) }, setFeedback);
  }

  async function uploadRoll() {
    const emails = rollText.split(/[\s,;]+/).filter((e) => e.includes("@"));
    if (!emails.length) return setFeedback({ tone: "error", text: "Pega al menos un correo." });
    setBusy(true);
    try {
      const n = await importRoll(emails);
      setRollText("");
      setRollCount(await countRoll());
      setFeedback({ tone: "ok", text: `${n} correos agregados al padrón.` });
    } catch (err) {
      setFeedback({ tone: "error", text: friendlyError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PanelHeader kicker="Seguridad" title="Correos y acceso" />

      <Card className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl space-y-1">
          <h2 className="text-lg">Permitir cualquier correo</h2>
          <p className="text-sm text-muted">
            Activado: se puede entrar con Gmail u otro correo, un voto por correo. Desactivado: solo los dominios
            institucionales de abajo (Outlook de la universidad puede no recibir los enlaces de acceso).
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <span className="text-sm">{settings.allowAnyEmail ? "Cualquier correo" : "Solo institucional"}</span>
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={settings.allowAnyEmail}
            onChange={(e) => save({ allowAnyEmail: e.target.checked }, setFeedback)}
          />
          <span className="relative h-7 w-12 rounded-full bg-white/15 transition after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-paper after:transition peer-checked:bg-neon peer-checked:after:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-neon" />
        </label>
      </Card>

      <Card>
        <form onSubmit={saveDomains} className="grid gap-5 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Dominios institucionales permitidos</span>
            <input className="field" value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="unbosque.edu.co" />
            <span className="block text-xs text-muted">
              Separados por coma. Solo aplican si &quot;Permitir cualquier correo&quot; está desactivado.
            </span>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Estudiantes habilitados para votar</span>
            <input type="number" min={0} className="field" value={eligible} onChange={(e) => setEligible(Number(e.target.value))} />
            <span className="block text-xs text-muted">Opcional. Se usa para calcular la participación.</span>
          </label>
          <div>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl space-y-1">
            <h2 className="text-lg">Padrón de estudiantes del programa</h2>
            <p className="text-sm text-muted">
              Con el dominio, cualquier estudiante de la universidad podría votar. Activa el padrón para que solo voten y se
              postulen los correos cargados aquí (estudiantes de Creación Digital).
            </p>
            <p className="label-hud text-muted">{rollCount === null ? "—" : rollCount} correos en el padrón</p>
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <span className="text-sm">Exigir padrón</span>
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={settings.restrictToRoll}
              onChange={(e) => save({ restrictToRoll: e.target.checked }, setFeedback)}
            />
            <span className="relative h-7 w-12 rounded-full bg-white/15 transition after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-paper after:transition peer-checked:bg-neon peer-checked:after:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-neon" />
          </label>
        </div>
        {settings.restrictToRoll && rollCount === 0 && (
          <Notice tone="error">El padrón está activo pero vacío: nadie podrá postularse ni votar.</Notice>
        )}
        <label className="block space-y-2">
          <span className="text-sm font-medium">Agregar correos</span>
          <textarea
            className="field min-h-32 font-mono text-sm"
            value={rollText}
            onChange={(e) => setRollText(e.target.value)}
            placeholder={"estudiante1@unbosque.edu.co\nestudiante2@unbosque.edu.co"}
          />
          <span className="block text-xs text-muted">Pega una columna de Excel o una lista separada por comas.</span>
        </label>
        <Button variant="ghost" onClick={uploadRoll} loading={busy}>
          Cargar al padrón
        </Button>
      </Card>

      {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
    </div>
  );
}
