import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gerarQuiz } from "./gerarQuiz.js";
import { gerarComAnthropic } from "./provedores/anthropic.js";
import { gerarComOpenAI } from "./provedores/openai.js";

vi.mock("./provedores/openai.js", () => ({ gerarComOpenAI: vi.fn() }));
vi.mock("./provedores/anthropic.js", () => ({ gerarComAnthropic: vi.fn() }));

const QUIZ = {
  tema: "Sistema solar",
  perguntas: [{ pergunta: "Maior planeta?", opcoes: ["Terra", "Júpiter", "Marte", "Vênus"], correta: 1, explicacao: "Júpiter." }],
};

const chaves = { openai: process.env.OPENAI_API_KEY, anthropic: process.env.ANTHROPIC_API_KEY };
beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  vi.mocked(gerarComOpenAI).mockResolvedValue({ ok: true, quiz: QUIZ });
  vi.mocked(gerarComAnthropic).mockResolvedValue({ ok: true, quiz: QUIZ });
});
afterEach(() => {
  process.env.OPENAI_API_KEY = chaves.openai;
  process.env.ANTHROPIC_API_KEY = chaves.anthropic;
  vi.clearAllMocks();
});

function post(corpo: unknown) {
  return new Request("http://localhost/api/gerar-quiz", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

const PEDIDO = { modo: "tema", tema: "Sistema solar", quantidade: 5, nivel: "fácil" };

describe("gerarQuiz", () => {
  it("recusa métodos que não são POST", async () => {
    const r = await gerarQuiz(new Request("http://localhost/api/gerar-quiz"));
    expect(r.status).toBe(405);
  });

  it("avisa quando não há nenhuma chave de IA", async () => {
    const r = await gerarQuiz(post(PEDIDO));
    expect(r.status).toBe(500);
    expect((await r.json()).erro).toMatch(/OPENAI_API_KEY/);
  });

  it("valida o pedido antes de chamar a IA", async () => {
    process.env.OPENAI_API_KEY = "teste";
    const r = await gerarQuiz(post({ modo: "texto", texto: "oi", quantidade: 5, nivel: "fácil" }));
    expect(r.status).toBe(400);
    expect(gerarComOpenAI).not.toHaveBeenCalled();
  });

  it("usa a OpenAI quando OPENAI_API_KEY está definida", async () => {
    process.env.OPENAI_API_KEY = "teste";
    process.env.ANTHROPIC_API_KEY = "teste";
    const r = await gerarQuiz(post(PEDIDO));
    expect(r.status).toBe(200);
    expect((await r.json()).tema).toBe("Sistema solar");
    expect(gerarComOpenAI).toHaveBeenCalledOnce();
    expect(gerarComAnthropic).not.toHaveBeenCalled();
  });

  it("usa o Claude quando só ANTHROPIC_API_KEY está definida", async () => {
    process.env.ANTHROPIC_API_KEY = "teste";
    await gerarQuiz(post(PEDIDO));
    expect(gerarComAnthropic).toHaveBeenCalledOnce();
  });

  it("repassa o erro do provedor", async () => {
    process.env.OPENAI_API_KEY = "teste";
    vi.mocked(gerarComOpenAI).mockResolvedValue({ ok: false, status: 429, erro: "Muitos pedidos" });
    const r = await gerarQuiz(post(PEDIDO));
    expect(r.status).toBe(429);
  });
});
