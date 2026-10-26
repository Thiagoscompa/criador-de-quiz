import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { ERRO_INCOMPLETO, ERRO_LIMITE, ERRO_RECUSA, ERRO_SERVICO, type PedidoIA, type Resultado } from "./tipos.js";

// Modelos padrão; troque com OPENAI_MODEL (texto) e OPENAI_MODEL_IMAGEM (leitura de fotos).
const MODELO_TEXTO = "gpt-5-mini";
const MODELO_IMAGEM = "gpt-5";

let cliente: OpenAI | null = null;

export async function chamarOpenAI<S extends z.ZodType>(pedido: PedidoIA<S>): Promise<Resultado<z.infer<S>>> {
  cliente ??= new OpenAI();
  const comImagens = (pedido.imagens?.length ?? 0) > 0;
  const modelo = comImagens
    ? process.env.OPENAI_MODEL_IMAGEM || MODELO_IMAGEM
    : process.env.OPENAI_MODEL || MODELO_TEXTO;

  try {
    const resposta = await cliente.responses.parse({
      model: modelo,
      input: comImagens
        ? [
            {
              role: "user",
              content: [
                ...pedido.imagens!.map((url) => ({ type: "input_image" as const, image_url: url, detail: "high" as const })),
                { type: "input_text" as const, text: pedido.prompt },
              ],
            },
          ]
        : pedido.prompt,
      text: { format: zodTextFormat(pedido.schema, pedido.nome) },
    });

    const recusou = resposta.output.some(
      (item) => item.type === "message" && item.content.some((c) => c.type === "refusal"),
    );
    if (recusou) return { ok: false, status: 422, erro: ERRO_RECUSA };
    if (resposta.status === "incomplete" || !resposta.output_parsed) {
      return { ok: false, status: 502, erro: ERRO_INCOMPLETO };
    }
    return { ok: true, dados: resposta.output_parsed as z.infer<S> };
  } catch (e) {
    if (e instanceof OpenAI.RateLimitError) return { ok: false, status: 429, erro: ERRO_LIMITE };
    if (e instanceof OpenAI.AuthenticationError) {
      return { ok: false, status: 500, erro: "A chave da API da OpenAI é inválida." };
    }
    if (e instanceof OpenAI.NotFoundError) {
      return { ok: false, status: 500, erro: `O modelo ${modelo} não existe ou não está liberado na sua conta da OpenAI.` };
    }
    if (e instanceof OpenAI.APIError) {
      console.error("Erro da API OpenAI", e.status, e.message);
      return { ok: false, status: 502, erro: ERRO_SERVICO };
    }
    throw e;
  }
}
