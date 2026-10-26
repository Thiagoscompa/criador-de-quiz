import { montarPrompt, normalizarQuiz, PedidoSchema, QuizSchema } from "../src/lib/quiz.js";
import { ERRO_SEM_CHAVE, json, lerJson, provedorConfigurado } from "./http.js";
import { consumirLimite } from "./limite.js";
import { chamarIA } from "./provedores/index.js";

export async function gerarQuiz(request: Request): Promise<Response> {
  if (request.method !== "POST") return json(405, { erro: "Use POST." });
  const provedor = provedorConfigurado();
  if (!provedor) return json(500, { erro: ERRO_SEM_CHAVE });

  const pedido = PedidoSchema.safeParse(await lerJson(request));
  if (!pedido.success) {
    return json(400, { erro: "Confira o tema ou o texto: o texto precisa ter pelo menos algumas frases." });
  }

  const limite = await consumirLimite(request);
  if (!limite.ok) return json(429, { erro: limite.erro });

  try {
    const resultado = await chamarIA(provedor, { schema: QuizSchema, nome: "quiz", prompt: montarPrompt(pedido.data) });
    if (!resultado.ok) return json(resultado.status, { erro: resultado.erro });
    const quiz = normalizarQuiz(resultado.dados);
    if (!quiz) return json(502, { erro: "Não saiu nenhuma pergunta válida. Tente gerar de novo." });
    return json(200, quiz);
  } catch (e) {
    console.error(e);
    return json(500, { erro: "Algo deu errado ao gerar o quiz." });
  }
}
