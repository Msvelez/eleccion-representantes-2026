import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { firebase, storageEnabled } from "./firebase";
import { DEFAULT_SETTINGS } from "./settings";
import type {
  Candidate,
  CandidateStatus,
  PublishedResults,
  Settings,
  Vote,
  VideoType,
  Winner,
} from "./types";

// ───────────── Conversión ─────────────

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function toSettings(data: DocumentData | undefined): Settings {
  if (!data) return DEFAULT_SETTINGS;
  return {
    electionName: data.electionName ?? DEFAULT_SETTINGS.electionName,
    applicationsClose: toDate(data.applicationsClose) ?? DEFAULT_SETTINGS.applicationsClose,
    votingStart: toDate(data.votingStart) ?? DEFAULT_SETTINGS.votingStart,
    votingEnd: toDate(data.votingEnd) ?? DEFAULT_SETTINGS.votingEnd,
    votingMode: data.votingMode ?? DEFAULT_SETTINGS.votingMode,
    resultsPublished: data.resultsPublished ?? false,
    seats: data.seats ?? DEFAULT_SETTINGS.seats,
    allowAnyEmail: data.allowAnyEmail ?? true,
    autoApprove: data.autoApprove ?? true,
    emailDomains: data.emailDomains ?? DEFAULT_SETTINGS.emailDomains,
    restrictToRoll: data.restrictToRoll ?? false,
    eligibleVoters: data.eligibleVoters ?? 0,
  };
}

function toCandidate(id: string, data: DocumentData): Candidate {
  return {
    id,
    uid: data.uid ?? id,
    name: data.name ?? "",
    semester: data.semester ?? 0,
    email: data.email ?? "",
    photoURL: data.photoURL ?? "",
    photoPath: data.photoPath ?? "",
    instagram: data.instagram ?? "",
    motivation: data.motivation ?? "",
    contribution: data.contribution ?? "",
    videoURL: data.videoURL ?? "",
    videoPath: data.videoPath ?? "",
    videoType: data.videoType ?? "none",
    status: data.status ?? "pending",
    createdAt: toDate(data.createdAt),
  };
}

const byName = (a: Candidate, b: Candidate) => a.name.localeCompare(b.name, "es");

// ───────────── Configuración ─────────────

export function watchSettings(onChange: (s: Settings) => void, onError: (e: Error) => void): Unsubscribe {
  const { db } = firebase();
  return onSnapshot(
    doc(db, "config", "settings"),
    (snap) => onChange(toSettings(snap.data())),
    onError,
  );
}

/** Guarda cambios de configuración. Si el documento no existe, lo crea completo (las reglas lo necesitan así). */
export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const { db } = firebase();
  const ref = doc(db, "config", "settings");
  const current = await getDoc(ref);
  await setDoc(ref, current.exists() ? patch : { ...DEFAULT_SETTINGS, ...patch }, { merge: true });
}

// ───────────── Candidatos ─────────────

