import { useState } from "react";
import { Criar } from "./components/Criar";
import { Responder } from "./components/Responder";
import { Resultado } from "./components/Resultado";
import { historico, salvos as armazenados } from "./lib/armazenamento";
import type { Quiz, Resposta } from "./lib/quiz";

type Tela =
  | { nome: "criar" }
  | { nome: "responder"; quiz: Quiz; fila: number[]; rodada: number }
  | { nome: "resultado"; quiz: Quiz; respostas: Resposta[] };

export default function App() {
  const [tela, setTela] = useState<Tela>({ nome: "criar" });
  const [salvos, setSalvos] = useState(() => armazenados.listar());
  const [tentativas, setTentativas] = useState(() => historico.listar());

  function comecar(quiz: Quiz, fila = quiz.perguntas.map((_, i) => i)) {
    // "rodada" força o Responder a recomeçar do zero ao refazer o mesmo quiz.
    setTela({ nome: "responder", quiz, fila, rodada: Date.now() });
    window.scrollTo({ top: 0 });
  }

  function aoComecar(quiz: Quiz, salvar: boolean) {
    if (salvar) {
      armazenados.adicionar(quiz);
      setSalvos(armazenados.listar());
    }
    comecar(quiz);
  }

  function aoTerminar(quiz: Quiz, respostas: Resposta[]) {
    historico.adicionar({
      tema: quiz.tema,
      acertos: respostas.filter((r) => r.certo).length,
      total: respostas.length,
      quando: Date.now(),
    });
    setTentativas(historico.listar());
    setTela({ nome: "resultado", quiz, respostas });
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="pagina">
      <header>
        <h1>Caderno de <span className="marca">Quiz</span></h1>
        <span className="etiqueta">estude · responda · revise</span>
      </header>

      {tela.nome === "criar" && (
        <Criar
          aoComecar={aoComecar}
          salvos={salvos}
          aoRemoverSalvo={(id) => {
            armazenados.remover(id);
            setSalvos(armazenados.listar());
          }}
          tentativas={tentativas}
        />
      )}

      {tela.nome === "responder" && (
        <Responder
          key={tela.rodada}
          quiz={tela.quiz}
          fila={tela.fila}
          aoTerminar={(r) => aoTerminar(tela.quiz, r)}
          aoSair={() => setTela({ nome: "criar" })}
        />
      )}

      {tela.nome === "resultado" && (
        <Resultado
          quiz={tela.quiz}
          respostas={tela.respostas}
          aoRefazerErradas={() => comecar(tela.quiz, tela.respostas.filter((r) => !r.certo).map((r) => r.indice))}
          aoRefazer={() => comecar(tela.quiz)}
          aoNovo={() => setTela({ nome: "criar" })}
        />
      )}
    </div>
  );
}
