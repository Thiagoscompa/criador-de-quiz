import { tutor } from "../server/tutor.js";

// Função serverless da Vercel: POST /api/tutor
export function POST(request: Request): Promise<Response> {
  return tutor(request);
}