export function watchApprovedCandidates(
  onChange: (c: Candidate[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  const { db } = firebase();
  const q = query(collection(db, "candidates"), where("status", "==", "approved"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => toCandidate(d.id, d.data())).sort(byName)),
    onError,
  );
}

/**
 * Todos los candidatos con su correo (solo administración). El correo vive aparte, en
 * candidateContacts, para que no sea público aunque la tarjeta del candidato sí lo sea.
 */
export function watchAllCandidates(
  onChange: (c: Candidate[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  const { db } = firebase();
  let candidates: Candidate[] = [];
  let emails: Record<string, string> = {};
  const emit = () => onChange(candidates.map((c) => ({ ...c, email: emails[c.id] ?? c.email })));
  const a = onSnapshot(
    collection(db, "candidates"),
    (snap) => {
      candidates = snap.docs.map((d) => toCandidate(d.id, d.data())).sort(byName);
      emit();
    },
    onError,
  );
  const b = onSnapshot(
    collection(db, "candidateContacts"),
    (snap) => {
      emails = Object.fromEntries(snap.docs.map((d) => [d.id, d.data().email ?? ""]));
      emit();
    },
    onError,
  );
  return () => {
    a();
    b();
  };
}

export async function getOwnApplication(uid: string): Promise<Candidate | null> {
  const { db } = firebase();
  const snap = await getDoc(doc(db, "candidates", uid));
  return snap.exists() ? toCandidate(snap.id, snap.data()) : null;
}

export async function setCandidateStatus(id: string, status: CandidateStatus): Promise<void> {
  const { db } = firebase();
  await updateDoc(doc(db, "candidates", id), { status });
}

function extensionOf(file: File): string {
  const fromName = file.name.split(".").pop();
  return (fromName && fromName.length <= 5 ? fromName : file.type.split("/")[1] || "bin").toLowerCase();
}

export function uploadCandidateFile(
  uid: string,
  kind: "photo" | "video",
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ url: string; path: string }> {
  const { storage } = firebase();
  const path = `candidates/${uid}/${kind}.${extensionOf(file)}`;
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (s) => onProgress?.(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      reject,
      async () => resolve({ url: await getDownloadURL(task.snapshot.ref), path }),
    );
  });
}

/** Reduce la foto a un JPEG liviano (data URL) para guardarla en Firestore sin usar Storage. */
export async function compressPhoto(file: File, maxSide = 720): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    const dataURL = canvas.toDataURL("image/jpeg", quality);
    if (dataURL.length < 300_000) return dataURL;
  }
  throw new Error("No pudimos comprimir la foto. Intenta con otra imagen.");
}

export interface ApplicationInput {
  name: string;
  semester: number;
  instagram: string;
  motivation: string;
  contribution: string;
  photo: File;
  videoType: VideoType;
  videoFile: File | null;
  videoLink: string;
}

