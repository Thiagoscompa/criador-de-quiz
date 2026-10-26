import { describe, expect, it } from "vitest";
import { mensagemResultado, montarPrompt, normalizarQuiz, PedidoSchema, percentual } from "./quiz";

describe("normalizarQuiz", () => {
  it("descarta perguntas com índice da correta fora das opções", () => {
    const quiz = normalizarQuiz({
      tema: " Frações ",
      perguntas: [
        { pergunta: "1/2 + 1/2?", opcoes: ["1", "2", "1/4", "0"], correta: 0, explicacao: "Meio mais meio é um inteiro." },
        { pergunta: "Quebrada", opcoes: ["a", "b"], correta: 5, explicacao: "" },
        { pergunta: "  ", opcoes: ["a", "b"], correta: 0, explicacao: "" },
      ],
    });
    expect(quiz?.tema).toBe("Frações");
    expect(quiz?.perguntas).toHaveLength(1);
  });

  it("devolve null quando não sobra nenhuma pergunta", () => {
    expect(normalizarQuiz({ tema: "x", perguntas: [] })).toBeNull();
  });
});

describe("PedidoSchema", () => {
  it("aceita um pedido por tema", () => {
    expect(PedidoSchema.safeParse({ modo: "tema", tema: "Sistema solar", quantidade: 8, nivel: "médio" }).success).toBe(true);
  });

  it("recusa texto curto demais", () => {
    expect(PedidoSchema.safeParse({ modo: "texto", texto: "curto", quantidade: 8, nivel: "fácil" }).success).toBe(false);
  });

  it("recusa nível desconhecido", () => {
    expect(PedidoSchema.safeParse({ modo: "tema", tema: "Química", quantidade: 8, nivel: "extremo" }).success).toBe(false);
  });
});

describe("montarPrompt", () => {
  it("restringe ao material quando o modo é texto", () => {
    const prompt = montarPrompt({ modo: "texto", texto: "A mitocôndria produz energia para a célula.", quantidade: 5, nivel: "fácil" });
    expect(prompt).toContain("SOMENTE");
    expect(prompt).toContain("<material>");
    expect(prompt).toContain("exatamente 5 perguntas");
  });
});

describe("pontuação", () => {
  it("calcula o percentual arredondado", () => {
    const r = [true, true, false].map((certo, indice) => ({ indice, escolhida: 0, certo }));
    expect(percentual(r)).toBe(67);
    expect(percentual([])).toBe(0);
  });

  it("parabeniza o gabarito", () => {
    expect(mensagemResultado(100)).toMatch(/Gabaritou/);
  });
});
