import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { plural, todayStr } from "../lib/dates";
import { rawPageText } from "../lib/rawpage";
import { contactEdits } from "../lib/contact";
import { BANDS, TRIGGERS, buildCircle, tieWarmth, type CircleItem } from "../lib/circle";
import { DIRECTION_WORDS, influenceGroups, influenceItemCount, ownInfluencePage, removeInfluence, type Direction, type InfluenceItem } from "../lib/influence";
import { confirmAction } from "../lib/native";
import type { Page } from "../lib/types";
import { countWords } from "../lib/person";
import { isListed } from "../lib/people";
import { peopleOf } from "../lib/themeNumbers";
import { Block } from "../pages/main/Scene";
import InfluenceSheet, { type InfluenceSheetMode } from "./InfluenceSheet";
import { Err, Mini } from "./SectionBits";
import "./Influence.css";

/**
 * Everyone in the theme by how close they are, the longest silent first inside a band. Rebuilt 2026-11-21: a row is
 * the name with its marks, a bar of how warm the tie still is against its rhythm, the days, and «написал» · «виделись».
 */
export function CircleSection({ theme }: { theme: string }) {
  const v = useVault();
  const { life, saveText, reload } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const today = todayStr();
  const people = useMemo(
    () => v.pages.filter((p) => p.theme === theme && isListed(p)),
    [v, theme],
  );
  const items = useMemo(() => buildCircle(people, life?.events ?? [], today), [people, life, today]);
  if (!items.length) return <div className="g-play"><Block title="Круг"><p className="g-faint">Людей в этой теме нет.</p></Block></div>;

  const overdue = items.filter((i) => (i.overdue ?? -1) > 0);
  const unrated = items.filter((i) => i.closeness === undefined);
  const warm = items.filter((i) => (tieWarmth(i)?.pct ?? 0) >= 50);

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
    const w = tieWarmth(it);
    return (
      <div key={it.page.rel} className={`g-crow${late ? " late" : ""}`}>
        <div className="who">
          <Link to={pageUrl(it.page)}>{it.name}</Link>
          {it.closeness !== undefined && <em>{it.closeness}/10</em>}
          {it.category && <small>{it.category}</small>}
          {it.triggers.map((t) => <span key={t} className="trig">{TRIGGERS.find((x) => x.key === t)?.label}</span>)}
          {it.support && <span className="sup">опора</span>}
        </div>
        <i title={w ? `связь · ${w.state}` : "близость не указана — ритма нет"}><u style={{ width: `${w?.pct ?? 0}%` }} /></i>
        <div className="when">
          {since === undefined ? "не отмечено" : since === 0 ? "сегодня" : `${since} ${plural(since, "день", "дня", "дней")} назад`}
          {it.cadence !== undefined && <small> · ритм {it.cadence}</small>}
        </div>
        <div className="acts">
          <button type="button" className="g-btn" disabled={busy === it.name} onClick={() => void touch(it, false)}>написал</button>
          <button type="button" className="g-btn" disabled={busy === it.name} onClick={() => void touch(it, true)}>виделись</button>
        </div>
      </div>
    );
  };

  return (
    <div className="g-play">
      <Block title="Круг в числах" right={<Link className="g-more" to="/people">все люди →</Link>}>
        <div className="g-minis four">
          <Mini value={items.length} label={plural(items.length, "человек", "человека", "человек")} />
          <Mini value={warm.length} label="связь тёплая" tone={warm.length ? "good" : undefined} />
          <Mini value={overdue.length} label="срок вышел" tone={overdue.length ? "bad" : undefined} />
          <Mini value={unrated.length} label="без оценки близости" />
        </div>
        <p className="g-cap">Ритм зависит от близости: 10/10 — раз в неделю, 8 — раз в три недели, 5 — раз в два месяца. «Написал» и «виделись» ставят сегодняшнюю дату; «виделись» ещё и записывает встречу в события.</p>
        <Err text={err} />
      </Block>
      {BANDS.map((b) => {
        const list = items.filter((i) => i.closeness !== undefined && i.closeness >= b.min && i.closeness <= b.max);
        if (!list.length) return null;
        return <Block key={b.title} title={<>{b.title} · {list.length}</>} right={`близость ${b.min}–${b.max}`}>{list.map(row)}</Block>;
      })}
      {unrated.length > 0 && <Block title={<>Без оценки близости · {unrated.length}</>} right="ритм считать не по чему">{unrated.map(row)}</Block>}
    </div>
  );
}

/**
 * «Тянет вверх» and «Тянет вниз»: each influence once, with the people who have it, and its habit on the days they
 * met. Rebuilt 2026-11-21 as two columns of cards; the sheet that writes an influence is the one it always was.
 */
