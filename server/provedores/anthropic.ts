import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { ERRO_INCOMPLETO, ERRO_LIMITE, ERRO_RECUSA, ERRO_SERVICO, type PedidoIA, type Resultado } from "./tipos.js";

const MODELO = "claude-opus-5-5";

let cliente: Anthropic | null = null;

type TipoImagem = "image/jpeg" | "image/png" | "image/webp";

function blocoImagem(dataUrl: string) {
  const [cabecalho, dados] = dataUrl.split(",", 2);
  const tipo = cabecalho.slice("data:".length, cabecalho.indexOf(";")) as TipoImagem;
  return { type: "image" as const, source: { type: "base64" as const, media_type: tipo, data: dados } };
}

export async function chamarAnthropic<S extends z.ZodType>(pedido: PedidoIA<S>): Promise<Resultado<z.infer<S>>> {
  cliente ??= new Anthropic();
  try {
    const resposta = await cliente.beta.messages.parse({
      model: MODELO,
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(pedido.schema) },
      // Se o modelo recusar por política, a API tenta de novo num modelo alternativo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [
        {
          role: "user",
          content: [...(pedido.imagens ?? []).map(blocoImagem), { type: "text" as const, text: pedido.prompt }],
        },
      ],
    });

    if (resposta.stop_reason === "refusal") return { ok: false, status: 422, erro: ERRO_RECUSA };
    if (resposta.stop_reason === "max_tokens" || !resposta.parsed_output) {
      return { ok: false, status: 502, erro: ERRO_INCOMPLETO };
    }
    return { ok: true, dados: resposta.parsed_output };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { ok: false, status: 429, erro: ERRO_LIMITE };
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, status: 500, erro: "A chave da API da Anthropic é inválida." };
    }
    if (e instanceof Anthropic.APIError) {
      console.error("Erro da API Anthropic", e.status, e.message);
      return { ok: false, status: 502, erro: ERRO_SERVICO };
    }
    throw e;
  }
}
