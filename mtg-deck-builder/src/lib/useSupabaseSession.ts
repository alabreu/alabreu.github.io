import React from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export function useSupabaseSession() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  // Set when the user arrives via a "reset password" email link. Supabase
  // signals this as a distinct auth event (not just a normal sign-in), so a
  // "set new password" screen can gate the app instead of silently treating
  // it like a regular login.
  const [isPasswordRecovery, setIsPasswordRecovery] = React.useState(false);

  React.useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Password-recovery links use a `token_hash` + `type=recovery` query
    // param (set via the "Reset Password" email template) instead of the
    // default PKCE `?code=` link. PKCE's code exchange depends on a
    // `code_verifier` stashed in localStorage by the SAME browser context
    // that called resetPasswordForEmail() — but on iOS, that's the installed
    // PWA, while the email link always opens in Safari, a separate storage
    // context. verifyOtp() has no such dependency: the token_hash alone is
    // enough to complete the exchange from any context.
    const url = new URL(window.location.href);
    const tokenHash = url.searchParams.get('token_hash');
    const otpType = url.searchParams.get('type');
    if (tokenHash && otpType === 'recovery') {
      url.searchParams.delete('token_hash');
      url.searchParams.delete('type');
      window.history.replaceState(window.history.state, '', url.toString());
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
    });

    // The magic link always opens in the device's default browser, never
    // directly in an installed PWA (an OS limitation, not something a web
    // app can override). If the PWA was already open in the background,
    // catch the newly-created session as soon as it's brought back to the
    // foreground, instead of waiting for the next full reload.
    function handleVisible() {
      if (document.visibilityState === 'visible') {
        supabase!.auth.getSession().then(({ data }) => setSession(data.session));
      }
    }
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleVisible);

    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleVisible);
    };
  }, []);

  return { session, loading, isPasswordRecovery, clearPasswordRecovery: () => setIsPasswordRecovery(false) };
}
