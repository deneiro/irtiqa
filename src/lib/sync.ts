import { create } from 'zustand';
import type { GameState } from '../store';
import { useGame } from '../store';
import { supabase } from './supabase';

/**
 * Cloud sync: the whole save is one JSONB row per user.
 * - Local-first: the game always runs off the local store; the cloud is a mirror.
 * - Every change is pushed a few seconds later (debounced).
 * - On login / app start, the newer side wins: if another device wrote since
 *   this one last synced, the cloud copy is adopted; otherwise local is pushed.
 */

export interface SyncUser {
  id: string;
  email: string;
}

interface SyncState {
  user: SyncUser | null;
  status: 'offline' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: string | null;
  error: string | null;
}

export const useSync = create<SyncState>(() => ({
  user: null,
  status: 'offline',
  lastSyncedAt: null,
  error: null,
}));

const META_KEY = 'irtiqa-sync-meta';
const PUSH_DEBOUNCE_MS = 2500;

let initialized = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPushedJson = '';

type SaveData = Record<string, unknown>;

/** Data-only view of the store: no actions, no transient celebration queue. */
function snapshot(): SaveData {
  const state = useGame.getState() as unknown as Record<string, unknown>;
  const data: SaveData = {};
  for (const [k, v] of Object.entries(state)) {
    if (typeof v === 'function' || k === 'celebrations') continue;
    data[k] = v;
  }
  return JSON.parse(JSON.stringify(data)) as SaveData;
}

function readMeta(): { lastServerUpdatedAt: string } | null {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function writeMeta(updatedAt: string) {
  localStorage.setItem(META_KEY, JSON.stringify({ lastServerUpdatedAt: updatedAt }));
}

async function push(): Promise<void> {
  const user = useSync.getState().user;
  if (!user) return;
  const data = snapshot();
  const json = JSON.stringify(data);
  if (json === lastPushedJson) {
    if (useSync.getState().status === 'syncing') useSync.setState({ status: 'synced' });
    return;
  }
  useSync.setState({ status: 'syncing' });
  const { data: row, error } = await supabase
    .from('saves')
    .upsert({ user_id: user.id, data })
    .select('updated_at')
    .single();
  if (error) {
    useSync.setState({ status: 'error', error: error.message });
    return;
  }
  lastPushedJson = json;
  writeMeta(row.updated_at);
  useSync.setState({ status: 'synced', lastSyncedAt: row.updated_at, error: null });
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void push();
  }, PUSH_DEBOUNCE_MS);
}

function adoptRemote(data: SaveData, updatedAt: string) {
  useGame.setState(data as unknown as Partial<GameState>);
  lastPushedJson = JSON.stringify(snapshot());
  writeMeta(updatedAt);
  useSync.setState({ status: 'synced', lastSyncedAt: updatedAt, error: null });
  // The pulled save may have unjudged days — run the engine over it
  useGame.getState().reconcile();
}

async function initialSync(): Promise<void> {
  const user = useSync.getState().user;
  if (!user) return;
  useSync.setState({ status: 'syncing' });
  const { data: row, error } = await supabase
    .from('saves')
    .select('data, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    useSync.setState({ status: 'error', error: error.message });
    return;
  }
  const localHasCharacter = !!useGame.getState().character;
  if (!row) {
    // Nothing in the cloud yet: seed it with local progress, if any
    if (localHasCharacter) await push();
    else useSync.setState({ status: 'synced' });
    return;
  }
  const meta = readMeta();
  if (!localHasCharacter || !meta || row.updated_at > meta.lastServerUpdatedAt) {
    // Fresh device, first login here, or another device wrote since we last synced → cloud wins
    adoptRemote(row.data as SaveData, row.updated_at);
  } else {
    // We are the latest writer (e.g. played offline) → local wins
    await push();
  }
}

export function initSync(): void {
  if (initialized) return;
  initialized = true;

  supabase.auth.onAuthStateChange((event, session) => {
    const u: SyncUser | null = session?.user
      ? { id: session.user.id, email: session.user.email ?? '' }
      : null;
    const prev = useSync.getState().user;
    if (u) {
      useSync.setState({ user: u });
      if (!prev || prev.id !== u.id || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // setTimeout: supabase-js holds an internal lock during this callback — never await inside it
        setTimeout(() => void initialSync(), 0);
      }
    } else {
      useSync.setState({ user: null, status: 'offline', lastSyncedAt: null, error: null });
    }
  });

  useGame.subscribe(() => {
    if (useSync.getState().user) schedulePush();
  });

  // Flush pending changes when the tab goes to the background
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && useSync.getState().user) void push();
  });
}

// ---------------- Auth helpers ----------------

export interface AuthResult {
  ok: boolean;
  message: string;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, message: error.message } : { ok: true, message: 'Signed in — syncing your save.' };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, message: error.message };
  if (!data.session) {
    return { ok: true, message: 'Account created — confirm it from the email we sent, then sign in.' };
  }
  return { ok: true, message: 'Account created and signed in.' };
}

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}

/** Manual "Sync now": full reconcile against the cloud, both directions. */
export async function syncNow(): Promise<void> {
  await initialSync();
}
