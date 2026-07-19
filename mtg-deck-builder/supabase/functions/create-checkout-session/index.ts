// Supabase Edge Function: creates a Stripe Checkout Session for the logged-in
// user and returns its URL. The browser then redirects to Stripe's hosted page,
// which handles card entry / Pix / boleto, 3DS/SCA, tax collection and invoicing
// (PCI stays SAQ-A — no card data ever touches our code). Deploy with:
//   supabase functions deploy create-checkout-session
//
// Required secrets (set via `supabase secrets set ...` or the dashboard):
//   STRIPE_SECRET_KEY   — sk_test_... / sk_live_... (NEVER in git)
//   STRIPE_PRICE_ID     — the recurring Price id (price_...) to subscribe to
// Optional secrets:
//   APP_BASE_URL        — where to return after checkout
//                         (default https://alabreu.github.io/mtg-deck-builder)
//   STRIPE_TRIAL_DAYS   — integer; adds a free trial when > 0
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by the Edge Runtime.
//
// The Price is chosen SERVER-SIDE (STRIPE_PRICE_ID), never sent by the client —
// same principle as coach-proxy ignoring the client-sent model, so a user can't
// swap in a cheaper/free price.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID')!;
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://alabreu.github.io/mtg-deck-builder';
const TRIAL_DAYS = Number(Deno.env.get('STRIPE_TRIAL_DAYS') ?? '0');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

/** Finds the user's Stripe customer id, creating (and persisting) one on first
 *  use. Stores the Supabase user id in customer metadata so the webhook can
 *  recover the mapping even if the row is ever missing. */
async function getOrCreateCustomer(
  admin: ReturnType<typeof createClient>,
  userId: string,
  email: string | undefined,
): Promise<string> {
  const { data: existing } = await admin
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing?.stripe_customer_id) return existing.stripe_customer_id as string;

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });
  // Upsert (not insert) to tolerate a racing concurrent checkout for the same
  // user; the unique constraint on user_id keeps a single row.
  await admin
    .from('stripe_customers')
    .upsert({ user_id: userId, stripe_customer_id: customer.id }, { onConflict: 'user_id' });
  return customer.id;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json(405, { error: { code: 'method_not_allowed', message: 'Method not allowed.' } });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json(401, { error: { code: 'unauthorized', message: 'Faça login para assinar.' } });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return json(401, { error: { code: 'unauthorized', message: 'Sessão inválida — saia e entre novamente.' } });
  }
  const user = userData.user;

  try {
    const customerId = await getOrCreateCustomer(admin, user.id, user.email);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      // Let the Stripe dashboard's "automatic payment methods" decide which
      // methods show (cards, Pix, boleto, wallets) instead of hardcoding them.
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      // Stripe Tax computes and adds tax automatically. Requires Tax enabled +
      // your tax registrations configured in the dashboard.
      automatic_tax: { enabled: true },
      // Persist the address/name Checkout collects back onto the customer, so
      // renewals, invoices and the billing portal have them.
      customer_update: { address: 'auto', name: 'auto' },
      subscription_data: TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : undefined,
      success_url: `${APP_BASE_URL}/#/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_BASE_URL}/#/billing`,
    });

    return json(200, { url: session.url });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return json(500, { error: { code: 'stripe_error', message: 'Não foi possível iniciar o checkout. Tente novamente.' } });
  }
});
