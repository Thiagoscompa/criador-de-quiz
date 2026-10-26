import type { QuizGuardado } from "./dados";
import { OPCOES_VF, TIPOS, type Pergunta, type Quiz } from "./quiz";
import { supabase } from "./supabase";

// Desafio: um quiz compartilhado por link, que qualquer pessoa responde sem conta, com placar.

export const PARAMETRO_URL = "desafio";
export const MAX_NOME = 30;
export const TAMANHO_PLACAR = 10;

export interface LinhaPlacar {
  id: number;
  nome: string;
  acertos: number;
  total: number;
  tempo_ms: number;
}

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function gerarId(tamanho = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
  return [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join("");
}

export function linkDesafio(id: string, origem = window.location.origin): string {
  return `${origem}/?${PARAMETRO_URL}=${id}`;
}

export function idDaUrl(busca = window.location.search): string | null {
  const id = new URLSearchParams(busca).get(PARAMETRO_URL);
  return id && /^[A-Za-z0-9]{8,16}$/.test(id) ? id : null;
}

// Só as perguntas vão para o link: sem ids internos e sem o trecho do material (que pode ser de um livro).
export function quizParaCompartilhar(quiz: QuizGuardado): Quiz {
  return {
    tema: quiz.tema,
    perguntas: quiz.perguntas.map((p) => ({
      tipo: p.tipo ?? "multipla",
      pergunta: p.pergunta,
      opcoes: p.opcoes,
      correta: p.correta,
      resposta: p.resposta ?? "",
      explicacao: p.explicacao,
    })),
  };
}

const texto = (v: unknown, max: number): string | null => (typeof v === "string" && v.length <= max ? v : null);

// O que vem do banco é tratado como desconhecido: só passa pergunta bem formada.
export function validarQuizCompartilhado(bruto: unknown): Quiz | null {
  const q = bruto as { tema?: unknown; perguntas?: unknown } | null;
  const tema = texto(q?.tema, 200);
  if (!tema || !Array.isArray(q?.perguntas)) return null;
  const perguntas: Pergunta[] = [];
  for (const item of q.perguntas.slice(0, 50) as Record<string, unknown>[]) {
    const tipo = TIPOS.find((t) => t === item?.tipo) ?? "multipla";
    const pergunta = texto(item?.pergunta, 1000);
    const explicacao = texto(item?.explicacao, 2000) ?? "";
    const resposta = texto(item?.resposta, 500) ?? "";
    const opcoes = Array.isArray(item?.opcoes) ? item.opcoes.filter((o): o is string => typeof o === "string" && o.length <= 500).slice(0, 6) : [];
    const correta = typeof item?.correta === "number" ? item.correta : -1;
    if (!pergunta) continue;
    if (tipo === "multipla" && (opcoes.length < 2 || correta < 0 || correta >= opcoes.length)) continue;
    if (tipo === "vf" && correta !== 0 && correta !== 1) continue;
    if ((tipo === "lacuna" || tipo === "flashcard") && !resposta) continue;
    perguntas.push({ tipo, pergunta, opcoes: tipo === "vf" ? [...OPCOES_VF] : opcoes, correta, resposta, explicacao });
  }
  return perguntas.length ? { tema, perguntas } : null;
}

function exigirSupabase() {
  if (!supabase) throw new Error("O compartilhamento ainda não foi configurado neste site.");
  return supabase;
}

export async function criarDesafio(quiz: QuizGuardado): Promise<string> {
  const sb = exigirSupabase();
  const id = gerarId();
  const { error } = await sb.from("desafios").insert({ id, quiz: quizParaCompartilhar(quiz) });
  if (error) throw new Error("Não foi possível criar o link. Tente de novo.");
  return id;
}

export async function buscarDesafio(id: string): Promise<Quiz | null> {
  const sb = exigirSupabase();
  const { data, error } = await sb.from("desafios").select("quiz").eq("id", id).maybeSingle();
  if (error) throw new Error("Não foi possível abrir o desafio. Verifique sua internet.");
  return data ? validarQuizCompartilhado(data.quiz) : null;
}

export async function entrarNoPlacar(desafioId: string, nome: string, acertos: number, total: number, tempoMs: number): Promise<number> {
  const sb = exigirSupabase();
  const { data, error } = await sb
    .from("placar")
    .insert({ desafio_id: desafioId, nome: nome.trim().slice(0, MAX_NOME), acertos, total, tempo_ms: Math.round(tempoMs) })
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível registrar seu resultado no placar.");
  return data.id as number;
}

export async function lerPlacar(desafioId: string): Promise<LinhaPlacar[]> {
  const sb = exigirSupabase();
  const { data, error } = await sb
    .from("placar")
    .select("id, nome, acertos, total, tempo_ms")
    .eq("desafio_id", desafioId)
    .order("acertos", { ascending: false })
    .order("tempo_ms", { ascending: true })
    .limit(TAMANHO_PLACAR);
  if (error) throw new Error("Não foi possível carregar o placar.");
  return data as LinhaPlacar[];
}

export function formatarTempo(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
