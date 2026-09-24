import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { todayStr } from "../lib/dates";
import { JOBS_REL, earnedThisMonth, jobStats, jobsHeader, monthsBetween, parseJobs, serializeJobs, type Job } from "../lib/jobs";

const PATH_PAGE = "Карьерный путь";
const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");
function months(n: number): string {
  const r = Math.round(n * 10) / 10, i = Math.round(r);
  const w = i % 10 === 1 && i % 100 !== 11 ? "месяц" : i % 10 >= 2 && i % 10 <= 4 && (i % 100 < 12 || i % 100 > 14) ? "месяца" : "месяцев";
  return `${r} ${w}`;
}

/** Ten roles in three years: the pattern is the length, so the length is drawn. */
export default function CareerSection() {
  const v = useVault();
  const { life, saveLedger, reload } = useStore();
  const today = todayStr();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ start: today.slice(0, 7), place: "", role: "", channel: "", money: "" });

  const raw = life?.jobs ?? null;
  const jobs = useMemo(() => (raw ? parseJobs(raw, today) : []), [raw, today]);
  const st = useMemo(() => jobStats(jobs, today), [jobs, today]);
  const page = useMemo(() => v.pages.find((p) => p.file === PATH_PAGE), [v]);
  if (!life || !raw || !jobs.length) return null;

  const max = Math.max(...jobs.map((j) => j.months));
  const earned = earnedThisMonth(life.days, today);

  const write = async (next: Job[]) => {
    setBusy(true);
    try {
      await saveLedger(JOBS_REL, serializeJobs(next, today, jobsHeader(raw)), (c) => parseJobs(c, today));
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const add = () => {
    const place = form.place.trim();
    if (!place || !/^\d{4}-\d{2}$/.test(form.start)) return;
    const closed = jobs.map((j) => (j.end ? j : { ...j, end: form.start, months: monthsBetween(j.start, form.start) }));
    void write([...closed, { ...form, place, role: form.role.trim(), channel: form.channel.trim(), money: form.money.trim(), end: undefined, months: 1 }]);
    setForm({ start: today.slice(0, 7), place: "", role: "", channel: "", money: "" });
    setAdding(false);
  };

  const close = (j: Job) => {
    void write(jobs.map((x) => (x === j ? { ...x, end: today.slice(0, 7) } : x)));
  };

  return (
    <section className="tblock">
      <h2 className="section">
        Работа <span className="n">{st.count} мест за {months(st.span)}</span>
        {page && <Link to={pageUrl(page)} className="small muted">{PATH_PAGE}</Link>}
      </h2>
      <div className="card">
        <div className="bodynums">
          <div className="bnum">
            <b>{st.current ? months(st.current.months) : "—"}</b>
            <span>{st.current ? `в «${st.current.place}»` : "без текущей работы"}</span>
          </div>
          <div className="bnum"><b>{months(st.avgMonths)}</b><span>средняя длительность роли</span></div>
          <div className="bnum"><b>{st.longest ? months(st.longest.months) : "—"}</b><span>самая долгая · {st.longest?.place}</span></div>
          <div className="bnum"><b className="ok">{fmt(earned)}</b><span>получено в этом месяце</span></div>
        </div>

        <div className="mrow-head">Хронология</div>
        {jobs.map((j) => (
          <div key={j.start + j.place} className={`hbar job ${j.end ? "" : "now"}`}>
            <span className="hname" title={j.role}>{j.place}</span>
            <span className="htrack"><i style={{ width: `${Math.max(3, (100 * j.months) / max)}%` }} /></span>
            <span className="mono">{j.months} мес</span>
            <span className="small faint jdate">{j.start}{j.end ? ` → ${j.end}` : " → сейчас"}</span>
            {!j.end && <button className="btn small" disabled={busy} onClick={() => close(j)}>закрыть</button>}
          </div>
        ))}

        {st.byChannel.length > 0 && (
          <div className="small muted" style={{ marginTop: 10 }}>
            Как получены: {st.byChannel.map((c) => `${c.channel} — ${c.count}`).join(", ")}.
            {st.unknownChannel > 0 && ` Не восстановлено: ${st.unknownChannel}. Колонка «Канал» в life/jobs.md — заполни, и приложение посчитает, сколько работ пришло через людей, а сколько через резюме.`}
          </div>
        )}

        {adding ? (
          <div className="measure-form">
            <input className="text" placeholder="ГГГГ-ММ" autoCorrect="off" spellCheck={false} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            <input className="text" placeholder="место" autoCorrect="off" spellCheck={false} value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
            <input className="text" placeholder="роль" autoCorrect="off" spellCheck={false} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <input className="text" placeholder="канал" autoCorrect="off" spellCheck={false} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
            <button className="btn" disabled={busy} onClick={add}>добавить</button>
          </div>
        ) : (
          <button className="btn small" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>новая работа</button>
        )}
        <div className="small faint" style={{ marginTop: 8 }}>
          Новая работа закрывает текущую тем же месяцем — так хронология не разъезжается.
        </div>
        {err && <div className="small err-text">{err}</div>}
      </div>
    </section>
  );
}
