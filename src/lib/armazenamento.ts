import { completarDados, MAX_DESEMPENHO, MAX_HISTORICO, MAX_SALVOS, type AgendaGravada, type Dados, type PerguntaSalva, type QuizGuardado, type QuizSalvo, type Registro, type Tentativa } from "./dados";
import { META_PADRAO, podarDias, somarRespondidas, type Estudo } from "./meta";
import type { Quiz } from "./quiz";
import { chave, hoje, proximaAgenda, separarChave } from "./revisao";

export type { PerguntaSalva, QuizGuardado, QuizSalvo, Registro, Tentativa } from "./dados";

// Os dados ficam no navegador (localStorage). Com conta, sincronizar.ts copia para a nuvem.

const CHAVES = {
  salvos: "quiz:salvos",
  historico: "quiz:historico",
  revisao: "quiz:revisao",
  estudo: "quiz:estudo",
  apagados: "quiz:apagados",
  desempenho: "quiz:desempenho",
} as const satisfies Record<keyof Dados, string>;

// Avisado a cada gravação, para a sincronização saber que há algo novo.
export const EVENTO_MUDOU = "quiz:mudou";

function ler<T>(chaveArmazenamento: string, vazio: T): T {
  try {
    const bruto = localStorage.getItem(chaveArmazenamento);
    return bruto ? (JSON.parse(bruto) as T) : vazio;
  } catch {
    return vazio;
  }
}

function gravar(chaveArmazenamento: string, valor: unknown, avisar = true): void {
  try {
    localStorage.setItem(chaveArmazenamento, JSON.stringify(valor));
  } catch {
    // Armazenamento cheio ou bloqueado: o app continua funcionando sem salvar.
  }
  if (avisar) window.dispatchEvent(new Event(EVENTO_MUDOU));
}

export function lerDados(): Dados {
  return completarDados(
    Object.fromEntries(Object.entries(CHAVES).map(([nome, c]) => [nome, ler<unknown>(c, null)])),
    META_PADRAO,
  );
}

// avisar=false quando quem grava é a própria sincronização.
export function gravarDados(dados: Dados, avisar = true): void {
  for (const [nome, c] of Object.entries(CHAVES)) gravar(c, dados[nome as keyof Dados], false);
  if (avisar) window.dispatchEvent(new Event(EVENTO_MUDOU));
}

export function comIds(quiz: Quiz): QuizGuardado {
  return {
    tema: quiz.tema,
    perguntas: quiz.perguntas.map((p) => ({ ...p, id: "id" in p && typeof p.id === "string" ? p.id : crypto.randomUUID() })),
  };
}

export const historico = {
  listar: () => {
    const itens = ler<Tentativa[]>(CHAVES.historico, []);
    return Array.isArray(itens) ? itens : [];
  },
  adicionar(t: Tentativa) {
    gravar(CHAVES.historico, [t, ...this.listar()].slice(0, MAX_HISTORICO));
  },
};

export const salvos = {
  listar(): QuizSalvo[] {
    const itens = ler<QuizSalvo[]>(CHAVES.salvos, []);
    if (!Array.isArray(itens)) return [];
    // Quizzes salvos antes das perguntas terem id ganham ids aqui, uma vez.
    const semId = itens.some((s) => s.quiz.perguntas.some((p) => !p.id));
    if (!semId) return itens;
    const corrigidos = itens.map((s) => ({ ...s, quiz: comIds(s.quiz) }));
    gravar(CHAVES.salvos, corrigidos);
    return corrigidos;
  },
  buscar(id: string): QuizSalvo | undefined {
    return this.listar().find((s) => s.id === id);
  },
  adicionar(quiz: Quiz): QuizSalvo {
    const agora = Date.now();
    const item: QuizSalvo = { id: crypto.randomUUID(), quiz: comIds(quiz), criadoEm: agora, atualizadoEm: agora };
    gravar(CHAVES.salvos, [item, ...this.listar()].slice(0, MAX_SALVOS));
    return item;
  },
  atualizar(id: string, quiz: QuizGuardado) {
    gravar(CHAVES.salvos, this.listar().map((s) => (s.id === id ? { ...s, quiz, atualizadoEm: Date.now() } : s)));
    revisao.limparOrfas();
  },
  remover(id: string) {
    gravar(CHAVES.salvos, this.listar().filter((s) => s.id !== id));
    gravar(CHAVES.apagados, { ...ler<Record<string, number>>(CHAVES.apagados, {}), [id]: Date.now() });
    revisao.limparOrfas();
  },
};

