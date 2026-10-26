import type { PDFDocumentProxy } from "pdfjs-dist";
import { LADO_MAXIMO_PX } from "./fotos";

// O PDF é lido no próprio navegador: o arquivo não sai do aparelho, só o texto extraído.
// Páginas escaneadas (sem camada de texto) viram imagens e passam pela mesma leitura das fotos.

// Abaixo disso a página é tratada como imagem escaneada.
export const MIN_CARACTERES_PAGINA = 40;

let carregando: Promise<typeof import("pdfjs-dist")> | null = null;

// O pdf.js é grande; só baixa quando alguém abre um PDF.
function pdfjs() {
  carregando ??= Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]).then(
    ([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    },
  );
  return carregando;
}

export async function abrirPdf(arquivo: File): Promise<PDFDocumentProxy> {
  const lib = await pdfjs();
  return lib.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
}

export interface PaginaPdf {
  numero: number;
  texto: string;
}

export function limparTextoPdf(partes: { str: string; hasEOL: boolean }[]): string {
  return partes
    .map((p) => p.str + (p.hasEOL ? "\n" : ""))
    .join("")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extrairTexto(doc: PDFDocumentProxy, de: number, ate: number, signal?: AbortSignal): Promise<PaginaPdf[]> {
  const paginas: PaginaPdf[] = [];
  for (let n = de; n <= ate; n++) {
    signal?.throwIfAborted();
    const pagina = await doc.getPage(n);
    const conteudo = await pagina.getTextContent();
    const partes = conteudo.items.filter((i): i is { str: string; hasEOL: boolean } & typeof i => "str" in i);
    paginas.push({ numero: n, texto: limparTextoPdf(partes) });
    pagina.cleanup();
  }
  return paginas;
}

export async function paginaComoImagem(doc: PDFDocumentProxy, numero: number): Promise<string> {
  const pagina = await doc.getPage(numero);
  const base = pagina.getViewport({ scale: 1 });
  const viewport = pagina.getViewport({ scale: LADO_MAXIMO_PX / Math.max(base.width, base.height) });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await pagina.render({ canvas, viewport }).promise;
  pagina.cleanup();
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function juntarPaginasPdf(paginas: PaginaPdf[]): string {
  return paginas
    .map((p) => p.texto)
    .filter(Boolean)
    .join("\n\n");
}
