import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { THEMES, groupByTheme, themeColor } from "../lib/themes";
import { useT } from "../lib/i18n";
import { confirmAction } from "../lib/native";
import { addDays, formatDayTitle, todayStr } from "../lib/dates";
import { maghribOn } from "../lib/maghrib";
import { useDayToday } from "../lib/useDayToday";
import {
  HABIT_DIR, LATE_MEAL_HOUR, earnedOf, emptyDay, habitDue, isLateMeal, normalizeTime,
  markOf, mergeDay, byHabitTime, habitTimeLabel, parseAmount, safeFilename, serializeDay, serializeHabit, spentOf, streak, withMark, xpForDay,
  type Day, type DayMark, type Habit, type HabitKind, type HabitTime, HABIT_TIMES, type Tx, type XpContext,
} from "../lib/life";
import QuestRows from "../components/QuestRows";
import TodayPlan from "../components/TodayPlan";
import NeedsYou from "../components/NeedsYou";

const NEXT_MARK: Record<string, DayMark | undefined> = { none: "done", done: "failed", failed: "skipped", skipped: undefined, late: "failed" };
const MARK_GLYPH: Record<string, string> = { none: "", done: "✓", failed: "✗", skipped: "→", late: "⏰" };
const MARK_TITLE: Record<string, string> = { none: "не отмечено", done: "сделано", failed: "не сделано", skipped: "пропуск по плану", late: "поздно" };

