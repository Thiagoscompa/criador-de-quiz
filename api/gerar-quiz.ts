import { gerarQuiz } from "../server/gerarQuiz.js";

// Função serverless da Vercel: POST /api/gerar-quiz
export function POST(request: Request): Promise<Response> {
  return gerarQuiz(request);
}
