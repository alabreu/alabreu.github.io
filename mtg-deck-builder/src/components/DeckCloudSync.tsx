import React from 'react';
import { supabaseConfigured } from '../lib/supabase';
import { useSupabaseSession } from '../lib/useSupabaseSession';
import { pullAndMergeOnLogin, startSyncing } from '../lib/deckSync';

/** Renders nothing — keeps decks synced with Supabase for as long as a
 *  session is active. Mounted once at the app root. */
export function DeckCloudSync() {
  const { session } = useSupabaseSession();
  const userId = session?.user.id ?? null;

  React.useEffect(() => {
    if (!supabaseConfigured || !userId) return;
    let cancelled = false;
    let stopSyncing: (() => void) | null = null;

    (async () => {
      await pullAndMergeOnLogin(userId);
      if (!cancelled) stopSyncing = startSyncing(userId);
    })();

    return () => {
      cancelled = true;
      stopSyncing?.();
    };
  }, [userId]);

  return null;
}
