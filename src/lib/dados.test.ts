import { describe, expect, it } from "vitest";
import { completarDados, mesclar, type Dados, type QuizSalvo } from "./dados";

const AGORA = Date.parse("2026-10-26T12:00:00Z");

function quiz(id: string, tema: string, criadoEm: number, atualizadoEm?: number): QuizSalvo {
  return { id, criadoEm, atualizadoEm, quiz: { tema, perguntas: [{ id: "p1", pergunta: "?", opcoes: ["a", "b"], correta: 0, explicacao: "" }] } };
}

function dados(parcial: Partial<Dados>): Dados {
  return { salvos: [], historico: [], revisao: {}, estudo: { meta: 20, dias: {} }, apagados: {}, desempenho: [], ...parcial };
}

const agenda = (proxima: string, em: number) => ({ repeticoes: 1, intervalo: 1, facilidade: 2.5, proxima, em });

describe("mesclar", () => {
  it("junta quizzes dos dois aparelhos e fica com a edição mais nova", () => {
    const local = dados({ salvos: [quiz("a", "Local novo", 1, AGORA), quiz("b", "Só local", 2)] });
    const remoto = dados({ salvos: [quiz("a", "Remoto velho", 1, AGORA - 1000), quiz("c", "Só remoto", 3)] });
    const m = mesclar(local, remoto, AGORA);
    expect(m.salvos.map((s) => s.quiz.tema).sort()).toEqual(["Local novo", "Só local", "Só remoto"]);
  });

  it("um quiz apagado em um aparelho some do outro, com a agenda dele", () => {
    const local = dados({ apagados: { a: AGORA - 10 } });
    const remoto = dados({ salvos: [quiz("a", "Apagado", 1, AGORA - 1000)], revisao: { "a/p1": agenda("2026-10-27", 5) } });
    const m = mesclar(local, remoto, AGORA);
    expect(m.salvos).toEqual([]);
    expect(m.revisao).toEqual({});
    expect(m.apagados.a).toBe(AGORA - 10);
  });

  it("um quiz editado depois de apagado em outro aparelho volta", () => {
    const local = dados({ apagados: { a: AGORA - 1000 } });
    const remoto = dados({ salvos: [quiz("a", "Editado depois", 1, AGORA - 10)] });
    expect(mesclar(local, remoto, AGORA).salvos).toHaveLength(1);
  });

  it("fica com a agenda gravada por último e o maior número de respostas do dia", () => {
    const salvos = [quiz("a", "Q", 1)];
    const local = dados({ salvos, revisao: { "a/p1": agenda("2026-10-30", 200) }, estudo: { meta: 30, dias: { "2026-10-26": 5 } } });
    const remoto = dados({ salvos, revisao: { "a/p1": agenda("2026-10-27", 100) }, estudo: { meta: 10, dias: { "2026-10-26": 9, "2026-10-25": 3 } } });
    const m = mesclar(local, remoto, AGORA);
    expect(m.revisao["a/p1"].proxima).toBe("2026-10-30");
    expect(m.estudo).toEqual({ meta: 30, dias: { "2026-10-26": 9, "2026-10-25": 3 } });
  });

  it("não duplica tentativas nem registros de desempenho", () => {
    const t = { tema: "Q", acertos: 1, total: 2, quando: 5 };
    const r = { id: "r1", dia: "2026-10-26", quizId: null, tema: "Q", acertos: 1, total: 2 };
    const m = mesclar(dados({ historico: [t], desempenho: [r] }), dados({ historico: [t], desempenho: [r] }), AGORA);
    expect(m.historico).toHaveLength(1);
    expect(m.desempenho).toHaveLength(1);
  });
});

describe("completarDados", () => {
  it("aceita dados vazios ou estranhos sem quebrar", () => {
    expect(completarDados(null, 20)).toEqual(dados({}));
    expect(completarDados({ salvos: "x", estudo: { meta: -1 } }, 20).estudo.meta).toBe(20);
  });
});
