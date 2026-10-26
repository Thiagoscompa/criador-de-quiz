import type { Quiz } from "./quiz";

// Tudo fica no navegador de quem usa (localStorage). Sem conta, sem servidor.

export interface Tentativa {
  tema: string;
  acertos: number;
  total: number;
  quando: number;
}

export interface QuizSalvo {
  id: string;
  quiz: Quiz;
  criadoEm: number;
}

const CHAVE_HISTORICO = "quiz:historico";
const CHAVE_SALVOS = "quiz:salvos";
const MAX_HISTORICO = 20;
const MAX_SALVOS = 30;

function ler<T>(chave: string): T[] {
  try {
    const bruto = localStorage.getItem(chave);
    const valor: unknown = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(valor) ? (valor as T[]) : [];
  } catch {
    return [];
  }
}

function gravar<T>(chave: string, itens: T[]): void {
  try {
    localStorage.setItem(chave, JSON.stringify(itens));
  } catch {
    // Armazenamento cheio ou bloqueado: o app continua funcionando sem salvar.
  }
}

export const historico = {
  listar: () => ler<Tentativa>(CHAVE_HISTORICO),
  adicionar(t: Tentativa) {
    gravar(CHAVE_HISTORICO, [t, ...this.listar()].slice(0, MAX_HISTORICO));
  },
};

export const salvos = {
  listar: () => ler<QuizSalvo>(CHAVE_SALVOS),
  adicionar(quiz: Quiz): QuizSalvo {
    const item: QuizSalvo = { id: crypto.randomUUID(), quiz, criadoEm: Date.now() };
    gravar(CHAVE_SALVOS, [item, ...this.listar()].slice(0, MAX_SALVOS));
    return item;
  },
  remover(id: string) {
    gravar(CHAVE_SALVOS, this.listar().filter((s) => s.id !== id));
  },
};
