/**
 * Cloudflare Email Worker for contato@tutor-brew.com.
 *
 * Does TWO things, in this order:
 *   1. Forwards the message to the personal inbox (unchanged behaviour — the
 *      routing rule used to do this directly).
 *   2. Best-effort POSTs it to the Supabase `email-inbox` function so it shows
 *      up in the admin dashboard next to in-app feedback.
 *
 * The forward happens FIRST and its failure is the only one that can reject the
 * message. If Supabase is down, the e-mail still reaches the inbox and we just
 * lose the dashboard copy — never the other way round.
 *
 * Deploy (needs the dashboard; the MCP connector here is read-only for Workers):
 *   1. Workers & Pages → Create → Worker → paste this file → Deploy.
 *   2. Settings → Variables: add INBOX_URL, INBOX_SECRET, FORWARD_TO
 *      (mark INBOX_SECRET as "Encrypt").
 *   3. Email → Email Routing → Routing rules → edit contato@tutor-brew.com →
 *      action "Send to a Worker" → pick this Worker.
 *
 * Variables:
 *   FORWARD_TO    personal address the mail is forwarded to (must already be a
 *                 verified destination in Email Routing)
 *   INBOX_URL     https://<ref>.supabase.co/functions/v1/email-inbox
 *   INBOX_SECRET  same value as the EMAIL_INBOX_SECRET secret on the function
 */

const MAX_BODY = 20000;

/** Read the raw stream, capped — a mail can be far larger than we want to keep. */
async function readBody(message) {
  const reader = message.raw.getReader();
  const decoder = new TextDecoder();
  let out = '';
  try {
    while (out.length < MAX_BODY) {
      const { done, value } = await reader.read();
      if (done) break;
      out += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return out.slice(0, MAX_BODY);
}

/**
 * The raw stream is a full RFC-822 message: headers, blank line, then body.
 * We only want what a human typed, so drop everything up to the first blank
 * line. Good enough for plain-text mail; a MIME multipart still lands readable,
 * just with its part boundaries visible.
 */
function stripHeaders(raw) {
  const split = raw.indexOf('\r\n\r\n');
  const alt = raw.indexOf('\n\n');
  const at = split >= 0 ? split + 4 : alt >= 0 ? alt + 2 : 0;
  return raw.slice(at).trim() || raw.trim();
}

export default {
  async email(message, env, ctx) {
    // 1) Forward first. If this throws, the sender gets a bounce and knows.
    await message.forward(env.FORWARD_TO);

    // 2) Then mirror it to the dashboard, best-effort. waitUntil keeps the
    //    worker alive for it without delaying the forward.
    if (!env.INBOX_URL || !env.INBOX_SECRET) return;

    const push = (async () => {
      try {
        const raw = await readBody(message);
        const res = await fetch(env.INBOX_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-inbox-secret': env.INBOX_SECRET,
          },
          body: JSON.stringify({
            from: message.from,
            subject: message.headers.get('subject') ?? '',
            text: stripHeaders(raw),
          }),
        });
        if (!res.ok) console.error('email-inbox responded', res.status);
      } catch (err) {
        // Swallowed on purpose: the mail was already forwarded, and throwing
        // here would bounce a message the user actually received.
        console.error('email-inbox push failed', err);
      }
    })();

    ctx.waitUntil(push);
  },
};
