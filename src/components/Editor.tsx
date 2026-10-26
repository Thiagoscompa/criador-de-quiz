import { useState } from "react";
import type { PerguntaSalva, QuizGuardado } from "../lib/armazenamento";
import { problemaDaPergunta } from "../lib/editar";
import { LACUNA, NOMES_TIPO, OPCOES_VF, tipoDe } from "../lib/quiz";

const LETRAS = "ABCDEF";

interface Props {
  quiz: QuizGuardado;
  aoSalvar: (quiz: QuizGuardado) => void;
  aoCancelar: () => void;
  aoApagarQuiz: () => void;
}

export function Editor({ quiz, aoSalvar, aoCancelar, aoApagarQuiz }: Props) {
  const [tema, setTema] = useState(quiz.tema);
  const [perguntas, setPerguntas] = useState<PerguntaSalva[]>(quiz.perguntas);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function alterar(id: string, mudanca: Partial<PerguntaSalva>) {
    setPerguntas((atuais) => atuais.map((p) => (p.id === id ? { ...p, ...mudanca } : p)));
  }

  function alterarOpcao(p: PerguntaSalva, i: number, valor: string) {
    alterar(p.id, { opcoes: p.opcoes.map((o, j) => (j === i ? valor : o)) });
  }

  function salvar() {
    if (perguntas.length === 0) return setErro("O quiz precisa de pelo menos uma pergunta. Para tirar o quiz todo, use Apagar quiz.");
    for (const [i, p] of perguntas.entries()) {
      const problema = problemaDaPergunta(p);
      if (problema) return setErro(`Pergunta ${i + 1}: ${problema}.`);
    }
    // Tira alternativas vazias e reajusta o índice da certa.
    const limpas = perguntas.map((p) => {
      const comum = { ...p, pergunta: p.pergunta.trim(), explicacao: p.explicacao.trim(), resposta: p.resposta?.trim() };
      if (tipoDe(p) !== "multipla") return comum;
      const certa = p.opcoes[p.correta];
      const opcoes = p.opcoes.map((o) => o.trim()).filter(Boolean);
      return { ...comum, opcoes, correta: opcoes.indexOf(certa.trim()) };
    });
    aoSalvar({ tema: tema.trim() || quiz.tema, perguntas: limpas });
  }

  return (
    <section className="folha">
      <h2>Editar quiz</h2>
      <div>
        <label htmlFor="editor-tema">Título</label>
        <input id="editor-tema" type="text" value={tema} onChange={(e) => setTema(e.target.value)} />
      </div>

      <ol className="editor-lista">
        {perguntas.map((p, n) => (
          <li key={p.id} className="editor-item">
            <div className="editor-topo">
              <span className="etiqueta">Pergunta {n + 1} · {NOMES_TIPO[tipoDe(p)]}</span>
              <button className="btn mini" onClick={() => setPerguntas((a) => a.filter((q) => q.id !== p.id))}>Apagar pergunta</button>
            </div>
            <textarea
              id={`enunciado-${p.id}`}
              aria-label={`Enunciado da pergunta ${n + 1}`}
              className="baixo"
              value={p.pergunta}
              onChange={(e) => alterar(p.id, { pergunta: e.target.value })}
            />
            {tipoDe(p) === "multipla" && (
              <fieldset className="editor-opcoes">
                <legend className="pequeno">Alternativas (marque a certa)</legend>
                {p.opcoes.map((o, i) => (
                  <div key={i} className="editor-opcao">
                    <input
                      type="radio"
                      id={`certa-${p.id}-${i}`}
                      name={`certa-${p.id}`}
                      checked={p.correta === i}
                      onChange={() => alterar(p.id, { correta: i })}
                      aria-label={`Marcar ${LETRAS[i]} como certa`}
                    />
                    <span className="letra">{LETRAS[i]}</span>
                    <input
                      type="text"
                      id={`opcao-${p.id}-${i}`}
                      aria-label={`Alternativa ${LETRAS[i]}`}
                      value={o}
                      onChange={(e) => alterarOpcao(p, i, e.target.value)}
                    />
                  </div>
                ))}
              </fieldset>
            )}
            {tipoDe(p) === "vf" && (
              <fieldset className="editor-opcoes">
                <legend className="pequeno">A afirmação é</legend>
                {OPCOES_VF.map((o, i) => (
                  <label key={o} className="editor-opcao pequeno">
                    <input type="radio" name={`certa-${p.id}`} checked={p.correta === i} onChange={() => alterar(p.id, { correta: i })} />
                    {o}
                  </label>
                ))}
              </fieldset>
            )}
            {(tipoDe(p) === "lacuna" || tipoDe(p) === "flashcard") && (
              <div>
                <label htmlFor={`resposta-${p.id}`}>{tipoDe(p) === "lacuna" ? "Palavra que falta" : "Verso do cartão"}</label>
                <input
                  type="text"
                  id={`resposta-${p.id}`}
                  value={p.resposta ?? ""}
                  onChange={(e) => alterar(p.id, { resposta: e.target.value })}
                />
                {tipoDe(p) === "lacuna" && <p className="dica">Na frase, a lacuna é marcada com {LACUNA}.</p>}
              </div>
            )}
            <label htmlFor={`explicacao-${p.id}`}>Explicação</label>
            <textarea
              id={`explicacao-${p.id}`}
              className="baixo"
              value={p.explicacao}
              onChange={(e) => alterar(p.id, { explicacao: e.target.value })}
            />
          </li>
        ))}
      </ol>

      {erro && <p className="aviso erro" aria-live="polite">{erro}</p>}
      <div className="acoes">
        <button className="btn primario" onClick={salvar}>Salvar</button>
        <button className="btn" onClick={aoCancelar}>Cancelar</button>
        {confirmarApagar ? (
          <>
            <span className="pequeno">Apagar o quiz e o histórico de revisão dele?</span>
            <button className="btn perigo" onClick={aoApagarQuiz}>Sim, apagar</button>
            <button className="btn" onClick={() => setConfirmarApagar(false)}>Não</button>
          </>
        ) : (
          <button className="btn" onClick={() => setConfirmarApagar(true)}>Apagar quiz</button>
        )}
      </div>
    </section>
  );
}
