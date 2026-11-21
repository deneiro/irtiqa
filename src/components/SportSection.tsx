import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { addDays, todayStr } from "../lib/dates";
import { eventDir, eventUrl, serializeEvent } from "../lib/events";
import { normEnd, normalizeTime } from "../lib/calendar";
import { shortDate } from "../lib/themeNumbers";
import { Block } from "../pages/main/Scene";
import { Err, Mini } from "./SectionBits";

const THEME = "Health & sport";

/**
 * Спорт: футбол, зал, пробежка — an event of Health & sport with a time and no description. It lands on the calendar;
 * photos are added on its page. Rebuilt 2026-11-21: what he usually plays as one-tap chips over the line that records
 * it, then sixty days as a strip and the latest games.
 */
export default function SportSection() {
  const { life, saveText } = useStore();
  const today = todayStr();
  const [f, setF] = useState({ title: "", date: today, from: "", to: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sport = useMemo(() => (life?.events ?? []).filter((e) => e.theme === THEME), [life]);
  // What he usually does, most frequent first — one click instead of typing «футбол» again.
  const usual = useMemo(() => {
    const n = new Map<string, number>();
    for (const e of sport) n.set(e.title, (n.get(e.title) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  }, [sport]);
  const strip = useMemo(() => {
    const on = new Map<string, string[]>();
    for (const e of sport) on.set(e.date, [...(on.get(e.date) ?? []), e.title]);
    return Array.from({ length: 60 }, (_, i) => { const date = addDays(today, i - 59); return { date, titles: on.get(date) ?? [] }; });
  }, [sport, today]);
  if (!life) return null;

  const month = today.slice(0, 7);
  const thisMonth = sport.filter((e) => e.date.startsWith(month)).length;
  const last30 = sport.filter((e) => e.date > addDays(today, -30) && e.date <= today).length;
  const shown = [...sport].sort((a, b) => b.date.localeCompare(a.date) || b.from.localeCompare(a.from)).slice(0, 15);
  const last = shown.find((e) => e.date <= today);

  const add = async () => {
    const title = f.title.trim();
    if (!title || busy) return;
    const from = f.from.trim() ? normalizeTime(f.from) : "";
    const to = from && f.to.trim() ? normEnd(f.to) : "";
    if ((f.from.trim() && !from) || (f.to.trim() && from && !to)) { setErr("Время — в виде 19:00."); return; }
    const dir = eventDir(f.date, title);
    if (life.events.some((e) => e.dir === dir)) { setErr(`«${title}» на ${f.date} уже записан.`); return; }
    setBusy(true);
    try {
      await saveText(`${dir}/event.md`, serializeEvent({ title, date: f.date, theme: THEME, place: "", from, to, people: [], tags: ["спорт"], body: "" }));
      setF({ title: "", date: f.date, from: "", to: "" });
      setErr(null);
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="g-play">
      <Block title="Записать игру" right="встанет в календарь · фото добавляются на странице события">
        {usual.length > 0 && (
          <div className="g-chips wrap">
            {usual.map((t) => <button key={t} type="button" className={f.title === t ? "on" : ""} onClick={() => setF({ ...f, title: t })}>{t}</button>)}
          </div>
        )}
        <form className="g-addrow flat" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <input className="text wide" placeholder="что: футбол, зал, пробежка" autoCorrect="off" spellCheck={false} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input className="text" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <input className="text short mono" placeholder="с 19:00" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
          <input className="text short mono" placeholder="до 21:00" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
          <button type="submit" disabled={!f.title.trim() || busy}>Записать</button>
        </form>
        <Err text={err} />
      </Block>

      <Block title="Что играл" right={<Link className="g-more" to="/training">тренировки и карта мышц →</Link>}>
        <div className="g-minis">
          <Mini value={thisMonth} label="в этом месяце" tone={thisMonth ? "good" : undefined} />
          <Mini value={last30} label="за 30 дней" />
          <Mini value={last ? shortDate(last.date) : "—"} label={last ? `последний раз · ${last.title}` : "записей нет"} />
        </div>
        <div className="g-strip60 tall" role="img" aria-label={`60 дней: ${strip.filter((d) => d.titles.length).length} с игрой`}>
          {strip.map((d) => <i key={d.date} className={d.titles.length ? "on" : ""} title={`${shortDate(d.date)}${d.titles.length ? ` — ${d.titles.join(", ")}` : ""}`} />)}
        </div>
        <div className="g-strip-ax"><span style={{ left: 0 }}>{shortDate(strip[0].date)}</span><span style={{ right: 0 }}>сегодня</span></div>
        {shown.length ? (
          <div className="g-games">
            {shown.map((e) => (
              <div key={e.rel}>
                <span>{shortDate(e.date)}</span>
                <Link to={eventUrl(e)}>{e.title}</Link>
                <em>{e.from ? `${e.from}${e.to ? `–${e.to}` : ""}` : ""}</em>
                <Link className="g-more" to={eventUrl(e)}>{e.photos.length ? `${e.photos.length} фото` : "+ фото"}</Link>
              </div>
            ))}
          </div>
        ) : <p className="g-faint">Пока ничего. Запиши первое: «футбол», день и время — встанет в календарь.</p>}
      </Block>
    </div>
  );
}
