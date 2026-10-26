import { useRef, useState } from "react";
import { pedirQuiz } from "../lib/api";
import { QUIZ_EXEMPLO } from "../lib/exemplo";
import type { QuizSalvo, Tentativa } from "../lib/armazenamento";
import { LIMITE_TEXTO, NIVEIS, QUANTIDADES, type Nivel, type Quiz } from "../lib/quiz";

interface Props {
  aoComecar: (quiz: Quiz, salvar: boolean) => void;
  salvos: QuizSalvo[];
  aoRemoverSalvo: (id: string) => void;
  tentativas: Tentativa[];
}

type Modo = "tema" | "texto";

export function Criar({ aoComecar, salvos, aoRemoverSalvo, tentativas }: Props) {
  const [modo, setModo] = useState<Modo>("tema");
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [quantidade, setQuantidade] = useState<number>(8);
  const [nivel, setNivel] = useState<Nivel>("médio");
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<{ msg: string; erro: boolean } | null>(null);
  const controle = useRef<AbortController | null>(null);

  async function gerar() {
    const entrada = modo === "tema" ? tema.trim() : texto.trim();
    if (modo === "tema" && entrada.length < 2) return setAviso({ msg: "Escreva um tema primeiro.", erro: true });
    if (modo === "texto" && entrada.length < 40) {
      return setAviso({ msg: "Cole um texto um pouco maior, com pelo menos algumas frases.", erro: true });
    }
    controle.current = new AbortController();
    setGerando(true);
    setAviso({ msg: "Preparando as perguntas… isso pode levar até um minuto.", erro: false });
    try {
      const pedido =
        modo === "tema"
          ? { modo, tema: entrada, quantidade, nivel }
          : { modo, texto: entrada, quantidade, nivel };
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

  return (
    <>
      <section className="folha">
        <h2>Monte um quiz para estudar</h2>
        <div className="abas" role="tablist">
          {(["tema", "texto"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={modo === m} onClick={() => setModo(m)}>
              {m === "tema" ? "Por tema" : "Colar texto"}
            </button>
          ))}
        </div>

        {modo === "tema" ? (
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
        ) : (
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

        <div className="acoes">
          <button className="btn primario" onClick={gerar} disabled={gerando}>
            {gerando ? "Gerando…" : "Gerar quiz"}
          </button>
          {gerando ? (
            <button className="btn" onClick={() => controle.current?.abort()}>Parar</button>
          ) : (
            <button className="btn" onClick={() => aoComecar(QUIZ_EXEMPLO, false)}>Usar quiz de exemplo</button>
          )}
        </div>
        {aviso && <p className={aviso.erro ? "aviso erro" : "aviso"} aria-live="polite">{aviso.msg}</p>}
      </section>

      {salvos.length > 0 && (
        <section className="folha">
          <span className="rotulo">Meus quizzes</span>
          <ul className="lista">
            {salvos.map((s) => (
              <li key={s.id}>
                <button className="link" onClick={() => aoComecar(s.quiz, false)}>{s.quiz.tema}</button>
                <span className="pequeno">{s.quiz.perguntas.length} perguntas</span>
                <button className="btn mini" onClick={() => aoRemoverSalvo(s.id)} aria-label={`Apagar ${s.quiz.tema}`}>Apagar</button>
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
