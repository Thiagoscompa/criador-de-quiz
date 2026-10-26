-- Caderno de Quiz: tabelas do Supabase (fase 3).
-- Rode este arquivo uma vez em Supabase → SQL Editor → New query → Run.
-- Ele pode ser rodado de novo sem perder dados.

-- 1. Dados de cada aluno (quizzes, revisões, metas, desempenho), sincronizados entre aparelhos.
create table if not exists public.dados_usuario (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

alter table public.dados_usuario enable row level security;

drop policy if exists "cada um lê os seus dados" on public.dados_usuario;
create policy "cada um lê os seus dados" on public.dados_usuario
  for select using (auth.uid() = user_id);

drop policy if exists "cada um grava os seus dados" on public.dados_usuario;
create policy "cada um grava os seus dados" on public.dados_usuario
  for insert with check (auth.uid() = user_id);

drop policy if exists "cada um atualiza os seus dados" on public.dados_usuario;
create policy "cada um atualiza os seus dados" on public.dados_usuario
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Quizzes compartilhados por link. Só as perguntas: nunca fotos nem o texto do material.
create table if not exists public.desafios (
  id text primary key check (id ~ '^[A-Za-z0-9]{8,16}$'),
  criado_por uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz jsonb not null check (pg_column_size(quiz) < 200000),
  criado_em timestamptz not null default now()
);

alter table public.desafios enable row level security;

drop policy if exists "qualquer pessoa com o link lê" on public.desafios;
create policy "qualquer pessoa com o link lê" on public.desafios
  for select using (true);

drop policy if exists "quem tem conta cria" on public.desafios;
create policy "quem tem conta cria" on public.desafios
  for insert to authenticated with check (auth.uid() = criado_por);

drop policy if exists "o autor apaga" on public.desafios;
create policy "o autor apaga" on public.desafios
  for delete using (auth.uid() = criado_por);

-- 3. Placar de cada desafio. Quem recebe o link joga sem conta, então o envio é aberto,
-- com limites para nomes e números absurdos.
create table if not exists public.placar (
  id bigint generated always as identity primary key,
  desafio_id text not null references public.desafios (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 30),
  acertos int not null check (acertos >= 0),
  total int not null check (total between 1 and 50 and acertos <= total),
  tempo_ms int not null check (tempo_ms between 1000 and 7200000),
  criado_em timestamptz not null default now()
);

create index if not exists placar_por_desafio on public.placar (desafio_id, acertos desc, tempo_ms asc);

alter table public.placar enable row level security;

drop policy if exists "placar é público" on public.placar;
create policy "placar é público" on public.placar
  for select using (true);

drop policy if exists "qualquer pessoa entra no placar" on public.placar;
create policy "qualquer pessoa entra no placar" on public.placar
  for insert to anon, authenticated with check (true);
