import type { Pedido, Quiz } from "./quiz";

export async function pedirQuiz(pedido: Pedido, signal?: AbortSignal): Promise<Quiz> {
  let resposta: Response;
  try {
    resposta = await fetch("/api/gerar-quiz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(pedido),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error("Sem conexão com o servidor. Verifique sua internet.");
  }
  const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | Quiz | null;
  if (!resposta.ok || !corpo || "erro" in corpo) {
    throw new Error((corpo && "erro" in corpo && corpo.erro) || "Algo deu errado ao gerar o quiz.");
  }
  return corpo as Quiz;
}
