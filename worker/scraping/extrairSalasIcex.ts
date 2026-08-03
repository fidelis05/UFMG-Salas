import type SalaItem from "../../types/salaItem";

const URL = "https://www.icex.ufmg.br/minhasala/recupera_salas.php";

export async function extrairSalasIcex(): Promise<SalaItem[]> {
  const response = await fetch(URL);
  if (!response.ok) {
    throw new Error(`Erro ao obter dados do ICEX: ${response.status}`);
  }

  const data: { records?: Record<string, unknown>[] } = await response.json();
  const records = data.records ?? [];

  return records.map((item) => ({
    nome_materia: "",
    codigo_materia: "",
    turma: "",
    hora_inicial: "",
    hora_final: "",
    dia_semana: "",
    nome_sala: "",
    fonte: "ICEX",
    ...item,
  })) as SalaItem[];
}
