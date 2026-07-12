// Supabase Edge Function: proxies Coach chat requests to OpenRouter using a
// server-side secret key, gated by Supabase auth (magic-link session) and a
// daily per-user message limit. Deploy with:
//   supabase functions deploy coach-proxy
// Required secrets (set via `supabase secrets set` or the dashboard):
//   OPENROUTER_API_KEY        — the embedded OpenRouter key (never in git)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the Supabase Edge Runtime — do not set them manually.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Bounds worst-case cost exposure per user per day. Tune to taste.
const DAILY_LIMIT = 40;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed', 'Method not allowed.');

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return jsonError(401, 'unauthorized', 'Faça login para usar o Tutor.');

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return jsonError(401, 'unauthorized', 'Sessão inválida — saia e entre novamente.');
  }
  const userId = userData.user.id;

  // Rate limit: read + upsert today's counter for this user
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage, error: usageErr } = await admin
    .from('coach_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('day', today)
    .maybeSingle();
  if (usageErr) {
    return jsonError(500, 'internal', 'Erro ao verificar limite de uso.');
  }
  const currentCount = usage?.count ?? 0;
  if (currentCount >= DAILY_LIMIT) {
    return jsonError(
      429,
      'rate_limited',
      `Limite diário do Tutor atingido (${DAILY_LIMIT} mensagens). Volte amanhã!`
    );
  }
  await admin
    .from('coach_usage')
    .upsert({ user_id: userId, day: today, count: currentCount + 1 }, { onConflict: 'user_id,day' });

  let body: { model?: string; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'bad_request', 'Corpo da requisição inválido.');
  }
  if (!body.model || !Array.isArray(body.messages)) {
    return jsonError(400, 'bad_request', 'model e messages são obrigatórios.');
  }

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://alabreu.github.io',
      'X-Title': 'Cobuilder Tutor',
    },
    body: JSON.stringify({ model: body.model, stream: true, messages: body.messages }),
  });

  // Stream OpenRouter's SSE response straight through to the client
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': upstream.headers.get('Content-Type') ?? 'text/event-stream',
    },
  });
});
