/**
 * Prueba de punta a punta de las reglas de seguridad contra los EMULADORES.
 * Uso:  npm run emulators            (en otra terminal)
 *       npm run test:rules
 *
 * Simula estudiantes reales (enlace mágico incluido) y verifica que:
 * postular y votar solo funciona en su fase, un voto por correo, conteos no manipulables, etc.
 */
import { initializeApp as initAdmin } from "firebase-admin/app";
import { getFirestore as adminDb, Timestamp } from "firebase-admin/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  OAuthProvider,
  sendSignInLinkToEmail,
  signInWithCredential,
  signInWithEmailLink,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  collection,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  getFirestore,
  setLogLevel,
  query,
  where,
} from "firebase/firestore";

const PROJECT = "demo-mision-representante";
setLogLevel("silent");
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
initAdmin({ projectId: PROJECT });
const admin = adminDb();

let passed = 0;
let failed = 0;
async function expect(label, shouldPass, fn) {
  let ok;
  try {
    await fn();
    ok = shouldPass;
  } catch (e) {
    ok = !shouldPass;
    if (shouldPass) console.error("   ↳", e.code ?? e.message);
  }
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  ok ? passed++ : failed++;
}

/** Inicia sesión como `email` usando el flujo real de enlace mágico del emulador. */
async function asUser(email) {
  const app = initializeApp({ apiKey: "demo-key", projectId: PROJECT }, email + Math.random());
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  await sendSignInLinkToEmail(auth, email, { url: "http://localhost:3000/verificar", handleCodeInApp: true });
  const res = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/oobCodes`);
  const { oobCodes } = await res.json();
  const link = oobCodes.filter((c) => c.email === email).pop().oobLink;
  await signInWithEmailLink(auth, email, link);
  return { app, auth, db, uid: auth.currentUser.uid, email };
}

function emulatorApp(name) {
  const app = initializeApp({ apiKey: "demo-key", projectId: PROJECT }, name + Math.random());
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  return { app, auth, db };
}

/** Inicia sesión con una cuenta Microsoft simulada (el emulador acepta tokens sin firmar). */
async function asMicrosoftUser(email) {
  const { app, auth, db } = emulatorApp(email);
  const idToken = JSON.stringify({ sub: "ms-" + email, email });
  await signInWithCredential(auth, new OAuthProvider("microsoft.com").credential({ idToken }));
  return { app, auth, db, uid: auth.currentUser.uid, email };
}

/** Cuenta con contraseña y correo SIN verificar (no debería poder votar). */
async function asUnverifiedUser(email) {
  const { app, auth, db } = emulatorApp(email);
  await createUserWithEmailAndPassword(auth, email, "secreto-123");
  return { app, auth, db, uid: auth.currentUser.uid, email };
}

const DAY = 86_400_000;
async function setPhase(phase, extra = {}) {
  const now = Date.now();
  const o = {
    convocatoria: [7, 14, 16],
    presentacion: [-1, 5, 7],
    votacion: [-8, -1, 2],
    cerrada: [-10, -5, -1],
  }[phase].map((d) => Timestamp.fromMillis(now + d * DAY));
  await admin.doc("config/settings").set({
    electionName: "Test",
    applicationsClose: o[0],
    votingStart: o[1],
    votingEnd: o[2],
    votingMode: "auto",
    resultsPublished: false,
    seats: 2,
    emailDomains: ["unbosque.edu.co"],
    restrictToRoll: false,
    eligibleVoters: 0,
    ...extra,
  });
}

function application(u, overrides = {}) {
  return setDoc(doc(u.db, "candidates", u.uid), {
    uid: u.uid,
    name: "Estudiante de Prueba",
    semester: 5,
    email: u.email,
    photoURL: "https://example.com/p.jpg",
    photoPath: `candidates/${u.uid}/photo.jpg`,
    instagram: "",
    motivation: "Quiero representar a mis compañeros del programa.",
    contribution: "Propongo más espacios de muestra y colaboración.",
    videoURL: "",
    videoPath: "",
    videoType: "none",
    status: "pending",
    createdAt: serverTimestamp(),
    ...overrides,
  });
}

function vote(u, candidateId, tallyValue = increment(1)) {
  const b = writeBatch(u.db);
  b.set(doc(u.db, "votes", u.email), { candidateId, email: u.email, uid: u.uid, createdAt: serverTimestamp() });
  b.set(doc(u.db, "tallies", candidateId), { count: tallyValue }, { merge: true });
  return b.commit();
}

// ───────── Preparación ─────────
await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
await admin.doc("admins/admin@unbosque.edu.co").set({ addedAt: Timestamp.now() });
for (const [id, status] of [["c1", "approved"], ["c2", "approved"], ["c3", "pending"]]) {
  await admin.doc(`candidates/${id}`).set({ uid: id, name: id, semester: 3, status, email: `${id}@unbosque.edu.co` });
}

const ana = await asUser("ana@unbosque.edu.co");
const beto = await asUser("beto@unbosque.edu.co");
const intruso = await asUser("intruso@gmail.com");
const adminUser = await asUser("admin@unbosque.edu.co");

// ───────── Fase 1: convocatoria ─────────
console.log("\n— Fase 1 · Convocatoria");
await setPhase("convocatoria");
await expect("Estudiante institucional puede postularse", true, () => application(ana));
await expect("No puede postularse dos veces", false, () => application(ana));
await expect("Correo no institucional no puede postularse", false, () => application(intruso));
await expect("No puede autoaprobarse", false, () => application(beto, { status: "approved" }));
await expect("No puede postular a nombre de otro correo", false, () => application(beto, { email: "otro@unbosque.edu.co" }));
await expect("No puede votar durante la convocatoria", false, () => vote(beto, "c1"));
await expect("Público ve candidatos aprobados", true, () =>
  getDocs(query(collection(beto.db, "candidates"), where("status", "==", "approved"))),
);
await expect("Público NO lista todos los candidatos", false, () => getDocs(collection(beto.db, "candidates")));
await expect("Postulante ve su propia postulación pendiente", true, () => getDoc(doc(ana.db, "candidates", ana.uid)));
await expect("Estudiante no puede cambiar configuración", false, () =>
  updateDoc(doc(ana.db, "config", "settings"), { votingMode: "open" }),
);

// ───────── Fase 2: presentación ─────────
console.log("\n— Fase 2 · Presentación");
await setPhase("presentacion");
await expect("Postulaciones cerradas tras la fecha", false, () => application(beto));
await expect("Aún no se puede votar", false, () => vote(beto, "c1"));

// ───────── Fase 3: votación ─────────
console.log("\n— Fase 3 · Votación");
await setPhase("votacion");
await expect("No se puede votar por un candidato pendiente", false, () => vote(ana, "c3"));
await expect("No se puede inflar el conteo (+100)", false, () => vote(ana, "c1", 100));
await expect("Voto válido se registra", true, () => vote(ana, "c1"));
await expect("Voto duplicado con el mismo correo es rechazado", false, () => vote(ana, "c2"));
await expect("Correo no institucional no puede votar", false, () => vote(intruso, "c1"));
await expect("No se puede sumar al conteo sin votar", false, () =>
  setDoc(doc(beto.db, "tallies", "c2"), { count: increment(1) }, { merge: true }),
);
await expect("Estudiante no puede ver conteos parciales", false, () => getDoc(doc(beto.db, "tallies", "c1")));
await expect("Estudiante no puede ver votos ajenos", false, () => getDoc(doc(beto.db, "votes", ana.email)));
await expect("Estudiante puede ver su propio voto", true, () => getDoc(doc(ana.db, "votes", ana.email)));
await expect("Segundo estudiante vota", true, () => vote(beto, "c1"));
const tally = (await admin.doc("tallies/c1").get()).data();
await expect(`Conteo correcto (c1 = ${tally?.count})`, true, async () => {
  if (tally?.count !== 2) throw new Error("conteo inesperado");
});

// Cuentas Microsoft institucionales y correos sin verificar
const msUser = await asMicrosoftUser("lucia@unbosque.edu.co");
await expect("Cuenta Microsoft institucional puede votar", true, () => vote(msUser, "c2"));
await expect("Cuenta Microsoft no puede votar dos veces", false, () => vote(msUser, "c1"));
const msOutsider = await asMicrosoftUser("alguien@hotmail.com");
await expect("Cuenta Microsoft de otro dominio no puede votar", false, () => vote(msOutsider, "c1"));
const unverified = await asUnverifiedUser("falso@unbosque.edu.co");
await expect("Correo institucional sin verificar no puede votar", false, () => vote(unverified, "c1"));

// Padrón
await setPhase("votacion", { restrictToRoll: true });
const carla = await asUser("carla@unbosque.edu.co");
await expect("Con padrón activo, correo fuera del padrón no vota", false, () => vote(carla, "c1"));
await admin.doc("roll/carla@unbosque.edu.co").set({ addedAt: Timestamp.now() });
await expect("Con padrón activo, correo en el padrón sí vota", true, () => vote(carla, "c2"));

// Cierre manual
await setPhase("votacion", { votingMode: "closed" });
const dani = await asUser("dani@unbosque.edu.co");
await expect("Cierre manual bloquea votos", false, () => vote(dani, "c1"));
await setPhase("presentacion", { votingMode: "open" });
await expect("Apertura manual permite votar", true, () => vote(dani, "c1"));

// ───────── Administración ─────────
console.log("\n— Administración");
await expect("Admin lee conteos", true, () => getDoc(doc(adminUser.db, "tallies", "c1")));
await expect("Admin lee todos los votos", true, () => getDocs(collection(adminUser.db, "votes")));
await expect("Admin aprueba candidatos", true, () => updateDoc(doc(adminUser.db, "candidates", ana.uid), { status: "approved" }));
await expect("Admin no puede borrar votos", false, () => writeBatch(adminUser.db).delete(doc(adminUser.db, "votes", ana.email)).commit());
await expect("Admin publica resultados", true, () =>
  setDoc(doc(adminUser.db, "public", "results"), { winners: [], totalVotes: 4, publishedAt: serverTimestamp() }),
);
await expect("Público lee resultados", true, () => getDoc(doc(beto.db, "public", "results")));
await setPhase("votacion", { resultsPublished: true });
const eva = await asUser("eva@unbosque.edu.co");
await expect("Con resultados publicados ya no se vota", false, () => vote(eva, "c1"));

for (const u of [ana, beto, intruso, adminUser, carla, dani, eva, msUser, msOutsider, unverified]) await deleteApp(u.app);
console.log(`\n${passed} pruebas correctas, ${failed} fallidas`);
process.exit(failed ? 1 : 0);
