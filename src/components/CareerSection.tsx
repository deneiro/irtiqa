import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { todayStr } from "../lib/dates";
import { JOBS_REL, earnedThisMonth, jobStats, jobsHeader, monthsBetween, parseJobs, serializeJobs, type Job } from "../lib/jobs";
import { Block } from "../pages/main/Scene";
import { Err, Mini } from "./SectionBits";

const PATH_PAGE = "Карьерный путь";
const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");
function months(n: number): string {
  const r = Math.round(n * 10) / 10, i = Math.round(r);
  const w = i % 10 === 1 && i % 100 !== 11 ? "месяц" : i % 10 >= 2 && i % 10 <= 4 && (i % 100 < 12 || i % 100 > 14) ? "месяца" : "месяцев";
  return `${r} ${w}`;
}

/**
 * Ten roles in three years: the pattern is the length, so the length is drawn. Rebuilt 2026-11-21 as one time line —
 * every job a bar from its first month to its last on the same axis of years, the current one lit.
 */
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
  if (!life || !raw || !jobs.length) return <div className="g-play"><Block title="Работа"><p className="g-faint">Записей о работе нет: их хранит life/jobs.md.</p></Block></div>;

  const earned = earnedThisMonth(life.days, today);
  const nowMonth = today.slice(0, 7);
  const first = jobs.reduce((a, j) => (j.start < a ? j.start : a), jobs[0].start);
  // months from the first job's first month — 0 for that month itself, where `monthsBetween` never goes below 1
  const gap = (m: string) => (Number(m.slice(0, 4)) - Number(first.slice(0, 4))) * 12 + Number(m.slice(5, 7)) - Number(first.slice(5, 7));
  const span = Math.max(1, gap(nowMonth));
  const pos = (m: string) => `${Math.max(0, Math.min(100, (gap(m) / span) * 100))}%`;
  const years = Array.from({ length: Number(nowMonth.slice(0, 4)) - Number(first.slice(0, 4)) }, (_, i) => `${Number(first.slice(0, 4)) + i + 1}-01`);

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
    <div className="g-play">
      <Block title="В числах" right={page ? <Link className="g-more" to={pageUrl(page)}>{PATH_PAGE} →</Link> : undefined}>
        <div className="g-minis four">
          <Mini value={st.current ? months(st.current.months) : "—"} label={st.current ? `в «${st.current.place}»` : "без текущей работы"} tone={st.current ? "now" : undefined} />
          <Mini value={months(st.avgMonths)} label="средняя длительность роли" />
          <Mini value={st.longest ? months(st.longest.months) : "—"} label={`самая долгая${st.longest ? ` · ${st.longest.place}` : ""}`} />
          <Mini value={fmt(earned)} label="получено в этом месяце, ₸" tone={earned > 0 ? "good" : undefined} />
        </div>
      </Block>

      <Block title="Хронология" right={`${st.count} мест за ${months(st.span)} · полоса — от первого месяца до последнего`}>
        <div className="g-gantt">
          <div className="ax"><span /><i>{years.map((y) => <em key={y} style={{ left: pos(y) }}>{y.slice(0, 4)}</em>)}</i><span /></div>
          {jobs.map((j) => (
            <div key={j.start + j.place} className={j.end ? "" : "now"}>
              <span title={j.role}><b>{j.place}</b>{j.role && <small>{j.role}</small>}</span>
              <i>
                {years.map((y) => <s key={y} style={{ left: pos(y) }} />)}
                <u style={{ left: pos(j.start), right: `calc(100% - ${pos(j.end ?? nowMonth)})` }} title={`${j.start} → ${j.end ?? "сейчас"}`} />
              </i>
              <span className="r">
                <b>{j.months} мес</b><small>{j.start}{j.end ? ` → ${j.end}` : " → сейчас"}</small>
                {!j.end && <button type="button" className="g-btn" disabled={busy} onClick={() => close(j)}>закрыть</button>}
              </span>
            </div>
          ))}
        </div>
        {st.byChannel.length > 0 && (
          <p className="g-cap">
            <b>Как получены:</b> {st.byChannel.map((c) => `${c.channel} — ${c.count}`).join(", ")}.
            {st.unknownChannel > 0 && ` Не восстановлено: ${st.unknownChannel}. Заполни колонку «Канал» в life/jobs.md — и приложение посчитает, сколько работ пришло через людей, а сколько через резюме.`}
          </p>
        )}
        {adding ? (
          <form className="g-addrow" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <input className="text short" placeholder="ГГГГ-ММ" autoCorrect="off" spellCheck={false} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            <input className="text" autoFocus placeholder="место" autoCorrect="off" spellCheck={false} value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
            <input className="text" placeholder="роль" autoCorrect="off" spellCheck={false} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <input className="text" placeholder="канал" autoCorrect="off" spellCheck={false} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
            <button type="submit" disabled={busy || !form.place.trim()}>Добавить</button>
            <button type="button" className="g-btn" onClick={() => setAdding(false)}>отмена</button>
            <small>Новая работа закрывает текущую тем же месяцем — так хронология не разъезжается.</small>
          </form>
        ) : <div className="g-addrow"><button type="button" className="g-btn sun" onClick={() => setAdding(true)}>+ новая работа</button></div>}
        <Err text={err} />
      </Block>
    </div>
  );
}
