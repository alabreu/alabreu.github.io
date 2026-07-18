# Backlog manual (coisas que dependem de você)

Passos que só você consegue fazer (têm segredos, acesso ao painel do Supabase/
OpenRouter, contas externas). Tudo é seguro de rodar mais de uma vez (migrações
usam `if not exists` / `on conflict do nothing`).

## ⭐ Ordem recomendada (faça de cima pra baixo)

**Agora — ligar o que já está construído:**
1. Rodar migrações `0005 → 0006 → 0007` + virar admin + excluir testers → **seção A**.
2. Redeploy `coach-proxy` + deploy `admin-openrouter-status` → **seção B**.
3. **Teto de gasto rígido no OpenRouter** → **seção C**. (crítico antes de qualquer público)
4. (Opcional) Popular o snapshot "Por função" → **seção E**.

**Antes de divulgar publicamente (ainda grátis):**
5. Ativar **Cloudflare Email Routing** (e-mail de suporte) → **seção D** → eu faço o Worker.
6. **Deploy da Edge Function de exclusão de conta** → **seção G** (depois que eu construir o código).
7. (Opcional) Criar conta de **monitoramento de erros / analytics** → **seção H** → eu ligo.

**Antes de cobrar (monetização):**
8. Definir **preços/trial/reembolso** e criar **conta Stripe** → **seção I** → eu construo pagamento + gating.
9. **Revisão jurídica** + aperto dos termos → **seção F**.
10. **Nota fiscal / tributação** → **seção I**.

> O que **não depende de você** (landing + OG, exclusão de conta no app, onboarding/
> deck de exemplo, FAQ, página de preços) eu construo e faço o deploy sozinho — só
> aparecem aqui os passos que exigem sua conta/segredo/deploy.

## A. Banco de dados — rodar migrações no SQL Editor do Supabase

Rode **na ordem**, uma de cada vez (SQL Editor → cole o arquivo → Run):

1. `supabase/migrations/0005_security_hardening.sql` — cap global de uso + limites de tamanho.
2. `supabase/migrations/0006_telemetry_and_admin.sql` — telemetria + funções do dashboard.
3. `supabase/migrations/0007_app_settings_active_model.sql` — controle do modelo pelo admin.

Depois:

4. Vire admin (troque pelo seu user id de `auth.users`):
   ```sql
   insert into public.admins (user_id) values ('SEU_UUID') on conflict do nothing;
   ```
   (Ache seu UUID em Authentication → Users, ou `select id, email from auth.users;`.)
5. Marque os testers pra não poluírem os números do dashboard (um por linha):
   ```sql
   insert into public.excluded_users (user_id, note) values ('UUID_DO_TESTER', 'tester Fulano') on conflict do nothing;
   ```

## B. Edge Functions — publicar/atualizar

Depois das migrações (a `coach-proxy` agora lê o modelo ativo de `app_settings`):

6. Redeployar o proxy (agora decide o modelo no servidor, ignora o do cliente):
   ```
   supabase functions deploy coach-proxy
   ```
7. Publicar a função nova que lê saldo/gasto do OpenRouter pro dashboard:
   ```
   supabase functions deploy admin-openrouter-status
   ```
   Ela usa o segredo `OPENROUTER_API_KEY` que já existe (mesmo do proxy) — nada a mais a configurar.

Feito A + B, o dashboard (`/#/admin`) mostra o seletor de **Modelo ativo do Tutor**
e o painel **OpenRouter (gasto/restante)**, e trocar o modelo lá vale pra todos.

## C. OpenRouter — teto de gasto (importante antes de ligar modelo pago)

8. No painel do OpenRouter, defina um **limite de gasto rígido** na chave usada pelo
   Tutor. O código já tem caps (40/dia por usuário, 2000/dia global), mas o teto na
   própria chave é a última linha de defesa contra custo inesperado.

## E. Agrupamento "Por função" — popular o snapshot (uma vez + refresh)

O modo **Por função** (Configurações → Agrupar cartas) usa um snapshot
`mtg-deck-builder/public/functionTags.json` gerado das tags da comunidade do
Scryfall. Ele **vem vazio** no repo — até popular, "Por função" joga tudo em
"Outros" (o fallback), sem quebrar nada.

9. Popular pela primeira vez (escolha um):
   - **Manual:** `cd mtg-deck-builder && node scripts/build-function-tags.mjs`
     (precisa de internet; sem chave de API), depois commitar o
     `public/functionTags.json` atualizado.
   - **Automático:** no GitHub, aba Actions → "Refresh function tags" →
     *Run workflow*. Ele gera e commita sozinho (o deploy horário publica).
