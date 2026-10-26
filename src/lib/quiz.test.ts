import { describe, expect, it } from "vitest";
import { conferirLacuna, LACUNA, mensagemResultado, montarPrompt, normalizarQuiz, PedidoSchema, percentual, respostaCerta } from "./quiz";

const vazio = { opcoes: [] as string[], correta: -1, resposta: "", explicacao: "", trecho: "" };

describe("normalizarQuiz", () => {
  it("descarta perguntas com índice da correta fora das opções", () => {
    const quiz = normalizarQuiz({
      tema: " Frações ",
      perguntas: [
        { ...vazio, tipo: "multipla", pergunta: "1/2 + 1/2?", opcoes: ["1", "2", "1/4", "0"], correta: 0, explicacao: "Meio mais meio é um inteiro." },
        { ...vazio, tipo: "multipla", pergunta: "Quebrada", opcoes: ["a", "b"], correta: 5 },
        { ...vazio, tipo: "multipla", pergunta: "  ", opcoes: ["a", "b"], correta: 0 },
      ],
    });
    expect(quiz?.tema).toBe("Frações");
    expect(quiz?.perguntas).toHaveLength(1);
  });

  it("devolve null quando não sobra nenhuma pergunta", () => {
    expect(normalizarQuiz({ tema: "x", perguntas: [] })).toBeNull();
  });

  it("padroniza verdadeiro ou falso e lacuna", () => {
    const quiz = normalizarQuiz({
      tema: "Biologia",
      perguntas: [
        { ...vazio, tipo: "vf", pergunta: "A célula é a unidade da vida.", opcoes: ["V", "F"], correta: 0 },
        { ...vazio, tipo: "lacuna", pergunta: "A ______ produz energia.", resposta: "mitocôndria" },
        { ...vazio, tipo: "lacuna", pergunta: "Sem resposta ____", resposta: "" },
        { ...vazio, tipo: "flashcard", pergunta: "Osmose", resposta: "Passagem de água pela membrana." },
      ],
    });
    expect(quiz?.perguntas.map((p) => p.tipo)).toEqual(["vf", "lacuna", "flashcard"]);
    expect(quiz?.perguntas[0].opcoes).toEqual(["Verdadeiro", "Falso"]);
    expect(quiz?.perguntas[1].pergunta).toBe(`A ${LACUNA} produz energia.`);
    expect(respostaCerta(quiz!.perguntas[2])).toBe("Passagem de água pela membrana.");
  });
});

describe("conferirLacuna", () => {
  it("ignora acentos, maiúsculas, artigo e um erro de digitação", () => {
    expect(conferirLacuna("Mitocondria", "mitocôndria")).toBe(true);
    expect(conferirLacuna("a mitocôndria.", "mitocôndria")).toBe(true);
    expect(conferirLacuna("mitocondira", "mitocôndria")).toBe(false);
    expect(conferirLacuna("mitocndria", "mitocôndria")).toBe(true);
    expect(conferirLacuna("ribossomo", "mitocôndria")).toBe(false);
    expect(conferirLacuna("", "mitocôndria")).toBe(false);
  });

  it("exige exatidão em palavras curtas", () => {
    expect(conferirLacuna("sal", "sol")).toBe(false);
  });
});

describe("PedidoSchema", () => {
  it("aceita um pedido por tema e assume múltipla escolha", () => {
    const r = PedidoSchema.safeParse({ modo: "tema", tema: "Sistema solar", quantidade: 8, nivel: "médio" });
    expect(r.success && r.data.tipos).toEqual(["multipla"]);
  });

  it("recusa texto curto demais", () => {
    expect(PedidoSchema.safeParse({ modo: "texto", texto: "curto", quantidade: 8, nivel: "fácil" }).success).toBe(false);
  });

  it("recusa nível ou tipo desconhecido", () => {
    expect(PedidoSchema.safeParse({ modo: "tema", tema: "Química", quantidade: 8, nivel: "extremo" }).success).toBe(false);
    expect(PedidoSchema.safeParse({ modo: "tema", tema: "Química", quantidade: 8, nivel: "fácil", tipos: ["dissertativa"] }).success).toBe(false);
  });
});

describe("montarPrompt", () => {
  it("restringe ao material quando o modo é texto e pede o trecho", () => {
    const prompt = montarPrompt({ modo: "texto", texto: "A mitocôndria produz energia para a célula.", quantidade: 5, nivel: "fácil" });
    expect(prompt).toContain("SOMENTE");
    expect(prompt).toContain("<material>");
    expect(prompt).toContain("exatamente 5 perguntas");
    expect(prompt).toContain('"trecho"');
  });

  it("descreve só os tipos pedidos", () => {
    const prompt = montarPrompt({ modo: "tema", tema: "Inglês", quantidade: 6, nivel: "fácil", tipos: ["vf", "flashcard"] });
    expect(prompt).toContain('"vf"');
    expect(prompt).toContain('"flashcard"');
    expect(prompt).not.toContain('- "lacuna"');
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
