import { describe, expect, it } from "vitest";
import { formatarTempo, gerarId, idDaUrl, linkDesafio, quizParaCompartilhar, validarQuizCompartilhado } from "./desafio";

describe("desafio", () => {
  it("compartilha só as perguntas, sem trecho do material nem ids", () => {
    const q = quizParaCompartilhar({
      tema: "Livro",
      perguntas: [{ id: "x", pergunta: "?", opcoes: ["a", "b"], correta: 1, explicacao: "e", trecho: "texto do livro" }],
    });
    expect(JSON.stringify(q)).not.toContain("texto do livro");
    expect(JSON.stringify(q)).not.toContain('"id"');
    expect(q.perguntas[0].tipo).toBe("multipla");
  });

  it("descarta perguntas malformadas vindas do link", () => {
    const q = validarQuizCompartilhado({
      tema: "T",
      perguntas: [
        { tipo: "multipla", pergunta: "ok", opcoes: ["a", "b"], correta: 0, explicacao: "" },
        { tipo: "multipla", pergunta: "ruim", opcoes: ["a"], correta: 3 },
        { tipo: "lacuna", pergunta: "sem resposta ____", resposta: "" },
        { tipo: "vf", pergunta: "afirmação", opcoes: ["x", "y", "z"], correta: 1 },
        "lixo",
      ],
    });
    expect(q?.perguntas.map((p) => p.pergunta)).toEqual(["ok", "afirmação"]);
    expect(q?.perguntas[1].opcoes).toEqual(["Verdadeiro", "Falso"]);
    expect(validarQuizCompartilhado({ tema: "T", perguntas: [] })).toBeNull();
    expect(validarQuizCompartilhado("x")).toBeNull();
  });

  it("monta e lê o link", () => {
    const id = gerarId();
    expect(id).toMatch(/^[A-Za-z0-9]{10}$/);
    const link = linkDesafio(id, "https://quiz.exemplo");
    expect(idDaUrl(new URL(link).search)).toBe(id);
    expect(idDaUrl("?desafio=<script>")).toBeNull();
  });

  it("formata o tempo em minutos e segundos", () => {
    expect(formatarTempo(65_400)).toBe("1:05");
  });
});
