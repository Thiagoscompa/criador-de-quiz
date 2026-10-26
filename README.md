# Caderno de Quiz

App web para estudar com quizzes de múltipla escolha. Você informa um tema ou cola seu material de estudo, e a IA (OpenAI ou Claude) gera as perguntas com 4 alternativas, a resposta certa e uma explicação para cada uma.

## O que já faz

- Gera quizzes por **tema** ou a partir de um **texto colado** (as perguntas usam só o que está no texto).
- Escolha da quantidade de perguntas (5, 8, 10 ou 15) e do nível (fácil, médio, difícil).
- Correção na hora, com explicação da resposta.
- Resultado com revisão de cada pergunta e botão para **refazer só as erradas**.
- **Meus quizzes** e **últimas tentativas** ficam salvos no navegador (localStorage).
- Quiz de exemplo para testar sem chave da API.

## Como rodar no seu computador

Precisa do Node.js 20 ou mais novo e de uma chave de IA: da OpenAI (https://platform.openai.com/api-keys) ou da Anthropic (https://platform.claude.com).

```bash
npm install
cp .env.example .env      # e cole sua chave em OPENAI_API_KEY
npm run dev               # abre em http://localhost:5173
```

## Como publicar na Vercel

1. Importe este repositório em https://vercel.com/new (o Vite é detectado sozinho).
2. Em **Settings → Environment Variables**, crie `OPENAI_API_KEY` com sua chave (ou `ANTHROPIC_API_KEY`, se preferir o Claude).
3. Faça o deploy. A página é servida como site estático e a pasta `api/` vira a função `POST /api/gerar-quiz`.

A chave fica só no servidor; o navegador nunca a vê. Cada quiz gerado consome créditos da sua conta na API.

## Qual IA é usada

| Variável definida | IA usada |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI, modelo `gpt-5-mini` (troque com `OPENAI_MODEL`) |
| só `ANTHROPIC_API_KEY` | Claude, modelo `claude-opus-5-5` |

Se as duas estiverem definidas, a OpenAI tem prioridade.

## Estrutura

| Caminho | O que é |
| --- | --- |
| `src/` | Interface em React + TypeScript |
| `src/lib/quiz.ts` | Formato do quiz, validação do pedido, prompt e pontuação (usado no navegador e no servidor) |
| `server/gerarQuiz.ts` | Valida o pedido e escolhe a IA conforme a chave configurada |
| `server/provedores/` | Chamadas à OpenAI e ao Claude, ambas com saída estruturada |
| `api/gerar-quiz.ts` | Função serverless da Vercel que expõe o servidor |
| `vite.config.ts` | Em `npm run dev`, atende `/api/gerar-quiz` com o mesmo código |

## Comandos

- `npm run dev`: servidor de desenvolvimento
- `npm test`: testes (Vitest)
- `npm run build`: checagem de tipos e build de produção
- `npm run lint`: lint (oxlint)
