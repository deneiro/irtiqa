import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { addDays, plural, todayStr } from "../lib/dates";
import { AUDIT_PARTS, auditRel, serializeAudit, sinceAudit, type AuditKey } from "../lib/audit";
import { shortDate } from "../lib/themeNumbers";
import { Block } from "../pages/main/Scene";
import { Err, LineKey, Lines, Mini } from "./SectionBits";

export const CRISIS_PAGE = "Когда накрывает";
const MOOD = "var(--d-iris)", STRESS = "var(--d-honey)";

/** The rule that decides when the page above is shown, stated in one place. */
function alarmOf(mood: (number | undefined)[], stress: (number | undefined)[]): string | null {
  const last = (xs: (number | undefined)[], n: number) => xs.filter((x) => x !== undefined).slice(-n) as number[];
  const m3 = last(mood, 3), m7 = last(mood, 7), s3 = last(stress, 3);
  if (m3.length === 3 && m3.every((x) => x <= 4)) return "Три дня подряд настроение 4 и ниже.";
  if (m7.length >= 5 && m7.reduce((a, b) => a + b, 0) / m7.length <= 5) return "Среднее настроение за неделю — 5 и ниже.";
  if (s3.length >= 2 && s3.filter((x) => x >= 8).length >= 2) return "Стресс 8 и выше два дня из трёх.";
  return null;
}

/**
 * Mood, stress, the early warning, and the audit ritual. Rebuilt 2026-11-21: the numbers, the warning as its own
 * card when the rule fires, sixty days as two lines, and the audit as four cards with the form in their place.
 */
export default function SelfSection() {
  const v = useVault();
  const { life, saveText, reload } = useStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<Record<AuditKey, string>>({ down: "", holds: "", drop: "", add: "" });
  const today = todayStr();

  const days = useMemo(() => Array.from({ length: 60 }, (_, i) => addDays(today, i - 59)), [today]);
  const moods = useMemo(() => days.map((d) => life?.days.get(d)?.mood), [days, life]);
  const stresses = useMemo(() => days.map((d) => life?.days.get(d)?.stress), [days, life]);
  const profile = useMemo(() => v.pages.find((p) => p.type === "profile"), [v]);
  const crisis = useMemo(() => v.pages.find((p) => p.file === CRISIS_PAGE), [v]);
  if (!life) return null;

  const rated = moods.filter((m): m is number => m !== undefined);
  const ratedS = stresses.filter((m): m is number => m !== undefined);
  const lastMood = rated.length ? rated[rated.length - 1] : undefined;
  const week = rated.slice(-7), weekS = ratedS.slice(-7);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : undefined);
  const alarm = alarmOf(moods, stresses);
  const since = sinceAudit(life.audits, today);
  const lastAudit = life.audits[0];
  const radicals = profile?.body.match(/Radical profile:\s*`([^`]+)`/)?.[1];

  const saveAudit = async () => {
    if (busy) return;
    if (!Object.values(form).some((x) => x.trim())) return;
    setBusy(true);
    try {
      await saveText(auditRel(today), serializeAudit({ date: today, parts: form }));
      setForm({ down: "", holds: "", drop: "", add: "" });
      setOpen(false);
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="g-play">
      {alarm && (
        <section className="g-block g-alarm">
          <h2>Раннее предупреждение</h2>
          <b>{alarm}</b>
          <p>Это то самое окно, в котором ты просил себе напомнить. {crisis ? <Link to={pageUrl(crisis)}>Открыть «{CRISIS_PAGE}» →</Link> : "Страница «Когда накрывает» пока не написана."}</p>
        </section>
      )}

      <Block title="Настроение и стресс · 60 дней" right={`${rated.length} ${plural(rated.length, "оценка", "оценки", "оценок")} настроения`}>
        <div className={`g-minis${radicals ? " four" : ""}`}>
          <Mini value={lastMood ?? "—"} label="настроение, последняя оценка" />
          <Mini value={avg(week) ?? "—"} label="настроение, среднее по 7 последним оценкам" />
          <Mini value={avg(weekS) ?? "—"} label="стресс, среднее по 7 последним оценкам" tone={(avg(weekS) ?? 0) >= 7 ? "bad" : undefined} />
          {radicals && <Mini value={<code>{radicals}</code>} label={<>радикалы · {profile ? <Link to={pageUrl(profile)}>профиль →</Link> : null}</>} />}
        </div>
        {rated.length >= 2 || ratedS.length >= 2 ? (
          <>
            <Lines wide lo={1} hi={10} height={170} titles={days.map((d) => shortDate(d))} series={[{ word: "настроение", color: MOOD, vals: moods }, { word: "стресс", color: STRESS, vals: stresses }]} />
            <LineKey items={[{ word: "настроение", color: MOOD }, { word: "стресс", color: STRESS }]} />
          </>
        ) : <p className="g-faint">Оценок настроения пока {rated.length}. Их спрашивает вечерний опрос бота и «Сегодня» — график соберётся сам.</p>}
      </Block>

      <Block title="Аудит жизни" right={
        <>
          {since === undefined ? "ещё не было" : `последний ${since === 0 ? "сегодня" : `${since} дн. назад`} · ${lastAudit.date}`}
          {!open && <button type="button" className="g-btn sun" onClick={() => setOpen(true)}>{since === 0 ? "переписать сегодняшний" : "пройти аудит"}</button>}
        </>
      }>
        {open ? (
          <form className="g-audit" onSubmit={(e) => { e.preventDefault(); void saveAudit(); }}>
            {AUDIT_PARTS.map((p) => (
              <label key={p.key}>
                <span>{p.heading}<small>{p.hint}</small></span>
                <textarea className="text" rows={4} autoCorrect="off" spellCheck={false} value={form[p.key]} onChange={(e) => setForm({ ...form, [p.key]: e.target.value })} />
              </label>
            ))}
            <div className="g-addrow">
              <button type="submit" disabled={busy || !Object.values(form).some((x) => x.trim())}>Записать аудит</button>
              <button type="button" className="g-btn" disabled={busy} onClick={() => setOpen(false)}>отмена</button>
            </div>
          </form>
        ) : lastAudit ? (
          <div className="g-fcards">
            {AUDIT_PARTS.filter((p) => lastAudit.parts[p.key]).map((p) => (
              <div key={p.key} className="g-fcard">
                <dl><div><dt>{p.heading}</dt><dd>{lastAudit.parts[p.key].split("\n").slice(0, 3).join(" ")}</dd></div></dl>
              </div>
            ))}
          </div>
        ) : <p className="g-faint">Ни одного аудита ещё не записано. Ты называл это регулярным делом, а не разовым — вот место, где он останется.</p>}
        <Err text={err} />
      </Block>
    </div>
  );
}
