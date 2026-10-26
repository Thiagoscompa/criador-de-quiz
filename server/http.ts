export function json(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export type Provedor = "openai" | "anthropic";

// Usa a OpenAI se OPENAI_API_KEY estiver definida; senão, o Claude com ANTHROPIC_API_KEY.
export function provedorConfigurado(): Provedor | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export const ERRO_SEM_CHAVE = "O servidor está sem chave de IA. Defina OPENAI_API_KEY ou ANTHROPIC_API_KEY.";

export async function lerJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
