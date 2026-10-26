import { EVENTO_MUDOU, gravarDados, lerDados } from "./armazenamento";
import { completarDados, mesclar } from "./dados";
import { META_PADRAO } from "./meta";
import { supabase } from "./supabase";

export type EstadoSync =
  | { tipo: "desligado" }
  | { tipo: "sincronizando" }
  | { tipo: "ok"; em: number }
  | { tipo: "erro"; mensagem: string };

const ESPERA_MS = 2500;

function horaCurta(ms: number): string {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function statusSync(sync: EstadoSync): string {
  if (sync.tipo === "sincronizando") return "Sincronizando…";
  if (sync.tipo === "ok") return `Sincronizado às ${horaCurta(sync.em)}`;
  if (sync.tipo === "erro") return sync.mensagem;
  return "";
}

// Puxa o que está na nuvem, junta com o deste aparelho e grava o resultado nos dois lugares.
async function sincronizarAgora(userId: string): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.from("dados_usuario").select("dados").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  const local = lerDados();
  const juntos = data ? mesclar(local, completarDados(data.dados, META_PADRAO)) : local;
  gravarDados(juntos, false);
  const { error: erroGravar } = await supabase
    .from("dados_usuario")
    .upsert({ user_id: userId, dados: juntos, atualizado_em: new Date().toISOString() });
  if (erroGravar) throw erroGravar;
}

// Mantém este aparelho e a nuvem iguais enquanto há alguém logado.
// Chama aoMudarDados quando a nuvem trouxe algo novo e aoMudarEstado a cada etapa.
export function iniciarSincronizacao(
  userId: string,
  aoMudarEstado: (e: EstadoSync) => void,
  aoMudarDados: () => void,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rodando: Promise<void> | null = null;
  let deNovo = false;
  let parado = false;

  async function rodar() {
    if (rodando) {
      deNovo = true;
      return;
    }
    aoMudarEstado({ tipo: "sincronizando" });
    const antes = JSON.stringify(lerDados());
    rodando = sincronizarAgora(userId);
    try {
      await rodando;
      if (parado) return;
      aoMudarEstado({ tipo: "ok", em: Date.now() });
      if (JSON.stringify(lerDados()) !== antes) aoMudarDados();
    } catch (e) {
      console.error("Falha ao sincronizar", e);
      if (!parado) aoMudarEstado({ tipo: "erro", mensagem: "Não foi possível sincronizar. Seus dados continuam salvos neste aparelho." });
    } finally {
      rodando = null;
      if (deNovo && !parado) {
        deNovo = false;
        void rodar();
      }
    }
  }

  function agendar() {
    clearTimeout(timer);
    timer = setTimeout(rodar, ESPERA_MS);
  }

  function aoVoltar() {
    if (document.visibilityState === "visible") void rodar();
  }

  window.addEventListener(EVENTO_MUDOU, agendar);
  document.addEventListener("visibilitychange", aoVoltar);
  void rodar();

  return () => {
    parado = true;
    clearTimeout(timer);
    window.removeEventListener(EVENTO_MUDOU, agendar);
    document.removeEventListener("visibilitychange", aoVoltar);
  };
}
