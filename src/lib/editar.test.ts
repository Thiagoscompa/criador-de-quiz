import { describe, expect, it } from "vitest";
import { problemaDaPergunta } from "./editar";

const base = { id: "p1", pergunta: "Capital do Brasil?", opcoes: ["Brasília", "Rio", "", ""], correta: 0, explicacao: "" };

describe("problemaDaPergunta", () => {
  it("aceita pergunta com 2 alternativas preenchidas", () => {
    expect(problemaDaPergunta(base)).toBeNull();
  });
  it("recusa enunciado vazio", () => {
    expect(problemaDaPergunta({ ...base, pergunta: " " })).toMatch(/enunciado/);
  });
  it("recusa quando a certa está vazia", () => {
    expect(problemaDaPergunta({ ...base, correta: 2 })).toMatch(/certa/);
  });
});

describe("problemaDaPergunta por tipo", () => {
  it("lacuna precisa da marca e da resposta", () => {
    const lacuna = { ...base, tipo: "lacuna" as const, opcoes: [], correta: -1, pergunta: "A ____ produz energia.", resposta: "mitocôndria" };
    expect(problemaDaPergunta(lacuna)).toBeNull();
    expect(problemaDaPergunta({ ...lacuna, pergunta: "Sem marca" })).toMatch(/lacuna/);
    expect(problemaDaPergunta({ ...lacuna, resposta: " " })).toMatch(/palavra/);
  });
  it("flashcard precisa do verso", () => {
    expect(problemaDaPergunta({ ...base, tipo: "flashcard", resposta: "" })).toMatch(/verso/);
  });
});
