import { supabase } from './supabase';

// Bump when the Terms/Privacy change materially. Matches the "Última atualização"
// shown on the legal pages. Recorded per user in public.terms_acceptance so we
// have an auditable trail of who accepted which version (LGPD).
export const TERMS_VERSION = '2026-07-16';

/** Record that the current user accepted the current version. Idempotent
 *  (PK on user_id+version) and best-effort — a failed record must never block
 *  using the app. */
export async function recordTermsAcceptance(userId: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from('terms_acceptance')
      .upsert({ user_id: userId, version: TERMS_VERSION }, { onConflict: 'user_id,version', ignoreDuplicates: true });
  } catch {
    /* best-effort */
  }
}
