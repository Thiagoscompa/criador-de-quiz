import { afterEach, describe, expect, it } from "vitest";
import { gerarQuiz } from "./gerarQuiz.js";

const chaveOriginal = process.env.ANTHROPIC_API_KEY;
afterEach(() => {
  process.env.ANTHROPIC_API_KEY = chaveOriginal;
});

function post(corpo: unknown) {
  return new Request("http://localhost/api/gerar-quiz", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

describe("gerarQuiz", () => {
  it("recusa métodos que não são POST", async () => {
    const r = await gerarQuiz(new Request("http://localhost/api/gerar-quiz"));
    expect(r.status).toBe(405);
  });

  it("avisa quando falta a chave da API", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const r = await gerarQuiz(post({ modo: "tema", tema: "Sistema solar", quantidade: 5, nivel: "fácil" }));
    expect(r.status).toBe(500);
    expect((await r.json()).erro).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("valida o pedido antes de chamar a API", async () => {
    process.env.ANTHROPIC_API_KEY = "teste";
    const r = await gerarQuiz(post({ modo: "texto", texto: "oi", quantidade: 5, nivel: "fácil" }));
    expect(r.status).toBe(400);
  });
});
