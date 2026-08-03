import type SalaItem from "../../types/salaItem";
import { extrairSalasEng } from "./extrairSalasEng";
import { extrairSalasIcex } from "./extrairSalasIcex";

export async function compilarSalas(): Promise<SalaItem[]> {
  const compiled: SalaItem[] = [];

  const results = await Promise.allSettled([
    extrairSalasEng(),
    extrairSalasIcex(),
  ]);

  for (const result of results) {
    if (result.status === "fulfilled") {
      compiled.push(...result.value);
    } else {
      console.error("Erro ao compilar dados de salas:", result.reason);
    }
  }

  return compiled;
}
