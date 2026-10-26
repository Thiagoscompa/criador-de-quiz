import { z } from "zod";

export const TIPOS = ["multipla", "vf", "lacuna", "flashcard"] as const;
export type Tipo = (typeof TIPOS)[number];

export const NOMES_TIPO: Record<Tipo, string> = {
  multipla: "Múltipla escolha",
  vf: "Verdadeiro ou falso",
  lacuna: "Completar lacuna",
  flashcard: "Flashcards",
};

export const OPCOES_VF = ["Verdadeiro", "Falso"];
export const LACUNA = "____";

// Formato que pedimos à IA. Todos os campos existem em todos os tipos porque as saídas
// estruturadas exigem campos obrigatórios; normalizarQuiz limpa o que não se aplica.
export const QuizSchema = z.object({
  tema: z.string(),
  perguntas: z.array(
    z.object({
      tipo: z.enum(TIPOS),
      pergunta: z.string(),
      opcoes: z.array(z.string()),
      correta: z.number().int(),
      resposta: z.string(),
      explicacao: z.string(),
      trecho: z.string(),
    }),
  ),
});

export interface Pergunta {
  // Ausente em quizzes salvos antes dos novos tipos: vale como múltipla escolha.
  tipo?: Tipo;
  pergunta: string;
  opcoes: string[];
  correta: number;
  // Lacuna: a palavra que falta. Flashcard: o verso do cartão.
  resposta?: string;
  explicacao: string;
  // Frase do material de onde a pergunta saiu (vazio no modo tema).
  trecho?: string;
}

export interface Quiz {
  tema: string;
  perguntas: Pergunta[];
}

export function tipoDe(p: Pergunta): Tipo {
  return p.tipo ?? "multipla";
}

export const NIVEIS = ["fácil", "médio", "difícil"] as const;
export type Nivel = (typeof NIVEIS)[number];

export const QUANTIDADES = [5, 8, 10, 15] as const;

export const LIMITE_TEXTO = 60_000;

export const PedidoSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("tema"), tema: z.string().trim().min(2).max(200) }),
  z.object({ modo: z.literal("texto"), texto: z.string().trim().min(40).max(LIMITE_TEXTO) }),
]).and(
  z.object({
    quantidade: z.number().int().min(3).max(20),
    nivel: z.enum(NIVEIS),
    tipos: z.array(z.enum(TIPOS)).min(1).max(TIPOS.length).default(["multipla"]),
  }),
);

export type Pedido = z.input<typeof PedidoSchema>;

const REGRAS_TIPO: Record<Tipo, string> = {
  multipla: `"multipla": 4 alternativas plausíveis em "opcoes", só uma certa; "correta" é o índice (0 a 3) dela. Varie a posição da certa. "resposta" vazio.`,
  vf: `"vf": uma afirmação em "pergunta" (sem "verdadeiro ou falso:" no texto); "opcoes" = ["Verdadeiro", "Falso"]; "correta" 0 se for verdadeira, 1 se for falsa. Equilibre verdadeiras e falsas. "resposta" vazio.`,
  lacuna: `"lacuna": uma frase do conteúdo com UMA palavra ou expressão curta trocada por ${LACUNA} em "pergunta"; "resposta" é o que falta (1 a 3 palavras, sem artigo). "opcoes" vazio e "correta" -1.`,
  flashcard: `"flashcard": "pergunta" é a frente do cartão (um conceito, termo ou pergunta curta); "resposta" é o verso (1 ou 2 frases). "opcoes" vazio e "correta" -1.`,
};

