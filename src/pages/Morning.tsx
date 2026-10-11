import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { useT } from "../lib/i18n";
import { addDays, formatDayTitle } from "../lib/dates";
import { useDayToday } from "../lib/useDayToday";
import { closeDays } from "../lib/closeDays";
import { goalsFor, withTaskDone } from "../lib/goals";
import { parseHealth } from "../lib/health";
import { themeColor } from "../lib/themes";
import { heldOut, weekGrid, winNumbers } from "../lib/wins";
import { GOALS_DIR, emptyDay, habitDue, impliedMarks, markOf, mergeDay, nextStep, questSteps, serializeDay, serializeQuest, withMark, withQuestSteps, type Day, type DayMark, type Habit, type HabitKind, type Quest, type QuestStep } from "../lib/life";
import NeedsYou from "../components/NeedsYou";
import "./Morning.css";

/**
 * «Утро» — the one screen of v2 (spec 2026-10-11). Eldar wakes up, opens the
 * app, marks *yesterday* himself (prayers in three states, what he held out
 * against, the habits he is building), presses «Готово», sees what grew, and
 * then what today's first step is. Nothing else is entered here: money, meals,
 * events and quest steps come in through Claude and show up on their own.
 */

/**
 * One button (Eldar, 2026-10-11): a good habit is tapped when done and
 * untouched means not done; a bad habit is tapped only when he gave in and
 * untouched means he held out. Prayers keep three states. What is untouched
 * gets its implied mark when «Готово» closes the day (`impliedMarks`).
 */
const PRAYER_CYCLE: Record<string, DayMark | undefined> = { none: "done", done: "late", late: "failed", failed: undefined };
const GLYPH: Record<string, string> = { none: "", done: "✓", late: "⏰", failed: "✗", skipped: "–" };
const PRAYER_TITLE: Record<string, string> = { none: "не отмечено", done: "вовремя", late: "прочитал, но поздно", failed: "пропустил", skipped: "пропуск" };
const BAD_TITLE: Record<string, string> = { none: "устоял", done: "устоял", failed: "не удержался — нажми ещё раз, если всё-таки устоял", skipped: "пропуск", late: "" };
const GOOD_TITLE: Record<string, string> = { none: "не сделал — нажми, если сделал", done: "сделал", failed: "не сделал", skipped: "пропуск по плану", late: "" };

const GROUPS: { kind: HabitKind; title: string; hint: string }[] = [
  { kind: "prayer", title: "Намаз", hint: "✓ вовремя · ⏰ поздно · ✗ пропустил" },
  { kind: "bad", title: "Удержался", hint: "нажми только то, где не удержался" },
  { kind: "good", title: "Привычки", hint: "нажми, что сделал" },
];

/** Did this habit count on that day: a prayer read, a bad habit held, a good one done. */
const scored = (m: DayMark | undefined, kind: HabitKind) => (kind === "bad" ? m !== "failed" : m === "done" || m === "late");

export default function MorningPage() {
  const today = useDayToday();
  return <Morning key={today} today={today} />;
}

