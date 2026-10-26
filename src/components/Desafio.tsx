import { useEffect, useState } from "react";
import { formatarTempo, lerPlacar, linkDesafio, MAX_NOME, type LinhaPlacar } from "../lib/desafio";
import type { Quiz } from "../lib/quiz";

const CHAVE_NOME = "quiz:nome-desafio";

function nomeGuardado(): string {
  try {
    return localStorage.getItem(CHAVE_NOME) ?? "";
  } catch {
    return "";
  }
}

interface PropsInicio {
  quiz: Quiz;
  aoComecar: (nome: string) => void;
  aoSair: () => void;
}

export function DesafioInicio({ quiz, aoComecar, aoSair }: PropsInicio) {
  const [nome, setNome] = useState(nomeGuardado);

  function comecar() {
    const limpo = nome.trim();
    if (!limpo) return;
    try {
      localStorage.setItem(CHAVE_NOME, limpo);
    } catch {
      // sem problema
    }
    aoComecar(limpo);
  }

  return (
    <section className="folha">
      <span className="etiqueta">Desafio</span>
      <h2>{quiz.tema}</h2>
      <p className="pequeno">
        {quiz.perguntas.length} perguntas. O relógio corre do início ao fim, e o placar ordena por acertos e, no empate, pelo menor tempo.
      </p>
      <div>
        <label htmlFor="nome-desafio">Seu nome no placar</label>
        <input id="nome-desafio" type="text" value={nome} maxLength={MAX_NOME} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && comecar()} autoComplete="nickname" />
      </div>
      <div className="acoes">
        <button className="btn primario" onClick={comecar} disabled={!nome.trim()}>Começar</button>
        <button className="btn" onClick={aoSair}>Ir para o início</button>
      </div>
    </section>
  );
}

interface PropsPlacar {
  desafioId: string;
  // Linha de quem acabou de jogar, para destacar.
  meuId: number | null;
  erroEnvio: string | null;
}

export function Placar({ desafioId, meuId, erroEnvio }: PropsPlacar) {
  const [linhas, setLinhas] = useState<LinhaPlacar[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    lerPlacar(desafioId)
      .then((l) => ativo && setLinhas(l))
      .catch((e: Error) => ativo && setErro(e.message));
    return () => {
      ativo = false;
    };
  }, [desafioId, meuId]);

  return (
    <div className="placar-desafio">
      <span className="rotulo">Placar</span>
      {erroEnvio && <p className="aviso erro">{erroEnvio}</p>}
      {erro && <p className="aviso erro">{erro}</p>}
      {!linhas && !erro && <p className="pequeno">Carregando…</p>}
      {linhas && (
        <ol className="lista">
          {linhas.map((l, i) => (
            <li key={l.id} className={l.id === meuId ? "eu" : undefined}>
              <span className="mono posicao">{i + 1}º</span>
              <span>{l.nome}{l.id === meuId && " (você)"}</span>
              <span className="mono">{l.acertos}/{l.total}</span>
              <span className="mono pequeno">{formatarTempo(l.tempo_ms)}</span>
            </li>
          ))}
        </ol>
      )}
      {linhas && meuId !== null && !linhas.some((l) => l.id === meuId) && (
        <p className="pequeno">Seu resultado ficou fora dos {linhas.length} primeiros desta vez.</p>
      )}
    </div>
  );
}

interface PropsLink {
  tema: string;
  id: string;
  aoFechar: () => void;
}

export function LinkDesafio({ tema, id, aoFechar }: PropsLink) {
  const link = linkDesafio(id);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  async function enviar() {
    try {
      await navigator.share({ title: `Desafio: ${tema}`, text: `Consegue fazer mais pontos que eu em "${tema}"?`, url: link });
    } catch {
      // Cancelado pela pessoa.
    }
  }

  return (
    <section className="folha revisar">
      <div>
        <span className="rotulo">Desafio criado: {tema}</span>
        <p className="pequeno">Quem abrir o link responde sem criar conta e entra no placar. Só as perguntas são compartilhadas.</p>
        <input type="text" readOnly value={link} aria-label="Link do desafio" onFocus={(e) => e.target.select()} />
      </div>
      <div className="acoes">
        <button className="btn primario" onClick={copiar}>{copiado ? "Copiado!" : "Copiar link"}</button>
        {"share" in navigator && <button className="btn" onClick={enviar}>Enviar</button>}
        <button className="btn" onClick={aoFechar}>Fechar</button>
      </div>
    </section>
  );
}
