import { LeituraSchema, MAX_FOTOS, PedidoLeituraSchema, promptLeitura } from "../src/lib/fotos.js";
import { ERRO_SEM_CHAVE, json, lerJson, provedorConfigurado } from "./http.js";
import { consumirLimite } from "./limite.js";
import { chamarIA } from "./provedores/index.js";

// Transcreve fotos de material de estudo. As imagens não são guardadas: só passam pela IA.
export async function lerFotos(request: Request): Promise<Response> {
  if (request.method !== "POST") return json(405, { erro: "Use POST." });
  const provedor = provedorConfigurado();
  if (!provedor) return json(500, { erro: ERRO_SEM_CHAVE });

  const pedido = PedidoLeituraSchema.safeParse(await lerJson(request));
  if (!pedido.success) {
    return json(400, { erro: `Envie de 1 a ${MAX_FOTOS} fotos em JPEG, PNG ou WebP, com até 4 MB no total.` });
  }

  const limite = await consumirLimite(request);
  if (!limite.ok) return json(429, { erro: limite.erro });

  const { imagens } = pedido.data;
  try {
    const resultado = await chamarIA(provedor, {
      schema: LeituraSchema,
      nome: "leitura",
      prompt: promptLeitura(imagens.length),
      imagens,
    });
    if (!resultado.ok) return json(resultado.status, { erro: resultado.erro });

    // Garante uma página por foto, mesmo que a IA devolva a mais ou a menos.
    const paginas = imagens.map((_, i) => {
      const p = resultado.dados.paginas[i];
      if (!p) return { texto: "", legivel: false, problema: "não foi possível ler esta foto" };
      return { texto: p.texto.trim(), legivel: p.legivel && p.texto.trim().length > 0, problema: p.problema.trim() };
    });
    return json(200, { paginas });
  } catch (e) {
    console.error(e);
    return json(500, { erro: "Algo deu errado ao ler as fotos." });
  }
}
