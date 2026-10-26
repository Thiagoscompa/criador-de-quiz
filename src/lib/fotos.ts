import { z } from "zod";

export const MAX_FOTOS = 10;
// As funções da Vercel aceitam até cerca de 4,5 MB por pedido; deixamos folga.
export const MAX_BYTES_ENVIO = 4_000_000;
export const LADO_MAXIMO_PX = 1600;

const DATA_URL_IMAGEM = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export const PedidoLeituraSchema = z.object({
  imagens: z
    .array(z.string().regex(DATA_URL_IMAGEM))
    .min(1)
    .max(MAX_FOTOS)
    .refine((imgs) => imgs.reduce((soma, i) => soma + i.length, 0) <= MAX_BYTES_ENVIO),
});

export type PedidoLeitura = z.infer<typeof PedidoLeituraSchema>;

// Formato pedido à IA: uma entrada por foto, na mesma ordem do envio.
export const LeituraSchema = z.object({
  paginas: z.array(
    z.object({
      texto: z.string(),
      legivel: z.boolean(),
      problema: z.string(),
    }),
  ),
});

export type Leitura = z.infer<typeof LeituraSchema>;

export function promptLeitura(quantidade: number): string {
  return `Você recebeu ${quantidade} foto(s) de material de estudo (páginas de livro, apostila, caderno ou quadro), em ordem.
Transcreva o texto de cada foto em português, fielmente, sem resumir nem inventar.
Inclua títulos, legendas de figuras e o conteúdo de tabelas (uma linha por linha da tabela).
Ignore cabeçalhos e rodapés repetidos, números de página e texto cortado na borda que não dá para ler.
Devolva exatamente ${quantidade} item(ns) em "paginas", na ordem das fotos.
Se uma foto estiver ilegível, sem texto ou não for material de estudo, use "legivel": false, "texto": "" e explique em "problema" em uma frase curta (por exemplo: "foto desfocada", "página cortada"). Caso contrário, "problema" fica vazio.`;
}

export function juntarPaginas(paginas: { texto: string }[]): string {
  return paginas
    .map((p) => p.texto.trim())
    .filter(Boolean)
    .join("\n\n");
}
