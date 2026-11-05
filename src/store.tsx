import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import MiniSearch from "minisearch";
import type { MdFile, Scan, Vault } from "./lib/types";
import { buildVault } from "./lib/vault";
import { inTauri } from "./lib/native";
import { buildIndex, toSearchDoc, type SearchDoc } from "./lib/search";
import { buildLife, dayRel, emptyDay, mergeDay, parseDay, serializeDay, serializeQuest, withQuestEntry, type Day, type Life } from "./lib/life";
import { LedgerConflict, ledgerLosses } from "./lib/guard";
import { dayOf, dayToday } from "./lib/maghrib";
import { treeChanged, writeText } from "./lib/fs";
import { parseLog } from "./lib/log";

const KEY = "irtiqa.vaultRoot";
const LANG_KEY = "irtiqa.lang";
const TIMER_KEY = "irtiqa.timer";
const PENDING_KEY = "irtiqa.pendingSession";
export type Lang = "en" | "ru";
export const DEFAULT_ROOT = "/Users/eldar/Desktop/personal-obsidian"; // moved out of iCloud 2026-11-01

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
  /** Read-modify-write today's day file, read fresh from disk (used by pages other than Day). */
  updateToday: (fn: (d: Day) => Day) => Promise<void>;
  /** The file as it is on disk right now; null when missing (or in browser mode, the last scan). */
  readFresh: (rel: string) => Promise<string | null>;
  /**
   * Write a day edited from `base`, merged with whatever the disk holds now
   * (the bot, Obsidian, Claude). Returns the day as written.
   */
  saveDayMerged: (base: Day, ours: Day) => Promise<Day>;
  /**
   * Rewrite a whole ledger (debts, accounts, subscriptions, calendar). Refused
   * when the file changed since the last scan, or when the new text would drop
   * a line the parser cannot read — the error names the lines.
   */
  saveLedger: (rel: string, content: string, parse: (content: string) => unknown[]) => Promise<void>;
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
  // rel -> our own writes (time and text): the watcher's echo is recognised by
  // content, and a scan that read the disk before a write gets the write back.
  const ownWrites = useRef(new Map<string, { at: number; content: string }>());
  const scanSeq = useRef(0);

  const rescan = useCallback(async () => {
    const seq = ++scanSeq.current;
    const startedAt = Date.now();
    setLoading(true);
    setError(null);
    try {
      let scan = inTauri
        ? await invoke<Scan>("scan_vault", { root })
        : await fetch(`/__vault?root=${encodeURIComponent(root)}`).then(async (r) => {
            if (!r.ok) throw new Error(await r.text());
            return (await r.json()) as Scan;
          });
      // A newer scan was started while this one read the disk: its result wins.
      if (seq !== scanSeq.current) return;
      // Our writes that landed after this scan began are newer than what it read.
      for (const [rel, w] of ownWrites.current) {
        if (w.at < startedAt) continue;
        const put = (list: MdFile[]) => list.map((f) => (f.rel.normalize("NFC") === rel ? { ...f, content: w.content } : f));
        if (rel.startsWith("life/")) scan = { ...scan, life: put(scan.life ?? []) };
        else if (rel === "wiki/log.md") scan = { ...scan, log: w.content };
        else scan = { ...scan, pages: put(scan.pages) };
      }
      treeChanged.value = false;
      scanRef.current = scan;
      setVault(buildVault(scan));
      if (inTauri && watching.current !== root) {
        await invoke("watch_vault", { root }).catch(() => undefined);
        watching.current = root;
      }
    } catch (e) {
      if (seq !== scanSeq.current) return;
      scanRef.current = null;
      setVault(null);
      setError(String(e));
    } finally {
      if (seq === scanSeq.current) setLoading(false);
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
    const un = listen<string[]>("vault-changed", async (e) => {
      const now = Date.now();
      for (const raw of e.payload ?? []) {
        const rel = raw.normalize("NFC");
        const w = ownWrites.current.get(rel);
        // Not ours, or ours long ago: someone else wrote it.
        if (!w || now - w.at > 5000) { void rescan(); return; }
        // Ours a moment ago — but the bot may have written in the same breath. Compare the text.
        const disk = await invoke<string>("read_text", { root, rel }).catch(() => null);
        if (disk !== w.content) { void rescan(); return; }
      }
    });
    return () => {
      void un.then((f) => f());
    };
  }, [rescan, root]);

  const pages = vault?.pages;
  // The search index costs seconds on a large vault; build it only once search is used.
  const [wantIndex, setWantIndex] = useState(false);
  const indexRef = useRef<MiniSearch<SearchDoc> | null>(null);
  const prevPagesRef = useRef<Map<string, number>>(new Map()); // rel -> mtime

  const index = useMemo(() => {
    if (!pages || !wantIndex) return null;
    if (!indexRef.current) {
      const idx = buildIndex(pages);
      indexRef.current = idx;
      prevPagesRef.current = new Map(pages.map((p) => [p.rel, p.mtime]));
      return idx;
    }
    const idx = indexRef.current;
    const oldMap = prevPagesRef.current;
    const newMap = new Map(pages.map((p) => [p.rel, p.mtime]));

    for (const [rel] of oldMap) {
      if (!newMap.has(rel)) {
        if (idx.has(rel)) idx.discard(rel);
      }
    }
    for (const p of pages) {
      const oldMtime = oldMap.get(p.rel);
      if (oldMtime === undefined || oldMtime !== p.mtime) {
        if (idx.has(p.rel)) idx.discard(p.rel);
        idx.add(toSearchDoc(p));
      }
    }
    prevPagesRef.current = newMap;
    return idx;
  }, [pages, wantIndex]);
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
      ownWrites.current.set(key, { at: Date.now(), content });
      patch(key, content);
    },
    [root, patch],
  );

  const readFresh = useCallback(
    async (rel: string): Promise<string | null> => {
      if (inTauri) return invoke<string>("read_text", { root, rel }).catch(() => null);
      const scan = scanRef.current;
      if (rel === "wiki/log.md") return scan?.log ?? null;
      return [...(scan?.life ?? []), ...(scan?.pages ?? [])].find((f) => f.rel.normalize("NFC") === rel.normalize("NFC"))?.content ?? null;
    },
    [root],
  );

  const readDayFresh = useCallback(
    async (date: string): Promise<Day> => {
      const text = await readFresh(dayRel(date));
      return text === null ? emptyDay(date) : parseDay({ rel: dayRel(date), content: text, mtime: 0 });
    },
    [readFresh],
  );

  // The disk, not the last scan: the bot or Obsidian may have written since.
  const updateToday = useCallback(
    async (fn: (d: Day) => Day) => {
      const today = dayToday();
      const next = fn(await readDayFresh(today));
      await saveText(dayRel(today), serializeDay(next));
    },
    [readDayFresh, saveText],
  );

  const saveDayMerged = useCallback(
    async (base: Day, ours: Day): Promise<Day> => {
      const merged = mergeDay(base, ours, await readDayFresh(ours.date));
      await saveText(dayRel(ours.date), serializeDay(merged));
      return merged;
    },
    [readDayFresh, saveText],
  );

  const saveLedger = useCallback(
    async (rel: string, content: string, parse: (content: string) => unknown[]) => {
      const disk = await readFresh(rel);
      if (disk !== null) {
        const seen = scanRef.current?.life?.find((f) => f.rel.normalize("NFC") === rel.normalize("NFC"))?.content;
        if (seen !== undefined && seen !== disk) {
          void rescan();
          throw new LedgerConflict(`${rel} изменился снаружи (Claude, Obsidian или бот). Экран обновлён — повтори действие.`);
        }
        const lost = ledgerLosses(disk, content, parse);
        if (lost.length) {
          throw new LedgerConflict(`Не записал ${rel}: приложение не понимает ${lost.length === 1 ? "строку" : "строки"} и потеряло бы ${lost.length === 1 ? "её" : "их"}. Поправь в Obsidian:\n${lost.slice(0, 8).join("\n")}`);
        }
      }
      await saveText(rel, content);
    },
    [readFresh, rescan, saveText],
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

  const value = useMemo<Store>(
    () => ({ root, setRoot, vault, index, needIndex, life, saveText, updateToday, readFresh, saveDayMerged, saveLedger, timer, startTimer, stopTimer, pending, commitSession, discardSession, loading, error, reload, paletteOpen, setPaletteOpen, lang, setLang }),
    [root, vault, index, needIndex, life, saveText, updateToday, readFresh, saveDayMerged, saveLedger, timer, startTimer, stopTimer, pending, commitSession, discardSession, loading, error, reload, paletteOpen, lang],
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
