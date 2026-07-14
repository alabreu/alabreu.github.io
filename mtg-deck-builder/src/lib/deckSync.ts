import { supabase } from './supabase';
import { useDeckStore } from '../store/useDeckStore';
import { Deck } from '../types';
import { safeGetItem, safeSetItem } from './safeStorage';

type CloudRow = { id: string; user_id: string; data: Deck; updated_at: string };

// Remembers which account last synced on this device/browser, so switching
// accounts on a shared browser doesn't merge one person's local decks into
// another person's cloud account.
const LAST_USER_KEY = 'mtg-deck-builder-last-synced-user';
// The set of deck ids that were attributed to LAST_USER at last sync. Used on
// account switch to tell "the previous account's decks" (drop them) apart from
// "decks created offline since / never attributed to anyone" (keep them).
const SYNCED_IDS_KEY = 'mtg-deck-builder-synced-ids';

// Monotonic token identifying the current sync "session". Each pull/startSyncing
// captures the token at call time; when the active account switches (or the
// syncer unmounts) the token advances, so any still-in-flight async step from a
// previous account detects it's stale and refuses to touch the store or push.
// This replaces the old global `pulling` boolean, which made a concurrent pull
// for a *different* account a silent no-op and could leave the store holding
// account A's decks while the live subscription was bound to account B —
// leaking A's decks into B's cloud on the next edit.
let activeToken = 0;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
// Tracks the updatedAt we've last pushed per deck id, so the debounced push
// only sends decks that actually changed since the last push.
const lastPushedAt = new Map<string, number>();

function cloudTime(iso: string): number {
  const t = new Date(iso).getTime();
  // A malformed/empty updated_at must never win a newest-wins comparison and
  // silently overwrite a newer local deck — treat it as the oldest possible.
  return Number.isFinite(t) ? t : 0;
}

/** Returns the attributed-id set, or null if attribution was never recorded on
 *  this browser (legacy / pre-upgrade). null and empty-set mean different
 *  things on account switch — see pullAndMergeOnLogin. */
