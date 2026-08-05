import { supabase } from './supabase';

// Bump ONLY when the Terms/Privacy change materially — i.e. when what the user
// agreed to actually changed. Recorded per user in public.terms_acceptance so we
// have an auditable trail of who accepted which version (LGPD).
//
// This deliberately does NOT track every edit, so it can lag the "Última
// atualização" date on the pages. On 04/08/2026 they gained a support e-mail
// (contato@tutor-brew.com) for exercising data-subject rights: that widens what
// the user can do and removes nothing, so it needs no re-consent. Bumping for it
// would silently write "accepted the 04/08 version" for people who never saw it
// — a worse audit trail than leaving it alone.
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
