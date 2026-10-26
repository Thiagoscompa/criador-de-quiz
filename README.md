# Caderno de Quiz

App web para estudar com quizzes. Você informa um tema ou envia seu material de estudo (texto, fotos ou PDF), e a IA (OpenAI ou Claude) gera as perguntas com a resposta certa e uma explicação para cada uma.

## O que já faz

- Gera quizzes por **tema**, a partir de um **texto colado**, de **fotos** do material (até 10 fotos) ou de um **PDF**. Você confere o texto lido antes de gerar.
- O PDF é lido no próprio navegador (o arquivo não sai do aparelho). Páginas escaneadas, sem texto, podem ser lidas pela IA como fotos.
- Quatro **tipos de pergunta**, que podem ser misturados: múltipla escolha, verdadeiro ou falso, completar lacuna (aceita acento faltando e um erro de digitação) e flashcards.
- **Tutor**: depois de responder, "Me explique melhor" abre uma conversa curta sobre a questão, citando o trecho do material de onde ela saiu (até 3 perguntas de acompanhamento).
- **Meta diária** de perguntas e contador de **dias seguidos** estudando.
- **Backup**: baixe um arquivo com todos os seus dados e restaure em outro aparelho.
- **Conta** (opcional, com Supabase): entre com Google ou por link no e-mail, e os quizzes, revisões e metas ficam iguais no celular e no computador. O que já estava no aparelho entra na conta no primeiro login.
- **Meu desempenho**: acerto por semana, por assunto e os assuntos mais fracos, com botão para reforçar começando pelas perguntas que você mais erra.
- **Desafiar**: gere um link de um quiz; quem recebe responde sem conta, com relógio, e entra num placar. Só as perguntas são compartilhadas, nunca as fotos ou o texto do material.
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
4. Faça o deploy. A página é servida como site estático e a pasta `api/` vira as funções `POST /api/gerar-quiz`, `POST /api/ler-fotos` e `POST /api/tutor`.

A chave fica só no servidor; o navegador nunca a vê. Cada quiz gerado consome créditos da sua conta na API.

## Login, sincronização e desafios (Supabase)

Sem as variáveis do Supabase o app funciona normalmente, só que sem conta e sem desafios (os botões nem aparecem).

1. Crie um projeto grátis em https://supabase.com/dashboard.
2. Em **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Isso cria as tabelas e as regras de acesso.
3. Em **Authentication → URL Configuration**, coloque o endereço do site na Vercel em **Site URL** e adicione `https://*.vercel.app/**` e `http://localhost:5173/**` em **Redirect URLs**.
4. Login com Google (opcional): em **Authentication → Sign In / Providers → Google**, ative e cole o Client ID e o Client Secret criados no Google Cloud (tipo "Aplicativo da Web", com a URL de callback que o Supabase mostra nessa tela). O login por link no e-mail já funciona sem isso.
5. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public** para a Vercel como `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, e faça um novo deploy.

O e-mail de login sai pelo servidor de testes do Supabase, que manda poucos e-mails por hora. Para uso aberto, configure um SMTP próprio em **Authentication → Emails → SMTP Settings**.

## Qual IA é usada

| Variável definida | IA usada |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI: `gpt-5-mini` para gerar perguntas (troque com `OPENAI_MODEL`) e `gpt-5` para ler fotos (troque com `OPENAI_MODEL_IMAGEM`) |
| só `ANTHROPIC_API_KEY` | Claude, modelo `claude-opus-5-5` |

Se as duas estiverem definidas, a OpenAI tem prioridade.

## Limite de uso

Cada geração de quiz, leitura de fotos (ou de páginas escaneadas do PDF) e mensagem do tutor conta 1. Os limites zeram à meia-noite (UTC).

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
| `server/tutor.ts` | Tutor que explica uma questão e responde dúvidas |
| `src/lib/pdf.ts` | Extração do texto do PDF no navegador (pdf.js) |
| `src/lib/meta.ts` | Meta diária e sequência de dias |
| `src/lib/dados.ts` | Formato dos dados do aluno e a junção entre aparelhos |
| `src/lib/sincronizar.ts` | Sincronização com o Supabase |
| `src/lib/desafio.ts` | Desafios por link e placar |
| `src/lib/painel.ts` | Cálculos do painel de desempenho |
| `supabase/schema.sql` | Tabelas e regras de acesso do Supabase |
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
