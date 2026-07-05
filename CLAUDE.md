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

## Planos pendentes

- **Backend/usuários (Supabase)**: quando o usuário disser **"vamos fazer o backend"**,
  seguir `mtg-deck-builder/docs/backend-plan.md`.

## Segurança

- NUNCA commitar chaves (OpenRouter, Supabase service role). A chave do OpenRouter
  do usuário vive só no localStorage do navegador dele.
