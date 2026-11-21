import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore, useVault } from "../store";
import { pageUrl } from "../lib/vault";
import { plural, todayStr } from "../lib/dates";
import {
  HEALTH_REL, PANCREAS_PAGE, daysUntil, lastOf, measures, parseHealth, withHealth,
  type HealthCard,
} from "../lib/health";
import { shortDate } from "../lib/themeNumbers";
import { Block } from "../pages/main/Scene";
import { Err, LineKey, Lines, Mini } from "./SectionBits";

const num = (s: string): number | undefined => {
  const n = Number(s.replace(",", "."));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Weight, push-ups, pull-ups: the numbers, the goal and one place to add today's. Rebuilt 2026-11-21: the numbers on
 * top, the weight as a line with the goal dashed, push-ups and pull-ups as a second chart, one line to record today.
 */
export function BodySection() {
  const { life, updateToday, reload } = useStore();
  const [form, setForm] = useState({ weight: "", pushups: "", pullups: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const card = useMemo(() => (life?.health ? parseHealth(life.health) : null), [life]);
  const ms = useMemo(() => (life ? measures(life.days) : []), [life]);
  if (!life) return null;

  const w = lastOf(ms, "weight");
  const weights = ms.filter((m) => m.weight !== undefined);
  const start = card?.weightStart ?? weights[0]?.weight;
  const goal = card?.weightGoal;
  const cur = w?.weight;
  const left = cur !== undefined && goal !== undefined ? cur - goal : undefined;
  const gone = cur !== undefined && start !== undefined ? start - cur : undefined;
  const reps = ms.filter((m) => m.pushups !== undefined || m.pullups !== undefined);

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
  const wv = weights.map((m) => m.weight as number);
  const wlo = Math.floor(Math.min(...wv, goal ?? Infinity) - 1), whi = Math.ceil(Math.max(...wv, goal ?? -Infinity) + 1);
  const rhi = Math.max(5, ...reps.map((m) => Math.max(m.pushups ?? 0, m.pullups ?? 0)));
  return (
    <div className="g-play">
      <Block title="Сейчас" right={`${ms.length} ${plural(ms.length, "замер", "замера", "замеров")}`}>
        <div className={`g-minis${goal !== undefined ? " four" : ""}`}>
          <Mini value={cur !== undefined ? <>{cur}<small> кг</small></> : "—"} label={`вес${w ? ` · ${shortDate(w.date)}` : ""}`} />
          <Mini value={pu?.pushups ?? "—"} label={`отжимания за подход${pu ? ` · ${shortDate(pu.date)}` : ""}`} />
          <Mini value={pl?.pullups ?? "—"} label={`подтягивания${pl ? ` · ${shortDate(pl.date)}` : ""}`} />
          {goal !== undefined && <Mini tone={left !== undefined && left <= 0 ? "good" : undefined} value={left !== undefined ? <>{left > 0 ? "−" : "+"}{Math.abs(r1(left))}<small> кг</small></> : "—"} label={`до цели ${goal} кг${card?.goalBy ? ` · к ${card.goalBy}` : ""}`} />}
        </div>
        {gone !== undefined && gone !== 0 && <p className="g-cap">{gone > 0 ? `Сброшено ${r1(gone)} кг от ${start} кг.` : `Набрано ${r1(-gone)} кг от ${start} кг.`}</p>}
        <form className="g-addrow" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <input className="text" placeholder="вес, кг" inputMode="decimal" autoCorrect="off" spellCheck={false} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          <input className="text" placeholder="отжимания" inputMode="numeric" autoCorrect="off" spellCheck={false} value={form.pushups} onChange={(e) => setForm({ ...form, pushups: e.target.value })} />
          <input className="text" placeholder="подтягивания" inputMode="numeric" autoCorrect="off" spellCheck={false} value={form.pullups} onChange={(e) => setForm({ ...form, pullups: e.target.value })} />
          <button type="submit" disabled={busy || (!form.weight.trim() && !form.pushups.trim() && !form.pullups.trim())}>Записать на сегодня</button>
        </form>
        <Err text={err} />
      </Block>

      <Block title="Вес" right={goal !== undefined ? `пунктир — цель ${goal} кг` : "цели по весу нет"}>
        {weights.length >= 2
            ? <Lines wide height={170} lo={wlo} hi={whi} goal={goal} titles={weights.map((m) => shortDate(m.date))} series={[{ word: "вес", color: "var(--d-moon)", vals: wv }]} />
            : <p className="g-faint">Замеров пока {weights.length}. График появится со второго — взвешивайся раз в неделю, чаще смысла нет.</p>}
      </Block>
      <Block title="Сила" right="отжимания · подтягивания за подход">
        {reps.length >= 2
            ? <><Lines wide height={150} lo={0} hi={rhi} titles={reps.map((m) => shortDate(m.date))} series={[{ word: "отжимания", color: "var(--d-sun)", vals: reps.map((m) => m.pushups) }, { word: "подтягивания", color: "var(--d-sage)", vals: reps.map((m) => m.pullups) }]} /><LineKey items={[{ word: "отжимания", color: "var(--d-sun)" }, { word: "подтягивания", color: "var(--d-sage)" }]} /></>
            : <p className="g-faint">Записей пока {reps.length}. График появится со второй.</p>}
      </Block>
    </div>
  );
}

/**
 * Chronic conditions, the doctor who is overdue, and what the body has been saying. Rebuilt 2026-11-21: the chronic
 * ones as marks on top, plans and symptoms side by side, each with its own line to add.
 */
export function MedicalSection() {
  const v = useVault();
  const { life, saveText, reload } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sym, setSym] = useState({ what: "", note: "" });
  const [plan, setPlan] = useState({ doctor: "", by: "", why: "" });
  const today = todayStr();
  const raw = life?.health ?? null;
  const card = useMemo(() => (raw ? parseHealth(raw) : null), [raw]);
  const ref = useMemo(() => v.pages.find((p) => p.file === PANCREAS_PAGE), [v]);
  if (!card || !raw) return <div className="g-play"><Block title="Медицина"><p className="g-faint">Файла здоровья ещё нет.</p></Block></div>;

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

  const visits = [...card.visits].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="g-play">
      {(card.chronic.length > 0 || ref) && (
        <div className="g-chronic">
          {card.chronic.map((c) => <span key={c}>{c}</span>)}
          {ref && <Link to={pageUrl(ref)}>что можно и что нельзя →</Link>}
        </div>
      )}
      <div className="g-two">
        <Block title="Планы" right={`${card.plans.length || "нет"} · «был» переносит в визиты`}>
          {card.plans.map((p, i) => {
            const d = daysUntil(p.by, today);
            const late = d !== undefined && d < 0;
            return (
              <div key={`${p.doctor}${i}`} className={`g-mrow${late ? " late" : ""}`}>
                <div>
                  <b>{p.doctor}</b>
                  <em>{late ? `просрочено на ${-d!} дн.` : d === undefined ? p.by || "без даты" : `осталось ${d} дн.`}</em>
                  {p.why && <p>{p.why}</p>}
                </div>
                <button type="button" className="g-btn" disabled={busy} onClick={() => closePlan(i)}>был</button>
              </div>
            );
          })}
          {!card.plans.length && <p className="g-faint">Ничего не запланировано.</p>}
          <form className="g-addrow" onSubmit={(e) => { e.preventDefault(); addPlan(); }}>
            <input className="text" placeholder="врач" autoCorrect="off" spellCheck={false} value={plan.doctor} onChange={(e) => setPlan({ ...plan, doctor: e.target.value })} />
            <input className="text" placeholder="к дате ГГГГ-ММ-ДД" autoCorrect="off" spellCheck={false} value={plan.by} onChange={(e) => setPlan({ ...plan, by: e.target.value })} />
            <input className="text" placeholder="зачем" autoCorrect="off" spellCheck={false} value={plan.why} onChange={(e) => setPlan({ ...plan, why: e.target.value })} />
            <button type="submit" disabled={busy || !plan.doctor.trim()}>Запланировать</button>
          </form>
        </Block>

        <Block title="Симптомы" right={`последние 5 из ${card.symptoms.length}`}>
          {card.symptoms.slice(0, 5).map((s, i) => (
            <div key={`${s.date}${i}`} className="g-mrow">
              <div>
                <b>{s.what}</b>
                <em>{s.date}{s.where ? ` · ${s.where}` : ""}</em>
                {s.note && <p>{s.note}</p>}
              </div>
            </div>
          ))}
          {!card.symptoms.length && <p className="g-faint">Симптомов не записано.</p>}
          <form className="g-addrow" onSubmit={(e) => { e.preventDefault(); addSymptom(); }}>
            <input className="text" placeholder="что беспокоит" autoCorrect="off" spellCheck={false} value={sym.what} onChange={(e) => setSym({ ...sym, what: e.target.value })} />
            <input className="text" placeholder="заметка" autoCorrect="off" spellCheck={false} value={sym.note} onChange={(e) => setSym({ ...sym, note: e.target.value })} />
            <button type="submit" disabled={busy || !sym.what.trim()}>Записать</button>
          </form>
        </Block>
      </div>

      <Block title="Визиты" right={`${visits.length} записано`}>
        {visits.slice(0, 6).map((x, i) => (
          <div key={`${x.date}${i}`} className="g-mrow">
            <div><b>{x.doctor}</b><em>{x.date}</em>{(x.result || x.why) && <p>{x.result || x.why}</p>}</div>
          </div>
        ))}
        {!visits.length && <p className="g-faint">Визитов не записано.</p>}
        <Err text={err} />
      </Block>
    </div>
  );
}
