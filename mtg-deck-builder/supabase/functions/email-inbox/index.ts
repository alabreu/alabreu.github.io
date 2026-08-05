// Supabase Edge Function: receives a support e-mail forwarded by the Cloudflare
// Email Worker (see cloudflare/email-worker.js) and files it in the same inbox
// as in-app feedback, so the admin dashboard shows one unified list.
//
// verify_jwt = false — Cloudflare has no Supabase session. Authenticated by a
// shared secret instead, compared in constant time.
//
// Required secret:
//   EMAIL_INBOX_SECRET — same value configured on the Worker.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY come from the Edge Runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EMAIL_INBOX_SECRET = Deno.env.get('EMAIL_INBOX_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// A mail body can be megabytes (quoted threads, pasted decklists). Store enough
// to read and act on, not the whole thing.
const MAX_SUBJECT = 300;
const MAX_BODY = 20000;
const MAX_FROM = 320; // RFC-max address length

/** Constant-time compare so the secret can't be recovered by timing the reply. */
function secretMatches(given: string): boolean {
  if (given.length !== EMAIL_INBOX_SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ EMAIL_INBOX_SECRET.charCodeAt(i);
  return diff === 0;
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });
  if (!EMAIL_INBOX_SECRET) return new Response('not_configured', { status: 500 });
  if (!secretMatches(req.headers.get('x-inbox-secret') ?? '')) {
    return new Response('unauthorized', { status: 401 });
  }

  let body: { from?: unknown; subject?: unknown; text?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response('bad_request', { status: 400 });
  }

  const from = clip(body.from, MAX_FROM);
  const text = clip(body.text, MAX_BODY);
  if (!from || !text) return new Response('bad_request', { status: 400 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { error } = await admin.from('feedback').insert({
    source: 'email',
    type: 'email',
    subject: clip(body.subject, MAX_SUBJECT) || '(sem assunto)',
    message: text,
    contact_email: from,
    // user_id stays null: a sender is just an address, not necessarily an
    // account, and guessing wrong would hide the message from the dashboard
    // (which filters out internal users).
  });
  if (error) {
    console.error('email-inbox insert failed', error.message);
    return new Response('insert_failed', { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
