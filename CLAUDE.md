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

## Coach (IA) — Supabase em andamento

- Login por magic link + proxy do Coach (Fase 1 lite + Fase 2 de
  `mtg-deck-builder/docs/backend-plan.md`) iniciado em 06/07/2026. Setup
  pendente (ação do usuário) documentado em `mtg-deck-builder/docs/supabase-setup.md`.
- `CoachTab` usa o proxy (`supabase/functions/coach-proxy`) quando
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` estão definidos no build; caso
  contrário cai no fluxo antigo (chave do OpenRouter do próprio usuário).
- Decks na nuvem (resto da Fase 1) e Fase 3 (social) continuam para quando o
  usuário disser **"vamos fazer o backend"** (agora referindo-se ao restante
  do plano).

## Segurança

- NUNCA commitar a chave do OpenRouter nem a Supabase **service role key**.
  A anon key do Supabase é pública por design (protegida por RLS/Edge Function)
  e pode ir no bundle/repo sem problema.
- Chave do OpenRouter: no fluxo legado (sem Supabase configurado) vive só no
  localStorage do navegador do usuário; no fluxo novo (embutido), vive só como
  secret da Edge Function `coach-proxy`, nunca no código.
