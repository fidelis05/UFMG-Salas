export interface RoomRecord {
  fonte?: string;
  codigo_materia?: string;
  nome_materia?: string;
  turma?: string;
  dia_semana?: string;
  hora_inicial?: string;
  hora_final?: string;
  nome_sala?: string;
}

export interface RoomFilters {
  fonte?: string;
  materia?: string;
  turma?: string;
  sala?: string;
}

// token-based ("fulltext-ish") matching
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const tokenize = (query: string) =>
  query.split(/\s+/).map(normalize).filter(Boolean);

const matchesAllTokens = (haystack: string, tokens: string[]) => {
  const target = normalize(haystack);
  return tokens.every((token) => target.includes(token));
};

export function filterRooms(
  rooms: RoomRecord[],
  filters: RoomFilters
): RoomRecord[] {
  const fonte = filters.fonte?.toLowerCase() || "";
  const turmaTokens = tokenize(filters.turma || "");
  const materiaTokens = tokenize(filters.materia || "");
  const salaTokens = tokenize(filters.sala || "");

  return rooms.filter((item) => {
    if (fonte && (!item.fonte || item.fonte.toLowerCase() !== fonte)) return false;
    if (turmaTokens.length && !matchesAllTokens(item.turma || "", turmaTokens))
      return false;
    if (
      materiaTokens.length &&
      !matchesAllTokens(
        `${item.nome_materia || ""} ${item.codigo_materia || ""}`,
        materiaTokens
      )
    )
      return false;
    if (salaTokens.length && !matchesAllTokens(item.nome_sala || "", salaTokens))
      return false;
    return true;
  });
}
