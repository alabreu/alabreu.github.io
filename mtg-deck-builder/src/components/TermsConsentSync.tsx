import React from 'react';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import { recordTermsAcceptance } from '../lib/termsConsent';

/** When a user is logged in, record their acceptance of the current Terms
 *  version once. The signup form gates on an explicit checkbox; this captures
 *  the recorded trail uniformly across every auth method (email, Google). */
export function TermsConsentSync() {
  const { session } = useSupabaseSession();
  const userId = session?.user?.id;
  React.useEffect(() => {
    if (userId) void recordTermsAcceptance(userId);
  }, [userId]);
  return null;
}
