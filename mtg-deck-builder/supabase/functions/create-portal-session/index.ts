// Supabase Edge Function: returns a Stripe Billing Customer Portal URL for the
// logged-in user. The portal is Stripe-hosted self-service where the user can
// update their card, see/download invoices, and cancel — near-zero code on our
// side. Deploy with:
//   supabase functions deploy create-portal-session
//
// Required secrets:
//   STRIPE_SECRET_KEY   — sk_test_... / sk_live_... (NEVER in git)
// Optional secrets:
//   APP_BASE_URL        — where the portal returns to
//                         (default https://alabreu.github.io/mtg-deck-builder)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by the Edge Runtime.
//
// One-time setup: enable the Customer Portal and pick which actions it exposes
// at https://dashboard.stripe.com/settings/billing/portal
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://alabreu.github.io/mtg-deck-builder';
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json(405, { error: { code: 'method_not_allowed', message: 'Method not allowed.' } });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json(401, { error: { code: 'unauthorized', message: 'Faça login.' } });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return json(401, { error: { code: 'unauthorized', message: 'Sessão inválida — saia e entre novamente.' } });
  }

  const { data: row } = await admin
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (!row?.stripe_customer_id) {
    return json(404, { error: { code: 'no_customer', message: 'Nenhuma assinatura encontrada para esta conta.' } });
  }

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id as string,
      return_url: `${APP_BASE_URL}/#/billing`,
    });
    return json(200, { url: portal.url });
  } catch (err) {
    console.error('create-portal-session error:', err);
    return json(500, { error: { code: 'stripe_error', message: 'Não foi possível abrir o portal de cobrança. Tente novamente.' } });
  }
});
