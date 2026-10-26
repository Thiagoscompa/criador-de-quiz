import { describe, expect, it } from "vitest";
import { juntarPaginasPdf, limparTextoPdf } from "./pdf";

describe("texto do PDF", () => {
  it("respeita quebras de linha e tira espaços sobrando", () => {
    const partes = [
      { str: "Capítulo 1", hasEOL: true },
      { str: "", hasEOL: true },
      { str: "", hasEOL: true },
      { str: "A   célula", hasEOL: false },
      { str: " é viva.", hasEOL: true },
    ];
    expect(limparTextoPdf(partes)).toBe("Capítulo 1\n\nA célula é viva.");
  });

  it("junta as páginas pulando as vazias", () => {
    expect(juntarPaginasPdf([{ numero: 1, texto: "Um" }, { numero: 2, texto: "" }, { numero: 3, texto: "Três" }])).toBe("Um\n\nTrês");
  });
});
