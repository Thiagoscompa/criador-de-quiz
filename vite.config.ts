/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

// Em desenvolvimento, atende as rotas de /api com o mesmo código das funções da Vercel.
const ROTAS = {
  "/api/gerar-quiz": { modulo: "/server/gerarQuiz.ts", funcao: "gerarQuiz" },
  "/api/ler-fotos": { modulo: "/server/lerFotos.ts", funcao: "lerFotos" },
  "/api/tutor": { modulo: "/server/tutor.ts", funcao: "tutor" },
};

function apiLocal(): Plugin {
  return {
    name: "api-local",
    configureServer(server) {
      for (const [caminho, { modulo, funcao }] of Object.entries(ROTAS)) {
        server.middlewares.use(caminho, async (req, res) => {
          const partes: Buffer[] = [];
          for await (const parte of req) partes.push(parte as Buffer);
          const request = new Request(`http://localhost${req.url ?? ""}`, {
            method: req.method,
            headers: {
              "content-type": req.headers["content-type"] ?? "application/json",
              "x-forwarded-for": req.socket.remoteAddress ?? "local",
            },
            body: req.method === "POST" ? Buffer.concat(partes) : undefined,
          });
          const mod = await server.ssrLoadModule(modulo);
          const response: Response = await mod[funcao](request);
          res.statusCode = response.status;
          response.headers.forEach((valor, chave) => res.setHeader(chave, valor));
          res.end(await response.text());
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    plugins: [react(), apiLocal()],
    test: { include: ["src/**/*.test.ts", "server/**/*.test.ts"] },
  };
});
