import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { plural, todayStr } from "../lib/dates";
import { TALKS_REL, lastTalk, parseTalks, serializeTalks } from "../lib/talks";
import { categoryOf, daysSinceContact, daysToBirthday, isListed } from "../lib/people";
import { shortDate } from "../lib/themeNumbers";
import type { Page } from "../lib/types";
import { Block } from "../pages/main/Scene";
import { Err, Mini } from "./SectionBits";

/** Under one roof and barely talking — so the unit here is a conversation. */
const CADENCE: Record<string, number> = { семья: 7, родня: 30 };

/**
 * Conversations with the theme's people. Rebuilt 2026-11-21: the numbers, everyone as a row — the longest without a
 * talk first — with «поговорили» opening one field, the nearest birthdays, and the latest talks.
 */
export default function TalksSection({ theme }: { theme: string }) {
  const v = useVault();
  const { life, saveLedger, reload } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const today = todayStr();

  const people = useMemo(
    () => v.pages.filter((p) => p.theme === theme && isListed(p)),
    [v, theme],
  );
  const talks = useMemo(() => parseTalks(life?.talks ?? ""), [life]);
  if (!life || !people.length) return <div className="g-play"><Block title="Разговоры"><p className="g-faint">Людей в этой теме нет.</p></Block></div>;

  const namesOf = (p: Page) => [p.title, p.file, ...p.aliases];
  const rows = people
    .map((p) => {
      const cat = categoryOf(p) ?? "";
      const t = lastTalk(talks, namesOf(p));
      const since = t ? daysSinceContact(t.date, today) : undefined;
      const cadence = CADENCE[cat];
      return { page: p, cat, talk: t, since, cadence, overdue: cadence !== undefined && since !== undefined ? since - cadence : undefined };
    })
    .filter((r) => r.cat !== "экс")
    .sort((a, b) =>
      (b.overdue ?? (b.since === undefined ? 1e8 : -1e9)) - (a.overdue ?? (a.since === undefined ? 1e8 : -1e9)) ||
      a.page.title.localeCompare(b.page.title, "ru"));

  const birthdays = people
    .map((p) => ({ page: p, days: daysToBirthday(typeof p.fm.birthday === "string" ? p.fm.birthday : undefined, today) }))
    .filter((b): b is { page: Page; days: number } => b.days !== undefined)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  const save = async (p: Page) => {
    if (busy) return;
    setBusy(p.rel);
    try {
      const next = [{ date: today, who: `[[${p.file}]]`, about: about.trim() }, ...talks];
      await saveLedger(TALKS_REL, serializeTalks(next, today), parseTalks);
      setAbout("");
      setOpen(null);
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(null); }
  };

  const last30 = talks.filter((t) => daysSinceContact(t.date, today) !== undefined && daysSinceContact(t.date, today)! <= 30);
  const silent = rows.filter((r) => r.talk === undefined).length;
  const late = rows.filter((r) => (r.overdue ?? -1) > 0).length;
  return (
    <div className="g-play">
      <Block title="В числах" right="считается разговор, после которого есть что записать в «о чём»">
        <div className="g-minis">
          <Mini value={last30.length} label="разговоров за 30 дней" tone={last30.length ? "good" : undefined} />
          <Mini value={late} label="срок вышел · домашние раз в неделю, родня раз в месяц" tone={late ? "bad" : undefined} />
          <Mini value={silent} label="разговор ещё не записан" />
        </div>
        {birthdays.length > 0 && (
          <div className="g-bdays">
            <span>дни рождения</span>
            {birthdays.map((b) => <Link key={b.page.rel} to={pageUrl(b.page)} className={b.days <= 14 ? "soon" : ""}>{b.page.title}<em>{b.days === 0 ? "сегодня" : `через ${b.days} ${plural(b.days, "день", "дня", "дней")}`}</em></Link>)}
          </div>
        )}
      </Block>

      <Block title="С кем" right="дольше всего без разговора — сверху">
        {rows.map((r) => {
          const isLate = (r.overdue ?? -1) > 0 || r.since === undefined;
          const isOpen = open === r.page.rel;
          return (
            <div key={r.page.rel} className={`g-trow${isLate ? " late" : ""}${isOpen ? " open" : ""}`}>
              <div className="who">
                <Link to={pageUrl(r.page)}>{r.page.title}</Link>
                <small>{typeof r.page.fm.connection === "string" ? r.page.fm.connection : r.cat}</small>
              </div>
              <div className="when">
                {r.talk === undefined ? "разговор не записан" : <>{r.since === 0 ? "сегодня" : `${r.since} ${plural(r.since!, "день", "дня", "дней")} назад`}{r.talk.about && <small> · {r.talk.about}</small>}</>}
              </div>
              {isOpen ? (
                <form className="acts" onSubmit={(e) => { e.preventDefault(); void save(r.page); }}>
                  <input className="text" autoFocus placeholder="о чём" autoCorrect="off" spellCheck={false} value={about} onChange={(e) => setAbout(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(null); }} />
                  <button type="submit" className="g-btn sun" disabled={busy !== null}>записать</button>
                  <button type="button" className="g-btn" onClick={() => setOpen(null)}>отмена</button>
                </form>
              ) : (
                <div className="acts"><button type="button" className="g-btn" onClick={() => { setOpen(r.page.rel); setAbout(""); }}>поговорили</button></div>
              )}
            </div>
          );
        })}
        <Err text={err} />
      </Block>

      {talks.length > 0 && (
        <Block title="Последние разговоры" right={`${talks.length} записано`}>
          <ul className="g-dated">
            {talks.slice(0, 8).map((t, i) => <li key={`${t.date}${i}`}><span>{/^\d{4}-\d{2}-\d{2}$/.test(t.date) ? shortDate(t.date) : t.date}</span><div><b>{t.who.replace(/\[\[|\]\]/g, "")}</b><small>{t.about || "—"}</small></div></li>)}
          </ul>
        </Block>
      )}
    </div>
  );
}
