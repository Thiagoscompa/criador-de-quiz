/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

// Em desenvolvimento, atende /api/gerar-quiz com o mesmo código da função da Vercel.
function apiLocal(): Plugin {
  return {
    name: "api-local",
    configureServer(server) {
      server.middlewares.use("/api/gerar-quiz", async (req, res) => {
        const partes: Buffer[] = [];
        for await (const parte of req) partes.push(parte as Buffer);
        const request = new Request(`http://localhost${req.url ?? ""}`, {
          method: req.method,
          headers: { "content-type": req.headers["content-type"] ?? "application/json" },
          body: req.method === "POST" ? Buffer.concat(partes) : undefined,
        });
        const { gerarQuiz } = await server.ssrLoadModule("/server/gerarQuiz.ts");
        const response: Response = await gerarQuiz(request);
        res.statusCode = response.status;
        response.headers.forEach((valor, chave) => res.setHeader(chave, valor));
        res.end(await response.text());
      });
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
