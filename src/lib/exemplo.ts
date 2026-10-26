import type { Quiz } from "./quiz";

export const QUIZ_EXEMPLO: Quiz = {
  tema: "Ciclo da água (exemplo)",
  perguntas: [
    {
      pergunta: "Qual processo transforma a água líquida dos oceanos em vapor?",
      opcoes: ["Condensação", "Evaporação", "Precipitação", "Infiltração"],
      correta: 1,
      explicacao: "Na evaporação, o calor do Sol faz a água líquida passar para o estado gasoso e subir para a atmosfera.",
    },
    {
      pergunta: "Como se chama a passagem do vapor de água para gotículas que formam as nuvens?",
      opcoes: ["Condensação", "Sublimação", "Transpiração", "Escoamento"],
      correta: 0,
      explicacao: "Ao subir, o vapor esfria e se condensa em gotículas minúsculas, que juntas formam as nuvens.",
    },
    {
      pergunta: "A liberação de vapor de água pelas folhas das plantas é chamada de:",
      opcoes: ["Fotossíntese", "Respiração", "Transpiração", "Percolação"],
      correta: 2,
      explicacao: "A transpiração vegetal libera vapor pelos estômatos das folhas e contribui bastante para a umidade do ar.",
    },
    {
      pergunta: "O que acontece com parte da água da chuva que penetra no solo?",
      opcoes: ["Vira vapor imediatamente", "Abastece os lençóis freáticos", "Volta direto para as nuvens", "Se transforma em gelo"],
      correta: 1,
      explicacao: "Pela infiltração, a água atravessa o solo e se acumula em aquíferos e lençóis freáticos.",
    },
    {
      pergunta: "Qual é a principal fonte de energia que movimenta o ciclo da água?",
      opcoes: ["O vento", "O calor do interior da Terra", "A energia solar", "A rotação da Lua"],
      correta: 2,
      explicacao: "É a radiação solar que aquece a água e provoca a evaporação, dando início ao ciclo.",
    },
  ],
};
