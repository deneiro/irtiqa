import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTip } from "./Bits";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { todayStr } from "../lib/dates";
import {
  HEALTH_REL, PANCREAS_PAGE, daysUntil, lastOf, measures, parseHealth, withHealth,
  type HealthCard, type Measure,
} from "../lib/health";

const axis = { stroke: "var(--faint)", fontSize: 11, fontFamily: "var(--font-mono)" };
const num = (s: string): number | undefined => {
  const n = Number(s.replace(",", "."));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Weight, push-ups, pull-ups: the numbers, the goal and one place to add today's. */
export function BodySection() {
  const { life, updateToday, reload } = useStore();
  const [form, setForm] = useState({ weight: "", pushups: "", pullups: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const card = useMemo(() => (life?.health ? parseHealth(life.health) : null), [life]);
  const ms = useMemo(() => (life ? measures(life.days) : []), [life]);
  if (!life) return null;

  const w = lastOf(ms, "weight");
  const first = ms.find((m) => m.weight !== undefined);
  const start = card?.weightStart ?? first?.weight;
  const goal = card?.weightGoal;
  const cur = w?.weight;
  const left = cur !== undefined && goal !== undefined ? cur - goal : undefined;
  const gone = cur !== undefined && start !== undefined ? start - cur : undefined;
  const data = ms.map((m: Measure) => ({ day: m.date.slice(5), вес: m.weight, отжимания: m.pushups, подтягивания: m.pullups }));

  const save = async () => {
    const weight = num(form.weight), pushups = num(form.pushups), pullups = num(form.pullups);
    if (weight === undefined && pushups === undefined && pullups === undefined) return;
    setBusy(true);
    try {
      await updateToday((d) => ({
        ...d,
        weight: weight ?? d.weight,
        pushups: pushups ?? d.pushups,
        pullups: pullups ?? d.pullups,
      }));
      setForm({ weight: "", pushups: "", pullups: "" });
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const pu = lastOf(ms, "pushups"), pl = lastOf(ms, "pullups");
  return (
    <section className="tblock">
      <h2 className="section">Тело <span className="n">{ms.length} {ms.length === 1 ? "замер" : "замеров"}</span></h2>
      <div className="card">
        <div className="bodynums">
          <div className="bnum">
            <b>{cur !== undefined ? `${cur} кг` : "—"}</b>
            <span>вес{w ? ` · ${w.date}` : ""}</span>
          </div>
          <div className="bnum"><b>{pu?.pushups ?? "—"}</b><span>отжимания за подход</span></div>
          <div className="bnum"><b>{pl?.pullups ?? "—"}</b><span>подтягивания</span></div>
          {goal !== undefined && (
            <div className="bnum">
              <b className={left !== undefined && left <= 0 ? "ok" : ""}>{left !== undefined ? `${left > 0 ? "−" : "+"}${Math.abs(Math.round(left * 10) / 10)} кг` : "—"}</b>
              <span>до цели {goal} кг{card?.goalBy ? ` · до ${card.goalBy}` : ""}</span>
            </div>
          )}
        </div>
        {gone !== undefined && gone !== 0 && (
          <div className="small muted" style={{ marginTop: 8 }}>
            {gone > 0 ? `Сброшено ${Math.round(gone * 10) / 10} кг от ${start} кг.` : `Набрано ${Math.round(-gone * 10) / 10} кг от ${start} кг.`}
          </div>
        )}
        {data.length >= 2 ? (
          <div className="chart" style={{ height: 180, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--hair)" />
                <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                {goal !== undefined && <ReferenceLine y={goal} stroke="var(--success)" strokeDasharray="4 4" />}
                <Line type="monotone" dataKey="вес" stroke="var(--accent-2)" dot connectNulls strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="small faint" style={{ marginTop: 10 }}>
            Замеров пока {data.length}. График появится со второго — взвешивайся раз в неделю, чаще смысла нет.
          </div>
        )}
        <div className="measure-form">
          <input className="text" placeholder="вес, кг" inputMode="decimal" autoCorrect="off" spellCheck={false} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          <input className="text" placeholder="отжимания" inputMode="numeric" autoCorrect="off" spellCheck={false} value={form.pushups} onChange={(e) => setForm({ ...form, pushups: e.target.value })} />
          <input className="text" placeholder="подтягивания" inputMode="numeric" autoCorrect="off" spellCheck={false} value={form.pullups} onChange={(e) => setForm({ ...form, pullups: e.target.value })} />
          <button className="btn" disabled={busy} onClick={() => void save()}>записать на сегодня</button>
        </div>
        {err && <div className="small err-text">{err}</div>}
      </div>
    </section>
  );
}

/** Chronic conditions, the doctor who is overdue, and what the body has been saying. */
export function MedicalSection() {
  const v = useVault();
  const { life, saveText, reload } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sym, setSym] = useState({ what: "", note: "" });
  const [plan, setPlan] = useState({ doctor: "", by: "", why: "" });
  const [adding, setAdding] = useState(false);
  const today = todayStr();
  const raw = life?.health ?? null;
  const card = useMemo(() => (raw ? parseHealth(raw) : null), [raw]);
  const ref = useMemo(() => v.pages.find((p) => p.file === PANCREAS_PAGE), [v]);
  if (!card || !raw) return null;

  const write = async (next: HealthCard) => {
    setBusy(true);
    try {
      await saveText(HEALTH_REL, withHealth(raw, next, today));
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const addSymptom = () => {
    const what = sym.what.trim();
    if (!what) return;
    void write({ ...card, symptoms: [{ date: today, what, where: "", note: sym.note.trim() }, ...card.symptoms] });
    setSym({ what: "", note: "" });
  };
  const addPlan = () => {
    const doctor = plan.doctor.trim();
    if (!doctor) return;
    void write({ ...card, plans: [...card.plans, { doctor, by: plan.by.trim(), why: plan.why.trim() }] });
    setPlan({ doctor: "", by: "", why: "" });
    setAdding(false);
  };
  /** A plan that happened becomes a visit. */
  const closePlan = (i: number) => {
    const p = card.plans[i];
    void write({
      ...card,
      plans: card.plans.filter((_, j) => j !== i),
      visits: [{ date: today, doctor: p.doctor, why: p.why, result: "" }, ...card.visits],
    });
  };

  const lastVisit = [...card.visits].sort((a, b) => b.date.localeCompare(a.date))[0];
  return (
    <section className="tblock">
      <h2 className="section">Медицина</h2>
      <div className="card">
        {card.chronic.length > 0 && (
          <div className="chronic">
            {card.chronic.map((c) => <span key={c} className="chip danger">{c}</span>)}
            {ref && <Link to={pageUrl(ref)} className="chip">что можно и что нельзя →</Link>}
          </div>
        )}

        <div className="mrow-head">Планы</div>
        {card.plans.length === 0 && <div className="small faint">Ничего не запланировано.</div>}
        {card.plans.map((p, i) => {
          const d = daysUntil(p.by, today);
          const late = d !== undefined && d < 0;
          return (
            <div key={`${p.doctor}${i}`} className={`mrow ${late ? "late" : ""}`}>
              <div style={{ minWidth: 0 }}>
                <b>{p.doctor}</b>
                <span className="small"> · {late ? `просрочено на ${-d!} дн.` : d === undefined ? p.by : `осталось ${d} дн.`}</span>
                {p.why && <div className="small faint">{p.why}</div>}
              </div>
              <button className="btn small" disabled={busy} onClick={() => closePlan(i)}>был</button>
            </div>
          );
        })}
        {adding ? (
          <div className="measure-form">
            <input className="text" placeholder="врач" autoCorrect="off" spellCheck={false} value={plan.doctor} onChange={(e) => setPlan({ ...plan, doctor: e.target.value })} />
            <input className="text" placeholder="к дате ГГГГ-ММ-ДД" autoCorrect="off" spellCheck={false} value={plan.by} onChange={(e) => setPlan({ ...plan, by: e.target.value })} />
            <input className="text" placeholder="зачем" autoCorrect="off" spellCheck={false} value={plan.why} onChange={(e) => setPlan({ ...plan, why: e.target.value })} />
            <button className="btn" disabled={busy} onClick={addPlan}>добавить</button>
          </div>
        ) : (
          <button className="btn small" style={{ marginTop: 8 }} onClick={() => setAdding(true)}>запланировать визит</button>
        )}

        <div className="mrow-head">Симптомы</div>
        {card.symptoms.slice(0, 5).map((s, i) => (
          <div key={`${s.date}${i}`} className="mrow">
            <div style={{ minWidth: 0 }}>
              <span className="mono faint">{s.date}</span> <b>{s.what}</b>
              {s.note && <div className="small faint">{s.note}</div>}
            </div>
          </div>
        ))}
        <div className="measure-form">
          <input className="text" placeholder="что беспокоит" autoCorrect="off" spellCheck={false} value={sym.what} onChange={(e) => setSym({ ...sym, what: e.target.value })} />
          <input className="text wide" placeholder="заметка" autoCorrect="off" spellCheck={false} value={sym.note} onChange={(e) => setSym({ ...sym, note: e.target.value })} />
          <button className="btn" disabled={busy} onClick={addSymptom}>записать</button>
        </div>

        {lastVisit && (
          <div className="small faint" style={{ marginTop: 10 }}>
            Последний визит: {lastVisit.doctor}, {lastVisit.date}{lastVisit.result ? ` — ${lastVisit.result}` : ""}. Всего визитов записано: {card.visits.length}.
          </div>
        )}
        {err && <div className="small err-text">{err}</div>}
      </div>
    </section>
  );
}
