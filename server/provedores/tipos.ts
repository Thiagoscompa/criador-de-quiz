import type { z } from "zod";

// O que cada provedor devolve: o dado já no formato pedido, ou um erro pronto para mostrar ao usuário.
export type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; status: number; erro: string };

export interface PedidoIA<S extends z.ZodType> {
  schema: S;
  nome: string;
  prompt: string;
  // Imagens como data URLs (data:image/jpeg;base64,...).
  imagens?: string[];
}

export const ERRO_RECUSA = "A IA não quis processar esse conteúdo. Tente outro tema, texto ou foto.";
export const ERRO_INCOMPLETO = "A resposta veio incompleta. Tente com menos perguntas ou menos fotos.";
export const ERRO_LIMITE = "Muitos pedidos seguidos. Espere um pouco e tente de novo.";
export const ERRO_SERVICO = "O serviço de IA falhou. Tente de novo em instantes.";
