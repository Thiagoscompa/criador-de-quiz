import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gerarQuiz } from "./gerarQuiz.js";
import { limparLimitesEmMemoria } from "./limite.js";
import { lerFotos } from "./lerFotos.js";
import { tutor } from "./tutor.js";
import { chamarIA } from "./provedores/index.js";

vi.mock("./provedores/index.js", () => ({ chamarIA: vi.fn() }));

const QUIZ = {
  tema: "Sistema solar",
  perguntas: [
    { tipo: "multipla", pergunta: "Maior planeta?", opcoes: ["Terra", "Júpiter", "Marte", "Vênus"], correta: 1, resposta: "", explicacao: "Júpiter.", trecho: "" },
  ],
};
const PEDIDO = { modo: "tema", tema: "Sistema solar", quantidade: 5, nivel: "fácil" };
const FOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

const ambiente = { ...process.env };
beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.LIMITE_DIARIO_POR_VISITANTE;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.KV_REST_API_URL;
  limparLimitesEmMemoria();
});
afterEach(() => {
  process.env = { ...ambiente };
  vi.clearAllMocks();
});

function post(caminho: string, corpo: unknown, ip = "1.1.1.1") {
  return new Request(`http://localhost${caminho}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(corpo),
  });
}

describe("gerarQuiz", () => {
  it("recusa métodos que não são POST", async () => {
    const r = await gerarQuiz(new Request("http://localhost/api/gerar-quiz"));
    expect(r.status).toBe(405);
  });

  it("avisa quando não há nenhuma chave de IA", async () => {
    const r = await gerarQuiz(post("/api/gerar-quiz", PEDIDO));
    expect(r.status).toBe(500);
    expect((await r.json()).erro).toMatch(/OPENAI_API_KEY/);
  });

  it("valida o pedido antes de chamar a IA", async () => {
    process.env.OPENAI_API_KEY = "teste";
    const r = await gerarQuiz(post("/api/gerar-quiz", { modo: "texto", texto: "oi", quantidade: 5, nivel: "fácil" }));
    expect(r.status).toBe(400);
    expect(chamarIA).not.toHaveBeenCalled();
  });

  it("usa a OpenAI quando OPENAI_API_KEY está definida", async () => {
    process.env.OPENAI_API_KEY = "teste";
    process.env.ANTHROPIC_API_KEY = "teste";
    vi.mocked(chamarIA).mockResolvedValue({ ok: true, dados: QUIZ });
    const r = await gerarQuiz(post("/api/gerar-quiz", PEDIDO));
    expect(r.status).toBe(200);
    expect((await r.json()).tema).toBe("Sistema solar");
    expect(vi.mocked(chamarIA).mock.calls[0][0]).toBe("openai");
  });

  it("usa o Claude quando só ANTHROPIC_API_KEY está definida", async () => {
    process.env.ANTHROPIC_API_KEY = "teste";
    vi.mocked(chamarIA).mockResolvedValue({ ok: true, dados: QUIZ });
    await gerarQuiz(post("/api/gerar-quiz", PEDIDO));
    expect(vi.mocked(chamarIA).mock.calls[0][0]).toBe("anthropic");
  });

  it("repassa o erro do provedor", async () => {
    process.env.OPENAI_API_KEY = "teste";
    vi.mocked(chamarIA).mockResolvedValue({ ok: false, status: 429, erro: "Muitos pedidos" });
    const r = await gerarQuiz(post("/api/gerar-quiz", PEDIDO));
    expect(r.status).toBe(429);
  });

  it("bloqueia o visitante que passa do limite diário, sem afetar outro", async () => {
    process.env.OPENAI_API_KEY = "teste";
    process.env.LIMITE_DIARIO_POR_VISITANTE = "2";
    vi.mocked(chamarIA).mockResolvedValue({ ok: true, dados: QUIZ });
    expect((await gerarQuiz(post("/api/gerar-quiz", PEDIDO))).status).toBe(200);
    expect((await gerarQuiz(post("/api/gerar-quiz", PEDIDO))).status).toBe(200);
    const bloqueado = await gerarQuiz(post("/api/gerar-quiz", PEDIDO));
    expect(bloqueado.status).toBe(429);
    expect((await bloqueado.json()).erro).toMatch(/limite de 2/);
    expect((await gerarQuiz(post("/api/gerar-quiz", PEDIDO, "2.2.2.2"))).status).toBe(200);
    expect(chamarIA).toHaveBeenCalledTimes(3);
  });
});

describe("lerFotos", () => {
  it("recusa pedido sem fotos ou com arquivo que não é imagem", async () => {
    process.env.OPENAI_API_KEY = "teste";
    expect((await lerFotos(post("/api/ler-fotos", { imagens: [] }))).status).toBe(400);
    expect((await lerFotos(post("/api/ler-fotos", { imagens: ["data:text/html;base64,PGI+"] }))).status).toBe(400);
    expect(chamarIA).not.toHaveBeenCalled();
  });

  it("recusa mais de 10 fotos", async () => {
    process.env.OPENAI_API_KEY = "teste";
    const r = await lerFotos(post("/api/ler-fotos", { imagens: Array(11).fill(FOTO) }));
    expect(r.status).toBe(400);
  });

  it("envia as imagens à IA e devolve uma página por foto", async () => {
    process.env.OPENAI_API_KEY = "teste";
    vi.mocked(chamarIA).mockResolvedValue({
      ok: true,
      dados: { paginas: [{ texto: " A célula é a unidade da vida. ", legivel: true, problema: "" }] },
    });
    const r = await lerFotos(post("/api/ler-fotos", { imagens: [FOTO, FOTO] }));
    expect(r.status).toBe(200);
    const { paginas } = await r.json();
    expect(paginas).toHaveLength(2);
    expect(paginas[0]).toEqual({ texto: "A célula é a unidade da vida.", legivel: true, problema: "" });
    expect(paginas[1].legivel).toBe(false);
    expect(vi.mocked(chamarIA).mock.calls[0][1].imagens).toHaveLength(2);
  });
});

describe("tutor", () => {
  const PEDIDO_TUTOR = {
    tema: "Biologia",
    tipo: "multipla",
    pergunta: "Qual organela produz energia?",
    respostaCerta: "Mitocôndria",
    respostaAluno: "Ribossomo",
    acertou: false,
    explicacao: "A mitocôndria faz a respiração celular.",
    trecho: "A mitocôndria é a usina de energia da célula.",
    mensagens: [],
  };

  it("explica a questão citando o trecho do material", async () => {
    process.env.OPENAI_API_KEY = "teste";
    vi.mocked(chamarIA).mockResolvedValue({ ok: true, dados: { resposta: " Pense na mitocôndria como uma usina. " } });
    const r = await tutor(post("/api/tutor", PEDIDO_TUTOR));
    expect(r.status).toBe(200);
    expect((await r.json()).resposta).toBe("Pense na mitocôndria como uma usina.");
    const prompt = vi.mocked(chamarIA).mock.calls[0][1].prompt;
    expect(prompt).toContain("usina de energia da célula");
    expect(prompt).toContain("O aluno errou");
  });

  it("responde à dúvida do aluno e recusa conversa longa demais", async () => {
    process.env.OPENAI_API_KEY = "teste";
    vi.mocked(chamarIA).mockResolvedValue({ ok: true, dados: { resposta: "Sim." } });
    const conversa = [{ papel: "tutor", texto: "Explicação." }, { papel: "aluno", texto: "E o ribossomo faz o quê?" }];
    await tutor(post("/api/tutor", { ...PEDIDO_TUTOR, mensagens: conversa }));
    expect(vi.mocked(chamarIA).mock.calls[0][1].prompt).toContain("Responda à última mensagem do aluno");

    const longa = Array.from({ length: 8 }, (_, i) => ({ papel: i % 2 ? "aluno" : "tutor", texto: "oi" }));
    expect((await tutor(post("/api/tutor", { ...PEDIDO_TUTOR, mensagens: longa }))).status).toBe(400);
  });
});
