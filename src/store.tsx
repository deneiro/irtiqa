import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import MiniSearch from "minisearch";
import type { MdFile, Scan, Vault } from "./lib/types";
import { buildVault } from "./lib/vault";
import { inTauri } from "./lib/native";
import { buildIndex, type SearchDoc } from "./lib/search";
import { buildLife, dayRel, emptyDay, serializeDay, serializeQuest, withQuestEntry, type Day, type Life } from "./lib/life";
import { dayOf, dayToday } from "./lib/maghrib";
import { runCmd, treeChanged, writeText, type CmdResult } from "./lib/fs";

/** What closing a day did with git: `commit` is null when there was nothing to commit, `push` null when it was not tried. */
export interface SyncResult {
  commit: CmdResult | null;
  push: CmdResult | null;
}
import { parseLog } from "./lib/log";

const KEY = "irtiqa.vaultRoot";
const LANG_KEY = "irtiqa.lang";
const TIMER_KEY = "irtiqa.timer";
const PENDING_KEY = "irtiqa.pendingSession";
export type Lang = "en" | "ru";
export const DEFAULT_ROOT =
  "/Users/eldar/Library/Mobile Documents/com~apple~CloudDocs/Documents/personal-obsidian";

interface Store {
  root: string;
  setRoot: (r: string) => void;
  vault: Vault | null;
  index: MiniSearch<SearchDoc> | null;
  /** Ask for the search index; `index` fills in on the next render. */
  needIndex: () => void;
  /** Parsed life/ zone, rebuilt on every scan. */
  life: Life | null;
  /** Write one file inside the vault (app-owned paths only). */
  saveText: (rel: string, content: string) => Promise<void>;
  /** Commit every change in the vault and push it. Returns null outside the desktop app. */
  commitVault: (message: string) => Promise<SyncResult | null>;
  /** Read-modify-write today's day file from the latest scan (used by pages other than Day). */
  updateToday: (fn: (d: Day) => Day) => Promise<void>;
  /** One running quest timer, kept in localStorage so a reload does not lose it. */
  timer: { quest: string; startedAt: number } | null;
  startTimer: (quest: string) => void;
  /** Stop the clock. The session is not written yet: it waits for its note. */
  stopTimer: () => void;
  /** A finished session waiting to be described. Nothing is logged until it is. */
  pending: { quest: string; minutes: number; at?: string } | null;
  /** Write the waiting session into today's day file and the quest's journal. */
  commitSession: (note: string) => Promise<void>;
  /** Throw the waiting session away — a timer started by accident. */
  discardSession: () => void;
  loading: boolean;
  error: string | null;
  /**
   * Bring the vault up to date after a write. Text writes are already patched
   * in memory, so this only rescans the disk after a photo/move/delete, or
   * always when `force` is set (the rescan buttons).
   */
  reload: (force?: boolean) => Promise<void>;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [root, setRootState] = useState<string>(() => localStorage.getItem(KEY) || DEFAULT_ROOT);
  const [vault, setVault] = useState<Vault | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) === "en" ? "en" : "ru"));
  const setLang = (l: Lang) => {
    localStorage.setItem(LANG_KEY, l);
    document.documentElement.lang = l;
    setLangState(l);
  };
  const watching = useRef<string | null>(null);

  const setRoot = (r: string) => {
    localStorage.setItem(KEY, r);
    setRootState(r);
  };

  // The last scan, kept so our own writes can be patched in without rereading
  // the whole vault (hundreds of pages over iCloud, then parse and reindex).
  const scanRef = useRef<Scan | null>(null);
  // rel -> time of our own recent writes, so the watcher's echo is ignored.
  const ownWrites = useRef(new Map<string, number>());

  const rescan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scan = inTauri
        ? await invoke<Scan>("scan_vault", { root })
        : await fetch(`/__vault?root=${encodeURIComponent(root)}`).then(async (r) => {
            if (!r.ok) throw new Error(await r.text());
            return (await r.json()) as Scan;
          });
      treeChanged.value = false;
      scanRef.current = scan;
      setVault(buildVault(scan));
      if (inTauri && watching.current !== root) {
        await invoke("watch_vault", { root }).catch(() => undefined);
        watching.current = root;
      }
    } catch (e) {
      scanRef.current = null;
      setVault(null);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [root]);

  const reload = useCallback(
    async (force = false) => {
      if (force || !scanRef.current || treeChanged.value) await rescan();
    },
    [rescan],
  );

  useEffect(() => {
    scanRef.current = null;
    void rescan();
  }, [rescan]);

  useEffect(() => {
    if (!inTauri) return;
    const un = listen<string[]>("vault-changed", (e) => {
      const now = Date.now();
      const foreign = (e.payload ?? []).some((rel) => {
        const t = ownWrites.current.get(rel.normalize("NFC"));
        return t === undefined || now - t > 5000;
      });
      if (foreign) void rescan();
    });
    return () => {
      void un.then((f) => f());
    };
  }, [rescan]);

  const pages = vault?.pages;
  // The search index costs seconds on a large vault; build it only once search is used.
  const [wantIndex, setWantIndex] = useState(false);
  const index = useMemo(() => (pages && wantIndex ? buildIndex(pages) : null), [pages, wantIndex]);
  const needIndex = useCallback(() => setWantIndex(true), []);
  const lifeFiles = vault?.life;
  const media = vault?.media;
  const life = useMemo(() => (lifeFiles ? buildLife(lifeFiles, media) : null), [lifeFiles, media]);

  /** Put one written file into the kept scan and derive the vault from it, no disk read. */
  const patch = useCallback((rel: string, content: string) => {
    const scan = scanRef.current;
    if (!scan) return;
    const file: MdFile = { rel, content, mtime: Math.floor(Date.now() / 1000) };
    const upsert = (list: MdFile[]) => {
      const i = list.findIndex((f) => f.rel.normalize("NFC") === rel);
      if (i < 0) return [...list, file];
      const next = list.slice();
      next[i] = { ...file, rel: list[i].rel };
      return next;
    };
    if (rel.startsWith("life/")) {
      const next = { ...scan, life: upsert(scan.life ?? []) };
      scanRef.current = next;
      setVault((v) => (v ? { ...v, life: next.life ?? [] } : v));
    } else if (rel === "wiki/log.md") {
      scanRef.current = { ...scan, log: content };
      setVault((v) => (v ? { ...v, logText: content, log: parseLog(content) } : v));
    } else {
      const next = { ...scan, pages: upsert(scan.pages) };
      scanRef.current = next;
      setVault(buildVault(next));
    }
  }, []);

  const saveText = useCallback(
    async (rel: string, content: string) => {
      await writeText(root, rel, content);
      const key = rel.normalize("NFC");
      ownWrites.current.set(key, Date.now());
      patch(key, content);
    },
    [root, patch],
  );

  const updateToday = useCallback(
    async (fn: (d: Day) => Day) => {
      const today = dayToday();
      const cur = life?.days.get(today);
      const next = fn(cur ?? emptyDay(today));
      await saveText(dayRel(today), serializeDay(next));
    },
    [life, saveText],
  );

  const [timer, setTimer] = useState<{ quest: string; startedAt: number } | null>(() => {
    try { const raw = localStorage.getItem(TIMER_KEY); return raw ? (JSON.parse(raw) as { quest: string; startedAt: number }) : null; } catch { return null; }
  });
  const startTimer = useCallback((quest: string) => {
    const t = { quest, startedAt: Date.now() };
    localStorage.setItem(TIMER_KEY, JSON.stringify(t));
    setTimer(t);
  }, []);
  const [pending, setPending] = useState<{ quest: string; minutes: number; at?: string } | null>(() => {
    try { const raw = localStorage.getItem(PENDING_KEY); return raw ? (JSON.parse(raw) as { quest: string; minutes: number; at?: string }) : null; } catch { return null; }
  });

  const stopTimer = useCallback(() => {
    if (!timer) return;
    const minutes = Math.max(1, Math.round((Date.now() - timer.startedAt) / 60000));
    localStorage.removeItem(TIMER_KEY);
    setTimer(null);
    const start = new Date(timer.startedAt);
    // A session that began in the previous day file lands in this one; its start time would lie there.
    const at = dayOf(start) === dayToday() ? `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}` : undefined;
    const p = { quest: timer.quest, minutes, at };
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    setPending(p);
  }, [timer]);

  const discardSession = useCallback(() => {
    localStorage.removeItem(PENDING_KEY);
    setPending(null);
  }, []);

  const commitSession = useCallback(async (note: string) => {
    if (!pending) return;
    const { quest, minutes, at } = pending;
    await updateToday((d) => ({ ...d, sessions: [...d.sessions, at ? { quest, minutes, at } : { quest, minutes }] }));
    const q = life?.quests.find((x) => x.title === quest);
    if (q) {
      const body = withQuestEntry(q.body, { date: dayToday(), minutes, note });
      await saveText(q.rel, serializeQuest({ ...q, body }));
    }
    localStorage.removeItem(PENDING_KEY);
    setPending(null);
  }, [pending, updateToday, life, saveText]);
  // The day's commit carries everything changed since the last one — Claude's
  // edits, people, quests — then goes to the remote, the only copy off this Mac.
  const commitVault = useCallback(
    async (message: string): Promise<SyncResult | null> => {
      if (!inTauri) return null;
      const add = await runCmd(root, "git", ["add", "-A"]);
      if (add.status !== 0) return { commit: add, push: null };
      // `diff --cached --quiet` exits 1 when something is staged.
      const staged = await runCmd(root, "git", ["diff", "--cached", "--quiet"]);
      const commit = staged.status === 0 ? null : await runCmd(root, "git", ["commit", "-q", "-m", message]);
      if (commit && commit.status !== 0) return { commit, push: null };
      // Push even with nothing new: earlier commits may still be waiting from an offline close.
      const push = await runCmd(root, "git", ["push", "-q"]);
      return { commit, push };
    },
    [root],
  );

  const value = useMemo<Store>(
    () => ({ root, setRoot, vault, index, needIndex, life, saveText, commitVault, updateToday, timer, startTimer, stopTimer, pending, commitSession, discardSession, loading, error, reload, paletteOpen, setPaletteOpen, lang, setLang }),
    [root, vault, index, needIndex, life, saveText, commitVault, updateToday, timer, startTimer, stopTimer, pending, commitSession, discardSession, loading, error, reload, paletteOpen, lang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider missing");
  return s;
}

/** Vault, guaranteed. Pages render only when the vault is loaded. */
export function useVault(): Vault {
  const { vault } = useStore();
  if (!vault) throw new Error("vault not loaded");
  return vault;
}
