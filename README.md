# Misión Representante · Creación Digital

Plataforma web para gestionar la **elección de representantes estudiantiles** del programa de Creación Digital de la Universidad El Bosque. La elección funciona como un videojuego: te postulas creando tu personaje, conoces a los candidatos en una pantalla de selección, votas eligiendo a tu jugador y los resultados se celebran como un nivel superado.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Firebase (Auth, Firestore, Storage) · Motion (animaciones).

---

## Cómo funciona

La plataforma **detecta sola la fase** según las fechas guardadas en Firestore (`config/settings`). No hay que tocar código cuando cambia una etapa; incluso cambia de pantalla en vivo, sin recargar, justo a la hora configurada.

| Fase | Cuándo | Qué ve el estudiante |
|---|---|---|
| **1 · Convocatoria** | hasta `applicationsClose` (p. ej. 15 oct 00:00) | Hero "¿Quieres representar a Creación Digital?", contador y formulario por pasos con vista previa de la tarjeta |
| **2 · Presentación** | hasta `votingStart` | "MISIÓN COMPLETADA", número de candidatos y galería de perfiles desbloqueables |
| **3 · Votación** | entre `votingStart` y `votingEnd`, o abierta manualmente | Roster tipo selección de personaje, perfil completo, verificación de correo y confirmación del voto |
| Escrutinio | votación cerrada, resultados sin publicar | "Contando votos…" |
| **4 · Resultados** | cuando administración publica | "Representantes Elegidos": fotos, votos, porcentaje y celebración |

La lógica vive en [src/lib/phase.ts](src/lib/phase.ts) y se replica en [firestore.rules](firestore.rules). Así la seguridad no depende del navegador: aunque alguien manipule la página, el servidor rechaza postulaciones fuera de fecha o votos con la votación cerrada.

### Identidad y un voto por correo

- Postularse y votar exige **confirmar el correo institucional** con un enlace mágico (Firebase Auth, *email link*, sin contraseñas).
- Los dominios permitidos se configuran desde `/admin` (por defecto `unbosque.edu.co`).
- **Padrón opcional:** con el dominio, cualquier estudiante de la universidad podría votar. Si activas el padrón en *Correos y acceso* y cargas los correos del programa, solo esas personas pueden postularse y votar.
- Cada voto se guarda en `votes/{correo}`: el correo **es** el id del documento, así que un segundo voto es imposible por diseño. El conteo (`tallies/{candidato}`) sube en la misma operación atómica y las reglas verifican que suba exactamente +1.
- Los conteos parciales solo los ve administración. El público solo ve los resultados publicados.

---

## Estructura

```
├── firestore.rules          Reglas de seguridad (fases, un voto por correo, admins)
├── storage.rules            Fotos (≤5 MB) y videos (≤60 MB) de postulantes
├── firebase.json            Configuración de emuladores y despliegue de reglas
├── scripts/
│   ├── seed-emulator.mjs    Datos de demostración para los emuladores
│   └── test-rules.mjs       34 pruebas de punta a punta de las reglas
└── src/
    ├── app/
    │   ├── page.tsx         Experiencia pública (cambia según la fase)
    │   ├── verificar/       Destino del enlace mágico del correo
    │   ├── admin/           Panel de administración protegido
    │   ├── layout.tsx       Fuentes Poppins + JetBrains Mono
    │   └── globals.css      Tokens de color, vidrio, HUD, animaciones
    ├── lib/
    │   ├── firebase.ts      Inicialización (y conexión a emuladores)
    │   ├── data.ts          Lecturas y escrituras en Firestore y Storage
    │   ├── phase.ts         Cálculo automático de la fase
    │   ├── settings.ts      Valores por defecto y zona horaria de Bogotá
    │   ├── auth.ts          Enlace mágico y errores legibles
    │   └── types.ts
    ├── hooks/               useElection (config + fase + sesión), candidatos, contador
    └── components/
        ├── ui/              Botón, modal accesible, contador, marquee, fondo espacial
        ├── experience/      Las 4 fases, tarjetas, perfil, flujos de postulación y voto
        └── admin/           Paneles de resumen, candidatos, fechas, votación, ganadores, exportar, accesos
```

### Modelo de datos (Firestore)

| Colección | Documento | Contenido | Quién lee / escribe |
|---|---|---|---|
| `config` | `settings` | fechas, `votingMode` (`auto`/`open`/`closed`), `resultsPublished`, `seats`, `emailDomains`, `restrictToRoll`, `eligibleVoters` | todos leen · admin escribe |
| `candidates` | `{uid}` | nombre, semestre, correo, foto, Instagram, motivación, propuestas, video, `status` | aprobados son públicos · el postulante crea el suyo en Fase 1 · admin modera |
| `votes` | `{correo}` | `candidateId`, `uid`, `createdAt` | cada quien ve el suyo · admin ve todos · nadie edita ni borra |
| `tallies` | `{candidateId}` | `count` | solo admin |
| `public` | `results` | ganadores con votos y porcentaje | todos leen · admin publica |
| `admins` | `{correo}` | — | se crea desde la consola |
| `roll` | `{correo}` | padrón opcional | admin |

