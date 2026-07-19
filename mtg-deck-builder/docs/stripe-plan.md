# Stripe integration — plan & setup

Tailored plan for an independent builder using **Payments + Invoicing + Tax**,
built on this repo's existing stack (React/Vite frontend + Supabase Edge
Functions + Postgres/RLS). Chosen defaults, and why:

| Decision | Choice | Why |
| --- | --- | --- |
| Charge model | **Recurring subscription** | Matches the Coach monetization already in `manual-backlog.md`; auto-invoicing + portal come almost for free. |
| Integration surface | **Hosted Stripe Checkout** | Least code, PCI **SAQ-A**, built-in 3DS/SCA, Stripe Tax, and BR methods (Pix/boleto). Best fit for a solo builder. |
| Server home | **Supabase Edge Functions** | Same place the secret key already lives for `coach-proxy`; secret key never enters the bundle. |
| Entitlement | **`subscriptions` table, webhook-written, RLS-read** | The client can never mark itself paid — only a verified webhook writes state. |
| Self-service | **Stripe Customer Portal** | Update card / see invoices / cancel with ~zero code. |

## What was added

- `supabase/migrations/0008_stripe_billing.sql` — `stripe_customers` + `subscriptions` (RLS: read-own, service-role writes only).
- `supabase/functions/create-checkout-session/` — auth-gated; creates/reuses the Stripe customer and returns a Checkout URL. Price is chosen **server-side**.
- `supabase/functions/create-portal-session/` — auth-gated; returns a Billing Portal URL.
- `supabase/functions/stripe-webhook/` — verifies the Stripe signature and mirrors subscription state. **Only writer of entitlement.**
- `src/lib/billing.ts` — `startCheckout()`, `openBillingPortal()`, `getEntitlement()`.

The frontend gets **no new secrets** — the publishable/price ids stay server-side.

## One-time setup (Stripe dashboard)

1. **Account / country** — confirm your account is in Brazil and can charge in BRL.
2. **Product + Price** — create a Product and a recurring **Price** (e.g. BRL/month). Copy the `price_...` id.
3. **Payment methods** — Settings → Payment methods: enable **cards** and, for BR, **Pix**/**boleto** (Checkout uses the dashboard's automatic methods).
4. **Stripe Tax** — Settings → Tax: enable it and add your **tax registrations**. Verify Stripe Tax coverage for your product/region before relying on automatic calculation — Brazilian indirect taxes (ISS/ICMS/PIS/COFINS) are complex; treat automatic tax as assistive and confirm with your accountant.
5. **Invoicing** — subscription invoices are issued automatically; the Customer Portal exposes them to users. Add your business details + **Terms/Refund** links (Settings → Business, and Checkout/Portal branding) — Stripe requires them for recurring billing.
6. **Customer Portal** — Settings → Billing → Customer portal: turn it on and choose allowed actions (cancel, update payment method, invoice history).
7. **Webhook endpoint** — Developers → Webhooks → add
   `https://<PROJECT_REF>.functions.supabase.co/stripe-webhook`, subscribe to:
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
   Copy the signing secret (`whsec_...`).

## Secrets (never commit these)

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_test_... \
  STRIPE_PRICE_ID=price_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  APP_BASE_URL=https://alabreu.github.io/mtg-deck-builder
# optional: STRIPE_TRIAL_DAYS=7
```

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do not set them.

## Deploy

```bash
# 1. Run the migration in the Supabase SQL Editor (paste 0008_stripe_billing.sql).
# 2. Deploy the functions:
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe calls this, not a user
```

## Wire it into the UI

```ts
import { startCheckout, openBillingPortal, getEntitlement } from '../lib/billing';

// Upgrade button:
<button onClick={() => startCheckout().catch((e) => toast(e.message))}>Assinar</button>

// Manage billing (for subscribers):
<button onClick={() => openBillingPortal().catch((e) => toast(e.message))}>Gerenciar assinatura</button>

// Gate a feature:
const { active } = await getEntitlement();
if (!active) { /* show paywall */ }
```

Add optional `#/billing` and `#/billing/success` routes to land users after
Checkout (the success page can poll `getEntitlement()` — the webhook usually
lands within a second or two).

## Testing

- Use **test mode** keys first. Test cards: `4242 4242 4242 4242` (success),
  `4000 0027 6000 3184` (3DS challenge).
- Local webhooks: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`.
- Verify: subscribe → row appears in `subscriptions` with `status=active`/`trialing`
  → cancel in the portal → row flips to `canceled`.

## Notes / gotchas

- Keep test and live keys separate; swap `STRIPE_PRICE_ID` when going live (ids differ per mode).
- The webhook must read the **raw** request body for signature verification — already handled.
- Automatic tax needs a customer **address**; Checkout collects it (`billing_address_collection: required`) and saves it via `customer_update`.
- `stripe_customers`/`subscriptions` have **no client write policies** by design — never add them.
