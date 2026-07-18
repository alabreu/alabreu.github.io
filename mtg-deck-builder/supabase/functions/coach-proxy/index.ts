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
// Backstop across ALL users: since signup is self-serve, the per-user limit
// alone doesn't cap aggregate spend on the paid model (an attacker can create
// many accounts). This hard daily ceiling protects the OpenRouter key's cost
// regardless of account count. Raise it as the real user base grows. NOTE:
// this is only a code-side safety net — also set a hard spend limit on the
// OpenRouter key itself in the OpenRouter dashboard.
const GLOBAL_DAILY_LIMIT = 2000;

// Safety allowlist for the server-chosen active model (defense-in-depth: a bad
// value in app_settings.active_model falls back to the default below instead of
// routing to an arbitrary, possibly expensive, model). Keep in sync with
// src/features/deck-builder/tutorModels.ts.
const ALLOWED_MODELS = new Set([
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'deepseek/deepseek-v4-flash',
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1:free',
  'google/gemma-3-27b-it:free',
  'qwen/qwq-32b:free',
  'mistralai/mistral-7b-instruct:free',
]);
// Fallback when app_settings has no (or an invalid) active_model row.
const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash';
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
  // request never consumes a user's daily quota. Note: the client-sent `model`
  // (if any) is IGNORED — the model is a product decision resolved server-side
  // from app_settings below, so a user can't force a pricier model.
  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'bad_request', 'Corpo da requisição inválido.');
  }
  if (!Array.isArray(body.messages)) {
    return jsonError(400, 'bad_request', 'messages é obrigatório.');
  }

  // Resolve the admin-chosen active model (migration 0007). Falls back to the
  // default on any miss, and re-validates against the allowlist so a stray DB
  // value can never route to an unbounded model.
  let model = DEFAULT_MODEL;
  try {
    const { data: setting } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'active_model')
      .maybeSingle();
    if (typeof setting?.value === 'string' && ALLOWED_MODELS.has(setting.value)) {
      model = setting.value;
    }
  } catch { /* keep default */ }

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

  // Reconstruct the messages with ONLY role+content before forwarding, so a
  // client can't smuggle extra keys (a multi-MB junk field that escapes the
  // size caps, or OpenRouter routing params) into the upstream request. Also
  // enforce a single leading system message — the app always sends exactly one
  // at index 0; anything else is a malformed/abusive payload.
  const safeMessages: { role: string; content: string }[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i] as { role: string; content: string };
    if (m.role === 'system' && i !== 0) {
      return jsonError(400, 'bad_request', 'Estrutura de conversa inválida.');
    }
    safeMessages.push({ role: m.role, content: m.content });
  }

  // Rate limit: atomically increment today's per-user counter (migration 0004).
  const { data: newCount, error: incErr } = await admin.rpc('add_coach_usage', {
    p_user_id: userId,
    p_day: today,
    p_delta: 1,
  });
  if (incErr || typeof newCount !== 'number') {
    return jsonError(500, 'internal', 'Erro ao verificar limite de uso.');
  }
  if (newCount > DAILY_LIMIT) {
    await admin.rpc('add_coach_usage', { p_user_id: userId, p_day: today, p_delta: -1 });
    return jsonError(
      429,
      'rate_limited',
      `Limite diário do Tutor atingido (${DAILY_LIMIT} mensagens). Volte amanhã!`
    );
  }

  // Global daily backstop (migration 0005) — bounds total spend across all
  // accounts. Increment only after the per-user check passed.
  const { data: globalCount, error: gErr } = await admin.rpc('add_global_coach_usage', {
    p_day: today,
    p_delta: 1,
  });
  if (gErr || typeof globalCount !== 'number') {
    await admin.rpc('add_coach_usage', { p_user_id: userId, p_day: today, p_delta: -1 });
    return jsonError(500, 'internal', 'Erro ao verificar limite de uso.');
  }
  if (globalCount > GLOBAL_DAILY_LIMIT) {
    await admin.rpc('add_global_coach_usage', { p_day: today, p_delta: -1 });
    await admin.rpc('add_coach_usage', { p_user_id: userId, p_day: today, p_delta: -1 });
    return jsonError(429, 'rate_limited', 'O Tutor atingiu o limite de uso de hoje. Tente novamente amanhã.');
  }

  // Refund both counters if the upstream call fails, so an overloaded free
  // model returning 429s doesn't silently burn anyone's quota.
  async function refund() {
    await admin.rpc('add_coach_usage', { p_user_id: userId, p_day: today, p_delta: -1 });
    await admin.rpc('add_global_coach_usage', { p_day: today, p_delta: -1 });
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
      // usage.include asks OpenRouter to append a final chunk with token counts
      // and actual cost, which we tee off for telemetry (see below).
      body: JSON.stringify({
        model,
        stream: true,
        messages: safeMessages,
        max_tokens: MAX_TOKENS,
        usage: { include: true },
      }),
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
    // Do NOT forward the upstream body — OpenRouter error messages can leak the
    // operator's account state (e.g. a 402 "you have X credits left"). Map the
    // status to a generic client-safe message instead.
    let msg: string;
    if (upstream.status === 429) msg = 'Modelo sobrecarregado — aguarde alguns segundos e tente novamente.';
    else if (upstream.status === 404) msg = 'Modelo do Tutor indisponível no momento. Tente novamente mais tarde.';
    else if (upstream.status === 401 || upstream.status === 403 || upstream.status === 402)
      msg = 'Serviço do Tutor temporariamente indisponível. Tente novamente mais tarde.';
    else msg = 'Erro no serviço do Tutor. Tente novamente.';
    return jsonError(upstream.status, 'upstream_error', msg);
  }

  const contentType = upstream.headers.get('Content-Type') ?? 'text/event-stream';
  if (!upstream.body) {
    return jsonError(502, 'upstream_error', 'Resposta vazia do modelo. Tente novamente.');
  }

  // Tee the stream: one branch goes straight to the client (no added latency),
  // the other is consumed in the background to extract the final usage chunk
  // (tokens + actual cost) for the pricing-study telemetry. Telemetry is
  // strictly best-effort — any failure here never affects the user's reply.
  const [clientBranch, logBranch] = upstream.body.tee();

  async function logUsage() {
    const reader = logBranch.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let usage: { prompt_tokens?: number; completion_tokens?: number; cost?: number } | null = null;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const m = line.match(/^data:\s?/);
          if (!m) continue;
          const data = line.slice(m[0].length).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed?.usage) usage = parsed.usage; // last one wins
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch { /* stream error — skip logging */ }
    try {
      await admin.from('coach_message_log').insert({
        user_id: userId,
        model,
        prompt_tokens: typeof usage?.prompt_tokens === 'number' ? usage.prompt_tokens : null,
        completion_tokens: typeof usage?.completion_tokens === 'number' ? usage.completion_tokens : null,
        cost_micro_usd: typeof usage?.cost === 'number' ? Math.round(usage.cost * 1_000_000) : null,
      });
    } catch { /* best-effort telemetry */ }
  }

  // Keep the function alive to finish logging after the response is returned.
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(logUsage());
  else logUsage(); // fallback: fire-and-forget

  // Stream OpenRouter's SSE response straight through to the client
  return new Response(clientBranch, {
    status: upstream.status,
    headers: { ...CORS_HEADERS, 'Content-Type': contentType },
  });
});
