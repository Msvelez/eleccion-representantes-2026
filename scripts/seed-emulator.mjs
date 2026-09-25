/**
 * Carga datos de demostración en los EMULADORES de Firebase.
 * Uso:  npm run emulators   (en otra terminal)
 *       npm run seed -- tu-correo@unbosque.edu.co
 *
 * Nunca se ejecuta contra producción: exige que los emuladores estén configurados.
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";

const adminEmail = (process.argv[2] ?? "admin@unbosque.edu.co").toLowerCase();
const phase = process.argv[3] ?? "convocatoria"; // convocatoria | presentacion | votacion | resultados

initializeApp({ projectId: "demo-mision-representante" });
const db = getFirestore();

const DAY = 86_400_000;
const now = Date.now();
const offsets = {
  convocatoria: { close: 7 * DAY, start: 14 * DAY, end: 16 * DAY },
  presentacion: { close: -1 * DAY, start: 5 * DAY, end: 7 * DAY },
  votacion: { close: -8 * DAY, start: -1 * DAY, end: 2 * DAY },
  resultados: { close: -10 * DAY, start: -4 * DAY, end: -1 * DAY },
}[phase];

if (!offsets) {
  console.error(`Fase desconocida "${phase}". Usa: convocatoria | presentacion | votacion | resultados`);
  process.exit(1);
}

const at = (ms) => Timestamp.fromMillis(now + ms);

// Limpia el emulador para empezar desde cero.
const host = process.env.FIRESTORE_EMULATOR_HOST;
await fetch(`http://${host}/emulator/v1/projects/demo-mision-representante/databases/(default)/documents`, {
  method: "DELETE",
});

const candidates = [
  ["Valentina Ríos", 6, "vale.crea", "Quiero que Creación Digital tenga más espacios para mostrar lo que hacemos: muestras, festivales y colaboraciones reales con la industria.", "Una muestra semestral de proyectos, un banco de equipos compartido y mentorías entre semestres."],
  ["Samuel Ortiz", 4, "samu.3d", "Me motiva que los estudiantes de primeros semestres se sientan parte de la comunidad desde el día uno.", "Programa de padrinos entre semestres, game jams trimestrales y un Discord oficial del programa."],
  ["Mariana López", 8, "", "Llevo cuatro años viendo cómo crece el programa y quiero dejar una base para las próximas generaciones.", "Canal directo con coordinación, encuestas abiertas cada corte y un repositorio de portafolios de egresados."],
  ["Juan Esteban Cruz", 3, "juanes.ux", "Creo que la voz de los estudiantes puede mejorar la forma en que aprendemos a crear productos digitales.", "Talleres de herramientas emergentes dictados por estudiantes y una feria de prácticas con empresas."],
];

const batch = db.batch();

batch.set(db.doc("config/settings"), {
  electionName: "Misión Representante 2026",
  applicationsClose: at(offsets.close),
  votingStart: at(offsets.start),
  votingEnd: at(offsets.end),
  votingMode: "auto",
  resultsPublished: false,
  seats: 2,
  allowAnyEmail: true,
  emailDomains: ["unbosque.edu.co"],
  restrictToRoll: false,
  eligibleVoters: 320,
});

batch.set(db.doc(`admins/${adminEmail}`), { addedAt: Timestamp.now() });

candidates.forEach(([name, semester, instagram, motivation, contribution], i) => {
  const id = `demo-${i + 1}`;
  batch.set(db.doc(`candidates/${id}`), {
    uid: id,
    name,
    semester,
    email: `demo${i + 1}@unbosque.edu.co`,
    photoURL: "",
    photoPath: "",
    instagram,
    motivation,
    contribution,
    videoURL: i === 0 ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : "",
    videoPath: "",
    videoType: i === 0 ? "link" : "none",
    status: i === 3 ? "pending" : "approved",
    createdAt: Timestamp.fromMillis(now - (i + 1) * DAY),
  });
});

if (phase === "resultados") {
  const votes = [58, 41, 27];
  votes.forEach((count, i) => batch.set(db.doc(`tallies/demo-${i + 1}`), { count }));
  const total = votes.reduce((a, b) => a + b, 0);
  batch.set(
    db.doc("public/results"),
    {
      totalVotes: total,
      publishedAt: Timestamp.now(),
      winners: [0, 1].map((i) => ({
        candidateId: `demo-${i + 1}`,
        name: candidates[i][0],
        semester: candidates[i][1],
        photoURL: "",
        votes: votes[i],
        percentage: Math.round((votes[i] / total) * 1000) / 10,
        role: ["Principal", "Suplente"][i],
      })),
    },
  );
  batch.set(db.doc("config/settings"), { resultsPublished: true, votingMode: "closed" }, { merge: true });
}

await batch.commit();
console.log(`✓ Datos de demo cargados (fase: ${phase}). Administrador: ${adminEmail}`);
