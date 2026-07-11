# alabreu.github.io

Site pessoal + **MTG Commander Deck Builder** em `mtg-deck-builder/` (React + Vite + TS).

## Deploy

- GitHub Pages publica do branch `gh-pages` (fonte: Settings → Pages → branch).
- Workflow `.github/workflows/deploy.yml`: roda **de hora em hora** (cron) e por
  `workflow_dispatch` — push em `master` NÃO dispara deploy (evita o limite de
  ~10 builds/hora do Pages, que já nos travou).
- Para publicar imediatamente: disparar o workflow "Deploy to GitHub Pages" manualmente.
- O app mostra a versão (sha + hora do build) no menu da home; um toast avisa o
  usuário quando há versão nova no servidor (`version.json` gerado no build).

## Dev

- `cd mtg-deck-builder && npm run dev` (base `/mtg-deck-builder/`, HashRouter).
- Sempre rodar `npm run build` antes de commitar mudanças do app.
- Idioma da UI: português (pt-BR).

## Backend (Supabase) — Fases 1 e 2 em produção

- Login por magic link, decks na nuvem e proxy do Coach (Fases 1 e 2 de
  `mtg-deck-builder/docs/backend-plan.md`) configurados e funcionando desde
  11/07/2026 (projeto `CoBuilder`, ref `rxshomnccqfcarvujswq`). SMTP customizado
  via Resend (o e-mail padrão do Supabase é limitado/não confiável).
- `CoachTab` usa o proxy (`supabase/functions/coach-proxy`) quando
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` estão definidos no build; caso
  contrário cai no fluxo antigo (chave do OpenRouter do próprio usuário).
- Decks sincronizam com a nuvem (tabela `decks`, RLS por `user_id`) via
  `src/lib/deckSync.ts`, montado em `App.tsx` por `DeckCloudSync`: no login,
  puxa e funde com o local (mais recente por `updatedAt` vence); mutações locais
  empurram (debounced) enquanto a sessão está ativa; troca de conta no mesmo
  navegador não vaza decks de uma conta pra outra (`mtg-deck-builder-last-synced-user`).
  Sem sessão, tudo continua local-only (localStorage), sem mudança de comportamento.
- Migrações do banco em `mtg-deck-builder/supabase/migrations/` — rodar cada
  nova migração manualmente no SQL Editor do Supabase (sem CI de banco ainda).
- Fase 3 (social) continua para quando o usuário disser **"vamos fazer o
  backend"** de novo, referindo-se ao restante do plano.

## Segurança

- NUNCA commitar a chave do OpenRouter nem a Supabase **service role key**.
  A anon key do Supabase é pública por design (protegida por RLS/Edge Function)
  e pode ir no bundle/repo sem problema.
- Chave do OpenRouter: no fluxo legado (sem Supabase configurado) vive só no
  localStorage do navegador do usuário; no fluxo novo (embutido), vive só como
  secret da Edge Function `coach-proxy`, nunca no código.
