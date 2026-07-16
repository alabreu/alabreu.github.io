import React from 'react';
import { supabase } from './supabase';
import { useSupabaseSession } from './useSupabaseSession';

// Whether the current user is in the `admins` allowlist (migration 0006). Used
// only to decide whether to show the dashboard entry — the real gate is the
// SECURITY DEFINER admin_metrics() function, which self-checks admin status.
export function useIsAdmin(): boolean {
  const { session } = useSupabaseSession();
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    if (!supabase || !session) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsAdmin(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  return isAdmin;
}
