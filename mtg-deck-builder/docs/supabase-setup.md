# Setup do Supabase — Coach embutido

Passo a passo para ativar o Coach como serviço embutido (login por magic link +
proxy que usa sua chave do OpenRouter, escondida no servidor). O código já está
pronto no repositório; falta só esta configuração, que só você pode fazer
(criação de conta em serviço de terceiro + segredos).

## 1. Criar o projeto Supabase

1. Crie uma conta grátis em [supabase.com](https://supabase.com) (dá para usar
   login com GitHub).
2. **New project** → dê um nome (ex: `cobuilder`) → escolha uma senha de banco
   (guarde-a, mas não vai ser usada por nós) → região mais próxima (`South America`
   se disponível).
3. Aguarde ~2 min até o projeto ficar pronto.

## 2. Pegar URL e anon key (pode compartilhar comigo — são públicas)

Em **Settings → API**, copie:
- **Project URL** (algo como `https://xxxxxxxx.supabase.co`)
- **anon / public key** (uma string longa começando com `eyJ...`)

Essas duas eu preciso para configurar o build — pode me passar aqui no chat,
elas são seguras para expor no frontend (protegidas por RLS/Edge Function).

## 3. Rodar a migração do banco

Em **SQL Editor**, cole e rode o conteúdo de
`mtg-deck-builder/supabase/migrations/0001_coach_usage.sql` (cria a tabela que
controla o limite diário de mensagens por usuário).

## 4. Configurar o e-mail de magic link (opcional, recomendado)

Em **Authentication → URL Configuration**, confira que **Site URL** está como
`https://alabreu.github.io/mtg-deck-builder/` — é para onde o link do e-mail
redireciona depois do login.

## 5. Guardar sua chave do OpenRouter como segredo (NÃO me envie essa chave)

Via **Supabase CLI** (`npm install -g supabase`, depois `supabase login`):

```bash
supabase link --project-ref xxxxxxxx   # o "ref" está na URL do projeto
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-...
```

Ou pelo dashboard: **Edge Functions → Secrets → New secret**, nome
`OPENROUTER_API_KEY`.

## 6. Publicar a Edge Function

```bash
supabase functions deploy coach-proxy --no-verify-jwt
```

(`--no-verify-jwt` porque a função já valida o token manualmente e assim aceita
qualquer usuário autenticado; sem essa flag o Supabase também bloquearia por
padrão antes mesmo de chegar no nosso código — funciona dos dois jeitos, mas
sem a flag fica redundante).

Se preferir, posso rodar esses dois últimos comandos por você — nesse caso me
gere um **Personal Access Token** em Account → Access Tokens e me passe (eu uso
só para o deploy e não guardo depois; recomendo revogar o token quando terminar).

## 7. Me avisar

Depois de ter feito os passos 1–6 (ou pelo menos 1–3, e me passar o token para
eu fazer o resto), me diga que está pronto e eu:
- Adiciono `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` como **GitHub Secrets**
  do repositório (Settings → Secrets and variables → Actions) — preciso que
  você faça essa parte também, ou me autorize a orientar você passo a passo.
- Publico uma nova versão e testamos o login por magic link de ponta a ponta.

## Limite de uso

Por padrão, cada usuário logado pode enviar até **40 mensagens/dia** ao Coach
(constante `DAILY_LIMIT` em `supabase/functions/coach-proxy/index.ts`) — ajuste
esse número conforme sentir necessidade depois de ver o uso real.
