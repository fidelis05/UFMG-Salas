import type SalaItem from "../../types/salaItem";

const ENG_URL = "https://alocacao.eng.ufmg.br/consulta.html";

const DICT_DIAS: Record<string, string> = {
  "2ª": "Seg",
  "3ª": "Ter",
  "4ª": "Qua",
  "5ª": "Qui",
  "6ª": "Sex",
  "Sáb.": "Sáb",
};

function extractCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? "";
  return setCookie.split(";")[0];
}

function extractViewState(html: string): string {
  const match = html.match(
    /name="javax\.faces\.ViewState"[^>]*value="([^"]*)"/
  );
  return match?.[1] ?? "";
}

function extractCursos(html: string): string[] {
  const cursos: string[] = [];
  const re = /<option value="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    if (match[1]) cursos.push(match[1]);
  }
  return cursos;
}

function extractPanelHtml(xml: string): string | null {
  const match =
    xml.match(
      /<update id="form:panel_tabela"><!\[CDATA\[([\s\S]*?)\]\]><\/update>/
    ) ??
    xml.match(
      /<update id="form:tabela"><!\[CDATA\[([\s\S]*?)\]\]><\/update>/
    );
  return match?.[1] ?? null;
}

function extractViewStateUpdate(xml: string): string | null {
  const match = xml.match(
    /<update id="[^"]*ViewState[^"]*"><!\[CDATA\[([^\]]*)\]\]><\/update>/
  );
  return match?.[1] ?? null;
}

function parseHorario(horaText: string): [string, string] | null {
  const times = horaText.match(/\d{1,2}:\d{2}/g);
  if (times && times.length >= 2) {
    return [times[0], times[1]];
  }
  const parts = horaText
    .split(/[-–—]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return [parts[0], parts[1]];
  }
  return null;
}

async function parseTabela(panelHtml: string): Promise<SalaItem[]> {
  const registros: SalaItem[] = [];

  let codigoBuf = "";
  let nomeBuf = "";
  let turmaBuf = "";
  let diaBuf = "";
  let horaBuf = "";
  let localBuf = "";

  const rewriter = new HTMLRewriter()
    .on("td.colunaDisciplinaCodigoConsulta", {
      element() {
        codigoBuf = "";
      },
      text(chunk) {
        codigoBuf += chunk.text;
      },
    })
    .on("td.colunaDisciplinaNomeConsulta", {
      element() {
        nomeBuf = "";
      },
      text(chunk) {
        nomeBuf += chunk.text;
      },
    })
    .on("td.colunaTurmaCodigoConsulta", {
      element() {
        turmaBuf = "";
      },
      text(chunk) {
        turmaBuf += chunk.text;
      },
    })
    .on("td.colunaHorarioDiaConsulta", {
      element() {
        diaBuf = "";
      },
      text(chunk) {
        diaBuf += chunk.text;
      },
    })
    .on("td.colunaHorarioHorasConsulta", {
      element() {
        horaBuf = "";
      },
      text(chunk) {
        horaBuf += chunk.text;
      },
    })
    .on("td.colunaHorarioLocalConsulta", {
      element(el) {
        localBuf = "";
        el.onEndTag(() => {
          if (!codigoBuf.trim()) return;

          const horario = parseHorario(horaBuf.trim());
          if (!horario) return;

          const diaRaw = diaBuf.trim();

          registros.push({
            nome_materia: nomeBuf.trim(),
            codigo_materia: codigoBuf.trim(),
            turma: turmaBuf.trim(),
            hora_inicial: horario[0],
            hora_final: horario[1],
            dia_semana: DICT_DIAS[diaRaw] ?? diaRaw,
            nome_sala: localBuf.trim(),
            fonte: "ENGENHARIA",
          });
        });
      },
      text(chunk) {
        localBuf += chunk.text;
      },
    });

  await rewriter
    .transform(
      new Response(panelHtml, {
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    )
    .text();

  return registros;
}

export async function extrairSalasEng(): Promise<SalaItem[]> {
  const initialResponse = await fetch(ENG_URL);
  const html = await initialResponse.text();
  const cookie = extractCookie(initialResponse);
  let viewState = extractViewState(html);
  const cursos = extractCursos(html);

  const registros: SalaItem[] = [];

  for (const curso of cursos) {
    try {
      const body = new URLSearchParams({
        "javax.faces.partial.ajax": "true",
        "javax.faces.source": "form:j_idt17",
        "javax.faces.partial.execute": "form:j_idt17",
        "javax.faces.partial.render": "form:panel_tabela",
        "javax.faces.behavior.event": "change",
        "javax.faces.partial.event": "change",
        "form:j_idt17": curso,
        form: "form",
        "javax.faces.ViewState": viewState,
      });

      const response = await fetch(ENG_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Faces-Request": "partial/ajax",
          Cookie: cookie,
        },
        body: body.toString(),
      });

      const xml = await response.text();

      const vsUpdate = extractViewStateUpdate(xml);
      if (vsUpdate) viewState = vsUpdate;

      const panelHtml = extractPanelHtml(xml);
      if (panelHtml) {
        registros.push(...(await parseTabela(panelHtml)));
      }
    } catch (e) {
      console.error(`Erro processando curso ${curso}:`, e);
    }
  }

  return registros;
}
