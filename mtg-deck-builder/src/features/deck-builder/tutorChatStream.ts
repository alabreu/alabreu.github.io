import type { Session } from '@supabase/supabase-js';

// Shared streaming core for both Tutor chat surfaces (CoachTab deck chat and
// TutorDeckChat commander-picking chat), which previously duplicated ~130 lines
// of near-identical fetch + SSE-parsing + error-mapping logic each.

export interface ChatMessage {
  role: string;
  content: string;
}

/** Maps a non-OK OpenRouter/proxy response to a friendly pt-BR message. */
export async function mapCoachError(res: Response, useProxy: boolean): Promise<string> {
  try {
    const json = await res.json();
    if (json?.error?.code === 'rate_limited') {
      return json.error.message ?? 'Limite diário do Tutor atingido. Volte amanhã.';
    }
    const raw: string = json?.error?.metadata?.raw ?? '';
    if (res.status === 429) {
      const seconds = raw.match(/"Retry-After":"(\d+)"/)?.[1];
      return `Modelo sobrecarregado — aguarde${seconds ? ` ${seconds}s` : ' alguns segundos'} e tente novamente.`;
    }
    if (res.status === 401 || res.status === 403) {
      return useProxy
        ? 'Sessão expirada — saia e entre novamente no menu ···.'
        : 'Chave de API inválida. Verifique no menu ···.';
    }
    if (res.status === 404) return 'Modelo indisponível. Escolha outro no menu ···.';
    return json?.error?.message ?? `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}

interface StreamOpts {
  useProxy: boolean;
  model: string;
  messages: ChatMessage[];
  session: Session | null;
  apiKey: string;
  signal: AbortSignal;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  /** Called once when a reasoning model starts emitting reasoning tokens and
   *  no visible content has arrived yet, so the caller can show a placeholder. */
  onThinking: () => void;
  /** Called with the full accumulated visible content each time it grows. */
  onToken: (fullText: string) => void;
}

/** Streams a Tutor reply, invoking onThinking/onToken as it arrives. Resolves
 *  with the final accumulated visible text (which may be empty if a reasoning
 *  model consumed its whole token budget without emitting content — the caller
 *  should surface a fallback in that case). Throws Error(friendlyMessage) on a
 *  non-OK response or empty body. */
export async function streamTutorReply(opts: StreamOpts): Promise<string> {
  const res = opts.useProxy
    ? await fetch(`${opts.supabaseUrl}/functions/v1/coach-proxy`, {
        method: 'POST',
        signal: opts.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.session!.access_token}`,
          apikey: opts.supabaseAnonKey!,
        },
        body: JSON.stringify({ model: opts.model, messages: opts.messages }),
      })
    : await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: opts.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'MTG Deck Builder Tutor',
        },
        body: JSON.stringify({ model: opts.model, stream: true, messages: opts.messages }),
      });

  if (!res.ok) throw new Error(await mapCoachError(res, opts.useProxy));
  if (!res.body) throw new Error('Resposta vazia do servidor.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let lineBuffer = '';
  let thinkingSignalled = false;

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Accumulate so lines split across chunks are handled correctly.
    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
      // SSE spec allows "data:" with or without a leading space.
      const m = line.match(/^data:\s?/);
      if (!m) continue;
      const data = line.slice(m[0].length).trim();
      if (data === '[DONE]') break outer;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed?.choices?.[0]?.delta;
        if (!delta) continue;

        // Reasoning models (DeepSeek R1, QwQ) emit reasoning_content before
        // content. Signal "thinking" once, but do NOT skip the rest of this
        // delta — a chunk can carry both reasoning_content and content.
        if (delta.reasoning_content && !accumulated && !thinkingSignalled) {
          thinkingSignalled = true;
          opts.onThinking();
        }

        if (delta.content) {
          accumulated += delta.content;
          opts.onToken(accumulated);
        }
      } catch {
        // skip malformed SSE chunk
      }
    }
  }

  return accumulated;
}
