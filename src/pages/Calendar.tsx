import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { useT } from "../lib/i18n";
import { THEMES, themeColor } from "../lib/themes";
import { WEEKDAYS_RU, addDays, formatDayTitle, todayStr, weekdayIndex } from "../lib/dates";
import { confirmAction } from "../lib/native";
import {
  CALENDAR_REL, factDay, fromMin, normEnd, normalizeTime, isWeekly, itemsOn, layLanes, parseCalendar, sameBlock, serializeCalendar, toMin, weekStart,
  type CalItem, type PlanBlock,
} from "../lib/calendar";

const HOUR = 44; // px per hour
const SNAP = 15; // minutes
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Draft {
  orig: PlanBlock | null;
  date: string;
  what: string;
  from: string;
  to: string;
  quest: string;
  theme: string;
  weekly: boolean;
  days: number[];
}

function useMinuteNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  return now;
}

function monthRange(a: string, b: string): string {
  const da = new Date(a + "T12:00:00"), db = new Date(b + "T12:00:00");
  // «18 сентября» → «сентября»: the genitive month, as a date range reads in Russian.
  const mg = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }).split(" ")[1];
  return da.getMonth() === db.getMonth()
    ? `${da.getDate()} — ${db.getDate()} ${mg(db)}`
    : `${da.getDate()} ${mg(da)} — ${db.getDate()} ${mg(db)}`;
}

