import React from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export function useSupabaseSession() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
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

  return { session, loading };
}
