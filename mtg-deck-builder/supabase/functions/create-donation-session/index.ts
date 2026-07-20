// Supabase Edge Function: creates a one-time DONATION Checkout Session (hosted,
// mode=payment, "Donate" button). The amount is chosen by the donor but clamped
// server-side to a sane range. Login is OPTIONAL — anonymous visitors can
// donate; if a valid session is present we attach the Stripe customer + the
// Supabase user id so the webhook can attribute the donation for metrics.
// Deploy with:
//   supabase functions deploy create-donation-session
//
// Required secrets:
//   STRIPE_SECRET_KEY   — sk_test_... / sk_live_... (NEVER in git)
// Optional secrets:
//   APP_BASE_URL        — return target (default https://alabreu.github.io/mtg-deck-builder)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by the Edge Runtime.
//
// No Product/Price needed: the donation uses inline price_data, so there is
// nothing to pre-create in the dashboard. Donations are intentionally NOT taxed
// (a tip to support the project, not a sale) — revisit if that changes for you.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://alabreu.github.io/mtg-deck-builder';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Guard rails on the donor-chosen amount (in cents / centavos): R$5 to R$1000.
const MIN_AMOUNT = 500;
const MAX_AMOUNT = 100_000;
const CURRENCY = 'brl';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json(405, { error: { code: 'method_not_allowed', message: 'Method not allowed.' } });

  let body: { amount?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: { code: 'bad_request', message: 'Corpo inválido.' } });
  }
  // Amount arrives in cents (centavos). Reject anything non-integer or out of range.
  const amount = body.amount;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return json(400, { error: { code: 'bad_amount', message: `Valor deve estar entre R$${MIN_AMOUNT / 100} e R$${MAX_AMOUNT / 100}.` } });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Login is OPTIONAL. functions.invoke sends the anon key as Authorization when
  // logged out, so getUser simply fails for anonymous donors — that's fine.
  let userId: string | undefined;
  let customerId: string | undefined;
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (jwt) {
    const { data: userData } = await admin.auth.getUser(jwt);
    if (userData?.user) {
      userId = userData.user.id;
      // Reuse (or lazily create) the same customer as the billing flow, so a
      // donor's later subscription lands on one customer record.
      const { data: existing } = await admin
        .from('stripe_customers')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (existing?.stripe_customer_id) {
        customerId = existing.stripe_customer_id as string;
      } else {
        const customer = await stripe.customers.create({
          email: userData.user.email,
          metadata: { supabase_user_id: userId },
        });
        customerId = customer.id;
        await admin
          .from('stripe_customers')
          .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' });
      }
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'donate',
      customer: customerId,
      metadata: userId ? { supabase_user_id: userId, kind: 'donation' } : { kind: 'donation' },
      // Attach the same metadata to the PaymentIntent so it's queryable there too.
      payment_intent_data: {
        metadata: userId ? { supabase_user_id: userId, kind: 'donation' } : { kind: 'donation' },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: amount,
            product_data: { name: 'Doação — Tutor Brew' },
          },
        },
      ],
      success_url: `${APP_BASE_URL}/#/doar/obrigado?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_BASE_URL}/#/doar`,
    });
    return json(200, { url: session.url });
  } catch (err) {
    console.error('create-donation-session error:', err);
    return json(500, { error: { code: 'stripe_error', message: 'Não foi possível iniciar a doação. Tente novamente.' } });
  }
});
