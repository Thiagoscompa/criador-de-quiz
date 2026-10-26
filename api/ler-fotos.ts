import { lerFotos } from "../server/lerFotos.js";

// Função serverless da Vercel: POST /api/ler-fotos
export function POST(request: Request): Promise<Response> {
  return lerFotos(request);
}
