import { montarPrompt, normalizarQuiz, PedidoSchema } from "../src/lib/quiz.js";
import { gerarComAnthropic } from "./provedores/anthropic.js";
import { gerarComOpenAI } from "./provedores/openai.js";
import type { Resultado } from "./provedores/tipos.js";

function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// Usa a OpenAI se OPENAI_API_KEY estiver definida; senão, o Claude com ANTHROPIC_API_KEY.
function escolherProvedor(): ((prompt: string) => Promise<Resultado>) | null {
  if (process.env.OPENAI_API_KEY) return gerarComOpenAI;
  if (process.env.ANTHROPIC_API_KEY) return gerarComAnthropic;
  return null;
}

export async function gerarQuiz(request: Request): Promise<Response> {
  if (request.method !== "POST") return json(405, { erro: "Use POST." });
  const provedor = escolherProvedor();
  if (!provedor) {
    return json(500, { erro: "O servidor está sem chave de IA. Defina OPENAI_API_KEY ou ANTHROPIC_API_KEY." });
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

  try {
    const resultado = await provedor(montarPrompt(pedido.data));
    if (!resultado.ok) return json(resultado.status, { erro: resultado.erro });
    const quiz = normalizarQuiz(resultado.quiz);
    if (!quiz) return json(502, { erro: "Não saiu nenhuma pergunta válida. Tente gerar de novo." });
    return json(200, quiz);
  } catch (e) {
    console.error(e);
    return json(500, { erro: "Algo deu errado ao gerar o quiz." });
  }
}