export function InfluenceSection({ theme }: { theme: string }) {
  const v = useVault();
  const { life } = useStore();
  const today = todayStr();
  const people = useMemo(() => peopleOf(v), [v]);
  // «Личностный рост» shows his own page too, and writes a new influence there (2026-11-23)
  const mine = theme === "Personal growth";
  const ownPage = useMemo(() => (mine ? ownInfluencePage(v.pages) : undefined), [mine, v]);
  const groups = useMemo(() => influenceGroups(people, life?.habits ?? [], undefined, ownPage), [people, life, ownPage]);
  const { saveText, reload } = useStore();
  const [busy, setBusy] = useState<string>();
  const [err, setErr] = useState<string>();
  /**
   * «убрать» (2026-11-23: «их слишком много и не к месту»): the influence off every page that holds it — his own and
   * each person's — or, with `only`, off that one person. Asked first; each page notes it in its «Changes».
   */
  const drop = async (it: InfluenceItem, only?: Page) => {
    const pages = only ? [only] : [...(it.own && ownPage ? [ownPage] : []), ...it.people.map((p) => p.page)];
    const where = only ? `у ${only.title}` : [it.own ? "со страницы «Влияние»" : "", it.people.length ? `у ${it.people.length} ${plural(it.people.length, "человека", "людей", "людей")}` : ""].filter(Boolean).join(" и ");
    if (!(await confirmAction(`Убрать «${it.label}» (${DIRECTION_WORDS[it.dir].toLowerCase()}) ${where}?`, "Убрать влияние"))) return;
    setBusy(it.key + (only?.rel ?? ""));
    let wrote = false;
    try {
      for (const p of pages) {
        const raw = rawPageText(v, p.rel);
        if (raw === null) continue;
        const out = removeInfluence(raw, it, life?.habits ?? [], todayStr());
        if (out !== raw) { await saveText(p.rel, out); wrote = true; }
      }
      setErr(wrote ? undefined : "На страницах этой строки не нашлось — обнови vault.");
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally {
      if (wrote) await reload().catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
      setBusy(undefined);
    }
  };
  const [sheet, setSheet] = useState<InfluenceSheetMode | null>(null);
  if (!life) return null;

  const group = (dir: Direction) => {
    const items = groups[dir];
    return (
      <Block className={`g-inf ${dir}`} title={<>{dir === "up" ? "↑" : "↓"} {DIRECTION_WORDS[dir]} · {items.length}</>}
        right={<button type="button" className="g-btn" onClick={() => setSheet({ kind: "new", dir })}>+ влияние</button>}>
        {items.map((it) => {
          const c = influenceItemCount(it, people, life, today);
          const w = c && c.beads.length ? countWords(c) : undefined;
          return (
            <div key={it.key} className="g-infcard">
              <div className="hd">
                <b>{it.label}{it.habit && <small>привычка</small>}{mine && it.own && !it.people.length && <small>без людей</small>}</b>
                <button type="button" className="drop" disabled={!!busy} title="убрать это влияние отовсюду" aria-label={`Убрать влияние: ${it.label}`} onClick={() => void drop(it)}>{busy === it.key ? "…" : "убрать"}</button>
              </div>
              {it.note && <p className="note">{it.note}</p>}
              <div className="who">
                {it.people.map((p) => (
                  <span key={p.page.rel} className="chip">
                    <Link to={pageUrl(p.page)} className={p.page.theme === theme ? "" : "other"}>{p.page.title}{p.note && <small>{p.note}</small>}</Link>
                    <button type="button" className="x" disabled={!!busy} title={`убрать у ${p.page.title}`} aria-label={`Убрать «${it.label}» у ${p.page.title}`} onClick={() => void drop(it, p.page)}>×</button>
                  </span>
                ))}
                <button type="button" className="plus" title="добавить человека" aria-label={`Добавить человека: ${it.label}`} onClick={() => setSheet({ kind: "person", item: it })}>+</button>
              </div>
              {c && <p>{w ? <>{w.together} · {w.apart}{c.counted < 3 && " · судить рано"}</> : "встреч за 90 дней нет"}</p>}
            </div>
          );
        })}
        {!items.length && <p className="g-faint">{mine ? "Пока пусто: «+ влияние» — вещь, место, занятие или привычка; людей можно добавить сразу или потом." : "Пока пусто: «+ влияние» запишет первое на страницу человека."}</p>}
      </Block>
    );
  };

  return (
    <>
      <div className="g-play">
        <div className="g-two">
          {group("up")}
          {group("down")}
        </div>
        {err && <p className="g-error" role="alert">{err}</p>}
        <p className="g-cap">«убрать» снимает влияние со всех страниц, где оно записано, × у имени — только у этого человека; на каждой странице это видно в «Changes». {mine && "Свои пункты лежат на странице «Влияние» в «Личностном росте»; «+» у пункта пишет его на страницу человека. "}Привычка считается по дням встреч за 90 дней до вчера; встреча без файла дня не в счёте. Бледное имя — человек из другой темы.</p>
      </div>
      <InfluenceSheet mode={sheet} people={people} habits={life.habits} onClose={() => setSheet(null)} toSelf={mine} />
    </>
  );
}
