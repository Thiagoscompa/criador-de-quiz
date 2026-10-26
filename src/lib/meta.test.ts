import { describe, expect, it } from "vitest";
import { calcularSequencia, podarDias, somarRespondidas } from "./meta";

describe("calcularSequencia", () => {
  const meta = 10;

  it("conta dias seguidos com a meta batida, incluindo hoje", () => {
    const dias = { "2026-10-24": 12, "2026-10-25": 10, "2026-10-26": 15 };
    expect(calcularSequencia({ meta, dias }, "2026-10-26")).toMatchObject({ dias: 3, bateuHoje: true, hoje: 15 });
  });

  it("mantém a sequência enquanto hoje ainda não acabou", () => {
    const dias = { "2026-10-25": 10, "2026-10-26": 3 };
    expect(calcularSequencia({ meta, dias }, "2026-10-26")).toMatchObject({ dias: 1, bateuHoje: false });
  });

  it("zera quando um dia passa sem bater a meta", () => {
    const dias = { "2026-10-23": 20, "2026-10-24": 4, "2026-10-25": 0 };
    expect(calcularSequencia({ meta, dias }, "2026-10-26").dias).toBe(0);
  });
});

describe("registro diário", () => {
  it("soma no dia e poda dias antigos", () => {
    const dias = somarRespondidas({ "2026-10-26": 5, "2024-01-01": 3 }, 8, "2026-10-26");
    expect(dias["2026-10-26"]).toBe(13);
    expect(podarDias(dias, "2026-10-26")).toEqual({ "2026-10-26": 13 });
  });
});
