import type { PerguntaSalva } from "./armazenamento";
import { LACUNA, tipoDe } from "./quiz";

// Devolve o problema da pergunta, ou null se ela está boa para salvar.
export function problemaDaPergunta(p: PerguntaSalva): string | null {
  if (!p.pergunta.trim()) return "escreva o enunciado";
  switch (tipoDe(p)) {
    case "multipla":
      if (p.opcoes.filter((o) => o.trim()).length < 2) return "deixe pelo menos 2 alternativas preenchidas";
      if (!p.opcoes[p.correta]?.trim()) return "a alternativa marcada como certa está vazia";
      return null;
    case "vf":
      return p.correta === 0 || p.correta === 1 ? null : "marque se a afirmação é verdadeira ou falsa";
    case "lacuna":
      if (!p.pergunta.includes(LACUNA)) return `marque a lacuna na frase com ${LACUNA}`;
      return p.resposta?.trim() ? null : "escreva a palavra que completa a lacuna";
    case "flashcard":
      return p.resposta?.trim() ? null : "escreva o verso do cartão";
  }
}
