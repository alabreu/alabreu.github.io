# Backlog do projeto

Ideias e melhorias que **eu (Claude) consigo construir sozinho** — ficam aqui até
virarem prioridade. Nada aqui está bloqueado por você; é só uma fila de trabalho.

> O par deste arquivo é `manual-backlog.md`, que lista só o que **depende de
> ações suas** (contas externas, segredos, cliques em painel).

---

## Produto — pré-lançamento

### Landing page
Arquitetura **já decidida**: mesma origem (`tutor-brew.com`), com um "smart gate"
que detecta se o usuário já tem decks/sessão e manda direto pro app; visitante
novo vê a landing. **Não usar subdomínio** — `localStorage` é por origem, então
`app.tutor-brew.com` órfãoaria os decks locais de quem já usa.

### Onboarding / deck de exemplo
Primeira sessão hoje cai num estado vazio. Ideia: um deck de exemplo pronto pra
explorar, ou um caminho guiado até o primeiro deck. (Um empty state ilustrado
chegou a ser testado e foi revertido — não agradou.)

### Imagens OG / meta de compartilhamento
Pra o link do `tutor-brew.com` renderizar bonito quando compartilhado.

---

## Monetização (construir junto da decisão de preço)

### UI de assinatura + gating
A infra de servidor já existe (`stripe-checkout`, `stripe-webhook`, tabela
`subscriptions`, tudo em modo teste). Falta a parte visível: tela de planos,
botão de assinar, portal de gerenciamento e onde exatamente o limite aperta.
Depende de você definir preço/trial/reembolso primeiro.

### Página de preços
Junto do item acima.

### BYOK como escape hatch
Hoje, em produção, todo mundo usa o Tutor pelo proxy. Ideia: deixar o usuário
colar a **própria** chave do OpenRouter pra escapar do limite diário sem custo
pra nós. Só faz sentido quando existir um limite/paywall pra "escapar" — por
isso entra junto da monetização, não antes. (O caminho BYOK legado já existe no
código para builds sem Supabase.)

---

## Social — Fase 3 do backend-plan

- Compartilhar deck por link público (flag `is_public` + rota de visualização).
- Ver decks de amigos / duplicar deck de outro usuário.
- Alternativa mais leve, sem backend: export/import por texto/link — suficiente
  se a necessidade for só passar decklists adiante.

---

## Dívidas técnicas conhecidas

### Repo dedicado + migração de hospedagem
O Tutor Brew vive dentro de `alabreu/alabreu.github.io` (repo de user-pages), na
pasta `mtg-deck-builder/`. Os dois movimentos são **independentes** — o Vercel
aceita apontar pra uma subpasta, então o repo dedicado não é pré-requisito da
migração de hospedagem. Melhor momento: com `dev` e `master` iguais. Envolve
ações suas (ver `manual-backlog.md`).

---

## Ideias soltas

- Mais ações em lote no sheet "Editar" da seleção múltipla: alterar quantidade,
  marcar como maybeboard, etc. O sheet foi desenhado pra crescer.

---

## ✅ Feito

- **Cartas "any number of copies"** (05/08/2026) — limite de cópias agora é por
  carta, com teto próprio para Seven Dwarves e Nazgûl. Lista gerada do Scryfall
  e atualizada pelo workflow mensal.
- **Worker de e-mail → dashboard** (05/08/2026) — código pronto; falta você
  aplicar (ver `manual-backlog.md`).