---

## Ejecutar localmente

Requisitos: **Node.js 20+**. Para los emuladores también necesitas **Java 11+**.

```bash
npm install
```

### Opción A · Con emuladores (sin proyecto real, recomendado para desarrollar)

```bash
# 1. Variables: solo activar emuladores
echo NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true > .env.local

# 2. Terminal 1: emuladores de Auth, Firestore y Storage (UI en http://127.0.0.1:4000)
npm run emulators

# 3. Terminal 2: datos de demo. Fase: convocatoria | presentacion | votacion | resultados
npm run seed -- tu-correo@unbosque.edu.co convocatoria

# 4. Terminal 3
npm run dev          # → http://localhost:3000
```

- Los correos no se envían de verdad. El **enlace mágico aparece en la terminal de los emuladores** y en la UI (pestaña *Authentication*); ábrelo en el mismo navegador.
- Para ver otra fase, vuelve a correr `npm run seed -- <correo> <fase>`. En desarrollo también puedes forzar una vista con `?fase=votacion` en la URL (solo visual; las reglas siguen aplicando).
- `npm run test:rules` corre las 34 pruebas de seguridad contra los emuladores (postulaciones fuera de fecha, voto duplicado, conteo inflado, padrón, cierre manual, etc.). **Borra los datos del emulador.**

### Opción B · Con un proyecto real de Firebase

1. Crea un proyecto en [console.firebase.google.com](https://console.firebase.google.com) y registra una **app web**.
2. **Authentication → Sign-in method →** habilita *Correo electrónico/contraseña* y activa **"Vínculo de correo electrónico (acceso sin contraseña)"**. En *Settings → Authorized domains* agrega tu dominio de producción.
3. Crea **Firestore Database** y **Storage**.
4. Copia `.env.example` como `.env.local` y pega la configuración de la app web.
5. Despliega las reglas:
   ```bash
   npx firebase-tools login
   npx firebase-tools use --add          # elige tu proyecto
   npm run deploy:rules
   ```
6. **Primer administrador:** en Firestore crea la colección `admins` con un documento cuyo **ID sea tu correo en minúsculas** (p. ej. `coordinacion@unbosque.edu.co`). Puede quedar vacío. Desde `/admin` ese administrador puede agregar otros.
7. Entra a `/admin → Fases y fechas`, revisa las fechas y guarda. Esto crea `config/settings`; mientras no exista, la app usa los valores de [src/lib/settings.ts](src/lib/settings.ts).
8. `npm run dev`, o despliega en Vercel (Next.js) con las mismas variables de entorno.

---

## Panel de administración (`/admin`)

Se accede con enlace mágico y solo para correos en la colección `admins`.

- **Resumen:** postulaciones, aprobados, votos, participación, línea de tiempo y votos por candidato en tiempo real.
- **Candidatos:** tarjetas filtrables por estado, ficha completa, **aprobar / rechazar / volver a pendiente**. Solo los aprobados aparecen en el sitio y reciben votos.
- **Fases y fechas:** cierre de postulaciones, apertura y cierre de votación (hora de Colombia) y número de representantes.
- **Votación:** *Automático* (según fechas), **Activar votación** o **Cerrar votación** de inmediato.
- **Ganadores:** sugiere los N más votados; puedes ajustar la selección y el rol (Principal / Suplente) y **publicar resultados**, lo que cierra la votación y muestra la Fase 4. También se pueden ocultar.
- **Exportar:** candidatos y votos en CSV compatible con Excel.
- **Correos y acceso:** dominios institucionales, total de estudiantes habilitados y padrón (pegar una columna de Excel).

---

## Diseño

La identidad parte de la página oficial del programa: magenta `#D10065`, vino profundo `#240011`, el **verde neón `#0FEC0F`** del marquee oficial y tipografía **Poppins** (300 / 500). Encima se construye una capa propia de videojuego:

- **HUD:** esquinas, etiquetas en mono y códigos de jugador (P01, P02…).
- **Vidrio ligero** sobre un fondo espacial con rejilla en perspectiva.
- **Tarjetas 3D** que siguen el cursor, cartas que se voltean al desbloquearse y un telón de revelación para los resultados.

**Accesibilidad:**

- Respeta *reducir movimiento* (desactiva confeti y animaciones).
- Foco visible en verde y modales con foco atrapado y tecla Esc.
- Roster navegable con flechas del teclado.
- Etiquetas ARIA en contadores, pasos y medidores.
- Contraste alto sobre fondo oscuro.

---

## Notas

- `AGENTS.md` y `CLAUDE.md` los genera `next dev` automáticamente (guía de Next.js para asistentes de IA). Para desactivarlos, agrega `agentRules: false` en `next.config.ts`.
- La hora de cada fase se evalúa en el servidor de Firestore (`request.time`). El contador del navegador es solo visual.
- La exportación de votos contiene correos personales: manéjala con cuidado.
