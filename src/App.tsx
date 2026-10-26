import { useState } from "react";
import { Criar, type InfoRevisao } from "./components/Criar";
import { Editor } from "./components/Editor";
import { Responder } from "./components/Responder";
import { Resultado } from "./components/Resultado";
import { historico, revisao, salvos as armazenados, type QuizSalvo } from "./lib/armazenamento";
import type { Quiz, Resposta } from "./lib/quiz";
import { chave, proximaData, vencidas } from "./lib/revisao";

const MAX_POR_REVISAO = 20;

// "chaves" liga cada pergunta à agenda de revisão; null = não entra na revisão (quiz de exemplo).
interface Sessao {
  quiz: Quiz;
  chaves: (string | null)[];
  salvoId: string | null;
}

type Tela =
  | { nome: "criar" }
  | { nome: "responder"; sessao: Sessao; fila: number[]; rodada: number }
  | { nome: "resultado"; sessao: Sessao; respostas: Resposta[] }
  | { nome: "editar"; salvo: QuizSalvo };

function sessaoDoSalvo(s: QuizSalvo): Sessao {
  return { quiz: s.quiz, chaves: s.quiz.perguntas.map((p) => chave(s.id, p.id)), salvoId: s.id };
}

function lerRevisao(): InfoRevisao {
  const agendas = revisao.agendas();
  return { vencidas: vencidas(agendas).length, agendadas: Object.keys(agendas).length, proxima: proximaData(agendas) };
}

export default function App() {
  const [tela, setTela] = useState<Tela>({ nome: "criar" });
  const [salvos, setSalvos] = useState(() => armazenados.listar());
  const [tentativas, setTentativas] = useState(() => historico.listar());
  const [infoRevisao, setInfoRevisao] = useState(lerRevisao);

  function atualizarListas() {
    setSalvos(armazenados.listar());
    setInfoRevisao(lerRevisao());
  }

  function irPara(t: Tela) {
    setTela(t);
    window.scrollTo({ top: 0 });
  }

  function comecar(sessao: Sessao, fila = sessao.quiz.perguntas.map((_, i) => i)) {
    // "rodada" força o Responder a recomeçar do zero ao refazer o mesmo quiz.
    irPara({ nome: "responder", sessao, fila, rodada: Date.now() });
  }

  function aoComecar(quiz: Quiz, salvar: boolean) {
    if (!salvar) return comecar({ quiz, chaves: quiz.perguntas.map(() => null), salvoId: null });
    const salvo = armazenados.adicionar(quiz);
    atualizarListas();
    comecar(sessaoDoSalvo(salvo));
  }

  function aoAbrirSalvo(id: string) {
    const salvo = armazenados.buscar(id);
    if (salvo) comecar(sessaoDoSalvo(salvo));
  }

  function aoRevisar() {
    const { quiz, chaves } = revisao.montarSessao(vencidas(revisao.agendas()).slice(0, MAX_POR_REVISAO));
    if (quiz.perguntas.length) comecar({ quiz, chaves, salvoId: null });
    else atualizarListas();
  }

  function aoTerminar(sessao: Sessao, respostas: Resposta[]) {
    revisao.registrar(
      respostas.flatMap((r) => {
        const c = sessao.chaves[r.indice];
        return c ? [{ chave: c, certo: r.certo }] : [];
      }),
    );
    historico.adicionar({
      tema: sessao.quiz.tema,
      acertos: respostas.filter((r) => r.certo).length,
      total: respostas.length,
      quando: Date.now(),
    });
    setTentativas(historico.listar());
    setInfoRevisao(lerRevisao());
    irPara({ nome: "resultado", sessao, respostas });
  }

  function aoEditarSalvo(id: string) {
    const salvo = armazenados.buscar(id);
    if (salvo) irPara({ nome: "editar", salvo });
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
          aoAbrirSalvo={aoAbrirSalvo}
          aoEditarSalvo={aoEditarSalvo}
          aoRevisar={aoRevisar}
          salvos={salvos}
          tentativas={tentativas}
          revisao={infoRevisao}
        />
      )}

      {tela.nome === "responder" && (
        <Responder
          key={tela.rodada}
          quiz={tela.sessao.quiz}
          fila={tela.fila}
          aoTerminar={(r) => aoTerminar(tela.sessao, r)}
          aoSair={() => irPara({ nome: "criar" })}
        />
      )}

      {tela.nome === "resultado" && (
        <Resultado
          quiz={tela.sessao.quiz}
          respostas={tela.respostas}
          aoRefazerErradas={() => comecar(tela.sessao, tela.respostas.filter((r) => !r.certo).map((r) => r.indice))}
          aoRefazer={() => comecar(tela.sessao)}
          aoNovo={() => irPara({ nome: "criar" })}
          aoEditar={tela.sessao.salvoId ? () => aoEditarSalvo(tela.sessao.salvoId!) : undefined}
        />
      )}

      {tela.nome === "editar" && (
        <Editor
          key={tela.salvo.id}
          quiz={tela.salvo.quiz}
          aoSalvar={(quiz) => {
            armazenados.atualizar(tela.salvo.id, quiz);
            atualizarListas();
            irPara({ nome: "criar" });
          }}
          aoCancelar={() => irPara({ nome: "criar" })}
          aoApagarQuiz={() => {
            armazenados.remover(tela.salvo.id);
            atualizarListas();
            irPara({ nome: "criar" });
          }}
        />
      )}
    </div>
  );
}
