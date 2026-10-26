import { useRef, useState } from "react";
import { lerFotos, type PaginaLida } from "../lib/api";
import { MAX_BYTES_ENVIO, MAX_FOTOS } from "../lib/fotos";
import { reduzirImagem } from "../lib/imagem";

interface Foto {
  id: string;
  dataUrl: string;
}

interface Props {
  texto: string;
  setTexto: (t: string) => void;
  ocupado: boolean;
}

// Etapa 1: escolher as fotos. Etapa 2: conferir e corrigir o texto lido antes de gerar o quiz.
export function Fotos({ texto, setTexto, ocupado }: Props) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [paginas, setPaginas] = useState<PaginaLida[] | null>(null);
  const [lendo, setLendo] = useState(false);
  const [aviso, setAviso] = useState<{ msg: string; erro: boolean } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const controle = useRef<AbortController | null>(null);

  async function adicionar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    const espaco = MAX_FOTOS - fotos.length;
    const escolhidos = [...arquivos].slice(0, espaco);
    const novas: Foto[] = [];
    let falhas = 0;
    for (const arquivo of escolhidos) {
      try {
        novas.push({ id: crypto.randomUUID(), dataUrl: await reduzirImagem(arquivo) });
      } catch {
        falhas++;
      }
    }
    setFotos((atuais) => [...atuais, ...novas]);
    setPaginas(null);
    const avisos = [];
    if (arquivos.length > espaco) avisos.push(`Só cabem ${MAX_FOTOS} fotos por quiz.`);
    if (falhas) avisos.push(`${falhas} arquivo(s) não puderam ser abertos. Use fotos em JPEG ou PNG.`);
    setAviso(avisos.length ? { msg: avisos.join(" "), erro: true } : null);
    if (entrada.current) entrada.current.value = "";
  }

  function remover(id: string) {
    setFotos((atuais) => atuais.filter((f) => f.id !== id));
    setPaginas(null);
  }

  async function ler() {
    const tamanho = fotos.reduce((soma, f) => soma + f.dataUrl.length, 0);
    if (tamanho > MAX_BYTES_ENVIO) {
      setAviso({ msg: "As fotos passam do limite de envio. Remova algumas e tente de novo.", erro: true });
      return;
    }
    controle.current = new AbortController();
    setLendo(true);
    setAviso({ msg: "Lendo as fotos… isso pode levar até um minuto.", erro: false });
    try {
      const lidas = await lerFotos(fotos.map((f) => f.dataUrl), controle.current.signal);
      setPaginas(lidas);
      setTexto(lidas.map((p) => p.texto).filter(Boolean).join("\n\n"));
      const ruins = lidas.flatMap((p, i) => (p.legivel ? [] : [`foto ${i + 1}: ${p.problema || "não deu para ler"}`]));
      if (ruins.length === lidas.length) setAviso({ msg: "Não consegui ler nenhuma foto. Tente com mais luz e a página inteira no quadro.", erro: true });
      else if (ruins.length) setAviso({ msg: `Algumas fotos ficaram de fora (${ruins.join("; ")}).`, erro: true });
      else setAviso(null);
    } catch (e) {
      if (controle.current?.signal.aborted) setAviso({ msg: "Leitura interrompida.", erro: false });
      else setAviso({ msg: e instanceof Error ? e.message : "Algo deu errado.", erro: true });
    } finally {
      setLendo(false);
    }
  }

  return (
    <div className="fotos">
      <div>
        <label htmlFor="fotos-entrada">Fotos do material ({fotos.length} de {MAX_FOTOS})</label>
        <p className="dica">Tire fotos das páginas, com boa luz e a página inteira no quadro.</p>
      </div>
      {fotos.length > 0 && (
        <ul className="miniaturas">
          {fotos.map((f, i) => (
            <li key={f.id}>
              <img src={f.dataUrl} alt={`Foto ${i + 1}`} />
              <span className="numero">{i + 1}</span>
              <button className="remover" onClick={() => remover(f.id)} disabled={lendo} aria-label={`Remover foto ${i + 1}`}>×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="acoes">
        <input
          ref={entrada}
          id="fotos-entrada"
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => adicionar(e.target.files)}
        />
        <button className="btn" onClick={() => entrada.current?.click()} disabled={lendo || fotos.length >= MAX_FOTOS}>
          {fotos.length ? "Adicionar fotos" : "Tirar ou escolher fotos"}
        </button>
        {fotos.length > 0 && !lendo && (
          <button className={paginas ? "btn" : "btn primario"} onClick={ler} disabled={ocupado}>
            {paginas ? "Ler de novo" : "Ler fotos"}
          </button>
        )}
        {lendo && <button className="btn" onClick={() => controle.current?.abort()}>Parar</button>}
      </div>
      {aviso && <p className={aviso.erro ? "aviso erro" : "aviso"} aria-live="polite">{aviso.msg}</p>}
      {paginas && (
        <div>
          <label htmlFor="texto-lido">Confira o texto lido</label>
          <p className="dica">Corrija palavras lidas errado antes de gerar. As perguntas sairão só deste texto.</p>
          <textarea id="texto-lido" className="alto" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
      )}
    </div>
  );
}
