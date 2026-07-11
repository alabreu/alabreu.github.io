import { supabase } from './supabase';
import { useDeckStore } from '../store/useDeckStore';
import { Deck } from '../types';

type CloudRow = { id: string; user_id: string; data: Deck; updated_at: string };

// Remembers which account last synced on this device/browser, so switching
// accounts on a shared browser doesn't merge one person's local decks into
// another person's cloud account.
const LAST_USER_KEY = 'mtg-deck-builder-last-synced-user';

let pulling = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeStore: (() => void) | null = null;
// Tracks the updatedAt we've last pushed per deck id, so the debounced push
// only sends decks that actually changed since the last push.
const lastPushedAt = new Map<string, number>();

function cloudTime(iso: string): number {
  return new Date(iso).getTime();
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

async function pushDeletion(deckId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('decks').delete().eq('id', deckId);
  if (error) console.error('deckSync delete failed', error);
  lastPushedAt.delete(deckId);
}

/** Pulls this account's cloud decks and merges them into the local store.
 *  Call once when a session becomes active (login, or app load with an
 *  existing session). Safe to call multiple times. */
export async function pullAndMergeOnLogin(userId: string): Promise<void> {
  if (!supabase || pulling) return;
  pulling = true;
  try {
    const { data, error } = await supabase
      .from('decks')
      .select('id,user_id,data,updated_at')
      .eq('user_id', userId);
    if (error) {
      console.error('deckSync pull failed', error);
      return;
    }
    const cloud = (data ?? []) as CloudRow[];

    const lastUser = localStorage.getItem(LAST_USER_KEY);
    // A different account synced on this browser before — don't attribute
    // its leftover local decks to the account logging in now.
    const local = lastUser && lastUser !== userId ? [] : useDeckStore.getState().decks;

    const { merged, toPush } = mergeDecks(local, cloud);
    useDeckStore.setState({ decks: merged });
    for (const d of merged) {
      const row = cloud.find((r) => r.id === d.id);
      lastPushedAt.set(d.id, row ? Math.max(d.updatedAt, cloudTime(row.updated_at)) : d.updatedAt);
    }
    for (const d of toPush) await pushDeck(userId, d);
    localStorage.setItem(LAST_USER_KEY, userId);
  } finally {
    pulling = false;
  }
}

/** Watches the local store and pushes changes (debounced) while a session
 *  is active. Returns a cleanup function to stop watching. */
export function startSyncing(userId: string): () => void {
  let prevIds = new Set(useDeckStore.getState().decks.map((d) => d.id));

  unsubscribeStore = useDeckStore.subscribe((state) => {
    if (pulling) return; // avoid feedback loop while pull/merge writes state

    const nextIds = new Set(state.decks.map((d) => d.id));
    for (const id of prevIds) {
      if (!nextIds.has(id)) pushDeletion(id);
    }
    prevIds = nextIds;

    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      for (const d of useDeckStore.getState().decks) {
        if (d.updatedAt > (lastPushedAt.get(d.id) ?? 0)) pushDeck(userId, d);
      }
    }, 1200);
  });

  return () => {
    unsubscribeStore?.();
    unsubscribeStore = null;
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
  };
}
