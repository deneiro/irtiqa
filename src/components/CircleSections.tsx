import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { todayStr } from "../lib/dates";
import { rawPageText } from "../lib/rawpage";
import { contactEdits } from "../lib/contact";
import { BANDS, TRIGGERS, buildCircle, triggerStats, type CircleItem } from "../lib/circle";
import { isAuthor } from "../lib/people";

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

/** Everyone in the theme, sorted by who has gone quiet longest past their cadence. */
export function CircleSection({ theme }: { theme: string }) {
  const v = useVault();
  const { life, saveText, reload } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const today = todayStr();
  const people = useMemo(
    () => v.pages.filter((p) => p.theme === theme && p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p)),
    [v, theme],
  );
  const items = useMemo(() => buildCircle(people, life?.events ?? [], today), [people, life, today]);
  if (!items.length) return null;

  const overdue = items.filter((i) => (i.overdue ?? -1) > 0);
  const unrated = items.filter((i) => i.closeness === undefined);

  /** Writing counts as contact; meeting counts as contact and becomes an event. */
  const touch = async (it: CircleItem, met: boolean) => {
    if (busy) return;
    setBusy(it.name);
    try {
      const raw = rawPageText(v, it.page.rel);
      if (raw === null) throw new Error("не нашёл страницу человека");
      for (const e of contactEdits({ rel: it.page.rel, file: it.page.file, raw }, life?.events ?? [], today, met, theme)) await saveText(e.rel, e.content);
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(null); }
  };

  const row = (it: CircleItem) => {
    const late = (it.overdue ?? -1) > 0;
    const since = it.sinceMeet !== undefined && (it.sinceContact === undefined || it.sinceMeet < it.sinceContact) ? it.sinceMeet : it.sinceContact;
    return (
      <div key={it.page.rel} className={`crow ${late ? "late" : ""}`}>
        <div className="cwho">
          <Link to={pageUrl(it.page)} className="cname">{it.name}</Link>
          {it.closeness !== undefined && <span className="mono faint">{it.closeness}/10</span>}
          {it.category && <span className="small faint">{it.category}</span>}
          {it.triggers.map((t) => (
            <span key={t} className="chip danger small">{TRIGGERS.find((x) => x.key === t)?.label}</span>
          ))}
          {it.support && <span className="chip small ok">опора</span>}
        </div>
        <div className="cwhen small">
          {since === undefined
            ? <span className="faint">не отмечено</span>
            : <span className={late ? "err-text" : "muted"}>
                {since === 0 ? "сегодня" : `${since} ${plural(since, "день", "дня", "дней")} назад`}
                {it.cadence !== undefined && ` · норма ${it.cadence}`}
              </span>}
        </div>
        <div className="cact">
          <button className="btn small" disabled={busy === it.name} onClick={() => void touch(it, false)}>написал</button>
          <button className="btn small" disabled={busy === it.name} onClick={() => void touch(it, true)}>виделись</button>
        </div>
      </div>
    );
  };

  return (
    <section className="tblock">
      <h2 className="section">
        Круг <span className="n">{items.length} {plural(items.length, "человек", "человека", "человек")}{overdue.length ? ` · ${overdue.length} просрочено` : ""}</span>
        <Link to="/people" className="small muted">контактная книга</Link>
      </h2>
      <div className="card">
        <div className="small muted">
          Норма зависит от близости: 10/10 — раз в неделю, 8 — раз в три недели, 5 — раз в два месяца.
          «Написал» и «виделись» ставят сегодняшнюю дату; «виделись» ещё и записывает встречу в события.
        </div>
        {BANDS.map((b) => {
          const list = items.filter((i) => i.closeness !== undefined && i.closeness >= b.min && i.closeness <= b.max);
          if (!list.length) return null;
          return (
            <div key={b.title} className="cband">
              <div className="mrow-head">{b.title} <span className="faint">· {b.min}–{b.max}</span></div>
              {list.map(row)}
            </div>
          );
        })}
        {unrated.length > 0 && (
          <div className="cband">
            <div className="mrow-head">Без оценки близости <span className="faint">· норму считать не по чему</span></div>
            {unrated.map(row)}
          </div>
        )}
        {err && <div className="small err-text">{err}</div>}
      </div>
    </section>
  );
}

/** Who pulls Eldar down, who holds him up, and what the days actually show. */
export function InfluenceSection({ theme }: { theme: string }) {
  const v = useVault();
  const { life } = useStore();
  const today = todayStr();
  const people = useMemo(
    () => v.pages.filter((p) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p)),
    [v],
  );
  const items = useMemo(() => buildCircle(people, life?.events ?? [], today), [people, life, today]);
  const stats = useMemo(
    () => (life ? triggerStats(items, life.events, life.days, life.habits, today) : []),
    [items, life, today],
  );
  if (!life || !stats.length) return null;

  const node = items.filter((i) => i.triggers.length >= 2);
  const support = items.filter((i) => i.support && i.triggers.length === 0);
  const themePeople = (i: CircleItem) => i.page.theme === theme;

  return (
    <section className="tblock">
      <h2 className="section">Влияние</h2>
      <div className="card">
        {node.length > 0 && (
          <div className="node">
            <b>Узел риска: {node.map((i) => i.name).join(", ")}</b>
            <div className="small muted">
              {node.length === 1 ? "Этот человек тянет" : "Эти люди тянут"} сразу несколько срывов одновременно. Бить по одному узлу — чинить несколько тем.
            </div>
          </div>
        )}
        {stats.map((s) => {
          const rateMet = s.metDays ? s.brokeOnMet / s.metDays : undefined;
          const rateApart = s.otherDays ? s.brokeApart / s.otherDays : undefined;
          return (
            <div key={s.key} className="trow">
              <div>
                <b>{s.label}</b>
                <span className="small faint">{s.habit ? ` · привычка «${s.habit}»` : " · привычки для этого нет"}</span>
                <div className="cwho" style={{ marginTop: 4 }}>
                  {s.people.map((p) => (
                    <Link key={p.page.rel} to={pageUrl(p.page)} className={`chip small ${themePeople(p) ? "" : "faint"}`}>{p.name}</Link>
                  ))}
                </div>
              </div>
              <div className="small" style={{ textAlign: "right", minWidth: 150 }}>
                {!s.habit ? (
                  <span className="faint">нечего считать</span>
                ) : s.metDays === 0 ? (
                  <span className="faint">встреч за 90 дней не отмечено</span>
                ) : (
                  <>
                    <div>{s.metDays} {plural(s.metDays, "встреча", "встречи", "встреч")} · срывов {s.brokeOnMet}</div>
                    {rateMet !== undefined && rateApart !== undefined && (
                      <div className="faint">
                        {Math.round(rateMet * 100)}% в дни встреч против {Math.round(rateApart * 100)}% в остальные
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        {support.length > 0 && (
          <div className="trow">
            <div>
              <b>Опоры</b>
              <div className="cwho" style={{ marginTop: 4 }}>
                {support.map((p) => <Link key={p.page.rel} to={pageUrl(p.page)} className="chip small ok">{p.name}</Link>)}
              </div>
            </div>
          </div>
        )}
        <div className="small faint" style={{ marginTop: 10 }}>
          Триггеры берутся из тегов на страницах людей — это твоя собственная разметка, приложение её не выдумывает.
          Цифры появятся, когда встречи начнут отмечаться кнопкой «виделись».
        </div>
      </div>
    </section>
  );
}
