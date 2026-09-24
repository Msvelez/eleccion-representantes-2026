export type Phase = "convocatoria" | "presentacion" | "votacion" | "escrutinio" | "resultados";

export type VotingMode = "auto" | "open" | "closed";

export type CandidateStatus = "pending" | "approved" | "rejected";

export type VideoType = "none" | "file" | "link";

export interface Settings {
  electionName: string;
  /** Fin de la convocatoria (las postulaciones cierran en este instante). */
  applicationsClose: Date;
  votingStart: Date;
  votingEnd: Date;
  /** auto = según fechas · open = abierta manualmente · closed = cerrada manualmente */
  votingMode: VotingMode;
  resultsPublished: boolean;
  /** Número de representantes a elegir. */
  seats: number;
  /** Dominios de correo institucional permitidos (sin @). */
  emailDomains: string[];
  /** Si es true, solo los correos cargados en el padrón pueden postularse y votar. */
  restrictToRoll: boolean;
  /** Estudiantes habilitados (opcional, para calcular participación). */
  eligibleVoters: number;
}

export interface Candidate {
  id: string;
  uid: string;
  name: string;
  semester: number;
  email: string;
  photoURL: string;
  photoPath: string;
  instagram: string;
  motivation: string;
  contribution: string;
  videoURL: string;
  videoPath: string;
  videoType: VideoType;
  status: CandidateStatus;
  createdAt: Date | null;
}

export interface Vote {
  email: string;
  candidateId: string;
  uid: string;
  createdAt: Date | null;
}

export interface Winner {
  candidateId: string;
  name: string;
  semester: number;
  photoURL: string;
  votes: number;
  percentage: number;
  role: string;
}

export interface PublishedResults {
  winners: Winner[];
  totalVotes: number;
  publishedAt: Date | null;
}
