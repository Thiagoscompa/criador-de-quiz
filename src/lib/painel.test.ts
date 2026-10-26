import { describe, expect, it } from "vitest";
import type { QuizSalvo, Registro } from "./dados";
import { montarPainel, segunda } from "./painel";

const reg = (dia: string, quizId: string | null, tema: string, acertos: number, total: number): Registro => ({ id: `${dia}${tema}${acertos}`, dia, quizId, tema, acertos, total });
const salvo = (id: string, tema: string) => ({ id, criadoEm: 0, quiz: { tema, perguntas: [] } }) as QuizSalvo;

describe("montarPainel", () => {
  it("encontra a segunda-feira da semana", () => {
    expect(segunda("2026-10-26")).toBe("2026-10-26"); // segunda
    expect(segunda("2026-11-01")).toBe("2026-10-26"); // domingo
  });

  it("soma por semana, por assunto e lista os mais fracos", () => {
    const registros = [
      reg("2026-10-26", "a", "Frações (nome antigo)", 2, 10),
      reg("2026-10-20", "a", "Frações", 3, 5),
      reg("2026-10-25", "b", "Verbos", 9, 10),
      reg("2026-10-26", "c", "Química", 4, 4),
      reg("2026-10-26", "apagado", "Sumiu", 0, 6),
      reg("2026-10-24", null, "Exemplo", 1, 5),
    ];
    const p = montarPainel(registros, [salvo("a", "Frações"), salvo("b", "Verbos"), salvo("c", "Química")], "2026-10-26");
    expect(p.semanas).toHaveLength(8);
    expect(p.semanas.at(-1)).toMatchObject({ inicio: "2026-10-26", acertos: 6, total: 20 });
    expect(p.semanas.at(-2)).toMatchObject({ inicio: "2026-10-19", acertos: 13, total: 20 });
    expect(p.assuntos.find((a) => a.quizId === "a")).toMatchObject({ tema: "Frações", acertos: 5, total: 15 });
    expect(p.assuntos.some((a) => a.quizId === "apagado")).toBe(false);
    // Química tem poucas respostas; Verbos está acima de 80%; Exemplo não é um quiz salvo.
    expect(p.fracos.map((a) => a.quizId)).toEqual(["a"]);
    expect(p.ultimos7).toEqual({ acertos: 19, total: 40 });
  });
});
