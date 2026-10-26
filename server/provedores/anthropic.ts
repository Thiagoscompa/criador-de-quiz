import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { QuizSchema } from "../../src/lib/quiz.js";
import { ERRO_INCOMPLETO, ERRO_LIMITE, ERRO_RECUSA, ERRO_SERVICO, type Resultado } from "./tipos.js";

const MODELO = "claude-opus-5-5";

let cliente: Anthropic | null = null;

export async function gerarComAnthropic(prompt: string): Promise<Resultado> {
  cliente ??= new Anthropic();
  try {
    const resposta = await cliente.beta.messages.parse({
      model: MODELO,
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(QuizSchema) },
      // Se o modelo recusar por política, a API tenta de novo num modelo alternativo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    });

    if (resposta.stop_reason === "refusal") return { ok: false, status: 422, erro: ERRO_RECUSA };
    if (resposta.stop_reason === "max_tokens" || !resposta.parsed_output) {
      return { ok: false, status: 502, erro: ERRO_INCOMPLETO };
    }
    return { ok: true, quiz: resposta.parsed_output };
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
