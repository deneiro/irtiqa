import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { addDays, todayStr } from "../lib/dates";
import { eventDir, eventUrl, serializeEvent } from "../lib/events";
import { normEnd, normalizeTime } from "../lib/calendar";

const THEME = "Health & sport";

/**
 * Спорт: футбол, зал, пробежка — an event of Health & sport with a time and no
 * description. It lands on the calendar; photos are added on its page.
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
  if (!life) return null;

  const month = today.slice(0, 7);
  const thisMonth = sport.filter((e) => e.date.startsWith(month)).length;
  const last30 = sport.filter((e) => e.date > addDays(today, -30) && e.date <= today).length;
  const shown = [...sport].sort((a, b) => b.date.localeCompare(a.date) || b.from.localeCompare(a.from)).slice(0, 15);

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
    <section className="tblock">
      <h2 className="section">Спорт <span className="n">{thisMonth} в этом месяце · {last30} за 30 дней</span></h2>
      <div className="card">
        <form className="addrow sport" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <input className="text" placeholder="что: футбол, зал, пробежка" autoCorrect="off" spellCheck={false} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input className="text" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <input className="text mono" placeholder="с 19:00" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
          <input className="text mono" placeholder="до 21:00" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
          <button className="btn primary" type="submit" disabled={!f.title.trim() || busy}>записать</button>
        </form>
        {usual.length > 0 && (
          <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
            {usual.map((t) => <button key={t} type="button" className={`chip link ${f.title === t ? "on" : ""}`} onClick={() => setF({ ...f, title: t })}>{t}</button>)}
          </div>
        )}
        {err && <div className="small err-text" style={{ marginTop: 6 }}>{err}</div>}
        <div style={{ marginTop: 12 }}>
          {shown.map((e) => (
            <div key={e.rel} className="crow">
              <div className="cwho">
                <Link className="cname" to={eventUrl(e)}>{e.title}</Link>
                {e.photos.length > 0 && <span className="small faint">{e.photos.length} фото</span>}
              </div>
              <div className="cwhen small mono faint">{e.date}{e.from ? ` · ${e.from}${e.to ? `–${e.to}` : ""}` : ""}</div>
              <div className="cact"><Link className="btn small" to={eventUrl(e)}>{e.photos.length ? "фото" : "+ фото"}</Link></div>
            </div>
          ))}
          {shown.length === 0 && <div className="small muted">Пока ничего. Запиши первое: «футбол», день и время — встанет в календарь.</div>}
        </div>
      </div>
    </section>
  );
}