function fmtMoney(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

/** The day runs maghrib to maghrib: at sunset the screen turns over to the next file. */
export default function DayPage() {
  const today = useDayToday();
  return <DayView key={today} today={today} />;
}

function DayView({ today }: { today: string }) {
  const { vault, life, saveText, saveDayMerged, reload } = useStore();
  const { themeLabel } = useT();
  const habits = life?.habits ?? [];
  const fromDisk = life?.days.get(today);

  // ----- draft: the day as edited here; written to disk 600ms after every change -----
  const [draft, setDraft] = useState<Day>(() => fromDisk ?? emptyDay(today));
  const lastWritten = useRef<string | null>(fromDisk ? serializeDay(fromDisk) : null);
  // The day as last seen on disk — what the draft's edits are measured against when merging.
  const base = useRef<Day>(fromDisk ?? emptyDay(today));
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [meal, setMeal] = useState({ time: "", what: "", note: "" });

  // External change (the bot, Claude, Obsidian): fold it into the draft. Unsaved
  // edits here stay; what changed on disk comes in. Our own echo changes nothing.
  useEffect(() => {
    if (!fromDisk) return;
    const ser = serializeDay(fromDisk);
    if (ser === lastWritten.current) return;
    const was = base.current;
    base.current = fromDisk;
    lastWritten.current = ser;
    setDraft((prev) => (dirty.current ? mergeDay(was, prev, fromDisk) : fromDisk));
  }, [fromDisk]);

  const persist = useCallback(
    async (d: Day) => {
      try {
        // Merged with the disk at the moment of writing, so a bot mark made a second ago survives.
        const written = await saveDayMerged(base.current, d);
        base.current = written;
        lastWritten.current = serializeDay(written);
        dirty.current = false;
        setSaveError(null);
        // Edits typed while the write was in flight stay; the disk's additions join them.
        setDraft((prev) => mergeDay(d, prev, written));
      } catch (e) {
        setSaveError(String(e));
      }
    },
    [saveDayMerged],
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

  // ----- reopening -----
  const [reopening, setReopening] = useState(false);

  /** The app no longer closes days; this lifts the lock from an old file that still says `closed: true`. */
  const reopen = async () => {
    if (!life || reopening) return;
    if (!(await confirmAction(`Открыть день ${draft.date} заново?`))) return;
    setReopening(true);
    try {
      const open = { ...draft, closed: false };
      setDraft(open); // persist merges against the draft, so it has to be open already or `closed` stays true
      await persist(open);
      setSaveError(null);
      await reload();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setReopening(false);
    }
  };

  // ----- habits -----
  const due = useMemo(() => habits.filter((h) => habitDue(h, today)), [habits, today]);
  const dueByTheme = useMemo(() => groupByTheme([...due].sort(byHabitTime)), [due]);
  const notDue = useMemo(() => habits.filter((h) => h.status === "active" && !habitDue(h, today)), [habits, today]);
  const [newHabit, setNewHabit] = useState({ title: "", theme: THEMES[2].name, kind: "good" as HabitKind, time: "" as HabitTime | "" });
  const [habitError, setHabitError] = useState<string | null>(null);

  const addHabit = async () => {
    const title = newHabit.title.trim();
    if (!title) return;
    const file = safeFilename(title);
    if (!file) return;
    if (habits.some((h) => h.title === title)) { setHabitError("Такая привычка уже есть."); return; }
    try {
      await saveText(`${HABIT_DIR}/${file}.md`, serializeHabit({ title, theme: newHabit.theme, kind: newHabit.kind, freq: "daily", time: newHabit.time || undefined, status: "active", created: today, source: undefined }));
      setNewHabit({ ...newHabit, title: "" });
      setHabitError(null);
      await reload();
    } catch (e) {
      setHabitError(String(e));
    }
  };

  const cycle = (h: Habit) => {
    update((d) => withMark(d, h.title, NEXT_MARK[markOf(d, h.title) ?? "none"]));
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

  const addMeal = () => {
    const what = meal.what.trim();
    if (!what) return;
    const time = normalizeTime(meal.time) || new Date().toTimeString().slice(0, 5);
    update((d) => ({ ...d, meals: [...d.meals, { time, what, note: meal.note.trim() }].sort((a, b) => a.time.localeCompare(b.time)) }));
    setMeal({ time: "", what: "", note: "" });
  };

  const addTx = () => {
    const amount = parseAmount(tx.amount);
    if (amount === undefined || amount === 0) return;
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
      <div className="eyebrow">
        {locked ? "День закрыт" : "Сегодня"}
        {todayStr() !== today && ` · с магриба ${maghribOn(addDays(today, -1)).toTimeString().slice(0, 5)}`}
      </div>
      <h1 className="title">{formatDayTitle(today)}</h1>
      <p className="lede">
        {due.length ? `${draft.habitsDone.length} из ${due.length} привычек` : "Привычек на сегодня нет"}
        {" · "}потрачено <b>{fmtMoney(spentOf(draft))}</b>
        {" · "}XP <b>{xpTotal}</b>
      </p>

      {!locked && <NeedsYou today={today} />}

      {saveError && <div className="notice err">Не удалось записать: {saveError}</div>}

      <div className="day-grid">
        <div className="col">
          <div className="card">
            <h3>Привычки <span className="n">{draft.habitsDone.length}/{due.length}</span></h3>
            {due.length === 0 && <div className="empty">Добавь первую привычку ниже. Она станет файлом в life/habits/.</div>}
            {dueByTheme.groups.map((g) => {
              const done = g.items.filter((h) => markOf(draft, h.title) === "done").length;
              const open = g.items.some((h) => !markOf(draft, h.title));
              return (
                <details className="htheme" key={g.theme ?? "none"} open={open || undefined}>
                  <summary>
                    <i className="tdot" style={{ background: themeColor(g.theme) }} />
                    <span>{g.theme ? themeLabel(g.theme) : "без темы"}</span>
                    <span className="n">{done}/{g.items.length}</span>
                  </summary>
                  {g.items.map((h) => {
                    const m = markOf(draft, h.title) ?? "none";
                    const s = streak(h, life.days, addDays(today, -1)) + (m === "done" ? 1 : 0);
                    return (
                      <div className="habit" key={h.rel}>
                        <button className={`mark ${m}`} title={MARK_TITLE[m]} onClick={() => cycle(h)} disabled={locked}>{MARK_GLYPH[m]}</button>
                        <div>
                          <div className="name">{h.title}</div>
                          <div className="sub">{habitTimeLabel(h.time)}{h.kind === "bad" ? " · плохая привычка: ✓ = удержался" : ""}</div>
                        </div>
                        <div className="streak">{s > 0 ? <><b>{s}</b> дн.</> : "—"}</div>
                      </div>
                    );
                  })}
                </details>
              );
            })}
            {due.length > 0 && dueByTheme.missing.length > 0 && <div className="small faint" style={{ marginTop: 8 }}>Без привычек сегодня: {dueByTheme.missing.map((t) => themeLabel(t)).join(", ")}</div>}
            {notDue.length > 0 && <div className="small faint" style={{ marginTop: 8 }}>Не сегодня: {notDue.map((h) => h.title).join(", ")}</div>}
            {!locked && (
              <form className="addrow habit" onSubmit={(e) => { e.preventDefault(); void addHabit(); }}>
                <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Новая привычка" value={newHabit.title} onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })} />
                <select className="text" value={newHabit.theme} onChange={(e) => setNewHabit({ ...newHabit, theme: e.target.value })}>
                  {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
                </select>
                <select className="text" value={newHabit.kind} onChange={(e) => setNewHabit({ ...newHabit, kind: e.target.value as HabitKind })}>
                  <option value="good">хорошая</option>
                  <option value="bad">плохая</option>
                </select>
                <select className="text" value={newHabit.time} onChange={(e) => setNewHabit({ ...newHabit, time: e.target.value as HabitTime | "" })}>
                  <option value="">весь день</option>
                  {HABIT_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
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
                <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Что сделано" value={doneText} onChange={(e) => setDoneText(e.target.value)} />
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
                <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="−сумма" value={tx.amount} onChange={(e) => setTx({ ...tx, amount: e.target.value })} />
                <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="категория" list="cats" value={tx.category} onChange={(e) => setTx({ ...tx, category: e.target.value })} />
                <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="счёт" list="accts" value={tx.account} onChange={(e) => setTx({ ...tx, account: e.target.value })} />
                <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="заметка" value={tx.note} onChange={(e) => setTx({ ...tx, note: e.target.value })} />
                <button className="btn" type="submit">+</button>
                <datalist id="cats">{categoryNames.map((c) => <option key={c} value={c} />)}</datalist>
                <datalist id="accts">{accountNames.map((c) => <option key={c} value={c} />)}</datalist>
              </form>
            )}
            <div className="totals">
              <span>потрачено <b className="amt neg">{fmtMoney(spentOf(draft))}</b></span>
              <span>получено <b className="amt pos">{fmtMoney(earnedOf(draft))}</b></span>
              <span className="faint">минус = трата, плюс = доход</span>
            </div>
          </div>

          <div className="card">
            <h3>Еда <span className="n">{draft.meals.length}</span></h3>
            <div className="small faint" style={{ margin: "-4px 0 8px" }}>Что и когда ел. После {LATE_MEAL_HOUR}:00 помечается: поздняя еда бьёт по поджелудочной.</div>
            {draft.meals.length > 0 && (
              <table className="tbl">
                <tbody>
                  {draft.meals.map((m, i) => (
                    <tr className={`mealrow ${isLateMeal(m) ? "late" : ""}`} key={i}>
                      <td className="mono" style={{ width: 58 }}>{m.time || "—"}</td>
                      <td>{m.what}{isLateMeal(m) && <span className="badge warn" style={{ marginLeft: 8 }}>поздно</span>}</td>
                      <td className="muted">{m.note}</td>
                      <td>{!locked && <button className="x" title="убрать" onClick={() => update((d) => ({ ...d, meals: d.meals.filter((_, j) => j !== i) }))}>×</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!locked && (
              <form className="addrow meal" onSubmit={(e) => { e.preventDefault(); addMeal(); }}>
                <span className="row" style={{ gap: 4 }}>
                  <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="8:30" value={meal.time} onChange={(e) => setMeal({ ...meal, time: e.target.value })} style={{ width: 62 }} />
                  <button className="btn small ghost" type="button" title="поставить текущее время" onClick={() => setMeal({ ...meal, time: new Date().toTimeString().slice(0, 5) })}>сейчас</button>
                </span>
                <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="что ел" value={meal.what} onChange={(e) => setMeal({ ...meal, what: e.target.value })} />
                <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="заметка (жирное, изжога…)" value={meal.note} onChange={(e) => setMeal({ ...meal, note: e.target.value })} />
                <button className="btn" type="submit">+</button>
              </form>
            )}
          </div>

          <div className="card">
            <h3>Журнал</h3>
            <textarea className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Как прошёл день. Свободный текст, он останется в файле дня." value={draft.journal} disabled={locked}
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

          <TodayPlan />

          <div className="card">
            <h3>Квесты <span className="n">{draft.sessions.reduce((s, x) => s + x.minutes, 0)} мин</span></h3>
            <QuestRows quests={activeQuests} compact />
            {draft.sessions.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {draft.sessions.map((s, i) => <div className="bul small" key={i}>{s.at && <span className="mono faint" style={{ marginRight: 8 }}>{s.at}</span>}<span>{s.quest}</span><span className="mono" style={{ marginLeft: "auto" }}>{s.minutes} мин</span></div>)}
              </div>
            )}
            {draft.questsClosed.length > 0 && <div className="small muted" style={{ marginTop: 8 }}>Закрыто сегодня: {draft.questsClosed.join(", ")}</div>}
          </div>

          {locked && (
            <div className="closebar closed">
              <span className="badge ok">закрыт</span>
              <span className="small muted">День зафиксирован, поэтому привычки, деньги и ползунки не двигаются.</span>
              <span className="grow" />
              <button className="btn small" onClick={() => void reopen()} disabled={reopening}>открыть заново</button>
            </div>
          )}

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
