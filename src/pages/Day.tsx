import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { THEMES } from "../lib/themes";
import { useT } from "../lib/i18n";
import { inTauri } from "../lib/native";
import { addDays, formatDayTitle, todayStr } from "../lib/dates";
import {
  ACCOUNTS_REL, HABIT_DIR, applyDayToAccounts, closeDay, dayLogLine, dayRel, earnedOf, emptyDay, habitDue,
  markOf, safeFilename, serializeAccounts, serializeDay, serializeHabit, spentOf, streak, withMark, xpForDay,
  type Day, type DayMark, type Habit, type HabitKind, type Tx, type XpContext,
} from "../lib/life";
import type { CmdResult } from "../lib/fs";
import QuestRows from "../components/QuestRows";

const NEXT_MARK: Record<string, DayMark | undefined> = { none: "done", done: "failed", failed: "skipped", skipped: undefined };
const MARK_GLYPH: Record<string, string> = { none: "", done: "✓", failed: "✗", skipped: "→" };
const MARK_TITLE: Record<string, string> = { none: "не отмечено", done: "сделано", failed: "не сделано", skipped: "пропуск по плану" };

function fmtMoney(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

interface CloseReport {
  day: Day;
  git: CmdResult | null;
  auto: boolean;
}

export default function DayPage() {
  const { vault, life, saveText, commitVault, reload } = useStore();
  const { themeLabel } = useT();
  const today = todayStr();
  const habits = life?.habits ?? [];
  const fromDisk = life?.days.get(today);

  // ----- draft: the day as edited here; written to disk 600ms after every change -----
  const [draft, setDraft] = useState<Day>(() => fromDisk ?? emptyDay(today));
  const lastWritten = useRef<string | null>(fromDisk ? serializeDay(fromDisk) : null);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);

  // External change (Claude, Obsidian, or our own echo): adopt it unless we have unsaved edits.
  useEffect(() => {
    if (!fromDisk) return;
    const ser = serializeDay(fromDisk);
    if (ser !== lastWritten.current && !dirty.current) {
      setDraft(fromDisk);
      lastWritten.current = ser;
    }
  }, [fromDisk]);

  const persist = useCallback(
    async (d: Day) => {
      const ser = serializeDay(d);
      lastWritten.current = ser;
      try {
        await saveText(dayRel(d.date), ser);
        dirty.current = false;
        setSaveError(null);
      } catch (e) {
        setSaveError(String(e));
      }
    },
    [saveText],
  );

  const update = useCallback(
    (fn: (d: Day) => Day) => {
      setDraft((prev) => {
        if (prev.closed) return prev;
        const next = fn(prev);
        dirty.current = true;
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void persist(next), 600);
        return next;
      });
    },
    [persist],
  );

  // Leaving the page flushes a pending write so no other page reads a stale file.
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    if (dirty.current) void persist(draftRef.current);
  }, [persist]);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // ----- closing -----
  const [report, setReport] = useState<CloseReport | null>(null);
  const [closing, setClosing] = useState(false);
  const [autoClosed, setAutoClosed] = useState<string[]>([]);
  const autoRan = useRef(false);

  /** Close one or more days: write files, update accounts, append log lines, one commit. */
  const closeDays = useCallback(
    async (days: Day[], auto: boolean): Promise<CloseReport | null> => {
      if (!vault || !life) return null;
      const paths: string[] = [];
      let logText = vault.logText;
      let accounts = life.accounts;
      let last: Day | null = null;
      for (const d of days) {
        const closed = closeDay(d, life.habits);
        const ser = serializeDay(closed);
        if (closed.date === today) lastWritten.current = ser;
        await saveText(dayRel(closed.date), ser);
        paths.push(dayRel(closed.date));
        if (closed.txs.some((t) => t.account.trim())) {
          const r = applyDayToAccounts(accounts ?? [], closed);
          if (r.changed) {
            accounts = r.rows;
            await saveText(ACCOUNTS_REL, serializeAccounts(r.rows, closed.date));
            if (!paths.includes(ACCOUNTS_REL)) paths.push(ACCOUNTS_REL);
          }
        }
        // The app owns its own `day` lines: refresh one in place, append a new one.
        const line = dayLogLine(closed, life.habits);
        const head = line.split(" | ")[0];
        const lines = logText.split("\n");
        const at = lines.findIndex((l) => l.startsWith(head));
        let nextLog = logText;
        if (at >= 0) { if (lines[at] !== line) { lines[at] = line; nextLog = lines.join("\n"); } }
        else nextLog = logText.replace(/\s*$/, "") + "\n\n" + line + "\n";
        if (nextLog !== logText) {
          logText = nextLog;
          await saveText("wiki/log.md", logText);
          if (!paths.includes("wiki/log.md")) paths.push("wiki/log.md");
        }
        last = closed;
      }
      if (!last) return null;
      const msg = days.length === 1 ? `day ${last.date}` : `days ${days[0].date}..${last.date}`;
      const git = await commitVault(paths, msg);
      return { day: last, git, auto };
    },
    [vault, life, saveText, commitVault, today],
  );

  /**
   * Reopen a closed day. The balances the close had applied are rolled back by
   * the inverse of the day's transactions, so closing again lands the corrected
   * numbers once, not twice; the `day` line in the log is rewritten in place.
   */
  const reopen = async () => {
    if (!life || closing) return;
    if (!window.confirm(`Открыть день ${draft.date} заново? Баланс счетов вернётся к состоянию до закрытия, строка в логе обновится при следующем закрытии.`)) return;
    setClosing(true);
    try {
      const open = { ...draft, closed: false };
      await persist(open);
      setDraft(open);
      if (draft.txs.some((t) => t.account.trim())) {
        const inverse = { ...draft, txs: draft.txs.map((t) => ({ ...t, amount: -t.amount })) };
        const r = applyDayToAccounts(life.accounts ?? [], inverse);
        if (r.changed) await saveText(ACCOUNTS_REL, serializeAccounts(r.rows, draft.date));
      }
      setReport(null);
      setSaveError(null);
      await reload();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setClosing(false);
    }
  };

  const doClose = async () => {
    if (draft.closed || closing) return;
    if (!window.confirm("Закрыть день? Неотмеченные привычки станут «не сделано», файл дня и лог уйдут в коммит.")) return;
    window.clearTimeout(timer.current);
    setClosing(true);
    try {
      const r = await closeDays([draft], false);
      if (r) {
        dirty.current = false;
        setDraft(r.day);
        setReport(r);
      }
      await reload();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setClosing(false);
    }
  };

  // Past days left open get closed on the first launch after 09:00 the next day.
  useEffect(() => {
    if (!life || autoRan.current) return;
    autoRan.current = true;
    const now = new Date();
    const yesterday = addDays(today, -1);
    const stale = [...life.days.values()]
      .filter((d) => !d.closed && d.date < today && (d.date < yesterday || now.getHours() >= 9))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!stale.length) return;
    void (async () => {
      try {
        await closeDays(stale, true);
        setAutoClosed(stale.map((d) => d.date));
        await reload();
      } catch (e) {
        setSaveError(String(e));
      }
    })();
  }, [life, today, closeDays, reload]);

  // ----- habits -----
  const due = useMemo(() => habits.filter((h) => habitDue(h, today)), [habits, today]);
  const notDue = useMemo(() => habits.filter((h) => h.status === "active" && !habitDue(h, today)), [habits, today]);
  const [newHabit, setNewHabit] = useState({ title: "", theme: THEMES[2].name, kind: "good" as HabitKind });
  const [habitError, setHabitError] = useState<string | null>(null);

  const addHabit = async () => {
    const title = newHabit.title.trim();
    if (!title) return;
    const file = safeFilename(title);
    if (!file) return;
    if (habits.some((h) => h.title === title)) { setHabitError("Такая привычка уже есть."); return; }
    try {
      await saveText(`${HABIT_DIR}/${file}.md`, serializeHabit({ title, theme: newHabit.theme, kind: newHabit.kind, freq: "daily", status: "active", created: today, source: undefined }));
      setNewHabit({ ...newHabit, title: "" });
      setHabitError(null);
      await reload();
    } catch (e) {
      setHabitError(String(e));
    }
  };

  const cycle = (h: Habit) => {
    const cur = markOf(draft, h.title) ?? "none";
    update((d) => withMark(d, h.title, NEXT_MARK[cur]));
  };

  // ----- done list, money, journal -----
  const [doneText, setDoneText] = useState("");
  const [tx, setTx] = useState({ amount: "", category: "", account: "", note: "" });
  const accountNames = useMemo(() => {
    const s = new Set<string>((life?.accounts ?? []).map((a) => a.name));
    for (const d of life?.days.values() ?? []) for (const t of d.txs) if (t.account) s.add(t.account);
    return [...s];
  }, [life]);
  const categoryNames = useMemo(() => {
    const s = new Set<string>();
    for (const d of life?.days.values() ?? []) for (const t of d.txs) if (t.category) s.add(t.category);
    return [...s];
  }, [life]);

  const addTx = () => {
    const amount = Number(tx.amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(amount) || amount === 0) return;
    const row: Tx = { amount, category: tx.category.trim(), account: tx.account.trim(), note: tx.note.trim() };
    update((d) => ({ ...d, txs: [...d.txs, row] }));
    setTx({ amount: "", category: "", account: tx.account, note: "" });
  };

  const reads = useMemo(
    () => (vault?.pages ?? []).filter((p) => p.zone === "resource" && p.fm.read).map((p) => ({ date: String(p.fm.read instanceof Date ? p.fm.read.toISOString() : p.fm.read).slice(0, 10), theme: p.theme })),
    [vault],
  );
  const xpCtx = useMemo<XpContext>(() => ({ habits, quests: life?.quests ?? [], days: life?.days ?? new Map(), reads }), [habits, life, reads]);
  const xp = useMemo(() => xpForDay(draft, xpCtx), [draft, xpCtx]);
  const activeQuests = useMemo(() => (life?.quests ?? []).filter((q) => q.status === "active"), [life]);
  const xpTotal = [...xp.values()].reduce((a, b) => a + b, 0);

  const week = useMemo(() => {
    const out: { date: string; day: Day | undefined; due: number }[] = [];
    for (let i = 1; i <= 7; i++) {
      const date = addDays(today, -i);
      out.push({ date, day: life?.days.get(date), due: habits.filter((h) => habitDue(h, date)).length });
    }
    return out;
  }, [life, habits, today]);

  if (!vault || !life) return null;
  const locked = draft.closed;

  return (
    <div>
      <div className="eyebrow">{locked ? "День закрыт" : "Сегодня"}</div>
      <h1 className="title">{formatDayTitle(today)}</h1>
      <p className="lede">
        {due.length ? `${draft.habitsDone.length} из ${due.length} привычек` : "Привычек на сегодня нет"}
        {" · "}потрачено <b>{fmtMoney(spentOf(draft))}</b>
        {" · "}XP <b>{xpTotal}</b>
      </p>

      {saveError && <div className="notice err">Не удалось записать: {saveError}</div>}
      {autoClosed.length > 0 && (
        <div className="notice" style={{ marginTop: 10 }}>
          Автоматически закрыты незакрытые дни: {autoClosed.join(", ")}.
        </div>
      )}

      {report && (
        <div className="card summary" style={{ marginTop: 16 }}>
          <h3>Итог дня {report.day.date}</h3>
          <div className="row wrap" style={{ gap: 18, fontSize: 13 }}>
            <span>привычки <b>{report.day.habitsDone.length}</b> / не сделано <b>{report.day.habitsFailed.length}</b></span>
            <span>потрачено <b>{fmtMoney(spentOf(report.day))}</b></span>
            {earnedOf(report.day) > 0 && <span>получено <b>{fmtMoney(earnedOf(report.day))}</b></span>}
            {report.day.mood !== undefined && <span>настроение <b>{report.day.mood}</b></span>}
          </div>
          <div style={{ marginTop: 10 }}>
            {[...xpForDay(report.day, xpCtx).entries()].map(([theme, n]) => (
              <div className="xp-row" key={theme}><span>{themeLabel(theme)}</span><b>+{n} XP</b></div>
            ))}
          </div>
          <div className="small muted" style={{ marginTop: 10 }}>
            {report.git === null
              ? "Записано. Коммит vault делается только из окна приложения, не из браузера."
              : report.git.status === 0
                ? "Записано и закоммичено в vault."
                : `Записано. Коммит не удался: ${(report.git.stderr || report.git.stdout).trim()}`}
          </div>
        </div>
      )}

      <div className="day-grid">
        <div className="col">
          <div className="card">
            <h3>Привычки <span className="n">{draft.habitsDone.length}/{due.length}</span></h3>
            {due.length === 0 && <div className="empty">Добавь первую привычку ниже. Она станет файлом в life/habits/.</div>}
            {due.map((h) => {
              const m = markOf(draft, h.title) ?? "none";
              const s = streak(h.title, life.days, addDays(today, -1)) + (m === "done" ? 1 : 0);
              return (
                <div className="habit" key={h.rel}>
                  <button className={`mark ${m}`} title={MARK_TITLE[m]} onClick={() => cycle(h)} disabled={locked}>{MARK_GLYPH[m]}</button>
                  <div>
                    <div className="name">{h.title}</div>
                    <div className="sub">{h.theme ? themeLabel(h.theme) : "без темы"}{h.kind === "bad" ? " · плохая привычка: ✓ = удержался" : ""}</div>
                  </div>
                  <div className="streak">{s > 0 ? <><b>{s}</b> дн.</> : "—"}</div>
                </div>
              );
            })}
            {notDue.length > 0 && <div className="small faint" style={{ marginTop: 8 }}>Не сегодня: {notDue.map((h) => h.title).join(", ")}</div>}
            {!locked && (
              <form className="addrow habit" onSubmit={(e) => { e.preventDefault(); void addHabit(); }}>
                <input className="text" placeholder="Новая привычка" value={newHabit.title} onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })} />
                <select className="text" value={newHabit.theme} onChange={(e) => setNewHabit({ ...newHabit, theme: e.target.value })}>
                  {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
                </select>
                <select className="text" value={newHabit.kind} onChange={(e) => setNewHabit({ ...newHabit, kind: e.target.value as HabitKind })}>
                  <option value="good">хорошая</option>
                  <option value="bad">плохая</option>
                </select>
                <button className="btn" type="submit">+ добавить</button>
              </form>
            )}
            {habitError && <div className="small" style={{ color: "var(--danger)", marginTop: 6 }}>{habitError}</div>}
          </div>

          <div className="card">
            <h3>Сделано за день <span className="n">{draft.done.length}</span></h3>
            <div className="small faint" style={{ margin: "-4px 0 8px" }}>Свободные строки о том, что сегодня получилось. Квесты живут на своём экране.</div>
            {draft.done.map((x, i) => (
              <div className="bul" key={i}>
                <span>— {x}</span>
                {!locked && <button className="x" title="убрать" onClick={() => update((d) => ({ ...d, done: d.done.filter((_, j) => j !== i) }))}>×</button>}
              </div>
            ))}
            {!locked && (
              <form className="addrow done" onSubmit={(e) => { e.preventDefault(); if (doneText.trim()) { update((d) => ({ ...d, done: [...d.done, doneText.trim()] })); setDoneText(""); } }}>
                <input className="text" placeholder="Что сделано" value={doneText} onChange={(e) => setDoneText(e.target.value)} />
                <button className="btn" type="submit">+</button>
              </form>
            )}
          </div>

          <div className="card">
            <h3>Деньги <span className="n">{draft.txs.length}</span></h3>
            <div className="small faint" style={{ margin: "-4px 0 8px" }}>Операции этого дня. Месяц и счета считаются из них на экране «Финансы».</div>
            {draft.txs.length > 0 && (
              <table className="tbl">
                <thead><tr><th style={{ textAlign: "right" }}>Сумма</th><th>Категория</th><th>Счёт</th><th>Заметка</th><th /></tr></thead>
                <tbody>
                  {draft.txs.map((t, i) => (
                    <tr className="txrow" key={i}>
                      <td className={`amt ${t.amount < 0 ? "neg" : "pos"}`}>{fmtMoney(t.amount)}</td>
                      <td>{t.category}</td><td>{t.account}</td><td className="muted">{t.note}</td>
                      <td>{!locked && <button className="x" title="убрать" onClick={() => update((d) => ({ ...d, txs: d.txs.filter((_, j) => j !== i) }))}>×</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!locked && (
              <form className="addrow tx" onSubmit={(e) => { e.preventDefault(); addTx(); }}>
                <input className="text" placeholder="−сумма" value={tx.amount} onChange={(e) => setTx({ ...tx, amount: e.target.value })} />
                <input className="text" placeholder="категория" list="cats" value={tx.category} onChange={(e) => setTx({ ...tx, category: e.target.value })} />
                <input className="text" placeholder="счёт" list="accts" value={tx.account} onChange={(e) => setTx({ ...tx, account: e.target.value })} />
                <input className="text" placeholder="заметка" value={tx.note} onChange={(e) => setTx({ ...tx, note: e.target.value })} />
                <button className="btn" type="submit">+</button>
                <datalist id="cats">{categoryNames.map((c) => <option key={c} value={c} />)}</datalist>
                <datalist id="accts">{accountNames.map((c) => <option key={c} value={c} />)}</datalist>
              </form>
            )}
            <div className="totals">
              <span>потрачено <b>{fmtMoney(spentOf(draft))}</b></span>
              <span>получено <b>{fmtMoney(earnedOf(draft))}</b></span>
              <span className="faint">минус = трата, плюс = доход</span>
            </div>
          </div>

          <div className="card">
            <h3>Журнал</h3>
            <textarea className="text" placeholder="Как прошёл день. Свободный текст, он останется в файле дня." value={draft.journal} disabled={locked}
              onChange={(e) => update((d) => ({ ...d, journal: e.target.value }))} />
          </div>
        </div>

        <div className="col">
          <div className="card">
            <h3>Состояние</h3>
            <div className="stack" style={{ gap: 12 }}>
              <label className="range-row">
                <span>Настроение</span>
                <input className="slider" type="range" min={1} max={10} value={draft.mood ?? 5} disabled={locked} onChange={(e) => update((d) => ({ ...d, mood: Number(e.target.value) }))} />
                <span className="v">{draft.mood ?? "—"}</span>
              </label>
              <label className="range-row">
                <span>Стресс</span>
                <input className="slider" type="range" min={1} max={10} value={draft.stress ?? 5} disabled={locked} onChange={(e) => update((d) => ({ ...d, stress: Number(e.target.value) }))} />
                <span className="v">{draft.stress ?? "—"}</span>
              </label>
            </div>
          </div>

          <div className="card">
            <h3>XP за день <span className="n">{xpTotal}</span></h3>
            {xp.size === 0 && <div className="small muted">Отметь привычку или напиши журнал.</div>}
            {[...xp.entries()].map(([theme, n]) => (
              <div className="xp-row" key={theme}><span>{themeLabel(theme)}</span><b>+{n}</b></div>
            ))}
          </div>

          <div className="card">
            <h3>Квесты <span className="n">{draft.sessions.reduce((s, x) => s + x.minutes, 0)} мин</span></h3>
            <QuestRows quests={activeQuests} compact />
            {draft.sessions.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {draft.sessions.map((s, i) => <div className="bul small" key={i}><span>{s.quest}</span><span className="mono" style={{ marginLeft: "auto" }}>{s.minutes} мин</span></div>)}
              </div>
            )}
            {draft.questsClosed.length > 0 && <div className="small muted" style={{ marginTop: 8 }}>Закрыто сегодня: {draft.questsClosed.join(", ")}</div>}
          </div>

          <div className={`closebar ${locked ? "closed" : ""}`}>
            {locked ? (
              <>
                <span className="badge ok">закрыт</span>
                <span className="small muted">День зафиксирован, поэтому привычки, деньги и ползунки не двигаются.</span>
                <span className="grow" />
                <button className="btn small" onClick={() => void reopen()} disabled={closing}>открыть заново</button>
              </>
            ) : (
              <>
                <button className="btn primary" onClick={() => void doClose()} disabled={closing}>{closing ? "Закрываю…" : "Закрыть день"}</button>
                <span className="small muted">{inTauri ? "Запишет файл, строку в лог и сделает коммит." : "В браузере: без коммита."}</span>
              </>
            )}
          </div>

          <div className="card">
            <h3>Неделя</h3>
            <table className="tbl week">
              <thead><tr><th>день</th><th>прив.</th><th>трата</th><th>настр.</th></tr></thead>
              <tbody>
                {week.map((w) => (
                  <tr key={w.date}>
                    <td className="date">{w.date.slice(5)}</td>
                    <td>{w.day ? `${w.day.habitsDone.length}/${w.due}` : "—"}</td>
                    <td>{w.day ? fmtMoney(spentOf(w.day)) : "—"}</td>
                    <td>{w.day?.mood ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
