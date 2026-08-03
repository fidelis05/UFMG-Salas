import { fetchMatriculas, handleScheduleWebSocket } from "./schedule";
import { compilarSalas } from "./scraping/horarios";
import {
  applySubmission,
  buildCorrectionKey,
  expandDias,
  getCorrection,
  hashUser,
  listCorrectionSlots,
  putCorrection,
  toClientCorrection,
  validateRoomName,
  withinRateLimit,
  type CorrectionsEnv,
} from "./corrections";

interface Env extends CorrectionsEnv {
  Salas: KVNamespace;
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        try {
          const dados = await compilarSalas();
          await env.Salas.put("dados-salas", JSON.stringify(dados));
          console.log(`dados-salas atualizado: ${dados.length} registros`);
        } catch (err) {
          console.error("Erro ao atualizar dados-salas:", err);
        }
      })()
    );
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/schedule-ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const cookieHeader = request.headers.get("Cookie") || "";
      const ltpaMatch = cookieHeader.match(/LtpaToken2=([^;]+)/);
      const token = ltpaMatch?.[1];

      if (!token) {
        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);
        server.accept();
        server.send(
          JSON.stringify({ type: "error", message: "MISSING_TOKEN" })
        );
        server.close(1000, "Missing Token");
        return new Response(null, { status: 101, webSocket: client });
      }

      const roomDataStr = await env.Salas.get("dados-salas");
      if (!roomDataStr) {
        return new Response("Room data not found", { status: 500 });
      }

      return handleScheduleWebSocket(token, JSON.parse(roomDataStr), env);
    }

    if (url.pathname === "/api/login" && request.method === "POST") {
      try {
        const { username, password } = (await request.json()) as {
          username: string;
          password: string;
        };

        if (!username || !password) {
          return new Response("Missing username or password", { status: 400 });
        }

        const formBody = new URLSearchParams({
          j_username: username,
          j_password: password,
        });

        const loginResponse = await fetch(
          "https://sistemas.ufmg.br/idp/j_security_check",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Referer: "https://ufmg.br/idp/login.jsp",
            },
            body: formBody.toString(),
            redirect: "manual",
          }
        );

        const rawSetCookie = loginResponse.headers.get("Set-Cookie") || "";
        const allCookies = rawSetCookie.split(/,(?=\s*\w+=)/); // parseia cookies
        const ltpaCookie = allCookies.find((c) => c.includes("LtpaToken2="));

        if (!ltpaCookie) {
          return new Response("Cookie LtpaToken2 não encontrado", {
            status: 401,
          });
        }

        const tokenValue = ltpaCookie.split(";")[0]; // pega só "LtpaToken2=..."
        
        return new Response("Login realizado com sucesso", {
          status: 200,
          headers: {
            "Set-Cookie": `${tokenValue}; HttpOnly; Secure; SameSite=Strict; Path=/`,
          },
        });
      } catch (err: any) {
        return new Response("Erro interno no login: " + err.message, {
          status: 500,
        });
      }
    }

    if (url.pathname === "/api/corrections" && request.method === "POST") {
      const cookieHeader = request.headers.get("Cookie") || "";
      const ltpaMatch = cookieHeader.match(/LtpaToken2=([^;]+)/);
      const token = ltpaMatch?.[1];

      if (!token) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Refuse to write rather than store weakly-pseudonymised identifiers.
      if (!env.CORRECTION_HASH_SECRET) {
        return new Response("Correções indisponíveis no momento.", { status: 503 });
      }

      try {
        const body = (await request.json()) as Record<string, unknown>;
        const { codigo_materia, turma, dia_semana, hora_inicial } = body;

        if (
          typeof codigo_materia !== "string" ||
          typeof turma !== "string" ||
          typeof dia_semana !== "string" ||
          typeof hora_inicial !== "string"
        ) {
          return new Response("Campos obrigatórios ausentes.", { status: 400 });
        }

        const roomCheck = validateRoomName(body.nome_sala);
        if (!roomCheck.ok) {
          return new Response(roomCheck.error, { status: 400 });
        }

        let matriculasData;
        try {
          matriculasData = await fetchMatriculas(token);
        } catch {
          return new Response("Sessão expirada, faça login novamente.", { status: 401 });
        }

        const list = matriculasData?.listaObj?.[0]?.matriculas || [];
        // Verified against the student's own enrolments, so a forged day/time
        // fails here rather than writing a bogus key.
        const isEnrolled = list.some((m: any) => {
          if (m.turma.atividadeAcademica.codigo !== codigo_materia) return false;
          if (m.turma.identificadorTurma !== turma) return false;
          return m.turma.horarios.some(
            (h: any) => h.diaDaSemana === dia_semana && h.horaInicial === hora_inicial
          );
        });

        if (!isEnrolled) {
          return new Response("Você não está matriculado nesta turma/horário.", {
            status: 403,
          });
        }

        const matricula = list[0]?.numeroDoRegistro;
        if (!matricula) {
          return new Response("Matrícula não encontrada.", { status: 500 });
        }

        const userHash = await hashUser(matricula, env.CORRECTION_HASH_SECRET);

        if (!(await withinRateLimit(env, userHash))) {
          return new Response("Limite diário de sugestões atingido.", { status: 429 });
        }

        const key = buildCorrectionKey(codigo_materia, turma, dia_semana, hora_inicial);
        const result = applySubmission(
          await getCorrection(env, key),
          roomCheck.room,
          userHash
        );

        if ("error" in result) {
          return new Response(result.error, { status: 400 });
        }

        await putCorrection(env, key, result.entry);

        return new Response(
          JSON.stringify(toClientCorrection(result.entry, userHash)),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch {
        return new Response("Erro ao salvar correção.", { status: 500 });
      }
    }

    if (url.pathname === "/api/logout") {
      return new Response("Logged out", {
        status: 200,
        headers: {
          "Set-Cookie":
            "LtpaToken2=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
        },
      });
    }

    if (url.pathname === "/api/schedule" && request.method === "GET") {
      const cookieHeader = request.headers.get("Cookie") || "";

      const ltpaMatch = cookieHeader.match(/LtpaToken2=([^;]+)/);
      const ltpaToken = ltpaMatch?.[1];

      if (!ltpaToken) {
        return new Response("Cookie LtpaToken2 não fornecido", { status: 401 });
      }

      const roomData = await env.Salas.get("dados-salas");

      if (!roomData) {
        return new Response("Room data not found", { status: 404 });
      }

      return handleScheduleWebSocket(ltpaToken, JSON.parse(roomData), env);
    }

    if (url.pathname === "/api/salas" && request.method === "GET") {
      const roomDataStr = (await env.Salas.get("dados-salas")) || "[]";
      const roomData = JSON.parse(roomDataStr);
      const correctionSlots = await listCorrectionSlots(env);

      const mergedData = roomData.map((sala: any) => {
        for (const dia of expandDias(sala.dia_semana)) {
          const key = buildCorrectionKey(
            sala.codigo_materia,
            sala.turma,
            dia,
            sala.hora_inicial
          );
          const approvedRoom = correctionSlots.get(key)?.approvedRoom;
          // One row cannot express different rooms per day, so on the rare
          // disagreement the earliest day wins, deterministically.
          if (approvedRoom) {
            return { ...sala, nome_sala: approvedRoom };
          }
        }
        return sala;
      });

      return new Response(JSON.stringify(mergedData), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=14400", // the cron job updates every 4 hours
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
