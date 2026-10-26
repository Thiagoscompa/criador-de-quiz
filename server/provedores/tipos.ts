import type { Quiz } from "../../src/lib/quiz.js";

// O que cada provedor devolve: o quiz bruto, ou um erro já pronto para mostrar ao usuário.
export type Resultado =
  | { ok: true; quiz: Quiz }
  | { ok: false; status: number; erro: string };

export const ERRO_RECUSA = "A IA não quis gerar perguntas com esse conteúdo. Tente outro tema ou texto.";
export const ERRO_INCOMPLETO = "A resposta veio incompleta. Tente com menos perguntas.";
export const ERRO_LIMITE = "Muitos pedidos seguidos. Espere um pouco e tente de novo.";
export const ERRO_SERVICO = "O serviço de geração falhou. Tente de novo em instantes.";
