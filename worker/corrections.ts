import type {
  CorrectionEntry,
  ClientCorrection,
} from "../types/correction";

/** Confirmations required *beyond* the proposer, so 1 means two students total. */
export const APPROVAL_THRESHOLD = 1;

/** Entries expire rather than being keyed by semester (scraped rows carry no
 *  semester field), so stale rooms self-heal across semester rollover. */
export const CORRECTION_TTL_SECONDS = 180 * 24 * 60 * 60;

export const MAX_PROPOSALS_PER_SLOT = 10;
export const MAX_SUBMISSIONS_PER_DAY = 20;
export const MAX_ROOM_NAME_LENGTH = 100;

const CORRECTION_PREFIX = "correction:";
const RATE_PREFIX = "rate:";

export interface CorrectionsEnv {
  Salas: KVNamespace;
  /** `wrangler secret put CORRECTION_HASH_SECRET`. Without it the stored hashes
   *  would be brute-forceable, so writes fail closed. */
  CORRECTION_HASH_SECRET?: string;
}

/** Kept on the key so `list()` can answer "what room won?" without a read per slot. */
export interface CorrectionMetadata {
  approvedRoom?: string;
}

const DAY_BY_PREFIX: Record<string, string> = {
  seg: "SEGUNDA",
  ter: "TERÇA",
  qua: "QUARTA",
  qui: "QUINTA",
  sex: "SEXTA",
  sáb: "SÁBADO",
  sab: "SÁBADO",
  dom: "DOMINGO",
};

/**
 * A scraped row may fold several days into one record ("Ter-Qui" — ~41% of ICEX
 * rows) while correction keys are single-day, so every day the row covers has to
 * be derived. Otherwise corrections for anything but the first day never match.
 */
export function expandDias(dia: string): string[] {
  return dia
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => DAY_BY_PREFIX[part.toLowerCase().substring(0, 3)] ?? part.toUpperCase());
}

export function buildCorrectionKey(
  codigoMateria: string,
  turma: string,
  diaSemana: string,
  horaInicial: string
): string {
  return `${codigoMateria}|${turma}|${diaSemana}|${horaInicial}`;
}

/**
 * Comparison form only, so "CAD 1 - Sala 3009" and "CAD1 - Sala 3009" count as one
 * proposal instead of splitting the vote. The typed spelling is what gets stored.
 */
export function normalizeRoomName(room: string): string {
  return room.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Control characters are rejected because these names are echoed into the exported
 * .ics, where a stray CR/LF would let a submitter inject calendar properties.
 */
export function validateRoomName(
  raw: unknown
): { ok: true; room: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Nome da sala inválido." };
  }
  const room = raw.trim();
  if (!room) {
    return { ok: false, error: "Nome da sala inválido." };
  }
  if (room.length > MAX_ROOM_NAME_LENGTH) {
    return {
      ok: false,
      error: `Nome da sala inválido (máx. ${MAX_ROOM_NAME_LENGTH} caracteres).`,
    };
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(room)) {
    return { ok: false, error: "Nome da sala contém caracteres inválidos." };
  }
  return { ok: true, room };
}

/**
 * HMAC rather than a bare digest: UFMG registration numbers are short and
 * enumerable, so an unsalted SHA-256 of one is reversible with a rainbow table.
 */
export async function hashUser(
  matricula: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(matricula));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Pending slots are included, not just approved ones — otherwise their proposals
 * could never be surfaced for someone to confirm and nothing would reach approval.
 */
export async function listCorrectionSlots(
  env: CorrectionsEnv
): Promise<Map<string, CorrectionMetadata>> {
  const slots = new Map<string, CorrectionMetadata>();
  let cursor: string | undefined;

  do {
    const page = await env.Salas.list<CorrectionMetadata>({
      prefix: CORRECTION_PREFIX,
      cursor,
    });
    for (const key of page.keys) {
      slots.set(key.name.slice(CORRECTION_PREFIX.length), key.metadata ?? {});
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return slots;
}

export async function getCorrection(
  env: CorrectionsEnv,
  slotKey: string
): Promise<CorrectionEntry | null> {
  return env.Salas.get<CorrectionEntry>(CORRECTION_PREFIX + slotKey, "json");
}

export async function putCorrection(
  env: CorrectionsEnv,
  slotKey: string,
  entry: CorrectionEntry
): Promise<void> {
  const metadata: CorrectionMetadata = { approvedRoom: entry.approvedRoom };
  await env.Salas.put(CORRECTION_PREFIX + slotKey, JSON.stringify(entry), {
    metadata,
    expirationTtl: CORRECTION_TTL_SECONDS,
  });
}

/** Strips proposer hashes before anything reaches the browser. */
export function toClientCorrection(
  entry: CorrectionEntry,
  userHash: string
): ClientCorrection {
  return {
    approvedRoom: entry.approvedRoom,
    status: entry.status,
    proposals: entry.proposals.map((proposal) => ({
      proposedRoom: proposal.proposedRoom,
      isProposer: proposal.proposerHash === userHash,
    })),
  };
}

/** Best-effort: racing submissions can undercount, which is fine for abuse
 *  friction rather than a security boundary. */
export async function withinRateLimit(
  env: CorrectionsEnv,
  userHash: string
): Promise<boolean> {
  const key = `${RATE_PREFIX}${userHash}:${new Date().toISOString().slice(0, 10)}`;
  const used = Number((await env.Salas.get(key)) ?? "0");
  if (used >= MAX_SUBMISSIONS_PER_DAY) return false;
  await env.Salas.put(key, String(used + 1), { expirationTtl: 48 * 60 * 60 });
  return true;
}

/**
 * An already-approved room stays active while a competing proposal gathers
 * confirmations, so a single dissenter cannot knock the schedule back to the
 * (possibly wrong) scraped value.
 */
export function applySubmission(
  entry: CorrectionEntry | null,
  room: string,
  userHash: string
): { entry: CorrectionEntry } | { error: string } {
  if (!entry) {
    return {
      entry: {
        proposals: [{ proposedRoom: room, proposerHash: userHash, verifiers: [] }],
        status: "pending",
      },
    };
  }

  const normalized = normalizeRoomName(room);
  const existing = entry.proposals.find(
    (proposal) => normalizeRoomName(proposal.proposedRoom) === normalized
  );

  if (!existing) {
    if (entry.proposals.length >= MAX_PROPOSALS_PER_SLOT) {
      return { error: "Muitas sugestões diferentes para esta aula." };
    }
    entry.proposals.push({ proposedRoom: room, proposerHash: userHash, verifiers: [] });
    return { entry };
  }

  if (existing.proposerHash === userHash) {
    return { error: "Você não pode verificar sua própria sugestão." };
  }
  if (existing.verifiers.includes(userHash)) {
    return { error: "Você já confirmou esta sala." };
  }

  existing.verifiers.push(userHash);

  if (existing.verifiers.length >= APPROVAL_THRESHOLD) {
    entry.status = "approved";
    entry.approvedRoom = existing.proposedRoom;
    entry.proposals = [existing];
  }

  return { entry };
}
