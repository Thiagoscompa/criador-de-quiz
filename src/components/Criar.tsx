import { useRef, useState } from "react";
import { pedirQuiz } from "../lib/api";
import { QUIZ_EXEMPLO } from "../lib/exemplo";
import type { QuizSalvo, Tentativa } from "../lib/armazenamento";
import { LIMITE_TEXTO, NIVEIS, NOMES_TIPO, QUANTIDADES, TIPOS, type Nivel, type Quiz, type Tipo } from "../lib/quiz";
import { Fotos } from "./Fotos";
import { Pdf } from "./Pdf";

export interface InfoRevisao {
  vencidas: number;
  agendadas: number;
  proxima: string | null;
}

interface Props {
  aoComecar: (quiz: Quiz, salvar: boolean) => void;
  aoAbrirSalvo: (id: string) => void;
  aoEditarSalvo: (id: string) => void;
  aoRevisar: () => void;
  // Ausente quando o compartilhamento não está configurado.
  aoDesafiar?: (id: string) => void;
  salvos: QuizSalvo[];
  tentativas: Tentativa[];
  revisao: InfoRevisao;
}

type Modo = "tema" | "texto" | "fotos" | "pdf";

const MODOS: Modo[] = ["tema", "texto", "fotos", "pdf"];
const NOMES_MODO: Record<Modo, string> = { tema: "Por tema", texto: "Colar texto", fotos: "Fotos", pdf: "PDF" };

