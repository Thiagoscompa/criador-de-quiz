# Caderno de Quiz

App web para estudar com quizzes de múltipla escolha. Você informa um tema ou cola seu material de estudo, e a IA (OpenAI ou Claude) gera as perguntas com 4 alternativas, a resposta certa e uma explicação para cada uma.

## O que já faz

- Gera quizzes por **tema**, a partir de um **texto colado** ou de **fotos** do material (até 10 fotos; você confere o texto lido antes de gerar).
- Escolha da quantidade de perguntas (5, 8, 10 ou 15) e do nível (fácil, médio, difícil).
- Correção na hora, com explicação da resposta.
- Resultado com revisão de cada pergunta e botão para **refazer só as erradas**.
- **Revisar hoje**: repetição espaçada (SM-2). Pergunta errada volta no dia seguinte; acertada volta em 1, 6 e depois cada vez mais dias.
- **Editar** qualquer quiz salvo: enunciado, alternativas, resposta certa e explicação.
- **Meus quizzes**, **últimas tentativas** e a agenda de revisão ficam salvos no navegador (localStorage).
- **Limite de uso** por visitante e total por dia, para proteger seus créditos de IA.
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
3. Recomendado: em **Storage**, adicione um banco **Upstash Redis** ao projeto (as variáveis são criadas sozinhas). Sem ele, o limite de uso conta separado em cada instância e não segura abuso.
4. Faça o deploy. A página é servida como site estático e a pasta `api/` vira as funções `POST /api/gerar-quiz` e `POST /api/ler-fotos`.

A chave fica só no servidor; o navegador nunca a vê. Cada quiz gerado consome créditos da sua conta na API.

## Qual IA é usada

| Variável definida | IA usada |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI: `gpt-5-mini` para gerar perguntas (troque com `OPENAI_MODEL`) e `gpt-5` para ler fotos (troque com `OPENAI_MODEL_IMAGEM`) |
| só `ANTHROPIC_API_KEY` | Claude, modelo `claude-opus-5-5` |

Se as duas estiverem definidas, a OpenAI tem prioridade.

## Limite de uso

Cada geração de quiz ou leitura de fotos conta 1. Os limites zeram à meia-noite (UTC).

| Variável | Padrão | O que limita |
| --- | --- | --- |
| `LIMITE_DIARIO_POR_VISITANTE` | 30 | Pedidos por dia de um mesmo IP |
| `LIMITE_DIARIO_TOTAL` | 500 | Pedidos por dia somando todos os visitantes |

As fotos não ficam guardadas: passam pela IA e são descartadas. Só o texto conferido vira quiz.

## Estrutura

| Caminho | O que é |
| --- | --- |
| `src/` | Interface em React + TypeScript |
| `src/lib/quiz.ts` | Formato do quiz, validação do pedido, prompt e pontuação (usado no navegador e no servidor) |
| `server/gerarQuiz.ts` | Valida o pedido e gera o quiz com a IA configurada |
| `server/lerFotos.ts` | Transcreve as fotos (uma página por foto) |
| `server/limite.ts` | Limite de uso diário (Upstash Redis ou memória) |
| `src/lib/revisao.ts` | Algoritmo de repetição espaçada |
| `server/provedores/` | Chamadas à OpenAI e ao Claude, ambas com saída estruturada |
| `api/` | Funções serverless da Vercel que expõem o servidor |
| `vite.config.ts` | Em `npm run dev`, atende as rotas de `/api` com o mesmo código |

## Comandos

- `npm run dev`: servidor de desenvolvimento
- `npm test`: testes (Vitest)
- `npm run build`: checagem de tipos e build de produção
- `npm run lint`: lint (oxlint)
