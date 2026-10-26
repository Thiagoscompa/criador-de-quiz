// Limite de uso da IA, para que visitantes não esgotem os créditos da conta.
// Conta pedidos por visitante (IP) e no total, por dia (UTC).
// Com Upstash Redis configurado o limite vale entre todas as instâncias da Vercel;
// sem ele, cada instância conta sozinha (serve para desenvolvimento, não segura abuso).

const PADRAO_POR_VISITANTE = 30;
const PADRAO_TOTAL = 500;
const UM_DIA_S = 24 * 60 * 60;

function numeroDoAmbiente(nome: string, padrao: number): number {
  const valor = Number(process.env[nome]);
  return Number.isFinite(valor) && valor > 0 ? valor : padrao;
}

export function limites() {
  return {
    porVisitante: numeroDoAmbiente("LIMITE_DIARIO_POR_VISITANTE", PADRAO_POR_VISITANTE),
    total: numeroDoAmbiente("LIMITE_DIARIO_TOTAL", PADRAO_TOTAL),
  };
}

export function identificarVisitante(request: Request): string {
  const encaminhado = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return encaminhado || request.headers.get("x-real-ip") || "desconhecido";
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

const memoria = new Map<string, { contagem: number; expira: number }>();

async function incrementarNaMemoria(chaves: string[]): Promise<number[]> {
  const agora = Date.now();
  return chaves.map((chave) => {
    const atual = memoria.get(chave);
    const item = atual && atual.expira > agora ? atual : { contagem: 0, expira: agora + UM_DIA_S * 1000 };
    item.contagem += 1;
    memoria.set(chave, item);
    return item.contagem;
  });
}

async function incrementarNoRedis(chaves: string[], cfg: { url: string; token: string }): Promise<number[]> {
  const comandos = chaves.flatMap((chave) => [["INCR", chave], ["EXPIRE", chave, String(UM_DIA_S), "NX"]]);
  const resposta = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.token}`, "content-type": "application/json" },
    body: JSON.stringify(comandos),
  });
  if (!resposta.ok) throw new Error(`Upstash respondeu ${resposta.status}`);
  const resultados = (await resposta.json()) as { result: number }[];
  return chaves.map((_, i) => Number(resultados[i * 2]?.result));
}

export type VerificacaoLimite = { ok: true } | { ok: false; erro: string };

export async function consumirLimite(request: Request): Promise<VerificacaoLimite> {
  const { porVisitante, total } = limites();
  const dia = new Date().toISOString().slice(0, 10);
  const chaves = [`limite:${dia}:visitante:${identificarVisitante(request)}`, `limite:${dia}:total`];

  let contagens: number[];
  const cfg = redisConfig();
  try {
    contagens = cfg ? await incrementarNoRedis(chaves, cfg) : await incrementarNaMemoria(chaves);
  } catch (e) {
    // Se o contador cair, o app segue funcionando em vez de bloquear todo mundo.
    console.error("Falha no limite de uso", e);
    return { ok: true };
  }

  const [doVisitante, doDia] = contagens;
  if (doVisitante > porVisitante) {
    return { ok: false, erro: `Você chegou ao limite de ${porVisitante} gerações por dia. Volte amanhã.` };
  }
  if (doDia > total) {
    return { ok: false, erro: "O app atingiu o limite de uso de hoje. Tente de novo amanhã." };
  }
  return { ok: true };
}

export function limparLimitesEmMemoria() {
  memoria.clear();
}
