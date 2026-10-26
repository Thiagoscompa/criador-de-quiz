import { useEffect, useRef, useState } from "react";
import type { Quiz, Resposta } from "../lib/quiz";

const LETRAS = "ABCDEF";

interface Props {
  quiz: Quiz;
  fila: number[];
  aoTerminar: (respostas: Resposta[]) => void;
  aoSair: () => void;
}

export function Responder({ quiz, fila, aoTerminar, aoSair }: Props) {
  const [pos, setPos] = useState(0);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const proxima = useRef<HTMLButtonElement>(null);

  const indice = fila[pos];
  const p = quiz.perguntas[indice];
  const atual = respostas[pos];
  const acertos = respostas.filter((r) => r.certo).length;

  useEffect(() => {
    if (atual) proxima.current?.focus();
  }, [atual]);

  function responder(escolhida: number) {
    if (atual) return;
    setRespostas([...respostas, { indice, escolhida, certo: escolhida === p.correta }]);
  }

  function avancar() {
    if (pos + 1 < fila.length) setPos(pos + 1);
    else aoTerminar(respostas);
  }

  return (
    <section className="folha">
      <div className="progresso">
        <span>{pos + 1}/{fila.length}</span>
        <div className="barra"><i style={{ width: `${(pos / fila.length) * 100}%` }} /></div>
        <span>{acertos} acerto{acertos === 1 ? "" : "s"}</span>
      </div>
      <span className="etiqueta">{quiz.tema}</span>
      <h2>{p.pergunta}</h2>
      <ul className="opcoes">
        {p.opcoes.map((texto, i) => {
          let classe = "opcao";
          if (atual && i === p.correta) classe += " certa";
          else if (atual && i === atual.escolhida) classe += " errada";
          return (
            <li key={i}>
              <button className={classe} disabled={!!atual} onClick={() => responder(i)}>
                <span className="letra">{LETRAS[i]}</span>
                <span>{texto}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {atual && (
        <div className="explicacao">
          <strong className={atual.certo ? "ok" : "ruim"}>
            {atual.certo ? "Certo!" : `Não foi dessa vez. A resposta é ${LETRAS[p.correta]}.`}
          </strong>
          <span>{p.explicacao}</span>
        </div>
      )}
      <div className="acoes">
        {atual && (
          <button ref={proxima} className="btn primario" onClick={avancar}>
            {pos + 1 < fila.length ? "Próxima" : "Ver resultado"}
          </button>
        )}
        <button className="btn" onClick={aoSair}>Sair do quiz</button>
      </div>
    </section>
  );
}
