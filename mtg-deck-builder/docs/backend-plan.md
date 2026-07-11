# Plano: Backend com usuários/login (Supabase)

> **Gatilho**: quando o Alexandre disser **"vamos fazer o backend"**, executar este plano.
> Status: **Fases 1 e 2 completas e em produção** desde 11/07/2026 (projeto
> Supabase `CoBuilder`, ref `rxshomnccqfcarvujswq`). Iniciado em 06/07/2026 a
> pedido do usuário para viabilizar o Coach como serviço embutido; decks na
> nuvem entraram no mesmo dia da configuração final do projeto, a pedido do
> usuário ("sinto falta dos decks que eu crio em um device aparecerem em outro").
> Ver `docs/supabase-setup.md` para o histórico do setup (já concluído).
>
> **Fase 3 fica para depois** — não foi pedida ainda.

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

## Fase 1 — Login + decks na nuvem ✅

1. ✅ `@supabase/supabase-js`; cliente em `src/lib/supabase.ts`
   (URL + anon key via `import.meta.env.VITE_SUPABASE_*`, definidos no build
   pelo workflow via GitHub Secrets).
2. ✅ Auth por **magic link** (e-mail, sem senha — ideal para testers); tela de
   login em `CoachLoginGate.tsx`; sessão gerenciada por `useSupabaseSession`.
3. ✅ Tabela `decks`: `id text PK` (mesmo id gerado localmente, não uuid — evita
   remodelar ids já existentes), `user_id uuid FK auth.users, data jsonb,
   updated_at timestamptz` (migração `0002_decks.sql`). O `data` guarda o
   objeto `Deck` inteiro (mesmo shape do tipo em `src/types/index.ts`).
4. ✅ **RLS**: política `user_id = auth.uid()` para select/insert/update/delete.
5. ✅ Sincronização em `src/lib/deckSync.ts` (montada por `DeckCloudSync` em
   `App.tsx`): local continua como cache (offline-first); ao logar, `pullAndMergeOnLogin`
   busca os decks da conta e funde com os locais (conflito por `updatedAt` mais
   recente); `startSyncing` observa o store e empurra mudanças (debounced
   ~1.2s) e exclusões enquanto a sessão está ativa.
6. ✅ **Migração de primeiro login**: decks locais sem par na nuvem são
   automaticamente enviados na primeira sincronização (mesma lógica do merge,
   sem passo separado).
7. ✅ Guarda contra troca de conta no mesmo navegador: `mtg-deck-builder-last-synced-user`
   no localStorage evita que decks de uma conta "vazem" pra outra ao trocar de
   login no mesmo device.

## Fase 2 — Proxy do Coach (IA sem chave por usuário) ✅

1. ✅ Edge Function `coach-proxy` no Supabase (`supabase/functions/coach-proxy`):
   recebe mensagens, injeta a chave do OpenRouter (secret da function),
   repassa a resposta pro cliente.
2. ✅ Exige usuário autenticado (valida o JWT); rate-limit de 40 msgs/dia por
   usuário via tabela `coach_usage` (migração `0001_coach_usage.sql`).
3. ✅ Fluxo legado (chave do OpenRouter do próprio usuário no `localStorage`)
   mantido como fallback quando `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
   não estão configurados no build.

## Fase 3 (opcional) — Social

- Compartilhar deck por link público (flag `is_public` + rota de visualização).
- Ver decks de amigos / duplicar deck de outro usuário.

## Notas

- Alternativa mais leve já discutida: export/import de decks por texto/link,
  sem backend — válida se a necessidade for só compartilhar decklists.
- Free tier Supabase: 50k MAU, 500 MB de banco — suficiente de sobra.
