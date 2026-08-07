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

### Ligar a caixa de entrada por e-mail
✅ **Lado Supabase pronto** — migração `0011` aplicada e a função `email-inbox`
deployada (com `verify_jwt` desligado, que é o correto: a Cloudflare não tem
sessão do Supabase e a autenticação é pelo segredo abaixo). Verifiquei inserindo
uma linha `type='email'` e conferindo que ela sai no payload do dashboard com o
assunto — depois removi a linha de teste.

Faltam três passos nos seus painéis:

**1) Criar o segredo compartilhado.** Gere um valor aleatório:
```
openssl rand -hex 32
```
Guarde — ele vai nos passos 2 e 3, e precisa ser **idêntico** nos dois.

**2) Supabase.** Project Settings → Edge Functions → Secrets → adicionar
`EMAIL_INBOX_SECRET` com esse valor.

**3) Cloudflare — criar o Worker:**
- Workers & Pages → Create → Worker → colar `cloudflare/email-worker.js` → Deploy.
- Settings → Variables, adicionar:
  - `FORWARD_TO` = seu Gmail (o mesmo destino já verificado)
  - `INBOX_URL` = `https://rxshomnccqfcarvujswq.supabase.co/functions/v1/email-inbox`
  - `INBOX_SECRET` = o valor do passo 1 — marcar **Encrypt**

**4) Cloudflare — apontar o endereço pro Worker:**
Email → Email Routing → Routing rules → editar `contato@tutor-brew.com` →
ação **Send to a Worker** → escolher o Worker criado.

⚠️ O Worker **encaminha pro Gmail primeiro** e só depois manda pro dashboard, então
trocar a regra não faz você perder e-mail: se o Supabase estiver fora, a mensagem
chega no Gmail do mesmo jeito e só a cópia do dashboard é perdida.

Enquanto o passo 2 não for feito, a função responde 500 `not_configured` — ou
seja, nada quebra, só não grava.

Depois, mande um e-mail de teste e me avise — ele deve aparecer em `/#/admin`
com o chip "e-mail", junto do feedback in-app.

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
| Entrega do e-mail testada ponta a ponta (Activity Log: `Forwarded`) | 05/08/2026 |
| Deploy do pacote com seleção múltipla, botão do Tutor, vidro e contato nos documentos (sha `6cbc579`) | 05/08/2026 |
