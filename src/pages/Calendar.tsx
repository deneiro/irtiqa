import { useEffect, useMemo, useRef, useState } from "react";
import { BANNER } from "../assets/play";
import { Block, SceneFrame, SceneNumber, SceneTitle, SideCard } from "./main/Scene";
import { dayUrl } from "../components/GameBits";
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
  const todayItems = itemsOn(today, blocks, factDay(today, life.days), life.quests, life.events).sort((a, b) => a.from - b.from);
  const weekPlan = dates.reduce((sum, d) => sum + itemsOn(d, blocks, undefined, life.quests, []).filter((x) => x.kind === "plan").reduce((a, x) => a + (x.to - x.from), 0), 0);
  const weekFact = dates.reduce((sum, d) => sum + (factDay(d, life.days)?.sessions.reduce((a, x) => a + x.minutes, 0) ?? 0), 0);
  const planOf = (d: string) => itemsOn(d, blocks, undefined, life.quests, []).filter((x) => x.kind === "plan").reduce((a, x) => a + (x.to - x.from), 0);
  const factOf = (d: string) => factDay(d, life.days)?.sessions.reduce((a, x) => a + x.minutes, 0) ?? 0;
  const hrs = (min: number) => (min ? `${Math.round(min / 6) / 10} ч` : "");
  return (
    <div className="calpage g-page">
      <div className="g-play">
        <div className="g-top">
          <SceneFrame art={BANNER.calendar}>
            <SceneTitle kicker={`календарь · ${week === weekStart(today) ? "эта неделя" : week < weekStart(today) ? "прошлая неделя" : "неделя впереди"}`} title={monthRange(dates[0], dates[6])} />
            <div className="g-nav">
              <button type="button" onClick={() => setWeek(addDays(week, -7))} aria-label="Неделя назад">←</button>
              {week !== weekStart(today) && <button type="button" className="wide" onClick={() => setWeek(weekStart(today))}>сегодня</button>}
              <button type="button" onClick={() => setWeek(addDays(week, 7))} aria-label="Неделя вперёд">→</button>
            </div>
            <div className="g-xp8"><span>рамка — план · заливка — что было по таймеру · пунктир — событие</span><span>протяни по колонке дня — поставишь дело</span></div>
            <SceneNumber value={Math.round(weekPlan / 6) / 10} unit=" ч" label="в плане недели" sub={`было по таймеру: ${Math.round(weekFact / 6) / 10} ч`} />
          </SceneFrame>
          <SideCard kicker={`сегодня · ${WEEKDAYS_RU[weekdayIndex(today)]}, ${Number(today.slice(8))}`}>
            {todayItems.length ? (
              <div className="g-agenda">{todayItems.map((it, k) => (
                <div key={k} className={`${it.kind}${it.kind === "plan" && it.to <= nowMin ? " past" : ""}`}>
                  <span>{fromMin(it.from)}–{fromMin(it.to)}</span><b>{it.title}</b>
                  <small>{it.kind === "plan" ? "план" : it.kind === "fact" ? `было · ${it.minutes ?? it.to - it.from} мин` : "событие"}{it.kind === "plan" && it.quest && !timer && it.to > nowMin && <button type="button" className="g-link" onClick={() => start(it.quest)}> · ▶ начать</button>}</small>
                </div>
              ))}</div>
            ) : <p className="g-rule">На сегодня в плане пусто. Протяни мышью по сегодняшней колонке ниже.</p>}
            {timer && <p className="g-cap">Идёт таймер: {timer.quest}.</p>}
          </SideCard>
        </div>

        <Block title="Неделя по часам" right={<span className="g-callegend"><i className="plan" />план<i className="fact" />было<i className="event" />событие</span>}>
          <div className="g-cal">
            <div className="g-cal-head">
              <span />
              {dates.map((d) => (
                <Link key={d} to={dayUrl(d)} className={`${d === today ? "today" : ""}${d > today ? " future" : ""}`} title={d > today ? formatDayTitle(d) : `${formatDayTitle(d)} — открыть день`} onClick={(e) => { if (d > today) e.preventDefault(); }}>
                  <span>{WEEKDAYS_RU[weekdayIndex(d)]}</span><b>{Number(d.slice(8))}</b>
                  <small>{hrs(planOf(d)) || "—"}{factOf(d) ? ` · ${hrs(factOf(d))}` : ""}</small>
                </Link>
              ))}
            </div>
            <div className="g-cal-body" ref={scroller}>
              <div className="g-cal-grid" style={{ height: hours.length * HOUR }}>
                <div className="gut">{hours.map((h) => <span key={h} style={{ top: (h - startH) * HOUR }}>{String(h).padStart(2, "0")}:00</span>)}</div>
                {cols.map(({ date, items }) => (
                  <div
                    key={date}
                    className={`col${date === today ? " today" : ""}${date < today ? " past" : ""}`}
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
                    {hours.map((h) => <i key={h} className="ln" style={{ top: (h - startH) * HOUR }} />)}
                    {items.map(({ item, lane, lanes }, k) => {
                      const top = y(item.from), h = Math.max(18, y(item.to) - top - 2);
                      const w = 100 / lanes;
                      const canStart = item.kind === "plan" && item.quest && date === today && !timer && item.to > nowMin;
                      // An event is a plan until its time has passed, then it is what happened.
                      const passed = date < today || (date === today && item.to <= nowMin);
                      return (
                        <div
                          key={k}
                          className={`it ${item.kind}${item.kind === "event" && passed ? " passed" : ""}${h < 34 ? " short" : ""}`}
                          style={{ top, height: h, left: `calc(${lane * w}% + 2px)`, width: `calc(${w}% - 4px)`, ["--c" as string]: themeColor(item.theme) }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => (item.block ? openBlock(item.block, date) : item.eventRel ? nav(`/event/${encodeURIComponent(item.eventRel)}`) : setFact(item))}
                          title={`${fromMin(item.from)}–${fromMin(item.to)} ${item.title}`}
                        >
                          <small>{fromMin(item.from)}{item.kind === "fact" ? ` · ${item.minutes} мин` : `–${fromMin(item.to)}`}</small>
                          <b>{item.title}</b>
                          {canStart && <button type="button" className="go" title="запустить таймер" onClick={(e) => { e.stopPropagation(); start(item.quest); }}>▶</button>}
                        </div>
                      );
                    })}
                    {drag?.date === date && (
                      <div className="it ghost" style={{ top: y(Math.min(drag.a, drag.b)), height: Math.max(8, Math.abs(y(drag.b) - y(drag.a))) }}>
                        <small>{fromMin(Math.min(drag.a, drag.b))}–{fromMin(Math.max(drag.a, drag.b))}</small>
                      </div>
                    )}
                    {date === today && <div className="now" style={{ top: y(nowMin) }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Block>
      </div>

      {draft && (
        <div className="g-overlay" onMouseDown={(e) => e.target === e.currentTarget && setDraft(null)}>
          <div className="g-sheet g-play" role="dialog" aria-label={draft.orig ? "Дело в календаре" : "Новое дело"}>
            <div className="g-kick">{draft.orig ? "дело в календаре" : "новое дело"} · {draft.weekly ? "каждую неделю" : formatDayTitle(draft.date)}</div>
            <input className="text big" autoFocus placeholder={draft.quest || "что: урок, спортзал, Коран…"} autoCorrect="off" spellCheck={false}
              value={draft.what} onChange={(e) => setDraft({ ...draft, what: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") void save(); }} aria-label="Что" />
            <div className="row2">
              <label>с<input className="text" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} onBlur={(e) => setDraft({ ...draft, from: normalizeTime(e.target.value) || draft.from })} /></label>
              <label>до<input className="text" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} onBlur={(e) => setDraft({ ...draft, to: normEnd(e.target.value) || draft.to })} onKeyDown={(e) => { if (e.key === "Enter") void save(); }} /></label>
              <select className="text" value={draft.quest} onChange={(e) => setDraft({ ...draft, quest: e.target.value })} aria-label="Деятельность">
                <option value="">без деятельности</option>
                {draft.quest && !activeQuests.some((q) => q.title === draft.quest) && <option value={draft.quest}>{draft.quest}</option>}
                {activeQuests.map((q) => <option key={q.rel} value={q.title}>{q.title}</option>)}
              </select>
            </div>
            {!draft.quest && (
              <div className="g-chips wrap">
                {THEMES.map((t) => <button type="button" key={t.name} className={draft.theme === t.name ? "on" : ""} aria-pressed={draft.theme === t.name} style={{ ["--c" as string]: t.color }} onClick={() => setDraft({ ...draft, theme: draft.theme === t.name ? "" : t.name })}><i className="g-dot" style={{ background: t.color }} />{themeLabel(t.name)}</button>)}
              </div>
            )}
            <div className="g-chips wrap">
              <button type="button" className={draft.weekly ? "on" : ""} aria-pressed={draft.weekly} onClick={() => setDraft({ ...draft, weekly: !draft.weekly })}>каждую неделю</button>
              {draft.weekly && shownDays.map((d) => <button type="button" key={d} className={draft.days.includes(d) ? "on" : ""} aria-pressed={draft.days.includes(d)} onClick={() => setDraft({ ...draft, days: draft.days.includes(d) ? draft.days.filter((x) => x !== d) : [...draft.days, d] })}>{WEEKDAYS_RU[d]}</button>)}
            </div>
            {err && <p className="g-error" role="alert">{err}</p>}
            <div className="foot">
              <div className="g-line"><button type="button" disabled={busy} onClick={() => void save()}>Сохранить</button></div>
              {draft.orig && draft.quest && draft.date === today && !timer && <button type="button" className="g-link" onClick={() => start(draft.quest)}>▶ начать сейчас</button>}
              <span />
              {draft.orig && <button type="button" className="g-link del" disabled={busy} onClick={() => void remove()}>{isWeekly(draft.orig) ? "удалить из всех недель" : "удалить"}</button>}
              <button type="button" className="g-link" onClick={() => setDraft(null)}>отмена</button>
            </div>
          </div>
        </div>
      )}

      {fact && (
        <div className="g-overlay" onMouseDown={(e) => e.target === e.currentTarget && setFact(null)}>
          <div className="g-sheet g-play" role="dialog" aria-label="Что было">
            <div className="g-kick">было · {formatDayTitle(fact.date)}</div>
            <div className="g-q">{fact.title}</div>
            <p className="g-faint">{fromMin(fact.from)}–{fromMin(fact.from + (fact.minutes ?? 0))} · {fact.minutes} мин по таймеру.</p>
            <div className="foot">
              {(() => { const q = life.quests.find((x) => x.title === fact.quest); return q ? <Link className="g-link" to={`/quest/${encodeURIComponent(q.rel)}`}>открыть деятельность →</Link> : <span />; })()}
              <span />
              <button type="button" className="g-link" onClick={() => setFact(null)}>закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
