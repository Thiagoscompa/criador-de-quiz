import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { QuizSchema } from "../../src/lib/quiz.js";
import { ERRO_INCOMPLETO, ERRO_LIMITE, ERRO_RECUSA, ERRO_SERVICO, type Resultado } from "./tipos.js";

// Troque com a variável OPENAI_MODEL (ex.: gpt-5, gpt-5.1).
const MODELO_PADRAO = "gpt-5-mini";

let cliente: OpenAI | null = null;

export async function gerarComOpenAI(prompt: string): Promise<Resultado> {
  cliente ??= new OpenAI();
  try {
    const resposta = await cliente.responses.parse({
      model: process.env.OPENAI_MODEL || MODELO_PADRAO,
      input: prompt,
      text: { format: zodTextFormat(QuizSchema, "quiz") },
    });

    const recusou = resposta.output.some(
      (item) => item.type === "message" && item.content.some((c) => c.type === "refusal"),
    );
    if (recusou) return { ok: false, status: 422, erro: ERRO_RECUSA };
    if (resposta.status === "incomplete" || !resposta.output_parsed) {
      return { ok: false, status: 502, erro: ERRO_INCOMPLETO };
    }
    return { ok: true, quiz: resposta.output_parsed };
  } catch (e) {
    if (e instanceof OpenAI.RateLimitError) return { ok: false, status: 429, erro: ERRO_LIMITE };
    if (e instanceof OpenAI.AuthenticationError) {
      return { ok: false, status: 500, erro: "A chave da API da OpenAI é inválida." };
    }
    if (e instanceof OpenAI.NotFoundError) {
      return { ok: false, status: 500, erro: "O modelo configurado em OPENAI_MODEL não existe ou não está liberado na sua conta." };
    }
    if (e instanceof OpenAI.APIError) {
      console.error("Erro da API OpenAI", e.status, e.message);
      return { ok: false, status: 502, erro: ERRO_SERVICO };
    }
    throw e;
  }
}