/** Неделя по часам: план — рамкой, факт (сессии таймера) — заливкой. */
export default function CalendarPage() {
  const { life, saveLedger, timer, startTimer } = useStore();
  const { themeLabel } = useT();
  const nav = useNavigate();
  const today = todayStr();
  const [week, setWeek] = useState(() => weekStart(today));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fact, setFact] = useState<CalItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ date: string; a: number; b: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const nowMs = useMinuteNow();

  const blocks = useMemo(() => parseCalendar(life?.calendar ?? ""), [life]);
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);
  const cols = useMemo(
    () => dates.map((d) => ({ date: d, items: layLanes(itemsOn(d, blocks, life ? factDay(d, life.days) : undefined, life?.quests ?? [], life?.events ?? [])) })),
    [dates, blocks, life],
  );
  const earliest = Math.min(...cols.flatMap((c) => c.items.map((x) => x.item.from)), 6 * 60);
  const startH = Math.floor(earliest / 60);
  const hours = Array.from({ length: 24 - startH }, (_, i) => startH + i);
  const y = (min: number) => ((min - startH * 60) / 60) * HOUR;

  // Open on the working part of the day, not on 06:00 every time.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const n = new Date();
    el.scrollTop = Math.max(0, y(Math.max(8 * 60, n.getHours() * 60 - 120)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!life]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setDraft(null); setFact(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The button can come up anywhere — over a block, outside the grid — so the end of a drag is heard on the window.
  const dragRef = useRef(drag);
  dragRef.current = drag;
  useEffect(() => {
    if (!drag) return;
    const up = () => {
      const d = dragRef.current;
      setDrag(null);
      if (d) openNew(d.date, d.a, d.b);
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag]);

  if (!life) return null;

  const activeQuests = life.quests.filter((q) => q.status === "active");
  const now = new Date(nowMs);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const minAt = (e: React.MouseEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const m = startH * 60 + ((e.clientY - r.top) / HOUR) * 60;
    return Math.max(0, Math.min(24 * 60, Math.floor(m / SNAP) * SNAP));
  };

  function openNew(date: string, a: number, b: number) {
    let from = Math.min(a, b), to = Math.max(a, b);
    if (to - from < SNAP * 2) { from = Math.floor(from / 30) * 30; to = Math.min(24 * 60, from + 60); }
    setErr(null);
    setDraft({ orig: null, date, what: "", from: fromMin(from), to: fromMin(to), quest: "", theme: "", weekly: false, days: [weekdayIndex(date)] });
  }
  const openBlock = (b: PlanBlock, date: string) => {
    setErr(null);
    setDraft({ orig: b, date, what: b.what, from: b.from, to: b.to, quest: b.quest, theme: b.theme, weekly: isWeekly(b), days: isWeekly(b) ? b.days : [weekdayIndex(date)] });
  };

  const write = async (next: PlanBlock[]) => {
    setBusy(true);
    try {
      await saveLedger(CALENDAR_REL, serializeCalendar(next, today), parseCalendar);
      setErr(null);
      return true;
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); return false; } finally { setBusy(false); }
  };

  const save = async () => {
    if (!draft) return;
    const from = normalizeTime(draft.from), to = normEnd(draft.to);
    const what = draft.what.trim() || draft.quest;
    if (!what) { setErr("Напиши, что это за дело."); return; }
    if (!from || !to) { setErr("Время — в виде 14:00."); return; }
    if (toMin(to) <= toMin(from)) { setErr("«До» должно быть позже «С»."); return; }
    if (draft.weekly && !draft.days.length) { setErr("Выбери хотя бы один день недели."); return; }
    const block: PlanBlock = {
      days: draft.weekly ? draft.days : [],
      date: draft.weekly ? "" : draft.date,
      from, to, what,
      quest: draft.quest,
      theme: draft.quest ? "" : draft.theme,
    };
    const rest = draft.orig ? blocks.filter((b) => !sameBlock(b, draft.orig!)) : blocks;
    if (await write([...rest, block])) setDraft(null);
  };

  const remove = async () => {
    if (!draft?.orig) return;
    const o = draft.orig;
    if (isWeekly(o) && !(await confirmAction(`«${o.what}» стоит каждую неделю. Удалить из всех недель?`))) return;
    if (await write(blocks.filter((b) => !sameBlock(b, o)))) setDraft(null);
  };

  const start = (quest: string) => {
    if (timer) return;
    startTimer(quest);
    setDraft(null);
  };

  const shownDays = WEEK_ORDER;
  return (
    <div className="calpage">
      <div className="eyebrow">Календарь</div>
      <div className="row" style={{ alignItems: "baseline" }}>
        <h1 className="title" style={{ marginBottom: 0 }}>{monthRange(dates[0], dates[6])}</h1>
        <span className="grow" />
        <button className="btn small" onClick={() => setWeek(addDays(week, -7))} title="прошлая неделя">‹</button>
        <button className="btn small" onClick={() => setWeek(weekStart(today))} disabled={week === weekStart(today)}>сегодня</button>
        <button className="btn small" onClick={() => setWeek(addDays(week, 7))} title="следующая неделя">›</button>
      </div>
      <div className="row wrap small muted" style={{ marginTop: 6 }}>
        <span>Протяни мышью по колонке — поставишь дело со скольки до скольки.</span>
        <span className="grow" />
        <span><span className="cal-legend plan" />план</span>
        <span><span className="cal-legend fact" />было на самом деле, по таймеру квеста</span>
        <span><span className="cal-legend event" />событие: спорт, встреча</span>
      </div>

      <div className="cal">
        <div className="cal-head">
          <div className="cal-gutter" />
          {dates.map((d) => {
            const dt = new Date(d + "T12:00:00");
            return (
              <button
                key={d}
                className={`cal-dhead ${d === today ? "today" : ""} ${d < today ? "past" : ""}`}
                onClick={() => d === today && nav("/")}
                title={d === today ? "открыть день" : formatDayTitle(d)}
              >
                <span className="wd">{WEEKDAYS_RU[weekdayIndex(d)]}</span> <b>{dt.getDate()}</b>
              </button>
            );
          })}
        </div>
        <div className="cal-body" ref={scroller}>
          <div className="cal-grid" style={{ height: hours.length * HOUR }}>
            <div className="cal-gutter">
              {hours.map((h) => <div key={h} className="cal-hour" style={{ top: (h - startH) * HOUR }}>{String(h).padStart(2, "0")}:00</div>)}
            </div>
            {cols.map(({ date, items }) => (
              <div
                key={date}
                className={`cal-col ${date === today ? "today" : ""}`}
                onMouseDown={(e) => {
                  if (e.button !== 0 || e.target !== e.currentTarget) return;
                  const m = minAt(e, e.currentTarget);
                  setDrag({ date, a: m, b: m + SNAP });
                }}
                onMouseMove={(e) => {
                  if (!drag || drag.date !== date) return;
                  const m = minAt(e, e.currentTarget);
                  setDrag({ ...drag, b: m >= drag.a ? m + SNAP : m });
                }}
              >
                {hours.map((h) => <div key={h} className="cal-line" style={{ top: (h - startH) * HOUR }} />)}
                {items.map(({ item, lane, lanes }, i) => {
                  const top = y(item.from), h = Math.max(18, y(item.to) - top - 2);
                  const w = 100 / lanes;
                  const canStart = item.kind === "plan" && item.quest && date === today && !timer && item.to > nowMin;
                  // An event is a plan until its time has passed, then it is what happened.
                  const passed = date < today || (date === today && item.to <= nowMin);
                  return (
                    <div
                      key={i}
                      className={`cal-item ${item.kind} ${item.kind === "event" && passed ? "passed" : ""} ${h < 34 ? "short" : ""}`}
                      style={{ top, height: h, left: `calc(${lane * w}% + 2px)`, width: `calc(${w}% - 4px)`, ["--c" as string]: themeColor(item.theme) }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => (item.block ? openBlock(item.block, date) : item.eventRel ? nav(`/event/${encodeURIComponent(item.eventRel)}`) : setFact(item))}
                      title={`${fromMin(item.from)}–${fromMin(item.to)} ${item.title}`}
                    >
                      <div className="t">{fromMin(item.from)}{item.kind === "fact" ? ` · ${item.minutes} мин` : `–${fromMin(item.to)}`}</div>
                      <div className="w">{item.title}</div>
                      {canStart && (
                        <button className="cal-go" title="запустить таймер квеста" onClick={(e) => { e.stopPropagation(); start(item.quest); }}>▶</button>
                      )}
                    </div>
                  );
                })}
                {drag?.date === date && (
                  <div className="cal-item ghost" style={{ top: y(Math.min(drag.a, drag.b)), height: Math.max(8, Math.abs(y(drag.b) - y(drag.a))) }}>
                    <div className="t">{fromMin(Math.min(drag.a, drag.b))}–{fromMin(Math.max(drag.a, drag.b))}</div>
                  </div>
                )}
                {date === today && <div className="cal-now" style={{ top: y(nowMin) }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {draft && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setDraft(null)}>
          <div className="card sheet cal-sheet cal-edit">
            <div className="eyebrow">{draft.orig ? "дело в календаре" : "новое дело"} · {draft.weekly ? "каждую неделю" : formatDayTitle(draft.date)}</div>
            <input
              className="text" autoFocus placeholder={draft.quest || "что: урок с Гулназ, спортзал, Коран…"} autoCorrect="off" spellCheck={false}
              value={draft.what} onChange={(e) => setDraft({ ...draft, what: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") void save(); }}
              style={{ width: "100%", marginTop: 8, fontSize: 15 }}
            />
            <div className="row" style={{ marginTop: 10 }}>
              <span className="small muted">с</span>
              <input className="text mono" style={{ width: 70 }} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} onBlur={(e) => setDraft({ ...draft, from: normalizeTime(e.target.value) || draft.from })} />
              <span className="small muted">до</span>
              <input className="text mono" style={{ width: 70 }} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} onBlur={(e) => setDraft({ ...draft, to: normEnd(e.target.value) || draft.to })} onKeyDown={(e) => { if (e.key === "Enter") void save(); }} />
              <span className="grow" />
              <select className="text" value={draft.quest} onChange={(e) => setDraft({ ...draft, quest: e.target.value })} style={{ maxWidth: 260 }}>
                <option value="">без квеста</option>
                {draft.quest && !activeQuests.some((q) => q.title === draft.quest) && <option value={draft.quest}>{draft.quest}</option>}
                {activeQuests.map((q) => <option key={q.rel} value={q.title}>{q.title}</option>)}
              </select>
            </div>
            {!draft.quest && (
              <div className="row wrap" style={{ marginTop: 10, gap: 6 }}>
                <span className="small muted">тема</span>
                {THEMES.map((t) => (
                  <button
                    key={t.name} className={`chip small c ${draft.theme === t.name ? "on" : ""}`} style={{ ["--c" as string]: t.color, opacity: draft.theme && draft.theme !== t.name ? 0.45 : 1 }}
                    onClick={() => setDraft({ ...draft, theme: draft.theme === t.name ? "" : t.name })}
                  >{themeLabel(t.name)}</button>
                ))}
              </div>
            )}
            <div className="row wrap" style={{ marginTop: 12, gap: 6 }}>
              <label className="row small" style={{ gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={draft.weekly} onChange={(e) => setDraft({ ...draft, weekly: e.target.checked })} />
                каждую неделю
              </label>
              {draft.weekly && shownDays.map((d) => (
                <button
                  key={d} className={`chip small ${draft.days.includes(d) ? "on" : ""}`}
                  onClick={() => setDraft({ ...draft, days: draft.days.includes(d) ? draft.days.filter((x) => x !== d) : [...draft.days, d] })}
                >{WEEKDAYS_RU[d]}</button>
              ))}
            </div>
            {err && <div className="small err-text" style={{ marginTop: 8 }}>{err}</div>}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn primary" disabled={busy} onClick={() => void save()}>сохранить</button>
              {draft.orig && draft.quest && draft.date === today && !timer && (
                <button className="btn" onClick={() => start(draft.quest)}>▶ старт</button>
              )}
              <span className="grow" />
              {draft.orig && <button className="btn ghost" disabled={busy} onClick={() => void remove()}>{isWeekly(draft.orig) ? "удалить из всех недель" : "удалить"}</button>}
              <button className="btn ghost" onClick={() => setDraft(null)}>отмена</button>
            </div>
          </div>
        </div>
      )}

      {fact && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setFact(null)}>
          <div className="card sheet cal-sheet">
            <div className="eyebrow">было · {formatDayTitle(fact.date)}</div>
            <h3 style={{ marginTop: 4 }}>{fact.title}</h3>
            <p className="small muted">
              {fromMin(fact.from)}–{fromMin(fact.from + (fact.minutes ?? 0))} · {fact.minutes} мин по таймеру.
            </p>
            <div className="row">
              {(() => {
                const q = life.quests.find((x) => x.title === fact.quest);
                return q ? <Link className="btn" to={`/quest/${encodeURIComponent(q.rel)}`}>открыть квест</Link> : null;
              })()}
              <span className="grow" />
              <button className="btn ghost" onClick={() => setFact(null)}>закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
