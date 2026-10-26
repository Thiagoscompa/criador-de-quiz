import { mensagemResultado, percentual, type Quiz, type Resposta } from "../lib/quiz";

interface Props {
  quiz: Quiz;
  respostas: Resposta[];
  aoRefazerErradas: () => void;
  aoRefazer: () => void;
  aoNovo: () => void;
  aoEditar?: () => void;
}

export function Resultado({ quiz, respostas, aoRefazerErradas, aoRefazer, aoNovo, aoEditar }: Props) {
  const acertos = respostas.filter((r) => r.certo).length;
  const errou = acertos < respostas.length;

  return (
    <section className="folha">
      <span className="etiqueta">{quiz.tema}</span>
      <div className="placar">
        <b>{acertos}/{respostas.length}</b>
        <span>{mensagemResultado(percentual(respostas))}</span>
      </div>
      <div className="acoes">
        {errou && <button className="btn primario" onClick={aoRefazerErradas}>Refazer só as erradas</button>}
        <button className={errou ? "btn" : "btn primario"} onClick={aoRefazer}>Refazer tudo</button>
        <button className="btn" onClick={aoNovo}>Novo quiz</button>
        {aoEditar && <button className="btn" onClick={aoEditar}>Corrigir perguntas</button>}
      </div>
      <span className="rotulo">Revisão</span>
      <ul className="revisao">
        {respostas.map((r) => {
          const p = quiz.perguntas[r.indice];
          return (
            <li key={r.indice}>
              <span className={r.certo ? "chip ok" : "chip ruim"}>{r.certo ? "acertou" : "errou"}</span>
              <b>{p.pergunta}</b>
              <span className="pequeno">
                {r.certo
                  ? `Resposta: ${p.opcoes[p.correta]}`
                  : `Você marcou: ${p.opcoes[r.escolhida]} · Certa: ${p.opcoes[p.correta]}`}
              </span>
              <span className="pequeno">{p.explicacao}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
