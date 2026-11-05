import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTip } from "./Bits";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { addDays, todayStr } from "../lib/dates";
import { AUDIT_PARTS, auditRel, serializeAudit, sinceAudit, type AuditKey } from "../lib/audit";

const axis = { stroke: "var(--faint)", fontSize: 11, fontFamily: "var(--font-mono)" };
export const CRISIS_PAGE = "Когда накрывает";

/** The rule that decides when the page above is shown, stated in one place. */
function alarmOf(mood: (number | undefined)[], stress: (number | undefined)[]): string | null {
  const last = (xs: (number | undefined)[], n: number) => xs.filter((x) => x !== undefined).slice(-n) as number[];
  const m3 = last(mood, 3), m7 = last(mood, 7), s3 = last(stress, 3);
  if (m3.length === 3 && m3.every((x) => x <= 4)) return "Три дня подряд настроение 4 и ниже.";
  if (m7.length >= 5 && m7.reduce((a, b) => a + b, 0) / m7.length <= 5) return "Среднее настроение за неделю — 5 и ниже.";
  if (s3.length >= 2 && s3.filter((x) => x >= 8).length >= 2) return "Стресс 8 и выше два дня из трёх.";
  return null;
}

/** Mood, stress, the early warning, and the audit ritual. */
export default function SelfSection() {
  const v = useVault();
  const { life, saveText, reload } = useStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<Record<AuditKey, string>>({ down: "", holds: "", drop: "", add: "" });
  const today = todayStr();

  const days = useMemo(() => Array.from({ length: 60 }, (_, i) => addDays(today, i - 59)), [today]);
  const data = useMemo(
    () => days.map((d) => {
      const day = life?.days.get(d);
      return { day: d.slice(5), настроение: day?.mood, стресс: day?.stress };
    }),
    [days, life],
  );
  const profile = useMemo(() => v.pages.find((p) => p.type === "profile"), [v]);
  const crisis = useMemo(() => v.pages.find((p) => p.file === CRISIS_PAGE), [v]);
  if (!life) return null;

  const moods = data.map((d) => d.настроение);
  const stresses = data.map((d) => d.стресс);
  const rated = moods.filter((m): m is number => m !== undefined);
  const lastMood = rated.length ? rated[rated.length - 1] : undefined;
  const week = rated.slice(-7);
  const avg7 = week.length ? week.reduce((a, b) => a + b, 0) / week.length : undefined;
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
    <section className="tblock">
      <h2 className="section">Состояние <span className="n">{rated.length} {rated.length === 1 ? "оценка" : "оценок"} за 60 дней</span></h2>
      <div className="card">
        <div className="bodynums">
          <div className="bnum"><b>{lastMood ?? "—"}</b><span>настроение, последняя оценка</span></div>
          <div className="bnum"><b>{avg7 !== undefined ? Math.round(avg7 * 10) / 10 : "—"}</b><span>в среднем за неделю</span></div>
          {radicals && (
            <div className="bnum">
              <b className="small mono" style={{ fontSize: 15 }}>{radicals}</b>
              <span>радикалы{profile ? "" : ""} · <Link to={profile ? pageUrl(profile) : "/"}>профиль</Link></span>
            </div>
          )}
        </div>

        {alarm && (
          <div className="node" style={{ marginTop: 12 }}>
            <b>{alarm}</b>
            <div className="small muted">
              Это то самое окно, в котором ты просил себе напомнить.{" "}
              {crisis ? <Link to={pageUrl(crisis)}>Открыть «{CRISIS_PAGE}»</Link> : "Страница «Когда накрывает» пока не написана."}
            </div>
          </div>
        )}

        {rated.length >= 2 ? (
          <div className="chart" style={{ height: 190, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--hair)" />
                <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} interval={6} />
                <YAxis domain={[0, 10]} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="настроение" stroke="var(--accent-2)" dot connectNulls strokeWidth={2} />
                <Line type="monotone" dataKey="стресс" stroke="var(--danger)" dot connectNulls strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="small faint" style={{ marginTop: 10 }}>
            Оценок настроения пока {rated.length}. Их спрашивает вечерний опрос бота — график соберётся сам.
          </div>
        )}

        <div className="mrow-head">Аудит жизни</div>
        <div className="small muted">
          {since === undefined
            ? "Ни одного аудита ещё не записано. Ты называл это регулярным делом, а не разовым — вот место, где он останется."
            : `Последний аудит ${since === 0 ? "сегодня" : `${since} дн. назад`}, ${lastAudit.date}.`}
        </div>
        {lastAudit && !open && (
          <div className="auditprev">
            {AUDIT_PARTS.filter((p) => lastAudit.parts[p.key]).map((p) => (
              <div key={p.key}>
                <div className="eyebrow">{p.heading}</div>
                <div className="small">{lastAudit.parts[p.key].split("\n").slice(0, 3).join(" ")}</div>
              </div>
            ))}
          </div>
        )}
        {open ? (
          <>
            {AUDIT_PARTS.map((p) => (
              <div key={p.key} style={{ marginTop: 10 }}>
                <div className="eyebrow">{p.heading} <span className="faint">· {p.hint}</span></div>
                <textarea
                  className="text" rows={3} style={{ width: "100%" }} autoCorrect="off" spellCheck={false}
                  value={form[p.key]} onChange={(e) => setForm({ ...form, [p.key]: e.target.value })}
                />
              </div>
            ))}
            <div className="measure-form">
              <button className="btn" disabled={busy} onClick={() => void saveAudit()}>записать аудит</button>
              <button className="btn small" disabled={busy} onClick={() => setOpen(false)}>отмена</button>
            </div>
          </>
        ) : (
          <button className="btn small" style={{ marginTop: 10 }} onClick={() => setOpen(true)}>
            {since === 0 ? "переписать сегодняшний аудит" : "пройти аудит"}
          </button>
        )}
        {err && <div className="small err-text">{err}</div>}
      </div>
    </section>
  );
}
