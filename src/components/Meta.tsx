import { METAS, type Sequencia } from "../lib/meta";

interface Props {
  sequencia: Sequencia;
  aoMudarMeta: (meta: number) => void;
}

export function Meta({ sequencia, aoMudarMeta }: Props) {
  const { hoje, meta, dias, bateuHoje } = sequencia;
  const falta = Math.max(0, meta - hoje);
  return (
    <section className="folha meta">
      <div className="meta-numeros">
        <div>
          <b className="mono">{dias}</b>
          <span className="pequeno">dia{dias === 1 ? "" : "s"} seguido{dias === 1 ? "" : "s"}</span>
        </div>
        <div className="meta-hoje">
          <span className="rotulo">Meta de hoje</span>
          <div className="barra" role="progressbar" aria-valuemin={0} aria-valuemax={meta} aria-valuenow={Math.min(hoje, meta)} aria-label="Progresso da meta de hoje">
            <i style={{ width: `${Math.min(100, (hoje / meta) * 100)}%` }} />
          </div>
          <span className="pequeno">
            {bateuHoje ? `Meta batida: ${hoje} perguntas hoje.` : `${hoje} de ${meta} perguntas. Faltam ${falta} para manter a sequência.`}
          </span>
        </div>
      </div>
      <div className="meta-escolha">
        <label htmlFor="meta">Perguntas por dia</label>
        <select id="meta" value={meta} onChange={(e) => aoMudarMeta(Number(e.target.value))}>
          {METAS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </section>
  );
}
