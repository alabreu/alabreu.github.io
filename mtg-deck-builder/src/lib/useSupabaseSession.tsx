import React from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
  // Set when the user arrives via a "reset password" email link. Supabase
  // signals this as a distinct auth event (not just a normal sign-in), so a
  // "set new password" screen can gate the app instead of silently treating
  // it like a regular login.
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

/** Owns the single Supabase auth subscription for the whole app. Mounted once
 *  at the root; every `useSupabaseSession()` reads from this context instead of
 *  each setting up its own getSession/onAuthStateChange/verifyOtp (which fired
 *  the token-hash exchange several times and ran redundant round-trips on every
 *  tab focus). */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = React.useState(false);

  React.useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    // Once any real auth event or verifyOtp result has landed, a late-resolving
    // initial getSession() must not clobber it back to the pre-verify state.
    let authSettled = false;

    async function init() {
      // Password-recovery and signup-confirmation links use a `token_hash` +
      // `type` query param (set via the corresponding email templates) instead
      // of the default PKCE `?code=` link. PKCE's code exchange depends on a
      // `code_verifier` stashed in localStorage by the SAME browser context
      // that called resetPasswordForEmail()/signUp() — but on iOS that's the
      // installed PWA, while the email link always opens in Safari, a separate
      // storage context. verifyOtp() has no such dependency: the token_hash
      // alone completes the exchange from any context.
      const url = new URL(window.location.href);
      const tokenHash = url.searchParams.get('token_hash');
      const otpType = url.searchParams.get('type');
      if (tokenHash && (otpType === 'recovery' || otpType === 'signup' || otpType === 'email')) {
        url.searchParams.delete('token_hash');
        url.searchParams.delete('type');
        window.history.replaceState(window.history.state, '', url.toString());
        const { error } = await supabase!.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
        if (error) console.error('[auth] verifyOtp failed:', error.status, error.message);
        authSettled = true; // onAuthStateChange delivers the resulting session
      }

      const { data } = await supabase!.auth.getSession();
      if (cancelled) return;
      if (!authSettled) setSession(data.session);
      setLoading(false);
    }
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      authSettled = true;
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
    });

    // The magic link always opens in the device's default browser, never
    // directly in an installed PWA (an OS limitation). If the PWA was already
    // open in the background, catch the newly-created session as soon as it's
    // brought to the foreground instead of waiting for a full reload.
    function handleVisible() {
      if (document.visibilityState === 'visible') {
        supabase!.auth.getSession().then(({ data }) => {
          if (!cancelled) setSession(data.session);
        });
      }
    }
    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('focus', handleVisible);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('focus', handleVisible);
    };
  }, []);

  const clearPasswordRecovery = React.useCallback(() => setIsPasswordRecovery(false), []);
  const value = React.useMemo(
    () => ({ session, loading, isPasswordRecovery, clearPasswordRecovery }),
    [session, loading, isPasswordRecovery, clearPasswordRecovery]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSupabaseSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error('useSupabaseSession must be used within a SessionProvider');
  return ctx;
}
