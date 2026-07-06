import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// The anon key is meant to be public (protected by Row Level Security /
// Edge Function auth checks server-side) — it's safe to embed in the bundle.
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // PKCE puts the magic-link token in a `?code=` query param instead of
        // a `#access_token=...` hash fragment, which would otherwise collide
        // with this app's HashRouter (#/deck/:id) routes.
        flowType: 'pkce',
      },
    })
  : null;
