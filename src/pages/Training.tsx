import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store";
import { todayStr } from "../lib/dates";
import {
  TRAINING_JSON, dayOf, framesOf, hitDay, hitExercise, inProgram, loadTraining, mirror, points, programWeek,
  type Exercise, type Hit, type Part, type TrainingData,
} from "../lib/trainingMap";
import "./Training.css";

type Tab = "m" | "e" | "p";
const TABS: [Tab, string][] = [["p", "Программа"], ["m", "Мышцы"], ["e", "Упражнения"]];

/**
 * «Тренировки» (2026-11-09): the body front and back, the muscle or exercise
 * picked lights up — red the main muscle, orange the one that helps; three tabs:
 * the program with today's day, the muscles, the exercises with their animation.
 * The state lives in the URL (`?tab=e&ex=…`), so the Main screen can link a day.
 */
export default function TrainingPage() {
  const { root } = useStore();
  const [data, setData] = useState<TrainingData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadTraining(root).then((d) => live && setData(d), (e) => live && setErr(String(e?.message ?? e)));
    return () => { live = false; };
  }, [root]);

  if (err) return <div className="tr"><h1>Тренировки</h1><p className="tr-note">Не нашёл данные: {err}. Их собирает <code>node {TRAINING_JSON.replace("training.json", "build.mjs")}</code> в vault.</p></div>;
  if (!data) return <div className="tr"><h1>Тренировки</h1><p className="tr-note">Загружаю…</p></div>;
  return <Atlas d={data} root={root} />;
}

