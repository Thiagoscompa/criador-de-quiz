import { z } from "zod";

// Formato que pedimos ao Claude. Restrições de tamanho ficam em normalizarQuiz,
// porque o JSON Schema das saídas estruturadas não aceita todas elas.
export const QuizSchema = z.object({
  tema: z.string(),
  perguntas: z.array(
    z.object({
      pergunta: z.string(),
      opcoes: z.array(z.string()),
      correta: z.number().int(),
      explicacao: z.string(),
    }),
  ),
});

export type Quiz = z.infer<typeof QuizSchema>;
export type Pergunta = Quiz["perguntas"][number];

export const NIVEIS = ["fácil", "médio", "difícil"] as const;
export type Nivel = (typeof NIVEIS)[number];

export const QUANTIDADES = [5, 8, 10, 15] as const;

export const LIMITE_TEXTO = 30_000;

export const PedidoSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("tema"), tema: z.string().trim().min(2).max(200) }),
  z.object({ modo: z.literal("texto"), texto: z.string().trim().min(40).max(LIMITE_TEXTO) }),
]).and(
  z.object({
    quantidade: z.number().int().min(3).max(20),
    nivel: z.enum(NIVEIS),
  }),
);

export type Pedido = z.infer<typeof PedidoSchema>;

export function montarPrompt(pedido: Pedido): string {
  const base = `Você é um professor criando um quiz de estudo em português do Brasil.
Crie exatamente ${pedido.quantidade} perguntas de múltipla escolha, nível ${pedido.nivel}, cada uma com 4 alternativas e só uma correta.
Varie a posição da alternativa correta entre as perguntas. As alternativas erradas devem ser plausíveis para quem não estudou.
Não repita perguntas nem cubra o mesmo fato duas vezes.
Na explicação, ensine: diga em 1 a 3 frases por que a alternativa correta está certa.
"correta" é o índice (0 a 3) da alternativa certa em "opcoes". "tema" é um título curto para o quiz.`;

  if (pedido.modo === "tema") {
    return `${base}\n\nTema: ${pedido.tema}`;
  }
  return `${base}\n\nUse SOMENTE as informações do material abaixo. Não invente fatos que não estejam nele.\n<material>\n${pedido.texto}\n</material>`;
}

// Descarta perguntas malformadas em vez de falhar o quiz inteiro.
export function normalizarQuiz(bruto: Quiz): Quiz | null {
  const perguntas = bruto.perguntas
    .map((p) => ({
      pergunta: p.pergunta.trim(),
      opcoes: p.opcoes.map((o) => o.trim()).filter(Boolean),
      correta: p.correta,
      explicacao: p.explicacao.trim(),
    }))
    .filter(
      (p) =>
        p.pergunta.length > 0 &&
        p.opcoes.length >= 2 &&
        p.opcoes.length <= 6 &&
        p.correta >= 0 &&
        p.correta < p.opcoes.length,
    );
  if (perguntas.length === 0) return null;
  return { tema: bruto.tema.trim() || "Quiz", perguntas };
}

export interface Resposta {
  indice: number;
  escolhida: number;
  certo: boolean;
}

export function percentual(respostas: Resposta[]): number {
  if (respostas.length === 0) return 0;
  const acertos = respostas.filter((r) => r.certo).length;
  return Math.round((acertos / respostas.length) * 100);
}

export function mensagemResultado(pct: number): string {
  if (pct === 100) return "Gabaritou! Que tal subir o nível?";
  if (pct >= 70) return `${pct}% de acerto. Revise as erradas abaixo.`;
  return `${pct}% de acerto. Leia as explicações e tente as erradas de novo.`;
}
