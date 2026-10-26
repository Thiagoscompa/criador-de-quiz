import type { PerguntaSalva } from "./armazenamento";

// Devolve o problema da pergunta, ou null se ela está boa para salvar.
export function problemaDaPergunta(p: PerguntaSalva): string | null {
  if (!p.pergunta.trim()) return "escreva o enunciado";
  if (p.opcoes.filter((o) => o.trim()).length < 2) return "deixe pelo menos 2 alternativas preenchidas";
  if (!p.opcoes[p.correta]?.trim()) return "a alternativa marcada como certa está vazia";
  return null;
}
