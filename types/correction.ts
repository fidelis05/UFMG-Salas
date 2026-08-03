export interface Proposal {
  proposedRoom: string;
  proposerHash: string;
  verifiers: string[];
}

/** Stored server-side, in KV. */
export interface CorrectionEntry {
  proposals: Proposal[];
  status: "pending" | "approved";
  approvedRoom?: string;
}

/** Shape sent to the browser: proposer identities reduced to a boolean. */
export interface ClientCorrection {
  approvedRoom?: string;
  status: "pending" | "approved";
  proposals: {
    proposedRoom: string;
    isProposer: boolean;
  }[];
}

export interface CorrectionRequest {
  codigo_materia: string;
  turma: string;
  dia_semana: string;
  hora_inicial: string;
  nome_sala: string;
}