function readSyncedIds(): Set<string> | null {
  const raw = safeGetItem(SYNCED_IDS_KEY);
  if (raw === null) return null;
  try {
    const arr = JSON.parse(raw);
    return new Set<string>(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeSyncedIds(ids: Iterable<string>): void {
  safeSetItem(SYNCED_IDS_KEY, JSON.stringify([...ids]));
}

/** Newest-updatedAt-wins merge of local and cloud decks, by id. Decks that
 *  exist on only one side are kept as-is. Returns decks that need pushing
 *  (new locally, or locally newer than the cloud copy). */
function mergeDecks(local: Deck[], cloud: CloudRow[]): { merged: Deck[]; toPush: Deck[] } {
  const cloudById = new Map(cloud.map((r) => [r.id, r]));
  const localIds = new Set(local.map((d) => d.id));
  const merged: Deck[] = [];
  const toPush: Deck[] = [];

  for (const d of local) {
    const row = cloudById.get(d.id);
    if (!row || d.updatedAt > cloudTime(row.updated_at)) {
      merged.push(d);
      toPush.push(d);
    } else {
      merged.push(row.data);
    }
  }
  for (const row of cloud) {
    if (!localIds.has(row.id)) merged.push(row.data);
  }
  return { merged, toPush };
}

async function pushDeck(userId: string, deck: Deck) {
  if (!supabase) return;
  const { error } = await supabase
    .from('decks')
    .upsert({ id: deck.id, user_id: userId, data: deck, updated_at: new Date(deck.updatedAt).toISOString() });
  if (error) {
    console.error('deckSync push failed', error);
    return;
  }
  lastPushedAt.set(deck.id, deck.updatedAt);
}

async function pushDeletion(userId: string, deckId: string) {
  if (!supabase) return;
  // Filter by user_id too (not just id) — defense in depth beyond RLS so a
  // deletion can never touch another account's row.
  const { error } = await supabase.from('decks').delete().eq('id', deckId).eq('user_id', userId);
  if (error) console.error('deckSync delete failed', error);
  lastPushedAt.delete(deckId);
}

/** Pulls this account's cloud decks and merges them into the local store.
 *  Call once when a session becomes active (login, or app load with an
 *  existing session). Safe to call multiple times; a newer call supersedes
 *  an older in-flight one. */
export async function pullAndMergeOnLogin(userId: string): Promise<void> {
  if (!supabase) return;
  const token = ++activeToken; // supersede any older in-flight pull
  lastPushedAt.clear(); // stale ids/timestamps from a previous account must not suppress pushes

  const { data, error } = await supabase
    .from('decks')
    .select('id,user_id,data,updated_at')
    .eq('user_id', userId);
  if (token !== activeToken) return; // account switched while we awaited — abandon
  if (error) {
    console.error('deckSync pull failed', error);
    return;
  }
  const cloud = (data ?? []) as CloudRow[];

  const lastUser = safeGetItem(LAST_USER_KEY);
  let local: Deck[];
  if (lastUser && lastUser !== userId) {
    // A different account synced on this browser before.
    const prevSynced = readSyncedIds();
    if (prevSynced === null) {
      // Attribution was never recorded (legacy upgrade) — we can't tell the
      // previous account's decks from offline-created ones, so stay
      // conservative and drop all local decks. This preserves the original
      // no-cross-account-leak guarantee; the offline-decks-are-kept improvement
      // only kicks in once attribution has been recorded at least once.
      local = [];
    } else {
      // Keep only decks NOT attributed to the previous account (created
      // offline / unattributed since); drop that account's decks so they
      // don't leak into this one.
      local = useDeckStore.getState().decks.filter((d) => !prevSynced.has(d.id));
    }
  } else {
    local = useDeckStore.getState().decks;
  }

  const { merged, toPush } = mergeDecks(local, cloud);
  if (token !== activeToken) return; // re-check right before mutating the store
  useDeckStore.setState({ decks: merged });
  for (const d of merged) {
    const row = cloud.find((r) => r.id === d.id);
    lastPushedAt.set(d.id, row ? Math.max(d.updatedAt, cloudTime(row.updated_at)) : d.updatedAt);
  }
  for (const d of toPush) {
    if (token !== activeToken) return;
    await pushDeck(userId, d);
  }
  safeSetItem(LAST_USER_KEY, userId);
  writeSyncedIds(merged.map((d) => d.id));
}

/** Watches the local store and pushes changes (debounced, with a max-wait so
 *  continuous editing still syncs) while a session is active. Returns a
 *  cleanup function that flushes any pending push and stops watching. */
export function startSyncing(userId: string): () => void {
  const token = activeToken; // bind to the current sync session
  let prevIds = new Set(useDeckStore.getState().decks.map((d) => d.id));

  function flush() {
    if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
    if (maxWaitTimer) { clearTimeout(maxWaitTimer); maxWaitTimer = null; }
    if (token !== activeToken) return; // superseded by an account switch
    for (const d of useDeckStore.getState().decks) {
      if (d.updatedAt > (lastPushedAt.get(d.id) ?? 0)) pushDeck(userId, d);
    }
  }

  const unsubscribe = useDeckStore.subscribe((state) => {
    if (token !== activeToken) return; // a pull/merge or switch is authoritative now

    const nextIds = new Set(state.decks.map((d) => d.id));
    // Only touch the id set / attribution when decks are actually added or
    // removed — not on every card edit, which also fires this subscription.
    const idsChanged = nextIds.size !== prevIds.size || [...nextIds].some((id) => !prevIds.has(id));
    if (idsChanged) {
      for (const id of prevIds) {
        if (!nextIds.has(id)) pushDeletion(userId, id);
      }
      prevIds = nextIds;
      writeSyncedIds(nextIds); // keep attribution current as decks are added/removed
    }

    // Debounce ~1.2s after the last edit, but force a flush at most 5s into a
    // continuous burst so a long uninterrupted editing session still syncs.
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(flush, 1200);
    if (!maxWaitTimer) maxWaitTimer = setTimeout(flush, 5000);
  });

  return () => {
    unsubscribe();
    flush(); // push whatever's pending before we stop watching
  };
}
