// Supabase Edge Function: receives Stripe webhook events, verifies their
// signature, and mirrors subscription state into public.subscriptions. This is
// the ONLY writer of entitlement — the client never marks itself paid. Deploy:
//   supabase functions deploy stripe-webhook --no-verify-jwt
// (--no-verify-jwt because Stripe, not a logged-in user, calls this endpoint;
//  we authenticate the request via the Stripe signature instead.)
//
// Required secrets:
//   STRIPE_SECRET_KEY       — sk_test_... / sk_live_... (NEVER in git)
//   STRIPE_WEBHOOK_SECRET   — whsec_... from the webhook endpoint you create at
//                             https://dashboard.stripe.com/webhooks (NEVER in git)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by the Edge Runtime.
//
// Recommended events to send to this endpoint:
//   checkout.session.completed
//   customer.subscription.created
//   customer.subscription.updated
//   customer.subscription.deleted
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@18?target=deno';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
});
// Deno has Web Crypto but not Node's crypto, so signature verification must use
// the async SubtleCrypto provider + constructEventAsync (the sync variant fails
// in this runtime).
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/** Resolves our Supabase user id for a Stripe customer, healing the mapping
 *  from customer metadata if the row is missing. */
async function resolveUserId(customerId: string): Promise<string | null> {
  const { data: row } = await admin
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (row?.user_id) return row.user_id as string;

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) {
      const uid = (customer.metadata as Record<string, string>)?.supabase_user_id;
      if (uid) {
        await admin
          .from('stripe_customers')
          .upsert({ user_id: uid, stripe_customer_id: customerId }, { onConflict: 'user_id' });
        return uid;
      }
    }
  } catch { /* fall through */ }
  return null;
}

async function upsertSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const userId = await resolveUserId(customerId);
  if (!userId) {
    console.error('stripe-webhook: no user for customer', customerId);
    return;
  }
  const item = sub.items?.data?.[0];
  // `current_period_end` lives on the subscription in older API versions and on
  // the subscription item in newer ones — read whichever is present.
  const periodEndUnix =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    (item as unknown as { current_period_end?: number } | undefined)?.current_period_end ??
    null;

  await admin.from('subscriptions').upsert(
    {
      id: sub.id,
      user_id: userId,
      status: sub.status,
      price_id: item?.price?.id ?? null,
      current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
}

Deno.serve(async (req: Request) => {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400 });

  // Raw body is required for signature verification — do NOT req.json() first.
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (err) {
    console.error('stripe-webhook: signature verification failed', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscription(sub);
        } else if (session.mode === 'payment' && session.payment_status === 'paid') {
          // Donation (or any one-off). Record it for metrics; user_id is null
          // for anonymous donors.
          const uid = (session.metadata as Record<string, string> | null)?.supabase_user_id ?? null;
          await admin.from('donations').upsert(
            {
              id: session.id,
              user_id: uid,
              amount_total: session.amount_total ?? 0,
              currency: session.currency ?? 'brl',
              status: 'paid',
            },
            { onConflict: 'id' },
          );
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        // Ignore other event types — safe to receive, nothing to do.
        break;
    }
  } catch (err) {
    // Return 500 so Stripe retries with backoff instead of dropping the event.
    console.error('stripe-webhook: handler error', err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
