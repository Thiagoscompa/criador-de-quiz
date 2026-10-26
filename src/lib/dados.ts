import type { Estudo } from "./meta";
import type { Pergunta } from "./quiz";
import type { Agenda } from "./revisao";

// Formato de tudo o que o app guarda de um aluno. É o mesmo no navegador, no backup e na nuvem.

export interface Tentativa {
  tema: string;
  acertos: number;
  total: number;
  quando: number;
}

export interface PerguntaSalva extends Pergunta {
  id: string;
}

export interface QuizGuardado {
  tema: string;
  perguntas: PerguntaSalva[];
}

export interface QuizSalvo {
  id: string;
  quiz: QuizGuardado;
  criadoEm: number;
  // Ausente em quizzes de antes da sincronização: vale criadoEm.
  atualizadoEm?: number;
}

// Agenda com o momento em que foi gravada, para saber qual aparelho tem a mais nova.
export interface AgendaGravada extends Agenda {
  em?: number;
}

// Um quiz (ou parte de uma revisão) respondido: base do painel de desempenho.
export interface Registro {
  id: string;
  dia: string;
  // null para quizzes que não foram salvos (o de exemplo, por exemplo).
  quizId: string | null;
  tema: string;
  acertos: number;
  total: number;
}

export interface Dados {
  salvos: QuizSalvo[];
  historico: Tentativa[];
  revisao: Record<string, AgendaGravada>;
  estudo: Estudo;
  // Quizzes apagados (id → quando), para o apagar valer também nos outros aparelhos.
  apagados: Record<string, number>;
  desempenho: Registro[];
}

export const MAX_HISTORICO = 20;
export const MAX_SALVOS = 200;
export const MAX_DESEMPENHO = 3000;
const DIAS_LEMBRAR_APAGADO = 180;

const quandoMudou = (s: QuizSalvo) => s.atualizadoEm ?? s.criadoEm;

// Junta os dados de dois aparelhos sem perder o que foi feito em cada um.
// O mais recente vence quando os dois mexeram na mesma coisa.
export function mesclar(local: Dados, remoto: Dados, agora = Date.now()): Dados {
  const apagados: Record<string, number> = {};
  for (const fonte of [local.apagados, remoto.apagados]) {
    for (const [id, quando] of Object.entries(fonte)) {
      if (agora - quando < DIAS_LEMBRAR_APAGADO * 86_400_000) apagados[id] = Math.max(apagados[id] ?? 0, quando);
    }
  }

  const porId = new Map<string, QuizSalvo>();
  for (const s of [...remoto.salvos, ...local.salvos]) {
    const atual = porId.get(s.id);
    if (!atual || quandoMudou(s) >= quandoMudou(atual)) porId.set(s.id, s);
  }
  const salvos = [...porId.values()]
    .filter((s) => !(s.id in apagados) || quandoMudou(s) > apagados[s.id])
    .sort((a, b) => b.criadoEm - a.criadoEm)
    .slice(0, MAX_SALVOS);

  const existentes = new Set(salvos.map((s) => s.id));
  const revisao: Record<string, AgendaGravada> = {};
  for (const fonte of [remoto.revisao, local.revisao]) {
    for (const [c, a] of Object.entries(fonte)) {
      if (!existentes.has(c.slice(0, c.indexOf("/")))) continue;
      if (!revisao[c] || (a.em ?? 0) >= (revisao[c].em ?? 0)) revisao[c] = a;
    }
  }

  const tentativas = new Map([...remoto.historico, ...local.historico].map((t) => [`${t.quando}|${t.tema}`, t]));
  const historico = [...tentativas.values()].sort((a, b) => b.quando - a.quando).slice(0, MAX_HISTORICO);

  // Cada aparelho soma o que respondeu no dia; sem saber quanto veio de cada um, fica o maior.
  const dias = { ...remoto.estudo.dias };
  for (const [dia, n] of Object.entries(local.estudo.dias)) dias[dia] = Math.max(dias[dia] ?? 0, n);

  const registros = new Map([...remoto.desempenho, ...local.desempenho].map((r) => [r.id, r]));
  const desempenho = [...registros.values()].sort((a, b) => b.dia.localeCompare(a.dia)).slice(0, MAX_DESEMPENHO);

  return { salvos, historico, revisao, estudo: { meta: local.estudo.meta, dias }, apagados, desempenho };
}

// Lê dados de origem desconhecida (nuvem ou arquivo) preenchendo o que faltar.
export function completarDados(bruto: unknown, metaPadrao: number): Dados {
  const d = (bruto && typeof bruto === "object" ? bruto : {}) as Partial<Dados>;
  const obj = <T>(v: unknown, vazio: T): T => (v && typeof v === "object" && !Array.isArray(v) ? (v as T) : vazio);
  const lista = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const estudo = obj<Partial<Estudo>>(d.estudo, {});
  return {
    salvos: lista<QuizSalvo>(d.salvos).filter((s) => s && typeof s.id === "string" && Array.isArray(s.quiz?.perguntas)),
    historico: lista<Tentativa>(d.historico),
    revisao: obj(d.revisao, {}),
    estudo: { meta: typeof estudo.meta === "number" && estudo.meta > 0 ? estudo.meta : metaPadrao, dias: obj(estudo.dias, {}) },
    apagados: obj(d.apagados, {}),
    desempenho: lista<Registro>(d.desempenho).filter((r) => r && typeof r.id === "string"),
  };
}
