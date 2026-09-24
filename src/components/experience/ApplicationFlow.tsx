"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { User } from "firebase/auth";
import { friendlyError } from "@/lib/auth";
import { getOwnApplication, submitApplication } from "@/lib/data";
import { storageEnabled } from "@/lib/firebase";
import type { Candidate, VideoType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { CandidateCard } from "./CandidateCard";
import { EmailGate } from "./EmailGate";
import { Celebration } from "./Celebration";

const MAX_PHOTO = 5 * 1024 * 1024;
const MAX_VIDEO = 60 * 1024 * 1024;
const TEXT_MIN = 20;
const TEXT_MAX = 1500;

const STEPS = [
  { id: "identidad", label: "Identidad" },
  { id: "mision", label: "Misión" },
  { id: "extra", label: "Extras" },
] as const;

interface FormState {
  name: string;
  semester: number;
  instagram: string;
  motivation: string;
  contribution: string;
  photo: File | null;
  videoType: VideoType;
  videoFile: File | null;
  videoLink: string;
}

const EMPTY: FormState = {
  name: "",
  semester: 0,
  instagram: "",
  motivation: "",
  contribution: "",
  photo: null,
  videoType: "none",
  videoFile: null,
  videoLink: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

function validate(step: number, f: FormState): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (f.name.trim().length < 3) e.name = "Escribe tu nombre completo.";
    if (!f.semester) e.semester = "Selecciona tu semestre.";
    if (!f.photo) e.photo = "Sube una foto de perfil.";
    else if (!f.photo.type.startsWith("image/")) e.photo = "La foto debe ser una imagen.";
    else if (f.photo.size > MAX_PHOTO) e.photo = "La foto debe pesar menos de 5 MB.";
    if (f.instagram && !/^@?[\w.]{1,30}$/.test(f.instagram.trim())) e.instagram = "Usuario de Instagram no válido.";
  }
  if (step === 1) {
    if (f.motivation.trim().length < TEXT_MIN) e.motivation = `Cuéntanos un poco más (mínimo ${TEXT_MIN} caracteres).`;
    if (f.contribution.trim().length < TEXT_MIN)
      e.contribution = `Cuéntanos un poco más (mínimo ${TEXT_MIN} caracteres).`;
  }
  if (step === 2) {
    if (f.videoType === "file") {
      if (!f.videoFile) e.videoFile = "Selecciona un video o elige otra opción.";
      else if (f.videoFile.size > MAX_VIDEO) e.videoFile = "El video debe pesar menos de 60 MB.";
    }
    if (f.videoType === "link" && !/^https?:\/\/\S+$/.test(f.videoLink.trim()))
      e.videoLink = "Pega un enlace válido (YouTube, TikTok, Vimeo, Drive…).";
  }
  return e;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-danger">
      {message}
    </p>
  );
}

function TextArea({
  id,
  label,
  hint,
  value,
  onChange,
  error,
}: {
  id: keyof FormState;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <span className="block text-sm text-muted">{hint}</span>
      <textarea
        className="field min-h-36 resize-y"
        value={value}
        maxLength={TEXT_MAX}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <span className="flex justify-between gap-2">
        <FieldError id={`${id}-error`} message={error} />
        <span className="label-hud ml-auto text-muted">
          {value.length}/{TEXT_MAX}
        </span>
      </span>
    </label>
  );
}