export async function submitApplication(
  input: ApplicationInput,
  onProgress: (label: string, pct: number) => void,
  autoApprove: boolean,
): Promise<void> {
  const { auth, db } = firebase();
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Debes confirmar tu correo antes de postularte.");

  onProgress("Preparando foto", 0);
  const photo = storageEnabled
    ? await uploadCandidateFile(user.uid, "photo", input.photo, (p) => onProgress("Subiendo foto", p))
    : { url: await compressPhoto(input.photo), path: "" };

  let videoURL = "";
  let videoPath = "";
  if (storageEnabled && input.videoType === "file" && input.videoFile) {
    const video = await uploadCandidateFile(user.uid, "video", input.videoFile, (p) =>
      onProgress("Subiendo video", p),
    );
    videoURL = video.url;
    videoPath = video.path;
  } else if (input.videoType === "link") {
    videoURL = input.videoLink.trim();
  }

  onProgress("Creando tu personaje", 100);
  const batch = writeBatch(db);
  batch.set(doc(db, "candidateContacts", user.uid), {
    email: user.email.toLowerCase(),
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, "candidates", user.uid), {
    uid: user.uid,
    name: input.name.trim(),
    semester: input.semester,
    photoURL: photo.url,
    photoPath: photo.path,
    instagram: input.instagram.trim().replace(/^@/, ""),
    motivation: input.motivation.trim(),
    contribution: input.contribution.trim(),
    videoURL,
    videoPath,
    videoType: videoURL ? input.videoType : "none",
    status: autoApprove ? "approved" : "pending",
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

// ───────────── Votos ─────────────

export async function getOwnVote(email: string): Promise<Vote | null> {
  const { db } = firebase();
  const snap = await getDoc(doc(db, "votes", email.toLowerCase()));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { email: snap.id, candidateId: d.candidateId, uid: d.uid, createdAt: toDate(d.createdAt) };
}

/**
 * Registra el voto y suma 1 al conteo del candidato en un único lote atómico.
 * Las reglas de Firestore rechazan votos duplicados, fuera de fecha o de correos no permitidos.
 */
export async function castVote(candidateId: string): Promise<void> {
  const { auth, db } = firebase();
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Debes confirmar tu correo antes de votar.");
  const email = user.email.toLowerCase();

  const batch = writeBatch(db);
  batch.set(doc(db, "votes", email), {
    candidateId,
    email,
    uid: user.uid,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, "tallies", candidateId), { count: increment(1) }, { merge: true });
  await batch.commit();
}

export async function getAllVotes(): Promise<Vote[]> {
  const { db } = firebase();
  const snap = await getDocs(collection(db, "votes"));
  return snap.docs.map((d) => {
    const data = d.data();
    return { email: d.id, candidateId: data.candidateId, uid: data.uid, createdAt: toDate(data.createdAt) };
  });
}

export function watchTallies(onChange: (t: Record<string, number>) => void, onError: (e: Error) => void) {
  const { db } = firebase();
  return onSnapshot(
    collection(db, "tallies"),
    (snap) => {
      const tallies: Record<string, number> = {};
      snap.docs.forEach((d) => (tallies[d.id] = d.data().count ?? 0));
      onChange(tallies);
    },
    onError,
  );
}

export async function countVotes(): Promise<number> {
  const { db } = firebase();
  const snap = await getCountFromServer(collection(db, "votes"));
  return snap.data().count;
}

// ───────────── Administración ─────────────

export async function isAdminEmail(email: string): Promise<boolean> {
  const { db } = firebase();
  try {
    const snap = await getDoc(doc(db, "admins", email.toLowerCase()));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function importRoll(emails: string[]): Promise<number> {
  const { db } = firebase();
  const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))];
  for (let i = 0; i < unique.length; i += 450) {
    const batch = writeBatch(db);
    unique.slice(i, i + 450).forEach((email) => batch.set(doc(db, "roll", email), { addedAt: serverTimestamp() }));
    await batch.commit();
  }
  return unique.length;
}

export async function countRoll(): Promise<number> {
  const { db } = firebase();
  const snap = await getCountFromServer(collection(db, "roll"));
  return snap.data().count;
}

// ───────────── Resultados ─────────────

export function watchResults(onChange: (r: PublishedResults | null) => void, onError: (e: Error) => void) {
  const { db } = firebase();
  return onSnapshot(
    doc(db, "public", "results"),
    (snap) => {
      const d = snap.data();
      onChange(
        d ? { winners: (d.winners ?? []) as Winner[], totalVotes: d.totalVotes ?? 0, publishedAt: toDate(d.publishedAt) } : null,
      );
    },
    onError,
  );
}

export async function publishResults(winners: Winner[], totalVotes: number): Promise<void> {
  const { db } = firebase();
  const batch = writeBatch(db);
  batch.set(doc(db, "public", "results"), { winners, totalVotes, publishedAt: serverTimestamp() });
  batch.set(doc(db, "config", "settings"), { resultsPublished: true, votingMode: "closed" }, { merge: true });
  await batch.commit();
}

async function deleteCollection(name: string): Promise<number> {
  const { db } = firebase();
  const snap = await getDocs(collection(db, name));
  for (let i = 0; i < snap.docs.length; i += 450) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.size;
}

/**
 * Reinicia la elección tras una prueba: borra votos, conteos y resultados publicados
 * (y, si se pide, las postulaciones) y vuelve la votación a modo automático.
 * Las reglas solo lo permiten con la votación cerrada.
 */
export async function resetElection(removeCandidates: boolean): Promise<{ votes: number; candidates: number }> {
  const { db } = firebase();
  const votes = await deleteCollection("votes");
  await deleteCollection("tallies");
  const batch = writeBatch(db);
  batch.delete(doc(db, "public", "results"));
  await batch.commit();
  let candidates = 0;
  if (removeCandidates) {
    candidates = await deleteCollection("candidates");
    await deleteCollection("candidateContacts");
  }
  await saveSettings({ resultsPublished: false, votingMode: "auto" });
  return { votes, candidates };
}

export async function unpublishResults(): Promise<void> {
  await saveSettings({ resultsPublished: false });
}
