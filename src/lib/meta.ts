import { hoje, somarDias } from "./revisao";

export const METAS = [10, 20, 30, 50] as const;
export const META_PADRAO = 20;

// Perguntas respondidas por dia ("AAAA-MM-DD" → quantidade).
export type Dias = Record<string, number>;

export interface Estudo {
  meta: number;
  dias: Dias;
}

export interface Sequencia {
  hoje: number;
  meta: number;
  // Dias seguidos com a meta batida, contando hoje se já bateu.
  dias: number;
  bateuHoje: boolean;
}

export function somarRespondidas(dias: Dias, quantidade: number, dia = hoje()): Dias {
  return { ...dias, [dia]: (dias[dia] ?? 0) + quantidade };
}

// A sequência só quebra quando um dia inteiro passa sem a meta; hoje ainda está em aberto.
export function calcularSequencia({ meta, dias }: Estudo, dia = hoje()): Sequencia {
  const feitas = dias[dia] ?? 0;
  const bateuHoje = feitas >= meta;
  let contagem = bateuHoje ? 1 : 0;
  let cursor = somarDias(dia, -1);
  while ((dias[cursor] ?? 0) >= meta) {
    contagem++;
    cursor = somarDias(cursor, -1);
  }
  return { hoje: feitas, meta, dias: contagem, bateuHoje };
}

// Guarda só os últimos 400 dias para o armazenamento não crescer sem fim.
export function podarDias(dias: Dias, dia = hoje()): Dias {
  const corte = somarDias(dia, -400);
  return Object.fromEntries(Object.entries(dias).filter(([d]) => d >= corte));
}
