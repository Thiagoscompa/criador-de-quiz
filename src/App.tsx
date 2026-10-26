import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Backup } from "./components/Backup";
import { Conta } from "./components/Conta";
import { Criar, type InfoRevisao } from "./components/Criar";
import { DesafioInicio, LinkDesafio, Placar } from "./components/Desafio";
import { Editor } from "./components/Editor";
import { Meta } from "./components/Meta";
import { Painel } from "./components/Painel";
import { Responder } from "./components/Responder";
import { Resultado } from "./components/Resultado";
import { desempenho, estudo, historico, revisao, salvos as armazenados, type QuizSalvo } from "./lib/armazenamento";
import { buscarDesafio, criarDesafio, entrarNoPlacar, idDaUrl, PARAMETRO_URL } from "./lib/desafio";
import { calcularSequencia } from "./lib/meta";
import { montarPainel } from "./lib/painel";
import type { Quiz, Resposta } from "./lib/quiz";
import { chave, hoje, proximaData, separarChave, vencidas } from "./lib/revisao";
import { iniciarSincronizacao, statusSync, type EstadoSync } from "./lib/sincronizar";
import { supabase } from "./lib/supabase";

const MAX_POR_REVISAO = 20;
const MAX_POR_REFORCO = 10;

// "chaves" liga cada pergunta à agenda de revisão; null = não entra na revisão (quiz de exemplo, desafio).
interface Sessao {
  quiz: Quiz;
  chaves: (string | null)[];
  salvoId: string | null;
  // Presente quando é um desafio recebido por link: vale para o placar.
  desafio?: { id: string; nome: string };
}

type Tela =
  | { nome: "criar" }
  | { nome: "responder"; sessao: Sessao; fila: number[]; rodada: number; inicio?: number }
  | { nome: "resultado"; sessao: Sessao; respostas: Resposta[]; noPlacar: boolean }
  | { nome: "editar"; salvo: QuizSalvo }
  | { nome: "painel" }
  | { nome: "desafio"; id: string; quiz: Quiz | null; erro: string | null };

function sessaoDoSalvo(s: QuizSalvo): Sessao {
  return { quiz: s.quiz, chaves: s.quiz.perguntas.map((p) => chave(s.id, p.id)), salvoId: s.id };
}

function lerRevisao(): InfoRevisao {
  const agendas = revisao.agendas();
  return { vencidas: vencidas(agendas).length, agendadas: Object.keys(agendas).length, proxima: proximaData(agendas) };
}

function telaInicial(): Tela {
  const id = supabase ? idDaUrl() : null;
  return id ? { nome: "desafio", id, quiz: null, erro: null } : { nome: "criar" };
}

