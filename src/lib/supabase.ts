import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Login, sincronização e desafios só aparecem quando o Supabase está configurado.
// As duas variáveis são públicas: a proteção dos dados fica nas regras (RLS) de supabase/schema.sql.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && chave ? createClient(url, chave) : null;
