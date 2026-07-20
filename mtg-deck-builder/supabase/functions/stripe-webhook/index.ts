// Supabase Edge Function: receives Stripe webhook events and keeps the
// public.subscriptions table in sync with the customer's real state in Stripe.
// verify_jwt = false — Stripe calls this with a signed payload, not a Supabase
// JWT; we verify authenticity via the Stripe-Signature header instead.
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by the Edge Runtime).
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const stripe = new Stripe(STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/** Resolve the app user_id for a Stripe subscription: prefer the metadata we
 *  stamped at checkout, fall back to matching the customer id we already stored. */
async function resolveUserId(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.user_id;
  if (fromMeta) return fromMeta;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (!customerId) return null;
  const { data } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function upsertFromSubscription(sub: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserId(sub);
  if (!userId) return;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  await admin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_id: priceId,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return new Response('stripe_not_configured', { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('missing_signature', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return new Response(`bad_signature: ${String((e as Error)?.message ?? e)}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Persist the customer id early (even before the subscription events
        // land) so a returning user reuses the same Stripe customer.
        const userId = session.client_reference_id ?? session.metadata?.user_id ?? null;
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        if (userId && session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertFromSubscription(sub);
        } else if (userId && customerId) {
          await admin
            .from('subscriptions')
            .upsert(
              { user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString() },
              { onConflict: 'user_id' },
            );
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // Log and 500 so Stripe retries transient failures.
    console.error('webhook_handler_error', event.type, String((e as Error)?.message ?? e));
    return new Response('handler_error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
