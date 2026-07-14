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

// Guard rails against prompt-injection / token-abuse (e.g. someone treating
// the Tutor as a free general-purpose LLM proxy). Keep in sync with
// src/features/deck-builder/CoachTab.tsx's MODELS list.
const ALLOWED_MODELS = new Set([
  'openai/gpt-4o-mini',
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1:free',
  'google/gemma-3-27b-it:free',
  'qwen/qwq-32b:free',
  'mistralai/mistral-7b-instruct:free',
]);
const MAX_MESSAGES = 60;
// The system prompt (deck list + persona + rules + guard rails + custom
// instructions) can legitimately run ~6.5k chars for a full 100-card deck —
// give it headroom instead of clipping real conversations.
const MAX_MESSAGE_CHARS = 9000;
const MAX_TOTAL_CHARS = 45000;
const MAX_TOKENS = 2000;

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
  const today = new Date().toISOString().slice(0, 10);

  // Validate the request body BEFORE touching the counter, so a malformed
  // request never consumes a user's daily quota.
  let body: { model?: string; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'bad_request', 'Corpo da requisição inválido.');
  }
  if (!body.model || !Array.isArray(body.messages)) {
    return jsonError(400, 'bad_request', 'model e messages são obrigatórios.');
  }
  if (!ALLOWED_MODELS.has(body.model)) {
    return jsonError(400, 'bad_request', 'Modelo não suportado.');
  }

  const messages = body.messages as unknown[];
  if (messages.length === 0 || messages.length > MAX_MESSAGES) {
    return jsonError(400, 'bad_request', 'Conversa inválida ou longa demais.');
  }
  let totalChars = 0;
  for (const m of messages) {
    if (
      typeof m !== 'object' ||
      m === null ||
      !('role' in m) ||
      !('content' in m) ||
      typeof (m as { role: unknown }).role !== 'string' ||
      typeof (m as { content: unknown }).content !== 'string' ||
      !['system', 'user', 'assistant'].includes((m as { role: string }).role)
    ) {
      return jsonError(400, 'bad_request', 'Mensagem inválida.');
    }
    const content = (m as { content: string }).content;
    if (content.length > MAX_MESSAGE_CHARS) {
      return jsonError(400, 'bad_request', 'Mensagem longa demais.');
    }
    totalChars += content.length;
  }
  if (totalChars > MAX_TOTAL_CHARS) {
    return jsonError(400, 'bad_request', 'Conversa longa demais.');
  }

  // Rate limit: atomically increment today's counter (see migration 0004). The
  // returned value reflects all concurrent callers, so parallel requests can't
  // race past the cap the way a read-then-write could.
  const { data: newCount, error: incErr } = await admin.rpc('add_coach_usage', {
    p_user_id: userId,
    p_day: today,
    p_delta: 1,
  });
  if (incErr || typeof newCount !== 'number') {
    return jsonError(500, 'internal', 'Erro ao verificar limite de uso.');
  }
  if (newCount > DAILY_LIMIT) {
    // Over the cap — refund the increment we just made and reject.
    await admin.rpc('add_coach_usage', { p_user_id: userId, p_day: today, p_delta: -1 });
    return jsonError(
      429,
      'rate_limited',
      `Limite diário do Tutor atingido (${DAILY_LIMIT} mensagens). Volte amanhã!`
    );
  }

  // Refund the counted message if the upstream call fails, so an overloaded
  // free model returning 429s doesn't silently burn the user's daily quota.
  async function refund() {
    await admin.rpc('add_coach_usage', { p_user_id: userId, p_day: today, p_delta: -1 });
  }

  let upstream: Response;
  try {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://alabreu.github.io',
        'X-Title': 'Cobuilder Tutor',
      },
      body: JSON.stringify({ model: body.model, stream: true, messages, max_tokens: MAX_TOKENS }),
    });
  } catch {
    // Network/DNS failure reaching OpenRouter — must still return CORS headers,
    // or the browser reports an opaque CORS error and the client's friendly
    // error mapping never runs.
    await refund();
    return jsonError(502, 'upstream_unreachable', 'Não foi possível contatar o modelo. Tente novamente.');
  }

  if (!upstream.ok) {
    await refund();
    // Forward the upstream error body (the client parses error.code/message)
    // with CORS headers attached.
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  }

  // Stream OpenRouter's SSE response straight through to the client
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': upstream.headers.get('Content-Type') ?? 'text/event-stream',
    },
  });
});
