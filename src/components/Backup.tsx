import { useRef, useState } from "react";
import { exportarBackup, importarBackup } from "../lib/armazenamento";
import { hoje } from "../lib/revisao";

interface Props {
  aoImportar: () => void;
  logado: boolean;
}

// Enquanto não há conta, o backup é o jeito de levar os quizzes para outro aparelho.
export function Backup({ aoImportar, logado }: Props) {
  const [arquivo, setArquivo] = useState<unknown>(null);
  const [aviso, setAviso] = useState<{ msg: string; erro: boolean } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  function baixar() {
    const blob = new Blob([JSON.stringify(exportarBackup(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `caderno-de-quiz-${hoje()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setAviso({ msg: "Backup baixado. Guarde o arquivo para restaurar em outro aparelho.", erro: false });
  }

  async function escolher(f: File | undefined) {
    if (entrada.current) entrada.current.value = "";
    if (!f) return;
    try {
      setArquivo(JSON.parse(await f.text()));
      setAviso(null);
    } catch {
      setAviso({ msg: "Não consegui ler este arquivo.", erro: true });
    }
  }

  function restaurar() {
    const erro = importarBackup(arquivo);
    setArquivo(null);
    if (erro) return setAviso({ msg: erro, erro: true });
    setAviso({ msg: "Backup restaurado.", erro: false });
    aoImportar();
  }

  return (
    <section className="folha">
      <div>
        <span className="rotulo">Seus dados</span>
        <p className="pequeno">
          {logado
            ? "Seus dados estão guardados na sua conta. O backup é uma cópia extra em arquivo."
            : "Quizzes, revisões e metas ficam só neste navegador. Baixe um backup para não perder nada."}
        </p>
      </div>
      <div className="acoes">
        <button className="btn" onClick={baixar}>Baixar backup</button>
        <input ref={entrada} type="file" accept="application/json,.json" hidden aria-label="Arquivo de backup" onChange={(e) => escolher(e.target.files?.[0])} />
        {arquivo === null ? (
          <button className="btn" onClick={() => entrada.current?.click()}>Restaurar backup</button>
        ) : (
          <>
            <span className="pequeno">Isso substitui os dados deste navegador. Continuar?</span>
            <button className="btn perigo" onClick={restaurar}>Sim, restaurar</button>
            <button className="btn" onClick={() => setArquivo(null)}>Não</button>
          </>
        )}
      </div>
      {aviso && <p className={aviso.erro ? "aviso erro" : "aviso"} aria-live="polite">{aviso.msg}</p>}
    </section>
  );
}
