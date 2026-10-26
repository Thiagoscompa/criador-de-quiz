import { pct, type Painel as DadosPainel } from "../lib/painel";

interface Props {
  painel: DadosPainel;
  aoReforcar: (quizId: string) => void;
  aoVoltar: () => void;
}

function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function Painel({ painel, aoReforcar, aoVoltar }: Props) {
  const { semanas, assuntos, fracos, ultimos7 } = painel;
  const comDados = semanas.some((s) => s.total > 0);

  return (
    <>
      <section className="folha">
        <div className="editor-topo">
          <h2>Meu desempenho</h2>
          <button className="btn mini" onClick={aoVoltar}>Voltar</button>
        </div>

        <div className="numeros">
          <div>
            <b className="mono">{ultimos7.total}</b>
            <span className="pequeno">perguntas nos últimos 7 dias</span>
          </div>
          <div>
            <b className="mono">{ultimos7.total ? `${pct(ultimos7.acertos, ultimos7.total)}%` : "–"}</b>
            <span className="pequeno">de acerto nos últimos 7 dias</span>
          </div>
        </div>

        <div>
          <span className="rotulo">Acerto por semana</span>
          {comDados ? (
            <figure className="grafico" aria-label="Percentual de acerto por semana">
              <div className="grafico-area">
                {[100, 50].map((g) => <span key={g} className="grade" style={{ bottom: `${g}%` }}><i>{g}%</i></span>)}
                {semanas.map((s, i) => {
                  const valor = pct(s.acertos, s.total);
                  const ultima = i === semanas.length - 1;
                  const dica = s.total ? `Semana de ${dataCurta(s.inicio)}: ${valor}% de acerto em ${s.total} perguntas` : `Semana de ${dataCurta(s.inicio)}: sem perguntas`;
                  return (
                    <div key={s.inicio} className="coluna" title={dica} tabIndex={0} aria-label={dica}>
                      {s.total > 0 && (
                        <>
                          {ultima && <span className="valor mono">{valor}%</span>}
                          <i style={{ height: `${Math.max(valor, 2)}%` }} />
                          <span className="dica-coluna" role="tooltip">{valor}% · {s.total} perg.</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="grafico-eixo">
                {semanas.map((s, i) => <span key={s.inicio}>{(semanas.length - 1 - i) % 2 === 0 ? dataCurta(s.inicio) : ""}</span>)}
              </div>
            </figure>
          ) : (
            <p className="pequeno">Responda alguns quizzes para ver sua evolução aqui.</p>
          )}
        </div>
      </section>

      {fracos.length > 0 && (
        <section className="folha">
          <div>
            <span className="rotulo">Para reforçar</span>
            <p className="pequeno">Os assuntos com menor acerto. O reforço começa pelas perguntas que você mais erra.</p>
          </div>
          <ul className="lista">
            {fracos.map((a) => (
              <li key={a.chave}>
                <span>{a.tema}</span>
                <span className="mono ruim">{pct(a.acertos, a.total)}%</span>
                <button className="btn mini" onClick={() => aoReforcar(a.quizId!)}>Reforçar</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {assuntos.length > 0 && (
        <section className="folha">
          <span className="rotulo">Por assunto</span>
          <table className="tabela">
            <thead>
              <tr><th>Assunto</th><th>Perguntas</th><th>Acerto</th><th>Último estudo</th></tr>
            </thead>
            <tbody>
              {assuntos.map((a) => (
                <tr key={a.chave}>
                  <td>{a.tema}</td>
                  <td className="mono">{a.total}</td>
                  <td className="mono">{pct(a.acertos, a.total)}%</td>
                  <td className="mono">{dataCurta(a.ultimoDia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
