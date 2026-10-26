import { useEffect, useRef, useState } from "react";
import { perguntarTutor } from "../lib/api";
import type { Pergunta, Resposta } from "../lib/quiz";
import { contextoTutor, MAX_PERGUNTAS_TUTOR, type MensagemTutor } from "../lib/tutor";

interface Props {
  tema: string;
  pergunta: Pergunta;
  resposta: Resposta;
}

// Conversa curta sobre uma questão: a primeira explicação vem sozinha, depois o aluno pode perguntar.
export function Tutor({ tema, pergunta, resposta }: Props) {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemTutor[]>([]);
  const [duvida, setDuvida] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const controle = useRef<AbortController | null>(null);

  useEffect(() => () => controle.current?.abort(), []);

  async function enviar(historico: MensagemTutor[]) {
    controle.current = new AbortController();
    setMensagens(historico);
    setPensando(true);
    setErro(null);
    try {
      const texto = await perguntarTutor({ ...contextoTutor(tema, pergunta, resposta), mensagens: historico }, controle.current.signal);
      setMensagens([...historico, { papel: "tutor", texto }]);
    } catch (e) {
      if (!controle.current.signal.aborted) setErro(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setPensando(false);
    }
  }

  function abrir() {
    setAberto(true);
    void enviar([]);
  }

  function perguntar() {
    const texto = duvida.trim();
    if (!texto || pensando) return;
    setDuvida("");
    void enviar([...mensagens, { papel: "aluno", texto }]);
  }

  if (!aberto) {
    return (
      <button className="btn mini" onClick={abrir}>
        Me explique melhor
      </button>
    );
  }

  const feitas = mensagens.filter((m) => m.papel === "aluno").length;
  const podePerguntar = !pensando && feitas < MAX_PERGUNTAS_TUTOR && mensagens.at(-1)?.papel === "tutor";

  return (
    <div className="tutor" aria-live="polite">
      <span className="rotulo">Tutor</span>
      {mensagens.map((m, i) => (
        <p key={i} className={m.papel === "aluno" ? "fala aluno" : "fala"}>{m.texto}</p>
      ))}
      {pensando && <p className="pequeno">Pensando…</p>}
      {erro && (
        <p className="aviso erro">
          {erro}{" "}
          <button className="link" onClick={() => enviar(mensagens)}>Tentar de novo</button>
        </p>
      )}
      {podePerguntar && (
        <div className="tutor-entrada">
          <input
            type="text"
            aria-label="Sua dúvida"
            value={duvida}
            maxLength={500}
            onChange={(e) => setDuvida(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && perguntar()}
            placeholder="Ficou alguma dúvida? Pergunte aqui"
          />
          <button className="btn mini" onClick={perguntar} disabled={!duvida.trim()}>Perguntar</button>
        </div>
      )}
      {!pensando && feitas >= MAX_PERGUNTAS_TUTOR && (
        <p className="pequeno">Chegou ao limite de perguntas sobre esta questão.</p>
      )}
    </div>
  );
}
