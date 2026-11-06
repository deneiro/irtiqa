import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { todayStr } from "../lib/dates";
import { rawPageText } from "../lib/rawpage";
import { contactEdits } from "../lib/contact";
import { BANDS, TRIGGERS, buildCircle, type CircleItem } from "../lib/circle";
import { DIRECTION_WORDS, influenceGroups, influenceItemCount, type Direction } from "../lib/influence";
import { countWords } from "../lib/person";
import { isAuthor } from "../lib/people";
import { peopleOf } from "../lib/themeNumbers";
import InfluenceSheet, { type InfluenceSheetMode } from "./InfluenceSheet";
import "./Influence.css";

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

/** «Тянет вверх» and «Тянет вниз»: each influence once, with the people who have it, and its habit on the days they met. */
export function InfluenceSection({ theme }: { theme: string }) {
  const v = useVault();
  const { life } = useStore();
  const today = todayStr();
  const people = useMemo(() => peopleOf(v), [v]);
  const groups = useMemo(() => influenceGroups(people, life?.habits ?? []), [people, life]);
  const [sheet, setSheet] = useState<InfluenceSheetMode | null>(null);
  if (!life) return null;

  const group = (dir: Direction) => {
    const items = groups[dir];
    return (
      <div className={`t-inf-group t-inf-${dir}`}>
        <div className="t-inf-head">
          <span className="t-inf-ar" aria-hidden="true">{dir === "up" ? "↑" : "↓"}</span>
          <h3>{DIRECTION_WORDS[dir]}</h3>
          <span className="t-inf-n">{items.length}</span>
          <button className="t-inf-add" type="button" onClick={() => setSheet({ kind: "new", dir })}>+ влияние</button>
        </div>
        {items.length ? (
          <ul className="t-inf-list">
            {items.map((it) => {
              const c = influenceItemCount(it, people, life, today);
              const w = c && c.beads.length ? countWords(c) : undefined;
              return (
                <li key={it.key} className="t-inf-item">
                  <div className="t-inf-name">{it.label}{it.habit && <small>привычка</small>}</div>
                  <div className="t-inf-who">
                    {it.people.map((p) => (
                      <Link key={p.page.rel} to={pageUrl(p.page)} className={`t-inf-chip${p.page.theme === theme ? "" : " t-inf-other"}`}>
                        {p.page.title}{p.note && <small>{p.note}</small>}
                      </Link>
                    ))}
                    <button className="t-inf-plus" type="button" title="добавить человека" aria-label={`Добавить человека: ${it.label}`} onClick={() => setSheet({ kind: "person", item: it })}>+</button>
                  </div>
                  {c && (
                    <div className="t-inf-count">
                      {w ? <>{w.together} · {w.apart}{c.counted < 3 && <span> · судить рано</span>}</> : "встреч за 90 дней нет"}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : <p className="t-inf-empty">Пока пусто: «+ влияние» запишет первое на страницу человека.</p>}
      </div>
    );
  };

  return (
    <section className="tblock t-inf">
      <h2 className="section">Влияние <span className="n">↑ {groups.up.length} · ↓ {groups.down.length}</span></h2>
      <div className="t-inf-groups">
        {group("up")}
        {group("down")}
      </div>
      <p className="t-inf-foot">Привычка считается по дням встреч за 90 дней до вчера; встреча без файла дня не в счёте.</p>
      <InfluenceSheet mode={sheet} people={people} habits={life.habits} onClose={() => setSheet(null)} />
    </section>
  );
}
