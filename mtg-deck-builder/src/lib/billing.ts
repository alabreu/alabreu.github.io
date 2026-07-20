// Frontend billing helpers. All the money logic lives server-side in the
// Stripe Edge Functions (create-checkout-session / create-portal-session /
// stripe-webhook); this module just kicks off those redirects and reads the
// user's entitlement, which RLS scopes to their own rows.
import { supabase } from './supabase';

/** Redirects the browser to Stripe Checkout to start a subscription. Requires a
 *  logged-in Supabase session (functions.invoke attaches the access token). */
export async function startCheckout(): Promise<void> {
  if (!supabase) throw new Error('Login na nuvem não está configurado.');
  const { data, error } = await supabase.functions.invoke<{ url?: string }>('create-checkout-session');
  if (error || !data?.url) {
    throw new Error('Não foi possível iniciar o checkout. Tente novamente.');
  }
  window.location.href = data.url;
}

/** Redirects the browser to a one-time donation Checkout. `amountBRL` is in
 *  reais (e.g. 25 → R$25); it's converted to cents and re-validated server-side.
 *  Login is optional — anonymous visitors can donate. */
export async function startDonation(amountBRL: number): Promise<void> {
  if (!supabase) throw new Error('Doações não estão configuradas.');
  const amount = Math.round(amountBRL * 100);
  const { data, error } = await supabase.functions.invoke<{ url?: string }>('create-donation-session', {
    body: { amount },
  });
  if (error || !data?.url) {
    throw new Error('Não foi possível iniciar a doação. Tente novamente.');
  }
  window.location.href = data.url;
}

/** Redirects to the Stripe Billing Portal (update card, invoices, cancel). */
export async function openBillingPortal(): Promise<void> {
  if (!supabase) throw new Error('Login na nuvem não está configurado.');
  const { data, error } = await supabase.functions.invoke<{ url?: string }>('create-portal-session');
  if (error || !data?.url) {
    throw new Error('Não foi possível abrir o portal de cobrança. Tente novamente.');
  }
  window.location.href = data.url;
}

export interface Entitlement {
  /** True while the user has an active or trialing subscription. */
  active: boolean;
  status?: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

/** Reads the user's current subscription entitlement. Returns inactive when
 *  logged out, cloud isn't configured, or there's no subscription row. RLS
 *  guarantees only the caller's own rows are visible. */
export async function getEntitlement(): Promise<Entitlement> {
  if (!supabase) return { active: false };
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, cancel_at_period_end')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return { active: false };
  return {
    active: ACTIVE_STATUSES.has(data.status),
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  };
}
