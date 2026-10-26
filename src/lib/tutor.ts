import { z } from "zod";
import { NOMES_TIPO, respostaCerta, respostaDoAluno, tipoDe, TIPOS, type Pergunta, type Resposta } from "./quiz.js";

// Quantas perguntas de acompanhamento o aluno pode fazer sobre uma mesma questão.
export const MAX_PERGUNTAS_TUTOR = 3;

const curto = (max: number) => z.string().trim().max(max);

export const PedidoTutorSchema = z.object({
  tema: curto(200),
  tipo: z.enum(TIPOS),
  pergunta: curto(1000).min(1),
  respostaCerta: curto(500),
  respostaAluno: curto(500),
  acertou: z.boolean(),
  explicacao: curto(1500),
  trecho: curto(500),
  mensagens: z
    .array(z.object({ papel: z.enum(["aluno", "tutor"]), texto: curto(1500).min(1) }))
    .max(MAX_PERGUNTAS_TUTOR * 2),
});

export type PedidoTutor = z.infer<typeof PedidoTutorSchema>;
export type MensagemTutor = PedidoTutor["mensagens"][number];

export const RespostaTutorSchema = z.object({ resposta: z.string() });

export function contextoTutor(tema: string, p: Pergunta, r: Resposta): Omit<PedidoTutor, "mensagens"> {
  return {
    tema,
    tipo: tipoDe(p),
    pergunta: p.pergunta,
    respostaCerta: respostaCerta(p),
    respostaAluno: respostaDoAluno(p, r),
    acertou: r.certo,
    explicacao: p.explicacao,
    trecho: p.trecho ?? "",
  };
}

export function promptTutor(pedido: PedidoTutor): string {
  const conversa = pedido.mensagens.map((m) => `${m.papel === "aluno" ? "Aluno" : "Tutor"}: ${m.texto}`).join("\n");
  const ultima = pedido.mensagens.at(-1);
  const tarefa =
    ultima?.papel === "aluno"
      ? "Responda à última mensagem do aluno."
      : pedido.acertou
        ? "O aluno acertou e pediu para entender melhor. Aprofunde o conceito com um exemplo."
        : "O aluno errou. Explique por que a resposta dele não serve e por que a certa está certa, com um exemplo ou analogia simples.";

  return `Você é um tutor paciente que ajuda um estudante brasileiro a entender uma questão de um quiz.
Responda em português do Brasil, em no máximo 120 palavras, com frases curtas, sem markdown e sem títulos.
${pedido.trecho ? "Cite entre aspas o trecho do material quando ele ajudar a explicar." : ""}
Fique no assunto da questão. Se o aluno pedir algo fora do estudo, traga a conversa de volta para a questão.

Tema do quiz: ${pedido.tema}
Tipo: ${NOMES_TIPO[pedido.tipo]}
Questão: ${pedido.pergunta}
Resposta certa: ${pedido.respostaCerta}
Resposta do aluno: ${pedido.respostaAluno} (${pedido.acertou ? "acertou" : "errou"})
Explicação do quiz: ${pedido.explicacao}
${pedido.trecho ? `Trecho do material: "${pedido.trecho}"` : "Não há material de origem: o quiz foi feito a partir de um tema."}
${conversa ? `\nConversa até agora:\n${conversa}\n` : ""}
${tarefa}`;
}
