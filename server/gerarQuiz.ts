import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { montarPrompt, normalizarQuiz, PedidoSchema, QuizSchema } from "../src/lib/quiz.js";

const MODELO = "claude-opus-5-5";

function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

let cliente: Anthropic | null = null;

export async function gerarQuiz(request: Request): Promise<Response> {
  if (request.method !== "POST") return json(405, { erro: "Use POST." });
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(500, { erro: "O servidor está sem a chave da API da Anthropic (ANTHROPIC_API_KEY)." });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return json(400, { erro: "Pedido inválido." });
  }
  const pedido = PedidoSchema.safeParse(corpo);
  if (!pedido.success) {
    return json(400, { erro: "Confira o tema ou o texto: o texto precisa ter pelo menos algumas frases." });
  }

  cliente ??= new Anthropic();

  try {
    const resposta = await cliente.beta.messages.parse({
      model: MODELO,
      max_tokens: 16000,
      output_config: { effort: "medium", format: betaZodOutputFormat(QuizSchema) },
      // Se o modelo recusar por política, a API tenta de novo num modelo alternativo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: montarPrompt(pedido.data) }],
    });

    if (resposta.stop_reason === "refusal") {
      return json(422, { erro: "O Claude não quis gerar perguntas com esse conteúdo. Tente outro tema ou texto." });
    }
    if (resposta.stop_reason === "max_tokens" || !resposta.parsed_output) {
      return json(502, { erro: "A resposta veio incompleta. Tente com menos perguntas." });
    }

    const quiz = normalizarQuiz(resposta.parsed_output);
    if (!quiz) return json(502, { erro: "Não saiu nenhuma pergunta válida. Tente gerar de novo." });
    return json(200, quiz);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return json(429, { erro: "Muitos pedidos seguidos. Espere um pouco e tente de novo." });
    }
    if (e instanceof Anthropic.AuthenticationError) {
      return json(500, { erro: "A chave da API da Anthropic é inválida." });
    }
    if (e instanceof Anthropic.APIError) {
      console.error("Erro da API Anthropic", e.status, e.message);
      return json(502, { erro: "O serviço de geração falhou. Tente de novo em instantes." });
    }
    console.error(e);
    return json(500, { erro: "Algo deu errado ao gerar o quiz." });
  }
}
