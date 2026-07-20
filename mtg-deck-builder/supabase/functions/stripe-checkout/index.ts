// Creates a Stripe Checkout Session (subscription) for the logged-in user and
// returns its URL. Requires secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_ID (and
// optionally APP_URL). verify_jwt = true — only authenticated users can call it.
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_PRICE_ID = Deno.env.get('STRIPE_PRICE_ID') ?? '';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://tutor-brew.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) return json(500, { error: 'stripe_not_configured' });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json(401, { error: 'unauthorized' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json(401, { error: 'unauthorized' });
  const user = userData.user;

  const stripe = new Stripe(STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${APP_URL}/#/?checkout=success`,
      cancel_url: `${APP_URL}/#/?checkout=cancel`,
      ...(existing?.stripe_customer_id
        ? { customer: existing.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
    });
    return json(200, { url: session.url });
  } catch (e) {
    return json(500, { error: 'checkout_failed', message: String((e as Error)?.message ?? e) });
  }
});