export function montarPrompt(pedido: Pedido): string {
  const tipos = pedido.tipos?.length ? pedido.tipos : ["multipla" as const];
  const mistura =
    tipos.length === 1
      ? `Todas as perguntas são do tipo "${tipos[0]}".`
      : `Distribua as perguntas de forma equilibrada entre os tipos: ${tipos.map((t) => `"${t}"`).join(", ")}.`;
  const base = `Você é um professor criando um quiz de estudo em português do Brasil.
Crie exatamente ${pedido.quantidade} perguntas, nível ${pedido.nivel}. ${mistura}
Regras de cada tipo:
${tipos.map((t) => `- ${REGRAS_TIPO[t]}`).join("\n")}
As alternativas erradas devem ser plausíveis para quem não estudou. Não repita perguntas nem cubra o mesmo fato duas vezes.
Na explicação, ensine: diga em 1 a 3 frases por que a resposta está certa.
"tema" é um título curto para o quiz.`;

  if (pedido.modo === "tema") {
    return `${base}\n"trecho" fica vazio.\n\nTema: ${pedido.tema}`;
  }
  return `${base}
Em "trecho", copie a frase do material (no máximo 300 caracteres) que sustenta a resposta.

Use SOMENTE as informações do material abaixo. Não invente fatos que não estejam nele.
<material>
${pedido.texto}
</material>`;
}

const LIMITE_TRECHO = 400;

function normalizarPergunta(p: z.infer<typeof QuizSchema>["perguntas"][number]): Pergunta | null {
  const pergunta = p.pergunta.trim();
  const explicacao = p.explicacao.trim();
  const trecho = p.trecho.trim().slice(0, LIMITE_TRECHO);
  const resposta = p.resposta.trim();
  if (!pergunta) return null;

  switch (p.tipo) {
    case "multipla": {
      const opcoes = p.opcoes.map((o) => o.trim()).filter(Boolean);
      if (opcoes.length < 2 || opcoes.length > 6 || p.correta < 0 || p.correta >= opcoes.length) return null;
      return { tipo: "multipla", pergunta, opcoes, correta: p.correta, explicacao, trecho };
    }
    case "vf":
      if (p.correta !== 0 && p.correta !== 1) return null;
      return { tipo: "vf", pergunta, opcoes: [...OPCOES_VF], correta: p.correta, explicacao, trecho };
    case "lacuna": {
      if (!resposta) return null;
      // A IA às vezes usa outra quantidade de sublinhados; padroniza ou põe a lacuna no fim.
      const comLacuna = /_{2,}/.test(pergunta) ? pergunta.replace(/_{2,}/, LACUNA) : `${pergunta} ${LACUNA}`;
      return { tipo: "lacuna", pergunta: comLacuna, opcoes: [], correta: -1, resposta, explicacao, trecho };
    }
    case "flashcard":
      if (!resposta) return null;
      return { tipo: "flashcard", pergunta, opcoes: [], correta: -1, resposta, explicacao, trecho };
    default:
      return null;
  }
}

// Descarta perguntas malformadas em vez de falhar o quiz inteiro.
export function normalizarQuiz(bruto: z.infer<typeof QuizSchema>): Quiz | null {
  const perguntas = bruto.perguntas.map(normalizarPergunta).filter((p): p is Pergunta => p !== null);
  if (perguntas.length === 0) return null;
  return { tema: bruto.tema.trim() || "Quiz", perguntas };
}

// Lacuna: aceita diferença de maiúsculas, acentos, pontuação, artigo inicial e um erro de digitação.
export function simplificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/^\s*(o|a|os|as|um|uma|the)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function distancia(a: string, b: string): number {
  const linha = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0];
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = linha[j];
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return linha[b.length];
}

export function conferirLacuna(digitada: string, esperada: string): boolean {
  const a = simplificar(digitada);
  const b = simplificar(esperada);
  if (!a) return false;
  if (a === b) return true;
  return b.length >= 5 && distancia(a, b) <= 1;
}

// Texto da resposta certa, para mostrar em qualquer tipo.
export function respostaCerta(p: Pergunta): string {
  const t = tipoDe(p);
  if (t === "lacuna" || t === "flashcard") return p.resposta ?? "";
  return p.opcoes[p.correta] ?? "";
}

export interface Resposta {
  indice: number;
  // Índice escolhido (múltipla e V/F); -1 nos tipos sem alternativas.
  escolhida: number;
  certo: boolean;
  // O que o aluno digitou na lacuna.
  digitada?: string;
}

export function respostaDoAluno(p: Pergunta, r: Resposta): string {
  const t = tipoDe(p);
  if (t === "lacuna") return r.digitada || "(em branco)";
  if (t === "flashcard") return r.certo ? "lembrei" : "não lembrei";
  return p.opcoes[r.escolhida] ?? "";
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
