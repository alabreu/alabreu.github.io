// Supabase Edge Function: reports the OpenRouter key's spend / remaining credit
// to the private admin dashboard. Admin-gated (checks the public.admins
// allowlist). Reads the OpenRouter key from the same secret the coach-proxy
// uses, so the key never reaches the browser. Deploy with:
//   supabase functions deploy admin-openrouter-status
// Required secrets: OPENROUTER_API_KEY (already set for coach-proxy).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return jsonError(401, 'unauthorized', 'Faça login.');

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return jsonError(401, 'unauthorized', 'Sessão inválida.');

  // Gate on the admins allowlist — same table the dashboard's SQL functions use.
  const { data: adminRow } = await admin
    .from('admins')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (!adminRow) return jsonError(403, 'forbidden', 'Acesso negado.');

  // GET /api/v1/key returns limit / limit_remaining / usage (all in USD) plus
  // rate-limit and free-tier flags for the key.
  let keyInfo: Record<string, unknown> = {};
  try {
    const res = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
    });
    if (res.ok) {
      const j = await res.json();
      keyInfo = j?.data ?? {};
    }
  } catch { /* leave empty */ }

  // GET /api/v1/credits returns total_credits / total_usage for the account.
  let credits: Record<string, unknown> = {};
  try {
    const res = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
    });
    if (res.ok) {
      const j = await res.json();
      credits = j?.data ?? {};
    }
  } catch { /* leave empty */ }

  return new Response(JSON.stringify({ key: keyInfo, credits }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
