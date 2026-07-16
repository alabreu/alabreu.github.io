// Supabase Edge Function: lets a logged-in user permanently delete their own
// account and cloud data (LGPD right / trust requirement). Runs with the
// service role so it can remove the auth user and rows across tables. Deploy:
//   supabase functions deploy delete-account
// No new secrets — SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by
// the Edge Runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json(401, { error: 'unauthorized' });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json(401, { error: 'unauthorized' });
  const userId = userData.user.id;

  // Remove the user's data first. Best-effort per table so a missing/renamed
  // table never blocks the actual account deletion.
  for (const table of ['decks', 'coach_message_log', 'coach_usage', 'feedback']) {
    try {
      await admin.from(table).delete().eq('user_id', userId);
    } catch { /* ignore — table may not have a user_id / may not exist */ }
  }

  // Finally delete the auth user itself. Rows in tables with an
  // `on delete cascade` FK to auth.users (admins, excluded_users) go with it.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) return json(500, { error: 'delete_failed' });

  return json(200, { ok: true });
});
