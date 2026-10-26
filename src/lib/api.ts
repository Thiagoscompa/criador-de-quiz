import type { Pedido, Quiz } from "./quiz";
import type { PedidoTutor } from "./tutor";

export interface PaginaLida {
  texto: string;
  legivel: boolean;
  problema: string;
}

async function postar<T>(caminho: string, corpo: unknown, signal?: AbortSignal): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(caminho, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error("Sem conexão com o servidor. Verifique sua internet.");
  }
  const dados = (await resposta.json().catch(() => null)) as ({ erro?: string } & T) | null;
  if (!resposta.ok || !dados || dados.erro) {
    if (resposta.status === 413) throw new Error("As fotos ficaram grandes demais. Envie menos fotos por vez.");
    throw new Error(dados?.erro || "Algo deu errado. Tente de novo.");
  }
  return dados;
}

export function pedirQuiz(pedido: Pedido, signal?: AbortSignal): Promise<Quiz> {
  return postar<Quiz>("/api/gerar-quiz", pedido, signal);
}

export async function lerFotos(imagens: string[], signal?: AbortSignal): Promise<PaginaLida[]> {
  const { paginas } = await postar<{ paginas: PaginaLida[] }>("/api/ler-fotos", { imagens }, signal);
  return paginas;
}

export async function perguntarTutor(pedido: PedidoTutor, signal?: AbortSignal): Promise<string> {
  const { resposta } = await postar<{ resposta: string }>("/api/tutor", pedido, signal);
  return resposta;
}
