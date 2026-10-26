import type { ReactNode } from "react";
import { mensagemResultado, percentual, respostaCerta, respostaDoAluno, tipoDe, type Quiz, type Resposta } from "../lib/quiz";

interface Props {
  quiz: Quiz;
  respostas: Resposta[];
  aoRefazerErradas: () => void;
  aoRefazer: () => void;
  aoNovo: () => void;
  aoEditar?: () => void;
  // Conteúdo extra abaixo do placar (o ranking, num desafio).
  children?: ReactNode;
  rotuloNovo?: string;
}

export function Resultado({ quiz, respostas, aoRefazerErradas, aoRefazer, aoNovo, aoEditar, children, rotuloNovo = "Novo quiz" }: Props) {
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
        <button className="btn" onClick={aoNovo}>{rotuloNovo}</button>
        {aoEditar && <button className="btn" onClick={aoEditar}>Corrigir perguntas</button>}
      </div>
      {children}
      <span className="rotulo">Revisão</span>
      <ul className="revisao">
        {respostas.map((r) => {
          const p = quiz.perguntas[r.indice];
          const cartao = tipoDe(p) === "flashcard";
          return (
            <li key={r.indice}>
              <span className={r.certo ? "chip ok" : "chip ruim"}>
                {cartao ? (r.certo ? "lembrou" : "não lembrou") : r.certo ? "acertou" : "errou"}
              </span>
              <b>{p.pergunta}</b>
              <span className="pequeno">
                {r.certo || cartao
                  ? `Resposta: ${respostaCerta(p)}`
                  : `Você respondeu: ${respostaDoAluno(p, r)} · Certa: ${respostaCerta(p)}`}
              </span>
              {p.explicacao && <span className="pequeno">{p.explicacao}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
