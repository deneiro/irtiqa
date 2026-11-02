import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { todayStr } from "../lib/dates";
import { TALKS_REL, lastTalk, parseTalks, serializeTalks } from "../lib/talks";
import { categoryOf, daysSinceContact, daysToBirthday, isAuthor } from "../lib/people";
import type { Page } from "../lib/types";

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

/** Under one roof and barely talking — so the unit here is a conversation. */
const CADENCE: Record<string, number> = { семья: 7, родня: 30 };

export default function TalksSection({ theme }: { theme: string }) {
  const v = useVault();
  const { life, saveLedger, reload } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const today = todayStr();

  const people = useMemo(
    () => v.pages.filter((p) => p.theme === theme && p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p)),
    [v, theme],
  );
  const talks = useMemo(() => parseTalks(life?.talks ?? ""), [life]);
  if (!life || !people.length) return null;

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
  return (
    <section className="tblock">
      <h2 className="section">Разговоры <span className="n">{last30.length} за 30 дней</span></h2>
      <div className="card">
        <div className="small muted">
          Считается не сообщение, а разговор — тот, после которого есть что записать в «о чём».
          Норма: с домашними раз в неделю, с роднёй раз в месяц.
        </div>
        {rows.map((r) => {
          const late = (r.overdue ?? -1) > 0 || r.since === undefined;
          return (
            <div key={r.page.rel} className={`crow ${late ? "late" : ""}`}>
              <div className="cwho">
                <Link to={pageUrl(r.page)} className="cname">{r.page.title}</Link>
                <span className="small faint">{typeof r.page.fm.connection === "string" ? r.page.fm.connection : r.cat}</span>
              </div>
              <div className="cwhen small">
                {r.talk === undefined ? (
                  <span className="err-text">разговор не записан</span>
                ) : (
                  <span className={late ? "err-text" : "muted"}>
                    {r.since === 0 ? "сегодня" : `${r.since} ${plural(r.since!, "день", "дня", "дней")} назад`}
                    {r.talk.about && <span className="faint"> · {r.talk.about}</span>}
                  </span>
                )}
              </div>
              <div className="cact">
                {open === r.page.rel ? (
                  <>
                    <input
                      className="text" autoFocus placeholder="о чём" autoCorrect="off" spellCheck={false}
                      value={about} onChange={(e) => setAbout(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void save(r.page); if (e.key === "Escape") setOpen(null); }}
                    />
                    <button className="btn small" disabled={busy !== null} onClick={() => void save(r.page)}>записать</button>
                  </>
                ) : (
                  <button className="btn small" onClick={() => { setOpen(r.page.rel); setAbout(""); }}>поговорили</button>
                )}
              </div>
            </div>
          );
        })}
        {birthdays.length > 0 && (
          <>
            <div className="mrow-head">Дни рождения</div>
            <div className="inwork">
              {birthdays.map((b) => (
                <span key={b.page.rel} className={`chip ${b.days <= 14 ? "learning" : ""}`}>
                  {b.page.title} · {b.days === 0 ? "сегодня" : `через ${b.days} ${plural(b.days, "день", "дня", "дней")}`}
                </span>
              ))}
            </div>
          </>
        )}
        {talks.length > 0 && (
          <>
            <div className="mrow-head">Последние</div>
            {talks.slice(0, 5).map((t, i) => (
              <div key={`${t.date}${i}`} className="mrow">
                <div style={{ minWidth: 0 }}>
                  <span className="mono faint">{t.date}</span> <b>{t.who.replace(/\[\[|\]\]/g, "")}</b>
                  {t.about && <span className="small faint"> · {t.about}</span>}
                </div>
              </div>
            ))}
          </>
        )}
        {err && <div className="small err-text">{err}</div>}
      </div>
    </section>
  );
}