10. Conferir os números que o script imprime por categoria. **Slugs já
    verificados** (tags reais do Scryfall): `ramp`, `removal`, `card-advantage`,
    `alternate-win-condition`. O único **não confirmado é `protection`** — se a
    linha "Proteção" vier **0**, me avise que troco por um slug válido (ou removo
    a categoria). As outras quatro devem vir com centenas/milhares de cartas.

Depois disso, o refresh mensal é automático (cron no dia 1º). Quando sair um set
novo e você quiser atualizar na hora, é só rodar o workflow manualmente.

## F. Jurídico — Termos e Privacidade (rascunho no ar; endurecer antes de cobrar)

Já estão publicados (`/#/termos` e `/#/privacidade`) e linkados na tela de login
com um aviso de aceite. São **rascunhos sob medida**, redigidos conforme o que o
app realmente faz — mas antes de **cobrar** (monetização), faça:

11. **Revisão jurídica** dos dois textos (LGPD + Código de Defesa do Consumidor).
    Não sou advogado; para cobrança de consumidor no Brasil vale um profissional.
12. **Aceite explícito**: trocar o aviso por um checkbox obrigatório no cadastro e
    registrar no banco qual versão foi aceita (auditável). Eu construo quando disser.
13. **Termos de assinatura/cobrança/reembolso** (o Stripe exige links de Termos +
    Privacidade + política de reembolso).
14. Preencher o **contato oficial** (e-mail de suporte, quando o Email Routing sair)
    e a identidade do controlador nos documentos — hoje o contato aponta para o
    "Enviar feedback".

## G. Exclusão de conta — publicar a Edge Function

Direito do titular (LGPD) e requisito de confiança pra abrir ao público. **Eu
construo a tela no app + o código da função**; você só faz o deploy (ela precisa
da service role pra apagar o usuário de `auth.users`, então roda como Edge
Function, igual ao `coach-proxy`).

15. Depois que eu entregar o código: `supabase functions deploy delete-account`
    (o nome final eu confirmo no commit). Sem segredos novos.

## H. Monitoramento de erros e analytics (opcional, recomendado antes de escalar)

Precisam de conta externa; **a fiação no app eu faço** assim que você me passar a chave.

16. **Erros:** criar projeto no Sentry (ou GlitchTip) → me passar o DSN. Eu ligo
    o SDK (tem free tier).
17. **Analytics de produto (privacy-friendly):** criar conta no Plausible (ou
    Umami) pro domínio `tutor-brew.com` → me passar o script/domínio. Eu ligo.

## I. Monetização (antes de cobrar)

18. **Definir o pacote comercial:** preço da assinatura, duração do trial, política
    de reembolso, e o que é grátis vs pago. (Eu já tenho o plano desenhado; preciso
    dos números.)
19. **Criar conta Stripe** (PF/CPF serve pra recorrência no Brasil) → me passar as
    chaves (via secret, nunca no código). Aí **eu construo** checkout, webhooks,
    portal de gerenciamento, estado de assinante no banco e o gating do Tutor.
20. **Nota fiscal / tributação:** definir com um contador como receber e declarar
    (MEI/PF) e se/como emitir NF. Decisão sua/contábil.

## D. Opcionais (quando quiser)

- **Reduzir expiração do OTP** (Auth → Email → OTP expiry) pra endurecer o magic link.
- **TCGplayer / afiliado:** cadastrar na Impact, pegar o link base e setar o secret
  `VITE_TCGPLAYER_AFFILIATE_BASE` no repositório (o código já é no-op sem ele).
- **E-mail de contato:** ativar Cloudflare Email Routing → me avisar que eu construo
  o Worker que joga os e-mails na mesma caixa de entrada do dashboard.

---

## Notas de produto

- **Modelo do Tutor:** o usuário final não escolhe mais o modelo. Você escolhe um
  único modelo ativo no dashboard (grátis ou pago). Modelos pagos disponíveis:
  GPT-4o mini, Gemini 2.5 Flash, Gemini 2.5 Flash Lite. Enquanto A+B não rodam, o
  proxy antigo continua usando `gpt-4o-mini` e nada quebra.
- **BYOK (usar a própria chave):** hoje, em produção, todo mundo usa o Tutor pelo
  proxy — não há escolha "modelo do Tutor vs BYOK" na experiência do usuário ainda.
  Isso é de propósito: BYOK só faz sentido quando existir um limite/paywall pra
  "escapar", então ele entra junto da monetização (assinatura), não antes. O caminho
  BYOK legado (build sem Supabase) continua existindo pra dev/fork.
