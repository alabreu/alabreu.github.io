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
// The deck ids this device has *confirmed* exist in the cloud for a given
// account ({ userId, ids }). Unlike SYNCED_IDS_KEY (attribution, updated as
// soon as a deck is created locally), an id is only added here after a
// successful push/pull and removed after a successful cloud delete. It is the
// "last common state" used to tell deletions apart from creations on merge:
//  - local has it, cloud doesn't, id confirmed → deleted on another device → drop
//  - cloud has it, local doesn't, id confirmed → deleted here while not syncing → delete in cloud
// Without it, a deck deleted on device A was re-uploaded by device B (which
// still had it locally) on B's next login — deleted decks "came back".
const CLOUD_IDS_KEY = 'mtg-deck-builder-cloud-ids';

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

/** Confirmed-in-cloud ids for this account, or null if unknown (never
 *  recorded on this device, or recorded for a different account). */
function readCloudIds(userId: string): Set<string> | null {
  const raw = safeGetItem(CLOUD_IDS_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.userId !== userId || !Array.isArray(parsed.ids)) return null;
    return new Set<string>(parsed.ids);
  } catch {
    return null;
  }
}

function writeCloudIds(userId: string, ids: Iterable<string>): void {
  safeSetItem(CLOUD_IDS_KEY, JSON.stringify({ userId, ids: [...ids] }));
}

function updateCloudIds(userId: string, fn: (ids: Set<string>) => void): void {
  const ids = readCloudIds(userId) ?? new Set<string>();
  fn(ids);
  writeCloudIds(userId, ids);
}

/** Newest-updatedAt-wins merge of local and cloud decks, by id. A deck that
 *  exists on only one side is kept, unless `cloudIds` (ids last confirmed in
 *  the cloud) shows it was deleted on the other side. Returns decks that need
 *  pushing (new locally, or locally newer than the cloud copy) and ids that
 *  must be deleted from the cloud (deleted locally while not syncing). */
export function mergeDecks(
  local: Deck[],
  cloud: CloudRow[],
  cloudIds: Set<string> | null = null,
): { merged: Deck[]; toPush: Deck[]; toDelete: string[] } {
  const cloudById = new Map(cloud.map((r) => [r.id, r]));
  const localIds = new Set(local.map((d) => d.id));
  const merged: Deck[] = [];
  const toPush: Deck[] = [];
  const toDelete: string[] = [];

  for (const d of local) {
    const row = cloudById.get(d.id);
    if (!row) {
      // Was in the cloud before and is gone now → deleted on another device.
      if (cloudIds?.has(d.id)) continue;
      merged.push(d);
      toPush.push(d);
    } else if (d.updatedAt > cloudTime(row.updated_at)) {
      merged.push(d);
      toPush.push(d);
    } else {
      merged.push(row.data);
    }
  }
  for (const row of cloud) {
    if (localIds.has(row.id)) continue;
    // Was synced here before and is gone locally → deleted on this device
    // while not syncing (offline, logged out, app closed before the push).
    if (cloudIds?.has(row.id)) toDelete.push(row.id);
    else merged.push(row.data);
  }
  return { merged, toPush, toDelete };
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
  // Only record it if it still exists locally — a delete may have raced this push.
  if (useDeckStore.getState().decks.some((d) => d.id === deck.id)) {
    updateCloudIds(userId, (ids) => ids.add(deck.id));
  }
}

async function pushDeletion(userId: string, deckId: string) {
  if (!supabase) return;
  // Filter by user_id too (not just id) — defense in depth beyond RLS so a
  // deletion can never touch another account's row.
  const { error } = await supabase.from('decks').delete().eq('id', deckId).eq('user_id', userId);
  lastPushedAt.delete(deckId);
  if (error) {
    // Keep the id in CLOUD_IDS so the next pull retries the delete instead
    // of resurrecting the deck.
    console.error('deckSync delete failed', error);
    return;
  }
  updateCloudIds(userId, (ids) => ids.delete(deckId));
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
  // Deletion detection is only safe when we know this device's last common
  // state with *this* account.
  const cloudIds = lastUser && lastUser !== userId ? null : readCloudIds(userId);
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

  const { merged, toPush, toDelete } = mergeDecks(local, cloud, cloudIds);
  if (token !== activeToken) return; // re-check right before mutating the store
  useDeckStore.setState({ decks: merged });
  // Everything currently in the cloud is now confirmed; deletions below and
  // pushes of new decks update this set as they succeed.
  writeCloudIds(userId, cloud.map((r) => r.id));
  for (const d of merged) {
    const row = cloud.find((r) => r.id === d.id);
    lastPushedAt.set(d.id, row ? Math.max(d.updatedAt, cloudTime(row.updated_at)) : d.updatedAt);
  }
  for (const id of toDelete) {
    if (token !== activeToken) return;
    await pushDeletion(userId, id);
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
