import { useEffect, useRef, useState } from "react";
import { conferirLacuna, LACUNA, NOMES_TIPO, respostaCerta, tipoDe, type Pergunta, type Quiz, type Resposta } from "../lib/quiz";
import { formatarTempo } from "../lib/desafio";
import { Tutor } from "./Tutor";

const LETRAS = "ABCDEF";

interface Props {
  quiz: Quiz;
  fila: number[];
  // Quando definido, mostra um relógio contando desde esse momento (modo desafio).
  inicio?: number;
  aoTerminar: (respostas: Resposta[]) => void;
  aoSair: () => void;
}

export function Responder({ quiz, fila, inicio, aoTerminar, aoSair }: Props) {
  const [pos, setPos] = useState(0);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const proxima = useRef<HTMLButtonElement>(null);

  const indice = fila[pos];
  const p = quiz.perguntas[indice];
  const tipo = tipoDe(p);
  const atual = respostas[pos];
  const acertos = respostas.filter((r) => r.certo).length;

  useEffect(() => {
    if (atual) proxima.current?.focus();
  }, [atual]);

  function registrar(r: Omit<Resposta, "indice">) {
    if (atual) return;
    setRespostas([...respostas, { indice, ...r }]);
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
        {inicio !== undefined && <Relogio inicio={inicio} />}
      </div>
      <span className="etiqueta">{quiz.tema}{tipo !== "multipla" && ` · ${NOMES_TIPO[tipo]}`}</span>

      {/* key: cada pergunta começa com o próprio estado (lacuna digitada, cartão virado). */}
      {(tipo === "multipla" || tipo === "vf") && (
        <Alternativas key={pos} p={p} atual={atual} aoEscolher={(i) => registrar({ escolhida: i, certo: i === p.correta })} />
      )}
      {tipo === "lacuna" && (
        <Lacuna key={pos} p={p} atual={atual} aoResponder={(d) => registrar({ escolhida: -1, digitada: d, certo: conferirLacuna(d, p.resposta ?? "") })} />
      )}
      {tipo === "flashcard" && (
        <Cartao key={pos} p={p} atual={atual} aoAvaliar={(certo) => registrar({ escolhida: -1, certo })} />
      )}

      {atual && (
        <div className="explicacao">
          <strong className={atual.certo ? "ok" : "ruim"}>{veredito(p, atual)}</strong>
          {p.explicacao && <span>{p.explicacao}</span>}
          <Tutor key={pos} tema={quiz.tema} pergunta={p} resposta={atual} />
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

function Relogio({ inicio }: { inicio: number }) {
  const [agora, setAgora] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="relogio" aria-label="Tempo">{formatarTempo(agora - inicio)}</span>;
}

function veredito(p: Pergunta, r: Resposta): string {
  const tipo = tipoDe(p);
  if (tipo === "flashcard") return r.certo ? "Boa! Esse cartão volta mais tarde." : "Sem problema: esse cartão volta logo na revisão.";
  if (r.certo) {
    if (tipo === "lacuna" && r.digitada && r.digitada.trim().toLowerCase() !== respostaCerta(p).toLowerCase()) {
      return `Certo! A forma esperada é "${respostaCerta(p)}".`;
    }
    return "Certo!";
  }
  if (tipo === "multipla") return `Não foi dessa vez. A resposta é ${LETRAS[p.correta]}.`;
  return `Não foi dessa vez. A resposta é "${respostaCerta(p)}".`;
}

interface PropsTipo {
  p: Pergunta;
  atual: Resposta | undefined;
}

function Alternativas({ p, atual, aoEscolher }: PropsTipo & { aoEscolher: (i: number) => void }) {
  const vf = tipoDe(p) === "vf";
  return (
    <>
      <h2>{p.pergunta}</h2>
      <ul className={vf ? "opcoes vf" : "opcoes"}>
        {p.opcoes.map((texto, i) => {
          let classe = "opcao";
          if (atual && i === p.correta) classe += " certa";
          else if (atual && i === atual.escolhida) classe += " errada";
          return (
            <li key={i}>
              <button className={classe} disabled={!!atual} onClick={() => aoEscolher(i)}>
                {!vf && <span className="letra">{LETRAS[i]}</span>}
                <span>{texto}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Lacuna({ p, atual, aoResponder }: PropsTipo & { aoResponder: (digitada: string) => void }) {
  const [digitada, setDigitada] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const [antes, depois] = p.pergunta.split(LACUNA);

  useEffect(() => campo.current?.focus(), []);

  function conferir() {
    if (digitada.trim()) aoResponder(digitada.trim());
  }

  return (
    <>
      <h2>
        {antes}
        <span className={atual ? (atual.certo ? "lacuna ok" : "lacuna ruim") : "lacuna"}>{atual ? atual.digitada || "…" : "____"}</span>
        {depois}
      </h2>
      {!atual && (
        <div className="tutor-entrada">
          <input
            ref={campo}
            type="text"
            aria-label="Palavra que completa a frase"
            value={digitada}
            onChange={(e) => setDigitada(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && conferir()}
            placeholder="Escreva a palavra que falta"
            autoComplete="off"
          />
          <button className="btn" onClick={conferir} disabled={!digitada.trim()}>Conferir</button>
          <button className="btn" onClick={() => aoResponder("")}>Não sei</button>
        </div>
      )}
    </>
  );
}

function Cartao({ p, atual, aoAvaliar }: PropsTipo & { aoAvaliar: (lembrou: boolean) => void }) {
  const [virado, setVirado] = useState(false);
  return (
    <>
      <div className="cartao">
        <span className="etiqueta">Frente</span>
        <h2>{p.pergunta}</h2>
        {virado && (
          <>
            <span className="etiqueta">Verso</span>
            <p className="verso">{p.resposta}</p>
          </>
        )}
      </div>
      {!virado && <button className="btn primario" onClick={() => setVirado(true)}>Mostrar resposta</button>}
      {virado && !atual && (
        <div className="acoes">
          <span className="pequeno">Você lembrou?</span>
          <button className="btn" onClick={() => aoAvaliar(true)}>Lembrei</button>
          <button className="btn" onClick={() => aoAvaliar(false)}>Não lembrei</button>
        </div>
      )}
    </>
  );
}
