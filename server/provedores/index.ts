import type { z } from "zod";
import type { Provedor } from "../http.js";
import { chamarAnthropic } from "./anthropic.js";
import { chamarOpenAI } from "./openai.js";
import type { PedidoIA, Resultado } from "./tipos.js";

export function chamarIA<S extends z.ZodType>(provedor: Provedor, pedido: PedidoIA<S>): Promise<Resultado<z.infer<S>>> {
  return provedor === "openai" ? chamarOpenAI(pedido) : chamarAnthropic(pedido);
}
