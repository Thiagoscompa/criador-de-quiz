import { PedidoTutorSchema, promptTutor, RespostaTutorSchema } from "../src/lib/tutor.js";
import { ERRO_SEM_CHAVE, json, lerJson, provedorConfigurado } from "./http.js";
import { consumirLimite } from "./limite.js";
import { chamarIA } from "./provedores/index.js";

// Explica uma questão do quiz e responde perguntas de acompanhamento do aluno.
export async function tutor(request: Request): Promise<Response> {
  if (request.method !== "POST") return json(405, { erro: "Use POST." });
  const provedor = provedorConfigurado();
  if (!provedor) return json(500, { erro: ERRO_SEM_CHAVE });

  const pedido = PedidoTutorSchema.safeParse(await lerJson(request));
  if (!pedido.success) return json(400, { erro: "Pedido inválido para o tutor. A conversa pode ter ficado longa demais." });

  const limite = await consumirLimite(request);
  if (!limite.ok) return json(429, { erro: limite.erro });

  try {
    const resultado = await chamarIA(provedor, { schema: RespostaTutorSchema, nome: "tutor", prompt: promptTutor(pedido.data) });
    if (!resultado.ok) return json(resultado.status, { erro: resultado.erro });
    const resposta = resultado.dados.resposta.trim();
    if (!resposta) return json(502, { erro: "O tutor não respondeu. Tente de novo." });
    return json(200, { resposta });
  } catch (e) {
    console.error(e);
    return json(500, { erro: "Algo deu errado ao falar com o tutor." });
  }
}
