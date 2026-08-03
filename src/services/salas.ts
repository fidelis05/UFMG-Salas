import type { RoomRecord } from "../utils/searchHelpers";

const CACHE_KEY = "salas-completo";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour; data itself only refreshes every 4h server-side

function readCache(): RoomRecord[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, fetchedAt } = JSON.parse(raw);
    if (Date.now() - fetchedAt > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data: RoomRecord[]) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, fetchedAt: Date.now() })
    );
  } catch {
    // localStorage unavailable/full: not fatal, just skip caching
  }
}

export async function getSalasCompleto(): Promise<RoomRecord[]> {
  const cached = readCache();
  if (cached) return cached;

  const res = await fetch("/api/salas");
  if (!res.ok) throw new Error("Erro ao carregar lista de salas");
  const data = await res.json();

  writeCache(data);
  return data;
}