function Atlas({ d, root }: { d: TrainingData; root: string }) {
  const [q, setQ] = useSearchParams();
  const today = todayStr();
  const mu = useMemo(() => Object.fromEntries(d.MUSCLES.map((m) => [m.id, m])), [d]);
  const ex = useMemo(() => Object.fromEntries(d.EX.map((e) => [e.id, e])), [d]);
  const eqName = useMemo(() => Object.fromEntries(d.EQUIP.map((x) => [x.id, x.name])), [d]);
  const prog = useMemo(() => inProgram(d.PROGRAM), [d]);
  const todayDay = dayOf(d.PROGRAM, today);

  const tab = (q.get("tab") as Tab) || "p";
  const muscle = mu[q.get("m") ?? ""] ? q.get("m")! : "chest";
  const exId = ex[q.get("ex") ?? ""] ? q.get("ex")! : d.EX[0].id;
  const dayK = d.PROGRAM.days.find((x) => x.k === q.get("day"))?.k ?? todayDay?.k ?? d.PROGRAM.days[0].k;
  const [eq, setEq] = useState("all");
  const [progOnly, setProgOnly] = useState(false);
  const go = (p: Record<string, string>) => setQ({ tab, m: muscle, ex: exId, day: dayK, ...p }, { replace: true });

  const day = d.PROGRAM.days.find((x) => x.k === dayK)!;
  const [hit, caption]: [Hit, string] =
    tab === "m" ? [{ [muscle]: "p" }, mu[muscle].name]
    : tab === "e" ? [hitExercise(ex[exId]), ex[exId].name]
    : [hitDay(day, ex), day.name];

  const tags = (id: string) => (
    <>
      {(prog[id] ?? []).map((p) => <span key={p.k} className="tr-tag prog">Д{p.k}</span>)}
      {ex[id].later && <span className="tr-tag later">позже</span>}
    </>
  );
  const row = (e: Exercise, color: string) => (
    <button key={e.id} className="tr-row" onClick={() => go({ tab: "e", ex: e.id })}>
      <span className="tr-dot" style={{ background: color }} />
      <span>{e.name}{tags(e.id)}</span>
      <small>{eqName[e.eq]}</small>
    </button>
  );
  const anim = (id: string, small = false) => <Anim root={root} d={d} id={id} small={small} alt={ex[id].name} />;

  let view: ReactNode;
  if (tab === "m") {
    const m = mu[muscle];
    const main = d.EX.filter((e) => e.p.includes(m.id));
    const help = d.EX.filter((e) => e.s.includes(m.id) && !e.p.includes(m.id));
    const groups = [...new Set(d.MUSCLES.map((x) => x.group))];
    view = (
      <>
        <div className="tr-groups">
          {groups.map((g) => (
            <div key={g} className="tr-grp"><span>{g}</span><div className="tr-chips">
              {d.MUSCLES.filter((x) => x.group === g).map((x) => <button key={x.id} className="tr-chip" aria-pressed={x.id === m.id} onClick={() => go({ m: x.id })}>{x.name}</button>)}
            </div></div>
          ))}
        </div>
        <article className="tr-card">
          <h2>{m.name}</h2><div className="tr-lat">{m.lat}</div>
          <p>{m.does}</p>
          <p className="tr-how">{m.how}</p>
          <h3>Качает главным образом · {main.length}</h3>
          <div className="tr-list">{main.length ? main.map((e) => row(e, "var(--tr-p)")) : <p className="tr-note">Нет упражнений.</p>}</div>
          {help.length > 0 && <><h3>Помогает · {help.length}</h3><div className="tr-list">{help.map((e) => row(e, "var(--tr-s)"))}</div></>}
        </article>
      </>
    );
  } else if (tab === "e") {
    const e = ex[exId];
    const list = d.EX.filter((x) => (eq === "all" || x.eq === eq) && (!progOnly || prog[x.id]));
    const use = (prog[e.id] ?? []).map((p) => `день ${p.k}: ${p.sets} × ${p.reps}`).join(" · ");
    view = (
      <>
        <article className="tr-card">
          <h2>{e.name}</h2><div className="tr-lat">{eqName[e.eq]}{tags(e.id)}</div>
          <div className="tr-mchips">
            {e.p.map((id) => <button key={id} className="tr-mchip" onClick={() => go({ tab: "m", m: id })}><i style={{ background: "var(--tr-p)" }} />{mu[id].name}</button>)}
            {e.s.map((id) => <button key={id} className="tr-mchip" onClick={() => go({ tab: "m", m: id })}><i style={{ background: "var(--tr-s)" }} />{mu[id].name}</button>)}
          </div>
          {anim(e.id)}
          <h3>Как делать</h3>
          <ol className="tr-cues">{e.cues.map((c, i) => <li key={i}>{c}</li>)}</ol>
          {use && <p className="tr-note">В программе — {use}.</p>}
          {e.later && <p className="tr-note">Не в первые две недели.</p>}
        </article>
        <div className="tr-chips">
          <button className="tr-chip" aria-pressed={eq === "all"} onClick={() => setEq("all")}>Всё · {d.EX.length}</button>
          {d.EQUIP.map((x) => <button key={x.id} className="tr-chip" aria-pressed={eq === x.id} onClick={() => setEq(x.id)}>{x.name}</button>)}
          <button className="tr-chip" aria-pressed={progOnly} onClick={() => setProgOnly(!progOnly)}>Только программа</button>
        </div>
        <div className="tr-list">
          {d.EQUIP.map((x) => [x, list.filter((y) => y.eq === x.id)] as const).filter(([, l]) => l.length).map(([x, l]) => (
            <div key={x.id}>
              <div className="tr-eqhead">{x.name}{x.note ? ` · ${x.note}` : ""}</div>
              {l.map((y) => row(y, y.id === e.id ? "var(--tr-p)" : "var(--tr-muscle)"))}
            </div>
          ))}
        </div>
      </>
    );
  } else {
    const P = d.PROGRAM;
    const wk = programWeek(P, today);
    const dow = (new Date(`${today}T12:00:00`).getDay() + 6) % 7;
    view = (
      <>
        <article className="tr-card">
          <p>{P.goal}</p>
          <h3>Неделя {wk ?? "—"}{todayDay ? ` · сегодня ${todayDay.name.toLowerCase()}` : ""}</h3>
          <div className="tr-week">
            {P.week.map(([wd, v], i) => {
              const w = P.days.find((x) => x.k === v);
              const cls = `tr-day${i === dow ? " today" : ""}${w ? " w" : ""}${w && w.k === dayK ? " on" : ""}`;
              return w
                ? <button key={wd} className={cls} onClick={() => go({ day: w.k })}><b>{wd}</b><span>{v}</span></button>
                : <div key={wd} className={cls}><b>{wd}</b><span>{v}</span></div>;
            })}
          </div>
        </article>
        <article className="tr-card">
          <h2>{day.name}</h2><div className="tr-lat">{day.focus}</div>
          <table className="tr-table"><tbody>
            {day.items.map(([id, s, r]) => (
              <tr key={id}>
                <td className="t">{anim(id, true)}</td>
                <td><button className="tr-link" onClick={() => go({ tab: "e", ex: id })}>{ex[id]?.name ?? id}</button><div className="tr-reps">{s} × {r}</div></td>
              </tr>
            ))}
          </tbody></table>
        </article>
        <article className="tr-card">
          <h3>Правила</h3><ul className="tr-rules">{P.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
          <h3>Почему так</h3><ul className="tr-rules">{P.research.map((r, i) => <li key={i}>{r}</li>)}</ul>
          <h3>Замеры</h3><p>{P.track}</p>
        </article>
      </>
    );
  }

  return (
    <div className="tr">
      <h1>Тренировки</h1>
      <div className="tr-grid">
        <aside className="tr-map" aria-label="Тело">
          <Body d={d} hit={hit} names={mu} onPick={(id) => go({ tab: "m", m: id })} />
          <div className="tr-cap"><b>{caption}</b><span className="tr-legend"><span><i style={{ background: "var(--tr-p)" }} />главная</span><span><i style={{ background: "var(--tr-s)" }} />помогает</span></span></div>
        </aside>
        <section className="tr-panel">
          <div className="tr-tabs" role="tablist">
            {TABS.map(([k, t]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => go({ tab: k })}>{t}</button>)}
          </div>
          {view}
        </section>
      </div>
    </div>
  );
}

function Body({ d, hit, names, onPick }: { d: TrainingData; hit: Hit; names: Record<string, { name: string }>; onPick: (id: string) => void }) {
  const fill = (id: string | null) => (!id ? "var(--tr-base)" : hit[id] === "p" ? "var(--tr-p)" : hit[id] === "s" ? "var(--tr-s)" : "var(--tr-muscle)");
  const view = (parts: Part[], dx: number, label: string, abs: boolean) => (
    <g transform={`translate(${dx},0)`}>
      {d.BODY.NEUTRAL.map((n, i) => n[0] === "e"
        ? <ellipse key={`n${i}`} cx={n[1]} cy={n[2]} rx={n[3]} ry={n[4]} fill="var(--tr-base)" />
        : <polygon key={`n${i}`} points={points(n[1])} fill="var(--tr-base)" />)}
      {parts.flatMap(([id, p, m], i) => (m ? [p, mirror(p)] : [p]).map((sh, j) => (
        <polygon key={`${i}-${j}`} points={points(sh)} fill={fill(id)} className={id ? "tr-mu" : undefined} onClick={id ? () => onPick(id) : undefined}>
          {id && <title>{names[id]?.name ?? id}</title>}
        </polygon>
      )))}
      {abs && (
        <g stroke="var(--tr-absline)" strokeWidth="1.2" pointerEvents="none">
          <line x1="100" y1="125" x2="100" y2="196" />
          {[143, 162, 180].map((y) => <line key={y} x1="89" y1={y} x2="111" y2={y} />)}
        </g>
      )}
      <text x="100" y="440" textAnchor="middle" className="tr-bl">{label}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 420 452" role="img" aria-label="Карта мышц, спереди и сзади">
      {view(d.BODY.FRONT, 0, "спереди", true)}
      {view(d.BODY.BACK, 220, "сзади", false)}
    </svg>
  );
}

function Anim({ root, d, id, small, alt }: { root: string; d: TrainingData; id: string; small: boolean; alt: string }) {
  const f = framesOf(root, d.ANIM, id);
  const cls = `tr-anim${small ? " sm" : ""}`;
  if (!f) return small ? <span className={`${cls} none`} /> : <p className="tr-note">Анимации для этого упражнения пока нет.</p>;
  if (f.kind === "gif") return <figure className={cls}><img src={f.src} alt={alt} loading="lazy" /></figure>;
  return <figure className={`${cls} two`}><span><img src={f.src[0]} alt={alt} loading="lazy" /><img src={f.src[1]} alt="" loading="lazy" /></span></figure>;
}