function Morning({ today }: { today: string }) {
  const { vault, life, saveText, readFresh, saveDayMerged, commitVault, reload } = useStore();
  const { themeLabel } = useT();
  const yesterday = addDays(today, -1);
  const habits = life?.habits ?? [];
  const fromDisk = life?.days.get(yesterday);

  // ----- yesterday's draft: marks land on disk 500 ms after a tap, merged with whatever is there -----
  const [draft, setDraft] = useState<Day>(() => fromDisk ?? emptyDay(yesterday));
  const base = useRef<Day>(fromDisk ?? emptyDay(yesterday));
  const lastWritten = useRef<string | null>(fromDisk ? serializeDay(fromDisk) : null);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [justClosed, setJustClosed] = useState(false);

  useEffect(() => {
    if (!fromDisk) return;
    const ser = serializeDay(fromDisk);
    if (ser === lastWritten.current) return;
    const was = base.current;
    base.current = fromDisk;
    lastWritten.current = ser;
    setDraft((prev) => (dirty.current ? mergeDay(was, prev, fromDisk) : fromDisk));
  }, [fromDisk]);

  const persist = useCallback(async (d: Day) => {
    try {
      const written = await saveDayMerged(base.current, d);
      base.current = written;
      lastWritten.current = serializeDay(written);
      dirty.current = false;
      setErr(null);
      setDraft((prev) => mergeDay(d, prev, written));
    } catch (e) { setErr(String(e)); }
  }, [saveDayMerged]);

  const update = useCallback((fn: (d: Day) => Day) => {
    setDraft((prev) => {
      if (prev.closed) return prev;
      const next = fn(prev);
      dirty.current = true;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void persist(next), 500);
      return next;
    });
  }, [persist]);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => () => { window.clearTimeout(timer.current); if (dirty.current) void persist(draftRef.current); }, [persist]);

  // ----- the groups due yesterday -----
  const due = useMemo(() => habits.filter((h) => habitDue(h, yesterday)), [habits, yesterday]);
  const byKind = (k: HabitKind) => due.filter((h) => h.kind === k).sort((a, b) => a.title.localeCompare(b.title, "ru"));
  const prayersOpen = byKind("prayer").filter((h) => !markOf(draft, h.title)).length;
  const summary = GROUPS.map((g) => {
    const items = byKind(g.kind);
    return items.length ? `${g.title.toLowerCase()} ${items.filter((h) => scored(markOf(draft, h.title), g.kind)).length}/${items.length}` : "";
  }).filter(Boolean).join(" · ");

  const tap = (h: Habit) => update((d) => {
    const cur = markOf(d, h.title);
    if (h.kind === "prayer") return withMark(d, h.title, PRAYER_CYCLE[cur ?? "none"]);
    if (h.kind === "bad") return withMark(d, h.title, cur === "failed" ? undefined : "failed");
    return withMark(d, h.title, cur === "done" ? undefined : "done");
  });
  /** The day as its marks imply: what the grid and the streaks show before «Готово». */
  const implied = useMemo(() => impliedMarks(draft, habits), [draft, habits]);

  // ----- closing: «Готово» for yesterday; anything older closes on its own -----
  const deps = useCallback(() => ({ readFresh, saveText, commitVault, habits, logText: vault?.logText ?? "" }), [readFresh, saveText, commitVault, habits, vault]);

  const done = async () => {
    if (draft.closed || busy) return;
    window.clearTimeout(timer.current);
    setBusy(true);
    try {
      const [closed] = await closeDays([{ base: base.current, ours: draft }], deps());
      if (closed) { base.current = closed; lastWritten.current = serializeDay(closed); dirty.current = false; setDraft(closed); setJustClosed(true); }
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const reopen = async () => {
    if (!draft.closed || busy) return;
    setBusy(true);
    const open = { ...draft, closed: false };
    setDraft(open); // before persist: its merge keeps the draft's own fields, so the draft must already be open
    try { await persist(open); setJustClosed(false); await reload(); } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const autoRan = useRef(false);
  useEffect(() => {
    if (!life || autoRan.current) return;
    autoRan.current = true;
    const stale = [...life.days.values()].filter((d) => !d.closed && d.date < yesterday).sort((a, b) => a.date.localeCompare(b.date));
    if (!stale.length) return;
    void closeDays(stale.map((d) => ({ base: d, ours: d })), deps()).then(() => reload()).catch((e) => setErr(String(e)));
  }, [life, yesterday, deps, reload]);

  // ----- wins -----
  const weightGoal = useMemo(() => (life?.health ? parseHealth(life.health).weightGoal : undefined), [life]);
  const numbers = useMemo(() => (life && vault ? winNumbers(life, vault.pages, yesterday, weightGoal) : []), [life, vault, yesterday, weightGoal]);
  const grid = useMemo(() => (life ? weekGrid(habits, new Map([...life.days, [implied.date, implied]]), yesterday) : []), [life, habits, implied, yesterday]);
  const held = useMemo(() => {
    if (!life) return [];
    const days = new Map([...life.days, [implied.date, implied]]);
    return habits.filter((h) => h.status === "active" && h.kind === "bad").map((h) => ({ h, n: heldOut(h, days, yesterday) })).sort((a, b) => b.n - a.n);
  }, [life, habits, implied, yesterday]);

  // ----- today: the step he does himself is ticked here; the rest comes from Claude -----
  const quests = useMemo(() => (life?.quests ?? []).filter((q) => q.status === "active").map((q) => ({ q, steps: questSteps(q.body) })), [life]);
  const { week, month } = useMemo(() => goalsFor(life?.goals ?? new Map(), today), [life, today]);
  const [ticking, setTicking] = useState<string | null>(null);

  /** Tick the current step of a quest: `- [x]`, with the date on its detail line so the quest no longer counts as stalled. */
  const tickStep = async (q: Quest, steps: QuestStep[], step: QuestStep) => {
    if (ticking) return;
    setTicking(q.rel);
    try {
      const next = steps.map((s) => (s === step ? { ...s, done: true, detail: [s.detail, `✓ ${today}`].filter(Boolean).join("\n") } : s));
      await saveText(q.rel, serializeQuest({ ...q, body: withQuestSteps(q.body, next) }));
      await reload();
    } catch (e) { setErr(String(e)); } finally { setTicking(null); }
  };

  const tickTask = async (index: number, done: boolean) => {
    if (!week || ticking) return;
    const rel = `${GOALS_DIR}/${week.key}.md`;
    const content = life?.goals.get(week.key);
    if (!content) return;
    setTicking(rel);
    try { await saveText(rel, withTaskDone(content, index, done)); await reload(); } catch (e) { setErr(String(e)); } finally { setTicking(null); }
  };

  if (!vault || !life) return null;
  const locked = draft.closed;

  return (
    <div className="morning">
      <div className="eyebrow">Утро</div>
      <h1 className="title">{formatDayTitle(today)}</h1>

      {err && <div className="notice err">Не удалось записать: {err}</div>}

      {/* ---------- yesterday ---------- */}
      <section className={`card yday ${locked ? "locked" : ""}`}>
        <header className="yhead">
          <div>
            <div className="eyebrow">Вчера{locked ? " · закрыт" : ""}</div>
            <h2>{formatDayTitle(yesterday)}</h2>
          </div>
          <div className="ycount mono">{summary}</div>
        </header>

        {GROUPS.map((g) => {
          const items = byKind(g.kind);
          if (!items.length) return null;
          const got = items.filter((h) => scored(markOf(draft, h.title), g.kind)).length;
          const titles = g.kind === "prayer" ? PRAYER_TITLE : g.kind === "bad" ? BAD_TITLE : GOOD_TITLE;
          return (
            <div className={`ygroup ${g.kind}`} key={g.kind}>
              <div className="ygroup-head">
                <span className="gname">{g.title}</span>
                <span className="ghint">{g.hint}</span>
                <span className="gn mono">{got}/{items.length}</span>
              </div>
              <div className="cells">
                {items.map((h) => {
                  const m = markOf(draft, h.title) ?? "none";
                  const look = g.kind === "bad" && m !== "failed" ? "held" : m;
                  return (
                    <button key={h.rel} className={`cell ${look}`} disabled={locked} onClick={() => tap(h)} title={`${h.title}: ${titles[m]}`}>
                      <span className="g">{look === "held" ? "✓" : GLYPH[m]}</span>
                      <span className="t">{h.title.replace(/^Учить суру\s+/, "Сура ")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {due.length === 0 && <div className="small muted">Вчера привычек не было.</div>}

        <footer className="yfoot">
          {locked ? (
            <>
              <span className="small muted">закрыт{prayersOpen ? ` · намаз без отметки: ${prayersOpen}` : ""}</span>
              <button className="btn small ghost" onClick={reopen} disabled={busy}>исправить</button>
            </>
          ) : (
            <>
              <span className="small muted">{prayersOpen ? `намаз без отметки: ${prayersOpen}` : "намаз отмечен"} · не нажатое: привычка — не сделал, удержался — устоял</span>
              <button className="btn primary" onClick={done} disabled={busy}>{busy ? "…" : "Готово"}</button>
            </>
          )}
        </footer>
      </section>

      {/* ---------- wins ---------- */}
      <section className={`wins ${justClosed ? "fresh" : ""}`}>
        <div className="numbers">
          {numbers.map((n) => (
            <div className={`num ${n.key}`} key={n.key}>
              <div className="v">{n.value}{n.trend !== 0 && <span className={`tr ${n.trend > 0 ? "up" : "down"}`}>{n.trend > 0 ? "▲" : "▼"}</span>}</div>
              <div className="l">{n.label}</div>
              <div className="s">{n.sub}</div>
            </div>
          ))}
        </div>
        <div className="card gridcard">
          <div className="gridwrap">
            <div className="grid">
              <div className="gh" />
              {grid[0]?.cells.map((c) => <div className="gh mono" key={c.date}>{["вс", "пн", "вт", "ср", "чт", "пт", "сб"][new Date(c.date + "T12:00:00").getDay()]}</div>)}
              {grid.map((r) => (
                <div className="grow-row" key={r.kind} style={{ display: "contents" }}>
                  <div className={`gl ${r.kind}`}>{r.label}</div>
                  {r.cells.map((c) => {
                    const f = c.due ? c.done / c.due : 0;
                    return <div key={c.date} className={`gc ${r.kind} ${c.due ? "" : "none"}`} style={{ ["--f" as string]: f }} title={`${c.date}: ${c.done} из ${c.due}`} />;
                  })}
                </div>
              ))}
            </div>
            <div className="held">
              {held.slice(0, 4).map(({ h, n }) => (
                <div className="hrow" key={h.rel}><span className="hn">{h.title}</span><b className={n ? "" : "zero"}>{n} дн</b></div>
              ))}
              {held.length === 0 && <div className="small muted">Плохих привычек нет.</div>}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- today ---------- */}
      <section className="today">
        <div className="eyebrow">Сегодня</div>
        <NeedsYou today={today} />
        <div className="qcards">
          {quests.map(({ q, steps }) => {
            const next = nextStep(steps);
            const at = next ? steps.indexOf(next) : -1;
            const after = at >= 0 ? steps.slice(at + 1).filter((s) => !s.done).slice(0, 2) : [];
            const doneN = steps.filter((s) => s.done).length;
            return (
              <div className="card qcard" key={q.rel} style={{ ["--c" as string]: themeColor(q.theme) }}>
                <div className="qhead">
                  <i className="tdot" style={{ background: themeColor(q.theme) }} />
                  <Link to={`/quest/${encodeURIComponent(q.rel)}`} className="qt">{q.title}</Link>
                  <span className="mono n">{steps.length ? `${doneN}/${steps.length}` : ""}</span>
                </div>
                {next ? (
                  <>
                    <div className="step now">
                      <button className="qcheck big" disabled={ticking !== null} onClick={() => void tickStep(q, steps, next)} title="сделал — открыть следующий шаг" />
                      <span className="s">{next.text.replace(/\s*—\s*(ты|Claude|ET1|JH1|ты и Claude|Claude и ты)\s*$/i, "")}</span>
                    </div>
                    {after.map((s, i) => (
                      <div className="step locked" key={i}><span className="k">🔒</span><span className="s">{s.text.replace(/\s*—\s*(ты|Claude|ET1|JH1|ты и Claude|Claude и ты)\s*$/i, "")}</span></div>
                    ))}
                  </>
                ) : (
                  <div className="step none"><span className="s">{steps.length ? "все шаги сделаны — скажи Claude, что дальше, или закрой квест" : "шагов нет — скажи Claude первый"}</span></div>
                )}
                <div className="small faint qtheme-line">{q.theme ? themeLabel(q.theme) : ""}{q.due ? ` · до ${q.due}` : ""}</div>
              </div>
            );
          })}
          {quests.length === 0 && <div className="empty">Активных квестов нет. Скажи Claude, что в работе.</div>}
        </div>

        <div className="goals2">
          <div className="card goalcard">
            <h3>Неделя {week ? week.key.replace(/^\d+-W/, "") : ""}{week && week.tasks.length ? <span className="n">{week.tasks.filter((t) => t.done).length}/{week.tasks.length}</span> : null}</h3>
            {!week && <div className="small muted">Файла недели нет. Воскресенье вечером: цели недели со мной.</div>}
            {week && week.goals.map((g, i) => <div className="goal" key={i}>{g}</div>)}
            {week && week.tasks.length > 0 && (
              <div className="tasks">
                {week.tasks.map((t, i) => (
                  <button className={`task ${t.done ? "done" : ""}`} key={i} disabled={ticking !== null} onClick={() => void tickTask(i, !t.done)} title={t.done ? "вернуть в работу" : "сделал"}>
                    <span className="box">{t.done ? "✓" : ""}</span><span>{t.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="card goalcard">
            <h3>Месяц {month ? month.key.slice(5) : ""}</h3>
            {!month && <div className="small muted">Файла месяца нет.</div>}
            {month && month.goals.map((g, i) => <div className="goal" key={i}>{g}</div>)}
          </div>
        </div>
      </section>
    </div>
  );
}
