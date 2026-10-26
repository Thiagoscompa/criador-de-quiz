// Repetição espaçada no modelo SM-2 (o algoritmo clássico do Anki e do SuperMemo).
// Cada pergunta respondida ganha uma agenda: errou volta amanhã; acertou volta em 1, 6 e depois
// intervalo × facilidade dias. A facilidade cai a cada erro, então o que você erra volta mais vezes.

export interface Agenda {
  repeticoes: number; // acertos seguidos
  intervalo: number; // em dias
  facilidade: number; // fator do SM-2, mínimo 1,3
  proxima: string; // data da próxima revisão, AAAA-MM-DD
}

export const FACILIDADE_INICIAL = 2.5;
const FACILIDADE_MINIMA = 1.3;
// Nota do SM-2 (0 a 5) que usamos para acerto e erro.
const NOTA_ACERTO = 4;
const NOTA_ERRO = 1;

export function hoje(agora = new Date()): string {
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function proximaAgenda(anterior: Agenda | undefined, certo: boolean, dia = hoje()): Agenda {
  const atual = anterior ?? { repeticoes: 0, intervalo: 0, facilidade: FACILIDADE_INICIAL, proxima: dia };
  const nota = certo ? NOTA_ACERTO : NOTA_ERRO;
  const facilidade = Math.max(
    FACILIDADE_MINIMA,
    atual.facilidade + (0.1 - (5 - nota) * (0.08 + (5 - nota) * 0.02)),
  );

  if (!certo) return { repeticoes: 0, intervalo: 1, facilidade, proxima: somarDias(dia, 1) };

  const repeticoes = atual.repeticoes + 1;
  const intervalo = repeticoes === 1 ? 1 : repeticoes === 2 ? 6 : Math.round(atual.intervalo * facilidade);
  return { repeticoes, intervalo, facilidade, proxima: somarDias(dia, intervalo) };
}

export function vencidas(agendas: Record<string, Agenda>, dia = hoje()): string[] {
  return Object.entries(agendas)
    .filter(([, a]) => a.proxima <= dia)
    .sort(([, a], [, b]) => a.proxima.localeCompare(b.proxima))
    .map(([chave]) => chave);
}

export function proximaData(agendas: Record<string, Agenda>): string | null {
  const datas = Object.values(agendas).map((a) => a.proxima).sort();
  return datas[0] ?? null;
}

export function chave(quizId: string, perguntaId: string): string {
  return `${quizId}/${perguntaId}`;
}

export function separarChave(c: string): { quizId: string; perguntaId: string } {
  const i = c.indexOf("/");
  return { quizId: c.slice(0, i), perguntaId: c.slice(i + 1) };
}