export const revisao = {
  agendas: () => ler<Record<string, AgendaGravada>>(CHAVES.revisao, {}),
  registrar(respostas: { chave: string; certo: boolean }[]) {
    const agendas = this.agendas();
    const em = Date.now();
    for (const r of respostas) agendas[r.chave] = { ...proximaAgenda(agendas[r.chave], r.certo), em };
    gravar(CHAVES.revisao, agendas);
  },
  // Tira da agenda perguntas e quizzes que foram apagados.
  limparOrfas() {
    const existentes = new Set(salvos.listar().flatMap((s) => s.quiz.perguntas.map((p) => chave(s.id, p.id))));
    const agendas = this.agendas();
    const filtradas = Object.fromEntries(Object.entries(agendas).filter(([c]) => existentes.has(c)));
    if (Object.keys(filtradas).length !== Object.keys(agendas).length) gravar(CHAVES.revisao, filtradas);
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
    const e = ler<Partial<Estudo>>(CHAVES.estudo, {});
    return { meta: typeof e.meta === "number" && e.meta > 0 ? e.meta : META_PADRAO, dias: e.dias ?? {} };
  },
  definirMeta(meta: number) {
    gravar(CHAVES.estudo, { ...this.ler(), meta });
  },
  registrar(quantidade: number) {
    if (quantidade <= 0) return;
    const atual = this.ler();
    gravar(CHAVES.estudo, { ...atual, dias: podarDias(somarRespondidas(atual.dias, quantidade)) });
  },
};

export const desempenho = {
  listar: () => {
    const itens = ler<Registro[]>(CHAVES.desempenho, []);
    return Array.isArray(itens) ? itens : [];
  },
  // Uma linha por quiz de origem: numa revisão, as perguntas podem vir de vários quizzes.
  registrar(partes: { quizId: string | null; tema: string; acertos: number; total: number }[]) {
    const dia = hoje();
    const novos = partes.filter((p) => p.total > 0).map((p) => ({ ...p, id: crypto.randomUUID(), dia }));
    if (novos.length) gravar(CHAVES.desempenho, [...novos, ...this.listar()].slice(0, MAX_DESEMPENHO));
  },
};

// Backup: um arquivo JSON com tudo o que o app guarda neste navegador.
const VERSAO_BACKUP = 1;

export interface Backup {
  app: "caderno-de-quiz";
  versao: number;
  exportadoEm: string;
  dados: Partial<Record<keyof Dados, unknown>>;
}

export function exportarBackup(): Backup {
  return { app: "caderno-de-quiz", versao: VERSAO_BACKUP, exportadoEm: new Date().toISOString(), dados: { ...lerDados() } };
}

// Substitui os dados deste navegador pelos do backup. Devolve uma mensagem de erro, ou null se deu certo.
export function importarBackup(bruto: unknown): string | null {
  const b = bruto as Partial<Backup> | null;
  if (!b || b.app !== "caderno-de-quiz" || typeof b.dados !== "object" || !b.dados) {
    return "Este arquivo não é um backup do Caderno de Quiz.";
  }
  if ((b.versao ?? 0) > VERSAO_BACKUP) return "Este backup foi feito por uma versão mais nova do app.";
  if (b.dados.salvos != null && !Array.isArray(b.dados.salvos)) return "O backup está corrompido.";
  gravarDados(completarDados(b.dados, META_PADRAO));
  return null;
}
