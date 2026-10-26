import type { QuizSalvo, Registro } from "./dados";
import { somarDias } from "./revisao";

export const SEMANAS_PAINEL = 8;
// Abaixo disso o percentual de um assunto ainda não diz muita coisa.
export const MIN_RESPOSTAS_ASSUNTO = 5;

// Assuntos com acerto abaixo disso aparecem como "para reforçar".
export const LIMITE_FRACO = 80;

export interface Semana {
  inicio: string; // segunda-feira, AAAA-MM-DD
  acertos: number;
  total: number;
}

export interface Assunto {
  chave: string;
  quizId: string | null;
  tema: string;
  acertos: number;
  total: number;
  ultimoDia: string;
}

export interface Painel {
  semanas: Semana[];
  assuntos: Assunto[];
  fracos: Assunto[];
  ultimos7: { acertos: number; total: number };
}

export function segunda(dia: string): string {
  const semana = new Date(`${dia}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return somarDias(dia, -((semana + 6) % 7));
}

export function pct(acertos: number, total: number): number {
  return total ? Math.round((acertos / total) * 100) : 0;
}

export function montarPainel(registros: Registro[], salvos: QuizSalvo[], dia: string): Painel {
  const atual = segunda(dia);
  const semanas: Semana[] = Array.from({ length: SEMANAS_PAINEL }, (_, i) => ({
    inicio: somarDias(atual, -7 * (SEMANAS_PAINEL - 1 - i)),
    acertos: 0,
    total: 0,
  }));
  const porInicio = new Map(semanas.map((s) => [s.inicio, s]));
  // O nome atual do quiz vale mais que o nome da época em que foi respondido.
  const nomes = new Map(salvos.map((s) => [s.id, s.quiz.tema]));
  const assuntos = new Map<string, Assunto>();
  const corte7 = somarDias(dia, -6);
  const ultimos7 = { acertos: 0, total: 0 };

  for (const r of registros) {
    const s = porInicio.get(segunda(r.dia));
    if (s) {
      s.acertos += r.acertos;
      s.total += r.total;
    }
    if (r.dia >= corte7) {
      ultimos7.acertos += r.acertos;
      ultimos7.total += r.total;
    }
    // Quizzes apagados somem do painel por assunto, mas continuam nas semanas.
    if (r.quizId && !nomes.has(r.quizId)) continue;
    const chave = r.quizId ?? `tema:${r.tema}`;
    const a = assuntos.get(chave) ?? { chave, quizId: r.quizId, tema: (r.quizId && nomes.get(r.quizId)) || r.tema, acertos: 0, total: 0, ultimoDia: r.dia };
    a.acertos += r.acertos;
    a.total += r.total;
    if (r.dia > a.ultimoDia) a.ultimoDia = r.dia;
    assuntos.set(chave, a);
  }

  const lista = [...assuntos.values()].sort((a, b) => b.total - a.total);
  const fracos = lista
    .filter((a) => a.quizId && a.total >= MIN_RESPOSTAS_ASSUNTO && pct(a.acertos, a.total) < LIMITE_FRACO)
    .sort((a, b) => a.acertos / a.total - b.acertos / b.total)
    .slice(0, 3);
  return { semanas, assuntos: lista, fracos, ultimos7 };
}
