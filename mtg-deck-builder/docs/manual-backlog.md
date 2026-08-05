# Meu backlog manual (só o que depende de você)

Tarefas que **eu não consigo fazer sozinho**: exigem uma conta externa, um
segredo, ou um clique num painel ao qual não tenho acesso de escrita.

> O par deste arquivo é `project-backlog.md`, com as ideias que **eu construo
> sozinho** — nada de lá está esperando você.

Última revisão: 05/08/2026.

---

## 🔵 Recorrente

### Rodar o deploy
Sempre que eu avisar que tem pacote no `master`:
**GitHub → Actions → "Deploy to GitHub Pages" → Run workflow** (branch `master`).

Isto **nunca** vai sair da sua lista: a integração do GitHub deste ambiente não
tem escopo de `workflow_dispatch` (dá 403 "Resource not accessible by
integration"). A alternativa é não fazer nada e esperar o cron horário.

---

## 🟡 Aberto

### Confirmar a entrega do e-mail de contato
Mande um e-mail de outra conta para `contato@tutor-brew.com` e veja se cai na
caixa. É o único teste que prova a corrente inteira (MX → regra de roteamento →
destino verificado). Se não chegar, o suspeito nº 1 é o link de verificação do
destino não ter sido clicado no Gmail.

---

## ⏸️ Estacionado (decisão sua de quando)

### Stripe — plugar os segredos
A infra do servidor já está construída e no ar em **modo teste**
(`stripe-checkout`, `stripe-webhook`, tabela `subscriptions`). Falta só:

1. Painel do Stripe com **Test mode LIGADO** → Product catalog → criar produto
   com preço **recorrente mensal** → copiar o **API ID** (`price_...`).
2. Developers → API keys → **Reveal test key** (`sk_test_...`).
3. Developers → Webhooks → Add endpoint:
   `https://rxshomnccqfcarvujswq.supabase.co/functions/v1/stripe-webhook`
   com os eventos `checkout.session.completed`,
   `customer.subscription.created/updated/deleted` → copiar o
   **Signing secret** (`whsec_...`).
4. Supabase → Project Settings → Edge Functions → Secrets, criar os três:
   `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.

Me avise e eu rodo um checkout de teste ponta a ponta (`4242 4242 4242 4242`).

### Monitoramento de erros — Sentry
sentry.io → plano Developer (free, 5k erros/mês) → novo projeto **React** →
copiar o **DSN** e me passar. O DSN é público por design, pode mandar no chat.

### Analytics — Plausible ou Umami
Plausible tem trial de 30 dias sem cartão, depois ~US$ 9/mês. **Umami Cloud** tem
free tier permanente (10k eventos/mês) e é equivalente em privacidade — provavelmente
a escolha melhor. Criar a conta pro domínio `tutor-brew.com` e me avisar.

### Repo dedicado para o Tutor Brew
Hoje ele vive em `alabreu/alabreu.github.io`. Se decidir separar, **você** precisa:
1. Criar o repo `alabreu/tutor-brew` no GitHub.
2. Re-adicionar os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. **Editar o Worker `tutor-brew-proxy`** no Cloudflare pro caminho novo — o
   conector que tenho é somente leitura para Workers.

⚠️ Entre o deploy novo e o ajuste do Worker o `tutor-brew.com` fica fora do ar
por alguns minutos. O resto (mover arquivos preservando histórico, workflow,
`base` do Vite, preview `/dev/`) é comigo.

### Opcionais sem pressa
- **Reduzir expiração do OTP**: Supabase → Auth → Email → OTP expiry. Endurece
  o magic link.
- **TCGplayer / afiliado**: cadastrar na Impact, pegar o link base e setar o
  secret `VITE_TCGPLAYER_AFFILIATE_BASE`. O código já é no-op sem ele.

---

## 💰 Só antes de cobrar

- **Definir o pacote comercial**: preço, trial, política de reembolso, e o que é
  grátis vs pago. Você quis decidir com dados de uso reais — a telemetria de
  custo por mensagem já está rodando pra isso.
- **Revisão jurídica** dos Termos e da Privacidade (LGPD + Código de Defesa do
  Consumidor). Os textos atuais são rascunhos sob medida, não revisados por
  advogado. O Stripe também exige política de reembolso.
- **Nota fiscal / tributação**: com um contador, definir como receber e declarar
  (MEI/PF) e se/como emitir NF.
- **Trocar as chaves do Stripe** de teste para live.

---

## ✅ Concluído

| Item | Quando |
|---|---|
| Migrações `0005`–`0007` + virar admin | jul/2026 |
| Deploy do `coach-proxy` e `admin-openrouter-status` | jul/2026 |
| Teto de gasto na chave do OpenRouter (Auto Top-Up OFF, limite US$ 10) | jul/2026 |
| Snapshot "Por função" (14.139 cartas; slug `protection` validado) | 20/07/2026 |
| Deploy da Edge Function `delete-account` | jul/2026 |
| Cloudflare Email Routing → `contato@tutor-brew.com` | 04/08/2026 |
| Leaked Password Protection no Supabase Auth | 05/08/2026 |
