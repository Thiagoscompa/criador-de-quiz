import { META_PADRAO, podarDias, somarRespondidas, type Estudo } from "./meta";
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
const CHAVE_ESTUDO = "quiz:estudo";
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

export const estudo = {
  ler(): Estudo {
    const e = ler<Partial<Estudo>>(CHAVE_ESTUDO, {});
    return { meta: typeof e.meta === "number" && e.meta > 0 ? e.meta : META_PADRAO, dias: e.dias ?? {} };
  },
  definirMeta(meta: number) {
    gravar(CHAVE_ESTUDO, { ...this.ler(), meta });
  },
  registrar(quantidade: number) {
    if (quantidade <= 0) return;
    const atual = this.ler();
    gravar(CHAVE_ESTUDO, { ...atual, dias: podarDias(somarRespondidas(atual.dias, quantidade)) });
  },
};

// Backup: um arquivo JSON com tudo o que o app guarda neste navegador.
const CHAVES_BACKUP = { salvos: CHAVE_SALVOS, historico: CHAVE_HISTORICO, revisao: CHAVE_REVISAO, estudo: CHAVE_ESTUDO } as const;
const VERSAO_BACKUP = 1;

export interface Backup {
  app: "caderno-de-quiz";
  versao: number;
  exportadoEm: string;
  dados: Partial<Record<keyof typeof CHAVES_BACKUP, unknown>>;
}

export function exportarBackup(): Backup {
  const dados = Object.fromEntries(
    Object.entries(CHAVES_BACKUP).map(([nome, chaveArmazenamento]) => [nome, ler<unknown>(chaveArmazenamento, null)]),
  );
  return { app: "caderno-de-quiz", versao: VERSAO_BACKUP, exportadoEm: new Date().toISOString(), dados };
}

// Substitui os dados deste navegador pelos do backup. Devolve uma mensagem de erro, ou null se deu certo.
export function importarBackup(bruto: unknown): string | null {
  const b = bruto as Partial<Backup> | null;
  if (!b || b.app !== "caderno-de-quiz" || typeof b.dados !== "object" || !b.dados) {
    return "Este arquivo não é um backup do Caderno de Quiz.";
  }
  if ((b.versao ?? 0) > VERSAO_BACKUP) return "Este backup foi feito por uma versão mais nova do app.";
  if (b.dados.salvos != null && !Array.isArray(b.dados.salvos)) return "O backup está corrompido.";
  for (const [nome, chaveArmazenamento] of Object.entries(CHAVES_BACKUP)) {
    const valor = b.dados[nome as keyof typeof CHAVES_BACKUP];
    if (valor == null) {
      try {
        localStorage.removeItem(chaveArmazenamento);
      } catch {
        // ignora
      }
    } else gravar(chaveArmazenamento, valor);
  }
  return null;
}