function ApplicationForm({ user, onDone }: { user: User & { email: string }; onDone: () => void }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const photoPreview = useMemo(() => (form.photo ? URL.createObjectURL(form.photo) : ""), [form.photo]);
  useEffect(() => () => void (photoPreview && URL.revokeObjectURL(photoPreview)), [photoPreview]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function next() {
    const e = validate(step, form);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => s + 1);
  }

  async function submit() {
    const e = validate(2, form);
    setErrors(e);
    if (Object.keys(e).length || !form.photo) return;
    setSubmitError(null);
    try {
      await submitApplication(
        {
          name: form.name,
          semester: form.semester,
          instagram: form.instagram,
          motivation: form.motivation,
          contribution: form.contribution,
          photo: form.photo,
          videoType: form.videoType,
          videoFile: form.videoFile,
          videoLink: form.videoLink,
        },
        (label, pct) => setProgress({ label, pct }),
      );
      onDone();
    } catch (err) {
      setSubmitError(friendlyError(err));
      setProgress(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Vista previa en vivo del "personaje" */}
      <aside className="hidden lg:block" aria-label="Vista previa de tu tarjeta">
        <div className="sticky top-4 space-y-3">
          <span className="label-hud text-muted">Vista previa</span>
          <div className="motion-safe:animate-float">
            <CandidateCard
              static
              index={0}
              candidate={{ name: form.name, semester: form.semester, photoURL: photoPreview }}
              badge="Nuevo"
            />
          </div>
          <p className="text-xs text-muted">Así te verán los estudiantes en la pantalla de selección.</p>
        </div>
      </aside>

      <div className="space-y-6">
        <header className="space-y-4 pr-10">
          <span className="label-hud text-neon">Crea tu personaje</span>
          <ol className="flex gap-2" aria-label="Pasos de la postulación">
            {STEPS.map((s, i) => (
              <li key={s.id} className="flex-1">
                <div className={clsx("h-1.5 rounded-full transition-colors", i <= step ? "bg-magenta-hot" : "bg-white/10")} />
                <span
                  aria-current={i === step ? "step" : undefined}
                  className={clsx("label-hud mt-2 block text-[0.6rem]", i === step ? "text-paper" : "text-muted")}
                >
                  {String(i + 1).padStart(2, "0")} {s.label}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted">
            Postulándote como <strong className="font-medium text-paper">{user.email}</strong>
          </p>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {step === 0 && (
              <>
                <div className="flex items-center gap-4">
                  <label
                    className={clsx(
                      "relative grid h-28 w-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition",
                      errors.photo ? "border-danger" : "border-white/20 hover:border-magenta-hot",
                    )}
                  >
                    {photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoPreview} alt="Vista previa de tu foto" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl text-muted" aria-hidden>
                        +
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      aria-label="Foto de perfil"
                      aria-describedby={errors.photo ? "photo-error" : undefined}
                      onChange={(e) => set("photo", e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Foto de perfil</p>
                    <p className="text-muted">Vertical, buena luz y tu cara visible. Máx. 5 MB.</p>
                    <FieldError id="photo-error" message={errors.photo} />
                  </div>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Nombre completo</span>
                  <input
                    className="field"
                    value={form.name}
                    maxLength={80}
                    autoComplete="name"
                    onChange={(e) => set("name", e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "name-error" : undefined}
                  />
                  <FieldError id="name-error" message={errors.name} />
                </label>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Semestre</legend>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <label key={n} className="cursor-pointer">
                        <input
                          type="radio"
                          name="semester"
                          value={n}
                          checked={form.semester === n}
                          onChange={() => set("semester", n)}
                          className="peer sr-only"
                        />
                        <span className="block rounded-xl bg-white/5 py-2.5 text-center font-mono ring-1 ring-white/10 transition peer-checked:bg-magenta peer-checked:ring-magenta-hot peer-focus-visible:outline-2 peer-focus-visible:outline-neon hover:bg-white/10">
                          {String(n).padStart(2, "0")}
                        </span>
                      </label>
                    ))}
                  </div>
                  <FieldError id="semester-error" message={errors.semester} />
                </fieldset>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">
                    Instagram <span className="text-muted">(opcional)</span>
                  </span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">@</span>
                    <input
                      className="field pl-9"
                      value={form.instagram}
                      maxLength={31}
                      onChange={(e) => set("instagram", e.target.value)}
                      aria-invalid={Boolean(errors.instagram)}
                    />
                  </div>
                  <FieldError id="instagram-error" message={errors.instagram} />
                </label>
              </>
            )}

            {step === 1 && (
              <>
                <TextArea
                  id="motivation"
                  label="¿Por qué quieres ser representante?"
                  hint="Tu motivación, lo que te mueve y por qué ahora."
                  value={form.motivation}
                  onChange={(v) => set("motivation", v)}
                  error={errors.motivation}
                />
                <TextArea
                  id="contribution"
                  label="¿Qué aportarías al programa?"
                  hint="Tus propuestas: iniciativas, proyectos o cambios concretos."
                  value={form.contribution}
                  onChange={(v) => set("contribution", v)}
                  error={errors.contribution}
                />
              </>
            )}

            {step === 2 && (
              <fieldset className="space-y-4">
                <legend className="mb-2 space-y-1">
                  <span className="block text-sm font-medium">
                    Video de presentación <span className="text-muted">(opcional)</span>
                  </span>
                  <span className="block text-sm text-muted">Un video corto ayuda a que te conozcan mejor.</span>
                </legend>
                <div className={clsx("grid gap-2", storageEnabled ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                  {(
                    [
                      ["none", "Sin video"],
                      ["link", "Pegar enlace"],
                      ["file", "Subir archivo"],
                    ] as const
                  )
                    .filter(([value]) => storageEnabled || value !== "file")
                    .map(([value, label]) => (
                    <label key={value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="videoType"
                        value={value}
                        checked={form.videoType === value}
                        onChange={() => set("videoType", value)}
                        className="peer sr-only"
                      />
                      <span className="block rounded-xl bg-white/5 px-4 py-3 text-center text-sm ring-1 ring-white/10 transition peer-checked:bg-magenta/30 peer-checked:ring-magenta-hot peer-focus-visible:outline-2 peer-focus-visible:outline-neon hover:bg-white/10">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
                {form.videoType === "link" && (
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Enlace del video</span>
                    <input
                      className="field"
                      type="url"
                      placeholder="https://youtube.com/…"
                      value={form.videoLink}
                      onChange={(e) => set("videoLink", e.target.value)}
                      aria-invalid={Boolean(errors.videoLink)}
                    />
                    <FieldError id="videoLink-error" message={errors.videoLink} />
                  </label>
                )}
                {form.videoType === "file" && (
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Archivo de video (máx. 60 MB)</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="field file:mr-4 file:rounded-full file:border-0 file:bg-magenta file:px-4 file:py-1.5 file:text-white"
                      onChange={(e) => set("videoFile", e.target.files?.[0] ?? null)}
                      aria-invalid={Boolean(errors.videoFile)}
                    />
                    <FieldError id="videoFile-error" message={errors.videoFile} />
                  </label>
                )}

                <div className="glass rounded-2xl p-4 text-sm text-muted">
                  Al enviar, tu postulación queda <strong className="font-medium text-paper">en revisión</strong>. El
                  comité del programa la aprobará antes de que aparezcas en la pantalla de candidatos.
                </div>
              </fieldset>
            )}
          </motion.div>
        </AnimatePresence>

        {progress && (
          <div role="status" className="space-y-2">
            <div className="flex justify-between label-hud text-muted">
              <span>{progress.label}</span>
              <span>{progress.pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full bg-neon" animate={{ width: `${progress.pct}%` }} />
            </div>
          </div>
        )}
        {submitError && (
          <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">
            {submitError}
          </p>
        )}

        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || Boolean(progress)}>
            ← Atrás
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continuar →</Button>
          ) : (
            <Button variant="neon" onClick={submit} loading={Boolean(progress)}>
              Enviar postulación
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ExistingApplication({ candidate }: { candidate: Candidate }) {
  const status = {
    pending: { label: "En revisión", tone: "text-magenta-soft", text: "El comité está revisando tu postulación." },
    approved: { label: "Aprobada", tone: "text-neon", text: "¡Ya eres parte del roster de candidatos!" },
    rejected: {
      label: "No aprobada",
      tone: "text-danger",
      text: "Tu postulación no fue aprobada. Escribe a la coordinación del programa si tienes dudas.",
    },
  }[candidate.status];
  return (
    <div className="grid items-center gap-8 sm:grid-cols-[220px_minmax(0,1fr)]">
      <CandidateCard static index={0} candidate={candidate} />
      <div className="space-y-3">
        <span className="label-hud text-muted">Tu postulación</span>
        <h3 className="text-2xl">Ya tienes un personaje creado</h3>
        <p className={clsx("label-hud", status.tone)}>● {status.label}</p>
        <p className="text-muted">{status.text}</p>
      </div>
    </div>
  );
}

function Success() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-5 py-8 text-center"
      role="status"
    >
      <Celebration />
      <motion.div
        initial={{ rotateY: 180 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.9, type: "spring" }}
        className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-neon text-5xl text-void shadow-[0_0_60px_-5px_rgb(15_236_15/0.8)]"
      >
        ✓
      </motion.div>
      <span className="label-hud text-neon">Personaje creado</span>
      <h3 className="text-3xl sm:text-4xl">¡Tu postulación fue enviada!</h3>
      <p className="mx-auto max-w-md text-muted">
        La revisaremos y te avisaremos por correo. Si es aprobada, aparecerás en la pantalla de selección de candidatos.
      </p>
    </motion.div>
  );
}

/** Flujo completo: verificar correo → ¿ya se postuló? → formulario por pasos → confirmación. */
export function ApplicationFlow() {
  const [done, setDone] = useState(false);

  if (done) return <Success />;

  return (
    <EmailGate
      returnTo="/?accion=postular"
      title="Primero, confirma que eres del programa"
      description="Te enviaremos un enlace a tu correo institucional. Así garantizamos que cada postulación es real."
    >
      {(user) => <OwnApplicationCheck user={user} onDone={() => setDone(true)} />}
    </EmailGate>
  );
}

function OwnApplicationCheck({ user, onDone }: { user: User & { email: string }; onDone: () => void }) {
  const [state, setState] = useState<{ loading: boolean; existing: Candidate | null }>({ loading: true, existing: null });

  useEffect(() => {
    let alive = true;
    getOwnApplication(user.uid)
      .then((existing) => alive && setState({ loading: false, existing }))
      .catch(() => alive && setState({ loading: false, existing: null }));
    return () => {
      alive = false;
    };
  }, [user.uid]);

  if (state.loading) return <p className="label-hud p-8 text-center text-muted">Buscando tu personaje…</p>;
  if (state.existing) return <ExistingApplication candidate={state.existing} />;
  return <ApplicationForm user={user} onDone={onDone} />;
}
