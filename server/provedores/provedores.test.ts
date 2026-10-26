import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LeituraSchema } from "../../src/lib/fotos.js";
import { chamarAnthropic } from "./anthropic.js";
import { chamarOpenAI } from "./openai.js";

// Servidor falso que guarda o corpo do pedido e responde 401, para conferir o formato enviado às APIs.
let servidor: Server;
const corpos: Record<string, unknown> = {};
const FOTO = "data:image/jpeg;base64,/9j/4AAQ";

beforeAll(async () => {
  servidor = createServer((req, res) => {
    let corpo = "";
    req.on("data", (p) => (corpo += p));
    req.on("end", () => {
      corpos[req.url ?? ""] = JSON.parse(corpo);
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { type: "authentication_error", message: "chave falsa" } }));
    });
  });
  await new Promise<void>((ok) => servidor.listen(0, ok));
  const porta = (servidor.address() as { port: number }).port;
  process.env.OPENAI_API_KEY = "falsa";
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${porta}/v1`;
  process.env.ANTHROPIC_API_KEY = "falsa";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${porta}`;
});
afterAll(() => servidor.close());

const pedido = { schema: LeituraSchema, nome: "leitura", prompt: "Transcreva", imagens: [FOTO] };

describe("provedores com imagens", () => {
  it("OpenAI recebe a foto como input_image e usa o modelo de imagem", async () => {
    const r = await chamarOpenAI(pedido);
    expect(r).toMatchObject({ ok: false, erro: expect.stringMatching(/OpenAI é inválida/) });
    const corpo = corpos["/v1/responses"] as { model: string; input: { content: { type: string; image_url?: string }[] }[] };
    expect(corpo.model).toBe("gpt-5");
    expect(corpo.input[0].content[0]).toMatchObject({ type: "input_image", image_url: FOTO });
    expect(corpo.input[0].content[1]).toMatchObject({ type: "input_text" });
  });

  it("Claude recebe a foto como bloco de imagem base64", async () => {
    const r = await chamarAnthropic(pedido);
    expect(r).toMatchObject({ ok: false, erro: expect.stringMatching(/Anthropic é inválida/) });
    const chave = Object.keys(corpos).find((k) => k.startsWith("/v1/messages"))!;
    const corpo = corpos[chave] as { messages: { content: { type: string; source?: { media_type: string; data: string } }[] }[] };
    expect(corpo.messages[0].content[0]).toEqual({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "/9j/4AAQ" } });
  });
});