function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function Criar(props: Props) {
  const { aoComecar, salvos, tentativas, revisao } = props;
  const [modo, setModo] = useState<Modo>("tema");
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [textoFotos, setTextoFotos] = useState("");
  const [textoPdf, setTextoPdf] = useState("");
  const [tipos, setTipos] = useState<Tipo[]>(["multipla"]);
  const [quantidade, setQuantidade] = useState<number>(8);
  const [nivel, setNivel] = useState<Nivel>("médio");
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<{ msg: string; erro: boolean } | null>(null);
  const controle = useRef<AbortController | null>(null);

  async function gerar() {
    const entrada = { tema, texto, fotos: textoFotos, pdf: textoPdf }[modo].trim();
    if (modo === "tema" && entrada.length < 2) return setAviso({ msg: "Escreva um tema primeiro.", erro: true });
    if (modo === "fotos" && !entrada) return setAviso({ msg: "Leia as fotos antes de gerar o quiz.", erro: true });
    if (modo === "pdf" && !entrada) return setAviso({ msg: "Extraia o texto do PDF antes de gerar o quiz.", erro: true });
    if (modo !== "tema" && entrada.length < 40) {
      return setAviso({ msg: "O texto está curto demais para um quiz. Use um trecho com pelo menos algumas frases.", erro: true });
    }
    controle.current = new AbortController();
    setGerando(true);
    setAviso({ msg: "Preparando as perguntas… isso pode levar até um minuto.", erro: false });
    try {
      const pedido =
        modo === "tema"
          ? { modo, tema: entrada, quantidade, nivel, tipos }
          : { modo: "texto" as const, texto: entrada.slice(0, LIMITE_TEXTO), quantidade, nivel, tipos };
      const quiz = await pedirQuiz(pedido, controle.current.signal);
      setAviso(null);
      aoComecar(quiz, true);
    } catch (e) {
      if (controle.current?.signal.aborted) setAviso({ msg: "Geração interrompida.", erro: false });
      else setAviso({ msg: e instanceof Error ? e.message : "Algo deu errado.", erro: true });
    } finally {
      setGerando(false);
    }
  }

  const podeGerar = (modo !== "fotos" || textoFotos.trim().length > 0) && (modo !== "pdf" || textoPdf.trim().length > 0);

  function alternarTipo(t: Tipo) {
    // Sempre sobra pelo menos um tipo marcado.
    setTipos((atuais) => (atuais.includes(t) ? (atuais.length > 1 ? atuais.filter((x) => x !== t) : atuais) : TIPOS.filter((x) => x === t || atuais.includes(x))));
  }

  return (
    <>
      {revisao.agendadas > 0 && (
        <section className="folha revisar">
          <div>
            <span className="rotulo">Revisar hoje</span>
            <p className="pequeno">
              {revisao.vencidas > 0
                ? `${revisao.vencidas} pergunta${revisao.vencidas === 1 ? "" : "s"} no ponto de revisar, escolhidas pelo que você errou e pelo tempo desde a última vez.`
                : `Nada para hoje.${revisao.proxima ? ` Próxima revisão em ${dataCurta(revisao.proxima)}.` : ""}`}
            </p>
          </div>
          {revisao.vencidas > 0 && (
            <button className="btn primario" onClick={props.aoRevisar}>Começar revisão</button>
          )}
        </section>
      )}

      <section className="folha">
        <h2>Monte um quiz para estudar</h2>
        <div className="abas" role="tablist">
          {MODOS.map((m) => (
            <button key={m} role="tab" aria-selected={modo === m} onClick={() => { setModo(m); setAviso(null); }}>
              {NOMES_MODO[m]}
            </button>
          ))}
        </div>

        {modo === "tema" && (
          <div>
            <label htmlFor="tema">Tema</label>
            <input
              id="tema"
              type="text"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !gerando && gerar()}
              placeholder="Ex.: Revolução Francesa, funções do 2º grau, verbos irregulares em inglês"
            />
          </div>
        )}
        {modo === "texto" && (
          <div>
            <label htmlFor="texto">Seu material de estudo</label>
            <textarea
              id="texto"
              value={texto}
              maxLength={LIMITE_TEXTO}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Cole aqui um resumo, trecho de livro ou anotações da aula. As perguntas serão feitas só a partir dele."
            />
            <p className="dica">{texto.length.toLocaleString("pt-BR")} de {LIMITE_TEXTO.toLocaleString("pt-BR")} caracteres</p>
          </div>
        )}
        {/* Fica montado ao trocar de aba para não perder as fotos já escolhidas. */}
        <div hidden={modo !== "fotos"}>
          <Fotos texto={textoFotos} setTexto={setTextoFotos} ocupado={gerando} />
        </div>
        <div hidden={modo !== "pdf"}>
          <Pdf texto={textoPdf} setTexto={setTextoPdf} ocupado={gerando} />
        </div>

        {podeGerar && (
          <>
            <div className="linha">
              <div>
                <label htmlFor="quantidade">Perguntas</label>
                <select id="quantidade" value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))}>
                  {QUANTIDADES.map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="nivel">Nível</label>
                <select id="nivel" value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)}>
                  {NIVEIS.map((n) => <option key={n} value={n}>{n[0].toUpperCase() + n.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <fieldset className="tipos">
              <legend className="rotulo">Tipos de pergunta</legend>
              {TIPOS.map((t) => (
                <label key={t} className="tipo">
                  <input type="checkbox" checked={tipos.includes(t)} onChange={() => alternarTipo(t)} />
                  {NOMES_TIPO[t]}
                </label>
              ))}
            </fieldset>

            <div className="acoes">
              <button className="btn primario" onClick={gerar} disabled={gerando}>
                {gerando ? "Gerando…" : "Gerar quiz"}
              </button>
              {gerando ? (
                <button className="btn" onClick={() => controle.current?.abort()}>Parar</button>
              ) : (
                modo !== "fotos" && modo !== "pdf" && <button className="btn" onClick={() => aoComecar(QUIZ_EXEMPLO, false)}>Usar quiz de exemplo</button>
              )}
            </div>
          </>
        )}
        {aviso && <p className={aviso.erro ? "aviso erro" : "aviso"} aria-live="polite">{aviso.msg}</p>}
      </section>

      {salvos.length > 0 && (
        <section className="folha">
          <span className="rotulo">Meus quizzes</span>
          <ul className="lista">
            {salvos.map((s) => (
              <li key={s.id}>
                <button className="link" onClick={() => props.aoAbrirSalvo(s.id)}>{s.quiz.tema}</button>
                <span className="pequeno">{s.quiz.perguntas.length} perguntas</span>
                <button className="btn mini" onClick={() => props.aoEditarSalvo(s.id)}>Editar</button>
                {props.aoDesafiar && <button className="btn mini" onClick={() => props.aoDesafiar!(s.id)}>Desafiar</button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tentativas.length > 0 && (
        <section className="folha">
          <span className="rotulo">Últimas tentativas</span>
          <ul className="lista">
            {tentativas.slice(0, 6).map((t) => (
              <li key={t.quando}>
                <span>{t.tema}</span>
                <span className="pequeno">{new Date(t.quando).toLocaleDateString("pt-BR")}</span>
                <span className="mono">{t.acertos}/{t.total}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
