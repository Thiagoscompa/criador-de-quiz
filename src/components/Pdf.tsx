import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { lerFotos } from "../lib/api";
import { MAX_BYTES_ENVIO, MAX_FOTOS } from "../lib/fotos";
import { abrirPdf, extrairTexto, juntarPaginasPdf, MIN_CARACTERES_PAGINA, paginaComoImagem, type PaginaPdf } from "../lib/pdf";
import { LIMITE_TEXTO } from "../lib/quiz";

interface Props {
  texto: string;
  setTexto: (t: string) => void;
  ocupado: boolean;
}

interface Aberto {
  nome: string;
  doc: PDFDocumentProxy;
  total: number;
}

// Etapa 1: escolher o PDF e as páginas. Etapa 2: conferir o texto extraído antes de gerar o quiz.
export function Pdf({ texto, setTexto, ocupado }: Props) {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [de, setDe] = useState(1);
  const [ate, setAte] = useState(1);
  const [paginas, setPaginas] = useState<PaginaPdf[] | null>(null);
  const [trabalhando, setTrabalhando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ msg: string; erro: boolean } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const controle = useRef<AbortController | null>(null);

  useEffect(() => () => void aberto?.doc.destroy(), [aberto]);

  async function escolher(arquivo: File | undefined) {
    if (entrada.current) entrada.current.value = "";
    if (!arquivo) return;
    setTrabalhando("Abrindo o PDF…");
    setAviso(null);
    setPaginas(null);
    setTexto("");
    try {
      const doc = await abrirPdf(arquivo);
      setAberto({ nome: arquivo.name, doc, total: doc.numPages });
      setDe(1);
      setAte(doc.numPages);
    } catch {
      setAberto(null);
      setAviso({ msg: "Não consegui abrir este arquivo. Confira se é um PDF e se não tem senha.", erro: true });
    } finally {
      setTrabalhando(null);
    }
  }

  const semTexto = paginas?.filter((p) => p.texto.length < MIN_CARACTERES_PAGINA) ?? [];

  function mostrar(lidas: PaginaPdf[]) {
    setPaginas(lidas);
    const juntado = juntarPaginasPdf(lidas);
    setTexto(juntado);
    const escaneadas = lidas.filter((p) => p.texto.length < MIN_CARACTERES_PAGINA).length;
    if (escaneadas === lidas.length) {
      setAviso({ msg: "Este PDF parece ser só imagem (escaneado). Use o botão abaixo para a IA ler as páginas.", erro: true });
    } else if (juntado.length > LIMITE_TEXTO) {
      setAviso({
        msg: `O texto passou de ${LIMITE_TEXTO.toLocaleString("pt-BR")} caracteres e só o começo será usado. Escolha menos páginas para focar no que importa.`,
        erro: true,
      });
    } else if (escaneadas) {
      setAviso({ msg: `${escaneadas} página(s) sem texto, provavelmente imagens. Dá para pedir à IA que leia.`, erro: false });
    } else setAviso(null);
  }

  async function extrair() {
    if (!aberto) return;
    const inicio = Math.max(1, Math.min(de, aberto.total));
    const fim = Math.max(inicio, Math.min(ate, aberto.total));
    controle.current = new AbortController();
    setTrabalhando("Extraindo o texto…");
    try {
      mostrar(await extrairTexto(aberto.doc, inicio, fim, controle.current.signal));
    } catch {
      if (!controle.current.signal.aborted) setAviso({ msg: "Não consegui extrair o texto deste PDF.", erro: true });
    } finally {
      setTrabalhando(null);
    }
  }

  // Páginas escaneadas viram imagem e passam pela mesma leitura das fotos, até 10 por vez.
  async function lerEscaneadas() {
    if (!aberto || !paginas) return;
    const alvo = semTexto.slice(0, MAX_FOTOS);
    controle.current = new AbortController();
    setTrabalhando(`Lendo ${alvo.length} página(s) com IA… isso pode levar até um minuto.`);
    try {
      const imagens: string[] = [];
      let tamanho = 0;
      for (const p of alvo) {
        const img = await paginaComoImagem(aberto.doc, p.numero);
        if (tamanho + img.length > MAX_BYTES_ENVIO) break;
        tamanho += img.length;
        imagens.push(img);
      }
      const lidas = await lerFotos(imagens, controle.current.signal);
      const porNumero = new Map(alvo.slice(0, imagens.length).map((p, i) => [p.numero, lidas[i]?.texto ?? ""]));
      mostrar(paginas.map((p) => (porNumero.has(p.numero) ? { ...p, texto: porNumero.get(p.numero) || p.texto } : p)));
    } catch (e) {
      if (controle.current.signal.aborted) setAviso({ msg: "Leitura interrompida.", erro: false });
      else setAviso({ msg: e instanceof Error ? e.message : "Algo deu errado.", erro: true });
    } finally {
      setTrabalhando(null);
    }
  }

  const ocupadoAqui = trabalhando !== null;

  return (
    <div className="fotos">
      <div>
        <label htmlFor="pdf-entrada">Apostila, slides ou livro em PDF</label>
        <p className="dica">O arquivo é lido no seu aparelho; só o texto vai para a IA.</p>
      </div>
      <div className="acoes">
        <input ref={entrada} id="pdf-entrada" type="file" accept="application/pdf,.pdf" hidden onChange={(e) => escolher(e.target.files?.[0])} />
        <button className="btn" onClick={() => entrada.current?.click()} disabled={ocupadoAqui || ocupado}>
          {aberto ? "Trocar PDF" : "Escolher PDF"}
        </button>
        {aberto && <span className="pequeno">{aberto.nome} · {aberto.total} página{aberto.total === 1 ? "" : "s"}</span>}
      </div>

      {aberto && (
        <div className="linha">
          <div>
            <label htmlFor="pdf-de">Da página</label>
            <input id="pdf-de" type="number" inputMode="numeric" min={1} max={aberto.total} value={de} onChange={(e) => setDe(Number(e.target.value))} />
          </div>
          <div>
            <label htmlFor="pdf-ate">Até a página</label>
            <input id="pdf-ate" type="number" inputMode="numeric" min={1} max={aberto.total} value={ate} onChange={(e) => setAte(Number(e.target.value))} />
          </div>
        </div>
      )}
      {aberto && (
        <div className="acoes">
          {!ocupadoAqui && (
            <button className={paginas ? "btn" : "btn primario"} onClick={extrair} disabled={ocupado}>
              {paginas ? "Extrair de novo" : "Extrair texto"}
            </button>
          )}
          {!ocupadoAqui && semTexto.length > 0 && (
            <button className="btn" onClick={lerEscaneadas} disabled={ocupado}>
              Ler {Math.min(semTexto.length, MAX_FOTOS)} página(s) escaneada(s) com IA
            </button>
          )}
          {ocupadoAqui && <button className="btn" onClick={() => controle.current?.abort()}>Parar</button>}
        </div>
      )}
      {trabalhando && <p className="aviso" aria-live="polite">{trabalhando}</p>}
      {!trabalhando && aviso && <p className={aviso.erro ? "aviso erro" : "aviso"} aria-live="polite">{aviso.msg}</p>}
      {paginas && (
        <div>
          <label htmlFor="texto-pdf">Confira o texto extraído</label>
          <p className="dica">Apague o que não interessa (sumário, referências) e corrija o que vier quebrado.</p>
          <textarea id="texto-pdf" className="alto" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <p className="dica">{texto.length.toLocaleString("pt-BR")} de {LIMITE_TEXTO.toLocaleString("pt-BR")} caracteres</p>
        </div>
      )}
    </div>
  );
}
