import type { Pergunta, Quiz } from "./quiz";
import { chave, proximaAgenda, separarChave, type Agenda } from "./revisao";

// Tudo fica no navegador de quem usa (localStorage). Sem conta, sem servidor.

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
}

const CHAVE_HISTORICO = "quiz:historico";
const CHAVE_SALVOS = "quiz:salvos";
const CHAVE_REVISAO = "quiz:revisao";
const MAX_HISTORICO = 20;
const MAX_SALVOS = 50;

function ler<T>(chaveArmazenamento: string, vazio: T): T {
  try {
    const bruto = localStorage.getItem(chaveArmazenamento);
    return bruto ? (JSON.parse(bruto) as T) : vazio;
  } catch {
    return vazio;
  }
}

function gravar(chaveArmazenamento: string, valor: unknown): void {
  try {
    localStorage.setItem(chaveArmazenamento, JSON.stringify(valor));
  } catch {
    // Armazenamento cheio ou bloqueado: o app continua funcionando sem salvar.
  }
}

export function comIds(quiz: Quiz): QuizGuardado {
  return {
    tema: quiz.tema,
    perguntas: quiz.perguntas.map((p) => ({ ...p, id: "id" in p && typeof p.id === "string" ? p.id : crypto.randomUUID() })),
  };
}

export const historico = {
  listar: () => {
    const itens = ler<Tentativa[]>(CHAVE_HISTORICO, []);
    return Array.isArray(itens) ? itens : [];
  },
  adicionar(t: Tentativa) {
    gravar(CHAVE_HISTORICO, [t, ...this.listar()].slice(0, MAX_HISTORICO));
  },
};

export const salvos = {
  listar(): QuizSalvo[] {
    const itens = ler<QuizSalvo[]>(CHAVE_SALVOS, []);
    if (!Array.isArray(itens)) return [];
    // Quizzes salvos antes das perguntas terem id ganham ids aqui, uma vez.
    const semId = itens.some((s) => s.quiz.perguntas.some((p) => !p.id));
    if (!semId) return itens;
    const corrigidos = itens.map((s) => ({ ...s, quiz: comIds(s.quiz) }));
    gravar(CHAVE_SALVOS, corrigidos);
    return corrigidos;
  },
  buscar(id: string): QuizSalvo | undefined {
    return this.listar().find((s) => s.id === id);
  },
  adicionar(quiz: Quiz): QuizSalvo {
    const item: QuizSalvo = { id: crypto.randomUUID(), quiz: comIds(quiz), criadoEm: Date.now() };
    gravar(CHAVE_SALVOS, [item, ...this.listar()].slice(0, MAX_SALVOS));
    return item;
  },
  atualizar(id: string, quiz: QuizGuardado) {
    gravar(CHAVE_SALVOS, this.listar().map((s) => (s.id === id ? { ...s, quiz } : s)));
    revisao.limparOrfas();
  },
  remover(id: string) {
    gravar(CHAVE_SALVOS, this.listar().filter((s) => s.id !== id));
    revisao.limparOrfas();
  },
};

export const revisao = {
  agendas: () => ler<Record<string, Agenda>>(CHAVE_REVISAO, {}),
  registrar(respostas: { chave: string; certo: boolean }[]) {
    const agendas = this.agendas();
    for (const r of respostas) agendas[r.chave] = proximaAgenda(agendas[r.chave], r.certo);
    gravar(CHAVE_REVISAO, agendas);
  },
  // Tira da agenda perguntas e quizzes que foram apagados.
  limparOrfas() {
    const existentes = new Set(salvos.listar().flatMap((s) => s.quiz.perguntas.map((p) => chave(s.id, p.id))));
    const agendas = this.agendas();
    const filtradas = Object.fromEntries(Object.entries(agendas).filter(([c]) => existentes.has(c)));
    if (Object.keys(filtradas).length !== Object.keys(agendas).length) gravar(CHAVE_REVISAO, filtradas);
  },
  // Monta a sessão de revisão a partir das chaves vencidas.
  montarSessao(chaves: string[]): { quiz: QuizGuardado; chaves: string[] } {
    const quizzes = new Map(salvos.listar().map((s) => [s.id, s]));
    const perguntas: PerguntaSalva[] = [];
    const usadas: string[] = [];
    for (const c of chaves) {
      const { quizId, perguntaId } = separarChave(c);
      const p = quizzes.get(quizId)?.quiz.perguntas.find((q) => q.id === perguntaId);
      if (p) {
        perguntas.push(p);
        usadas.push(c);
      }
    }
    return { quiz: { tema: "Revisão de hoje", perguntas }, chaves: usadas };
  },
};
