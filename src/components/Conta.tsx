import type { Session } from "@supabase/supabase-js";
import { useState } from "react";
import { statusSync, type EstadoSync } from "../lib/sincronizar";
import { supabase } from "../lib/supabase";

interface Props {
  sessao: Session | null;
  sync: EstadoSync;
  // Texto que explica por que o login foi pedido (por exemplo, para criar um desafio).
  motivo: string | null;
  aoFechar: () => void;
}

// Painel de entrar e sair. Os dados deste aparelho entram na conta no primeiro login.
export function Conta({ sessao, sync, motivo, aoFechar }: Props) {
  const [email, setEmail] = useState("");
  const [aviso, setAviso] = useState<{ msg: string; erro: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!supabase) return null;
  const sb = supabase;
  const volta = window.location.origin + window.location.pathname + window.location.search;

  async function entrarComGoogle() {
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: volta } });
    if (error) setAviso({ msg: "O login com Google não está disponível agora. Tente pelo e-mail.", erro: true });
  }

  async function entrarComEmail() {
    const endereco = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) return setAviso({ msg: "Confira o e-mail digitado.", erro: true });
    setEnviando(true);
    const { error } = await sb.auth.signInWithOtp({ email: endereco, options: { emailRedirectTo: volta } });
    setEnviando(false);
    if (error) setAviso({ msg: "Não foi possível enviar o link. Espere um minuto e tente de novo.", erro: true });
    else setAviso({ msg: `Enviamos um link de acesso para ${endereco}. Abra o e-mail neste aparelho para entrar.`, erro: false });
  }

  async function sair() {
    await sb.auth.signOut();
    aoFechar();
  }

  if (sessao) {
    return (
      <section className="folha conta">
        <div>
          <span className="rotulo">Sua conta</span>
          <p className="pequeno">{sessao.user.email}</p>
          <p className="pequeno">{statusSync(sync)}</p>
          <p className="pequeno">Seus quizzes, revisões e metas ficam iguais em todos os aparelhos em que você entrar. Ao sair, eles continuam neste aparelho.</p>
        </div>
        <div className="acoes">
          <button className="btn" onClick={sair}>Sair</button>
          <button className="btn" onClick={aoFechar}>Fechar</button>
        </div>
      </section>
    );
  }

  return (
    <section className="folha conta">
      <div>
        <span className="rotulo">Entrar</span>
        <p className="pequeno">{motivo ?? "Com uma conta, seus quizzes e revisões aparecem no celular e no computador. O que já está neste aparelho entra na conta."}</p>
      </div>
      <button className="btn" onClick={entrarComGoogle}>Entrar com Google</button>
      <div>
        <label htmlFor="email">Ou receba um link no e-mail</label>
        <div className="tutor-entrada">
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrarComEmail()} placeholder="voce@exemplo.com" autoComplete="email" inputMode="email" enterKeyHint="send" />
          <button className="btn primario" onClick={entrarComEmail} disabled={enviando}>{enviando ? "Enviando…" : "Enviar link"}</button>
        </div>
      </div>
      {aviso && <p className={aviso.erro ? "aviso erro" : "aviso"} aria-live="polite">{aviso.msg}</p>}
      <div className="acoes">
        <button className="btn mini" onClick={aoFechar}>Agora não</button>
      </div>
    </section>
  );
}
