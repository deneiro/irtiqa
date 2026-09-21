import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import type { Quest } from "../lib/life";
import { addDays, formatDayTitle, weekdayIndex } from "../lib/dates";
import { useDayToday } from "../lib/useDayToday";
import {
  CALENDAR_REL, blockOn, formatDays, isWeekly, normEnd, normalizeTime, parseCalendar, serializeCalendar, toMin, type PlanBlock,
} from "../lib/calendar";

const AHEAD = 14;

/**
 * When the quest gets worked on: its blocks in the calendar for the next two
 * weeks, and a form to put one there. The rule (vault CLAUDE.md, «Квест и
 * время») is that every quest has a slot; a quest with none is a wish, and the
 * Day screen's «Требует тебя» says so.
 */
export default function QuestTime({ quest }: { quest: Quest }) {
  const { life, saveLedger } = useStore();
  const today = useDayToday();
  const blocks = useMemo(() => parseCalendar(life?.calendar ?? ""), [life?.calendar]);
  const mine = blocks.filter((b) => b.quest === quest.title);
  const upcoming = useMemo(() => {
    const out: { date: string; b: PlanBlock }[] = [];
    for (let i = 0; i < AHEAD; i++) {
      const date = addDays(today, i);
      for (const b of mine) if (blockOn(b, date)) out.push({ date, b });
    }
    return out.sort((a, b) => a.date.localeCompare(b.date) || a.b.from.localeCompare(b.b.from));
  }, [mine, today]);

  const [f, setF] = useState({ date: today, from: "", to: "", weekly: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const add = async () => {
    const from = normalizeTime(f.from), to = normEnd(f.to);
    if (!from || !to || toMin(to) <= toMin(from)) { setErr("Время: с и до, например 19:00 и 20:30."); return; }
    const block: PlanBlock = {
      from, to, what: quest.title, quest: quest.title, theme: quest.theme ?? "",
      days: f.weekly ? [weekdayIndex(f.date)] : [], date: f.weekly ? "" : f.date,
    };
    setBusy(true);
    try {
      await saveLedger(CALENDAR_REL, serializeCalendar([...blocks, block], today), parseCalendar);
      setF({ ...f, from: "", to: "" });
      setErr(null);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="card">
      <h3>Время <span className="n">{upcoming.length ? `${upcoming.length} за ${AHEAD} дней` : "не поставлено"}</span></h3>
      {upcoming.length === 0 && (
        <div className="small muted" style={{ marginBottom: 8 }}>
          В календаре на две недели вперёд у этого квеста нет времени. Какого числа, со скольки и сколько часов — поставь ниже.
        </div>
      )}
      {upcoming.slice(0, 6).map(({ date, b }, i) => (
        <div className="small" key={i} style={{ padding: "3px 0" }}>
          <span className="mono">{b.from}–{b.to}</span> · {formatDayTitle(date)}{isWeekly(b) ? <span className="faint"> · каждую неделю ({formatDays(b.days)})</span> : null}
        </div>
      ))}
      <form className="row wrap" style={{ gap: 8, marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <input className="text" type="date" value={f.date} min={today} onChange={(e) => setF({ ...f, date: e.target.value })} disabled={busy} />
        <input className="text" placeholder="с 19:00" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} style={{ width: 80 }} disabled={busy} />
        <input className="text" placeholder="до 20:30" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} style={{ width: 80 }} disabled={busy} />
        <label className="small muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={f.weekly} onChange={(e) => setF({ ...f, weekly: e.target.checked })} disabled={busy} /> каждую неделю
        </label>
        <button className="btn" type="submit" disabled={busy || !f.from || !f.to}>в календарь</button>
        <Link className="small muted" to="/calendar">календарь →</Link>
      </form>
      {err && <div className="notice err" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{err}</div>}
    </div>
  );
}
