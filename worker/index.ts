import { handleScheduleWebSocket } from "./schedule";
import { compilarSalas } from "./scraping/horarios";

interface Env {
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
      const roomData = JSON.parse(roomDataStr);

      return handleScheduleWebSocket(token, roomData);
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

      // extracts the LtpaToken2 from the Cookie header
      const ltpaMatch = cookieHeader.match(/LtpaToken2=([^;]+)/);
      const ltpaToken = ltpaMatch?.[1];

      if (!ltpaToken) {
        return new Response("Cookie LtpaToken2 não fornecido", { status: 401 });
      }

      const roomData = await env.Salas.get("dados-salas");

      if (!roomData) {
        return new Response("Room data not found", { status: 404 });
      }

      return handleScheduleWebSocket(ltpaToken, JSON.parse(roomData));
    }

    if (url.pathname === "/api/salas" && request.method === "GET") {
      const roomDataStr = await env.Salas.get("dados-salas");

      return new Response(roomDataStr ?? "[]", {
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
