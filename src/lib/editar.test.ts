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
