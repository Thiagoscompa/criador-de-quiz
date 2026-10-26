import { describe, expect, it } from "vitest";
import { proximaAgenda, proximaData, somarDias, vencidas, type Agenda } from "./revisao";

const DIA = "2026-10-26";

describe("proximaAgenda", () => {
  it("pergunta errada volta no dia seguinte", () => {
    expect(proximaAgenda(undefined, false, DIA).proxima).toBe("2026-10-27");
  });

  it("três acertos seguidos levam a revisão para semanas depois", () => {
    const a1 = proximaAgenda(undefined, true, DIA);
    const a2 = proximaAgenda(a1, true, a1.proxima);
    const a3 = proximaAgenda(a2, true, a2.proxima);
    expect([a1.intervalo, a2.intervalo]).toEqual([1, 6]);
    expect(a3.intervalo).toBeGreaterThanOrEqual(14);
  });

  it("um erro zera a sequência e reduz a facilidade", () => {
    const boa = proximaAgenda(proximaAgenda(undefined, true, DIA), true, DIA);
    const depois = proximaAgenda(boa, false, DIA);
    expect(depois.repeticoes).toBe(0);
    expect(depois.facilidade).toBeLessThan(boa.facilidade);
  });

  it("a facilidade nunca cai abaixo de 1,3", () => {
    let a: Agenda | undefined;
    for (let i = 0; i < 10; i++) a = proximaAgenda(a, false, DIA);
    expect(a!.facilidade).toBe(1.3);
  });
});

describe("vencidas", () => {
  it("lista só o que vence até hoje, o mais atrasado primeiro", () => {
    const base = { repeticoes: 1, intervalo: 1, facilidade: 2.5 };
    const agendas = {
      "q/a": { ...base, proxima: "2026-10-26" },
      "q/b": { ...base, proxima: "2026-10-20" },
      "q/c": { ...base, proxima: "2026-11-01" },
    };
    expect(vencidas(agendas, DIA)).toEqual(["q/b", "q/a"]);
    expect(proximaData(agendas)).toBe("2026-10-20");
  });
});

describe("somarDias", () => {
  it("atravessa o fim do mês", () => {
    expect(somarDias("2026-10-30", 6)).toBe("2026-11-05");
  });
});