export default function App() {
  const [tela, setTela] = useState<Tela>(telaInicial);
  const [salvos, setSalvos] = useState(() => armazenados.listar());
  const [tentativas, setTentativas] = useState(() => historico.listar());
  const [infoRevisao, setInfoRevisao] = useState(lerRevisao);
  const [sequencia, setSequencia] = useState(() => calcularSequencia(estudo.ler()));
  const [sessaoLogin, setSessaoLogin] = useState<Session | null>(null);
  const [sync, setSync] = useState<EstadoSync>({ tipo: "desligado" });
  const [conta, setConta] = useState<{ motivo: string | null } | null>(null);
  const [linkCriado, setLinkCriado] = useState<{ tema: string; id: string } | null>(null);
  const [avisoTopo, setAvisoTopo] = useState<string | null>(null);
  const [envio, setEnvio] = useState<{ meuId: number | null; erro: string | null }>({ meuId: null, erro: null });

  function atualizarListas() {
    setSalvos(armazenados.listar());
    setInfoRevisao(lerRevisao());
  }

  function atualizarTudo() {
    atualizarListas();
    setTentativas(historico.listar());
    setSequencia(calcularSequencia(estudo.ler()));
  }

  // Login: acompanha a sessão do Supabase (inclusive a volta do link do e-mail ou do Google).
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSessaoLogin(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, sessao) => setSessaoLogin(sessao));
    return () => data.subscription.unsubscribe();
  }, []);

  const usuarioId = sessaoLogin?.user.id;
  // A sincronização recomeça só quando muda a pessoa, não a cada renovação do token.
  useEffect(() => {
    if (usuarioId) return iniciarSincronizacao(usuarioId, setSync, atualizarTudo);
  }, [usuarioId]);
  const estadoSync: EstadoSync = sessaoLogin ? sync : { tipo: "desligado" };

  // Desafio aberto por link: carrega o quiz compartilhado.
  const desafioCarregando = tela.nome === "desafio" && !tela.quiz && !tela.erro ? tela.id : null;
  useEffect(() => {
    if (!desafioCarregando) return;
    buscarDesafio(desafioCarregando)
      .then((quiz) =>
        setTela({ nome: "desafio", id: desafioCarregando, quiz, erro: quiz ? null : "Este desafio não existe mais ou o link está incompleto." }),
      )
      .catch((e: Error) => setTela({ nome: "desafio", id: desafioCarregando, quiz: null, erro: e.message }));
  }, [desafioCarregando]);

  function irPara(t: Tela) {
    setTela(t);
    window.scrollTo({ top: 0 });
  }

  function irParaInicio() {
    // Tira o ?desafio= da barra de endereço para não reabrir o desafio ao recarregar.
    if (new URLSearchParams(window.location.search).has(PARAMETRO_URL)) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    irPara({ nome: "criar" });
  }

  function comecar(sessao: Sessao, fila = sessao.quiz.perguntas.map((_, i) => i)) {
    // "rodada" força o Responder a recomeçar do zero ao refazer o mesmo quiz.
    irPara({ nome: "responder", sessao, fila, rodada: Date.now(), inicio: sessao.desafio ? Date.now() : undefined });
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

  // Reforço de um assunto fraco: as perguntas com menor facilidade (as mais erradas) primeiro.
  function aoReforcar(quizId: string) {
    const salvo = armazenados.buscar(quizId);
    if (!salvo) return;
    const sessao = sessaoDoSalvo(salvo);
    const agendas = revisao.agendas();
    const peso = (i: number) => agendas[sessao.chaves[i]!]?.facilidade ?? 2.5;
    const fila = salvo.quiz.perguntas.map((_, i) => i).sort((a, b) => peso(a) - peso(b)).slice(0, MAX_POR_REFORCO);
    comecar(sessao, fila);
  }

  function registrarDesempenho(sessao: Sessao, respostas: Resposta[]) {
    const nomes = new Map(salvos.map((s) => [s.id, s.quiz.tema]));
    const partes = new Map<string, { quizId: string | null; tema: string; acertos: number; total: number }>();
    for (const r of respostas) {
      const c = sessao.chaves[r.indice];
      const quizId = c ? separarChave(c).quizId : null;
      const k = quizId ?? "";
      const parte = partes.get(k) ?? { quizId, tema: (quizId && nomes.get(quizId)) || sessao.quiz.tema, acertos: 0, total: 0 };
      parte.total++;
      if (r.certo) parte.acertos++;
      partes.set(k, parte);
    }
    desempenho.registrar([...partes.values()]);
  }

  function aoTerminar(sessao: Sessao, respostas: Resposta[], inicio?: number) {
    revisao.registrar(
      respostas.flatMap((r) => {
        const c = sessao.chaves[r.indice];
        return c ? [{ chave: c, certo: r.certo }] : [];
      }),
    );
    const acertos = respostas.filter((r) => r.certo).length;
    historico.adicionar({ tema: sessao.quiz.tema, acertos, total: respostas.length, quando: Date.now() });
    registrarDesempenho(sessao, respostas);
    estudo.registrar(respostas.length);
    setTentativas(historico.listar());
    setInfoRevisao(lerRevisao());
    setSequencia(calcularSequencia(estudo.ler()));

    // Só a rodada completa de um desafio, com relógio, entra no placar.
    const noPlacar = !!sessao.desafio && inicio !== undefined && respostas.length === sessao.quiz.perguntas.length;
    setEnvio({ meuId: null, erro: null });
    if (noPlacar) {
      entrarNoPlacar(sessao.desafio!.id, sessao.desafio!.nome, acertos, respostas.length, Date.now() - inicio)
        .then((meuId) => setEnvio({ meuId, erro: null }))
        .catch((e: Error) => setEnvio({ meuId: null, erro: e.message }));
    }
    irPara({ nome: "resultado", sessao, respostas, noPlacar });
  }

  function aoEditarSalvo(id: string) {
    const salvo = armazenados.buscar(id);
    if (salvo) irPara({ nome: "editar", salvo });
  }

  async function aoDesafiar(id: string) {
    const salvo = armazenados.buscar(id);
    if (!salvo) return;
    if (!sessaoLogin) {
      setConta({ motivo: "Entre na sua conta para criar o link do desafio. Quem recebe o link não precisa de conta." });
      window.scrollTo({ top: 0 });
      return;
    }
    setAvisoTopo("Criando o link…");
    try {
      setLinkCriado({ tema: salvo.quiz.tema, id: await criarDesafio(salvo.quiz) });
      setAvisoTopo(null);
    } catch (e) {
      setAvisoTopo(e instanceof Error ? e.message : "Algo deu errado.");
    }
    window.scrollTo({ top: 0 });
  }

  function salvarDesafio(quiz: Quiz) {
    armazenados.adicionar({ tema: quiz.tema, perguntas: quiz.perguntas });
    atualizarListas();
    irParaInicio();
  }

  return (
    <div className="pagina">
      <header>
        <h1>Caderno de <span className="marca">Quiz</span></h1>
        {supabase ? (
          <div className="cabeca-acoes">
            {sessaoLogin && <span className="etiqueta" title={statusSync(estadoSync)}>{estadoSync.tipo === "erro" ? "sem sincronizar" : "sincronizado"}</span>}
            <button className="btn mini" onClick={() => setConta(conta ? null : { motivo: null })}>
              {sessaoLogin ? "Minha conta" : "Entrar"}
            </button>
          </div>
        ) : (
          <span className="etiqueta">estude · responda · revise</span>
        )}
      </header>

      {conta && <Conta sessao={sessaoLogin} sync={estadoSync} motivo={conta.motivo} aoFechar={() => setConta(null)} />}

      {tela.nome === "criar" && linkCriado && <LinkDesafio tema={linkCriado.tema} id={linkCriado.id} aoFechar={() => setLinkCriado(null)} />}
      {tela.nome === "criar" && avisoTopo && <p className="aviso" aria-live="polite">{avisoTopo}</p>}

      {tela.nome === "criar" && (
        <Meta
          sequencia={sequencia}
          aoMudarMeta={(meta) => {
            estudo.definirMeta(meta);
            setSequencia(calcularSequencia(estudo.ler()));
          }}
          aoVerDesempenho={() => irPara({ nome: "painel" })}
        />
      )}

      {tela.nome === "criar" && (
        <Criar
          aoComecar={aoComecar}
          aoAbrirSalvo={aoAbrirSalvo}
          aoEditarSalvo={aoEditarSalvo}
          aoRevisar={aoRevisar}
          aoDesafiar={supabase ? aoDesafiar : undefined}
          salvos={salvos}
          tentativas={tentativas}
          revisao={infoRevisao}
        />
      )}

      {tela.nome === "criar" && <Backup aoImportar={atualizarTudo} logado={!!sessaoLogin} />}

      {tela.nome === "painel" && (
        <Painel
          painel={montarPainel(desempenho.listar(), salvos, hoje())}
          aoReforcar={aoReforcar}
          aoVoltar={() => irPara({ nome: "criar" })}
        />
      )}

      {tela.nome === "desafio" && !tela.quiz && (
        <section className="folha">
          <span className="etiqueta">Desafio</span>
          {tela.erro ? <p className="aviso erro">{tela.erro}</p> : <p className="pequeno">Carregando o desafio…</p>}
          {tela.erro && <div className="acoes"><button className="btn" onClick={irParaInicio}>Ir para o início</button></div>}
        </section>
      )}

      {tela.nome === "desafio" && tela.quiz && (
        <DesafioInicio
          quiz={tela.quiz}
          aoSair={irParaInicio}
          aoComecar={(nome) =>
            comecar({ quiz: tela.quiz!, chaves: tela.quiz!.perguntas.map(() => null), salvoId: null, desafio: { id: tela.id, nome } })
          }
        />
      )}

      {tela.nome === "responder" && (
        <Responder
          key={tela.rodada}
          quiz={tela.sessao.quiz}
          fila={tela.fila}
          inicio={tela.inicio}
          aoTerminar={(r) => aoTerminar(tela.sessao, r, tela.inicio)}
          aoSair={irParaInicio}
        />
      )}

      {tela.nome === "resultado" && (
        <Resultado
          quiz={tela.sessao.quiz}
          respostas={tela.respostas}
          aoRefazerErradas={() =>
            // Refazer as erradas é treino: fica fora do placar.
            comecar({ ...tela.sessao, desafio: undefined }, tela.respostas.filter((r) => !r.certo).map((r) => r.indice))
          }
          aoRefazer={() => comecar(tela.sessao)}
          aoNovo={tela.sessao.desafio ? () => salvarDesafio(tela.sessao.quiz) : irParaInicio}
          rotuloNovo={tela.sessao.desafio ? "Salvar nos meus quizzes" : "Novo quiz"}
          aoEditar={tela.sessao.salvoId ? () => aoEditarSalvo(tela.sessao.salvoId!) : undefined}
        >
          {tela.noPlacar && tela.sessao.desafio && (
            <Placar desafioId={tela.sessao.desafio.id} meuId={envio.meuId} erroEnvio={envio.erro} />
          )}
        </Resultado>
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
