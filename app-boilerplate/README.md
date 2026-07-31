# app-boilerplate

Ponto de partida para apps novos (React + Vite + TS + Tailwind v4 + Supabase +
Vercel), extraído dos padrões do **Tutor Brew** e do **Komme**. Todo app criado
a partir daqui já nasce com:

- **i18n** (pt/en) com chaves tipadas — tradução faltando nunca renderiza em branco
- **Feedback** in-app (Supabase, aceita anônimo; fallback `mailto:` sem backend)
- **Novidades** (changelog curado com badge de "não lido")
- **Uso sem login** (guest-first) + criar conta / entrar com email+senha + **Google**
- **Botão no topo direito** que abre um sheet com tudo isso (extensível por app)
- **PWA** com toast de "nova versão disponível"

## Como criar um app novo

1. No GitHub: **Use this template** → crie o repositório do app novo.
2. Clone, `npm install`, `npm run dev`. O app já roda 100% em modo convidado,
   sem nenhuma variável de ambiente.
3. **Renomeie** (checklist abaixo).
4. Quando quiser login/nuvem: crie o projeto no Supabase (passos abaixo).
5. Conecte o repositório na Vercel (framework Vite é detectado; `vercel.json`
   já cuida do rewrite de SPA) e configure as variáveis de ambiente lá também.

### Checklist de renomeação

| Onde | O quê |
| --- | --- |
| `src/core/config.ts` | `APP_NAME` e `STORAGE_PREFIX` (slug do app) |
| `vite.config.ts` | `APP_NAME`, `APP_DESCRIPTION`, `THEME_COLOR` (manifest PWA) |
| `index.html` | `<title>`, `<meta name="description">`, `theme-color` |
| `package.json` | `name` |
| `src/index.css` | Valores da paleta em `@theme` (mantenha os nomes semânticos) |
| `public/` | Ícones: rode `npm run icons` para placeholders, troque pela arte real antes do lançamento |
| `src/core/changelog.ts` | Substitua a entrada inicial |

### Setup do Supabase (quando for ligar login/nuvem)

1. Crie o projeto no [Supabase](https://supabase.com) e copie a URL + anon key
   para `.env` (a partir de `.env.example`) e para as env vars da Vercel.
   A anon key é pública por design (protegida por RLS) — a **service_role
   nunca** sai do dashboard.
2. Rode `supabase/migrations/0001_feedback.sql` no SQL Editor.
3. **Google login**: Supabase → Authentication → Providers → Google. Crie as
   credenciais OAuth no Google Cloud Console (tipo "Web application"), com o
   redirect `https://<ref>.supabase.co/auth/v1/callback`, e cole client id +
   secret no Supabase. Em Authentication → URL Configuration, adicione o
   domínio do app (e `http://localhost:5173`) às Redirect URLs.
4. Email: o SMTP padrão do Supabase é limitado/pouco confiável — para produção,
   configure SMTP customizado (ex.: Resend), como no Tutor Brew.

## Arquitetura: "cérebro" vs "pele"

```
src/
  core/   # cérebro — portável (sem DOM/UI): i18n, auth, feedback, changelog, stores
  ui/     # pele — só web: screens, components, hooks
  app/    # bootstrap: App.tsx (rotas + seeds), main.tsx
```

Regras:

- **Nada em `src/core/` importa de `src/ui/`** nem usa APIs de DOM
  (exceções pontuais de `localStorage` são guardadas e comentadas).
- Aliases: `@core/*`, `@ui/*`, `@app/*`.
- **Todo acesso ao backend passa por `src/core/backend/client.ts`** — essa é a
  costura que mantém a migração de provedor viável (ver abaixo).
- Sem env vars de backend, o app degrada para 100% local (guest mode) — nunca
  quebre essa propriedade ao adicionar features.

## Plano de migração para AWS (quando um app validar)

A decisão de infra deste boilerplate: **Supabase + Vercel para começar** (piso
de segurança alto com ~zero ops), migrando para AWS completa **quando um app
estiver validado** e justificar operação dedicada. O código já está preparado —
o provedor fica atrás de costuras únicas:

| Peça | Hoje | Na AWS | Onde trocar |
| --- | --- | --- | --- |
| Cliente backend | Supabase JS | API Gateway + Lambda (ou AppSync) | `core/backend/client.ts` |
| Auth | Supabase Auth | Cognito (via `amazon-cognito-identity-js` / Amplify Auth) | `core/auth/client.ts` (a UI só vê `AuthUser`) |
| Banco | Postgres (Supabase) | RDS/Aurora Postgres — as migrações SQL em `supabase/migrations/` são Postgres puro e portam direto | `supabase/migrations/` |
| Regras por usuário | RLS (`auth.uid()`) | Lambda valida o JWT do Cognito e filtra por `user_id` | camada de dados em `core/` |
| Hosting | Vercel | S3 + CloudFront (+ CDK para IaC) | `vercel.json` → stack CDK |

O que **não** muda na migração: `ui/` inteira, `core/i18n`, `core/changelog`,
stores, telas. O que muda fica confinado a `core/backend`, `core/auth` e ao
deploy.

## Desenvolvimento

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm run build      # typecheck + build de produção (rodar antes de commitar)
npm run preview    # serve o build localmente
npm run icons      # regenera os ícones placeholder do PWA
```

## Segurança

- NUNCA commitar a **service_role key** do Supabase nem qualquer secret. A anon
  key é pública por design e pode ir no bundle.
- Tabelas novas: **sempre** habilitar RLS e escrever as policies junto com a
  migração — nunca depois.
- Feedback é insert-only por RLS: clientes não conseguem ler o que outros
  enviaram; leia pelo dashboard (ou um RPC `security definer` gated por
  allowlist de admins, como no Tutor Brew).
