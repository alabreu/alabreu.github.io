# Plano: Backend com usuários/login (Supabase)

> **Gatilho**: quando o Alexandre disser **"vamos fazer o backend"**, executar este plano.
> Status: **Fase 1 (lite) + Fase 2 em andamento** (iniciado em 06/07/2026, a pedido
> explícito do usuário para viabilizar o Coach como serviço embutido para testers).
> Ver `docs/supabase-setup.md` para o passo a passo de configuração pendente
> (criação do projeto Supabase, que só o usuário pode fazer).
>
> Escopo desta rodada: login por magic link (sem senha) + proxy do Coach com limite
> diário por usuário. **Decks na nuvem (resto da Fase 1) e Fase 3 ficam para depois** —
> não foram pedidos ainda.

## Contexto

O app é 100% estático (GitHub Pages, deploy horário via cron a partir do `master`).
Dados hoje: decks em `localStorage` (Zustand persist, chave `mtg-deck-builder-storage`);
chave do OpenRouter do Coach também em `localStorage` (`openrouter-api-key`) — cada
usuário precisa da própria. Objetivo: contas para amigos/testers, decks na nuvem,
Coach sem chave individual.

## Stack escolhida

**Supabase** (Postgres + Auth + Edge Functions), plano gratuito.
Motivo: funciona direto do frontend estático via SDK JS — não exige servidor próprio
nem mudança de hospedagem.

## Pré-requisito (ação do usuário)

Criar conta em supabase.com, criar projeto e fornecer:
- URL do projeto (`https://<ref>.supabase.co`)
- anon key (pública, pode ir no frontend)
- **NUNCA** commitar a service role key nem a chave do OpenRouter no repositório.

## Fase 1 — Login + decks na nuvem

1. `npm install @supabase/supabase-js`; cliente em `src/lib/supabase.ts`
   (URL + anon key via `import.meta.env.VITE_SUPABASE_*`, definidos no build).
2. Auth por **magic link** (e-mail, sem senha — ideal para testers); telas de
   login/logout; sessão persistida pelo SDK.
3. Tabela `decks`: `id uuid PK, user_id uuid FK auth.users, data jsonb,
   updated_at timestamptz`. O `data` guarda o objeto `Deck` inteiro (mesmo shape
   do tipo em `src/types/index.ts`) para não reprojetar o schema a cada mudança.
4. **RLS** (Row Level Security): política `user_id = auth.uid()` para
   select/insert/update/delete.
5. Sincronização no `useDeckStore`: continua com cache local (offline-first);
   ao logar, faz pull; mutações fazem push (debounced); conflito resolvido por
   `updatedAt` mais recente.
6. **Migração**: no primeiro login, importar decks existentes do `localStorage`
   para a conta.

## Fase 2 — Proxy do Coach (IA sem chave por usuário)

1. Edge Function `coach` no Supabase: recebe mensagens, injeta a chave do
   OpenRouter (secret da function), repassa o stream SSE para o cliente.
2. Exigir usuário autenticado; rate-limit simples por usuário.
3. Remover necessidade da chave no `localStorage` do cliente.

## Fase 3 (opcional) — Social

- Compartilhar deck por link público (flag `is_public` + rota de visualização).
- Ver decks de amigos / duplicar deck de outro usuário.

## Notas

- Alternativa mais leve já discutida: export/import de decks por texto/link,
  sem backend — válida se a necessidade for só compartilhar decklists.
- Free tier Supabase: 50k MAU, 500 MB de banco — suficiente de sobra.
