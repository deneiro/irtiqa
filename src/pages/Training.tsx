import { useMemo, useState, type ReactNode } from "react";
import { BANNER } from "../assets/play";
import { Block, SceneFrame, SceneNumber, SceneTitle, SideCard } from "./main/Scene";
import { trainingFor } from "../lib/training";
import GameAside from "../components/GameAside";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../store";
import { todayStr } from "../lib/dates";
import {
  TRAINING_JSON, dayOf, framesOf, hitDay, hitExercise, inProgram, mirror, setsNow, useTraining, points, programWeek,
  type Exercise, type Hit, type Nutrition, type Part, type TrainingData,
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
  const { root, vault } = useStore();
  const today = todayStr();
  const t = useMemo(() => (vault ? trainingFor(vault, today) : undefined), [vault, today]);
  return (
    <div className="tr g-page">
      <div className="g-play g-theme" style={{ ["--th" as string]: "#45B6C6" }}>
        <div className="g-top">
          <SceneFrame art={BANNER.training}>
            <SceneTitle kicker="тренировки · программа, мышцы, упражнения" title="Тренировки" />
            <div className="g-xp8"><span>красным — главная мышца, оранжевым — та, что помогает</span><span>вкладки ниже: программа · мышцы · упражнения</span></div>
            <SceneNumber value={t ? (t.kind || "тренировка") : "отдых"} label="сегодня" sub={t?.what || (t ? "по плану тренировок" : "в плане на сегодня ничего")} />
          </SceneFrame>
          <SideCard kicker="сегодня по плану">
            {t ? (
              <>
                <div className="g-q">{t.what || t.kind}</div>
                {t.exercises.length > 0 ? <ul className="g-plain">{t.exercises.map((x, k) => <li key={k}>{x}</li>)}</ul> : <p className="g-faint">Упражнения дня — во вкладке «Программа».</p>}
              </>
            ) : <p className="g-rule">Сегодня без тренировки.</p>}
            <GameAside theme="Health & sport" />
          </SideCard>
        </div>
      </div>
      <TrainingAtlas root={root} />
    </div>
  );
}

/** The atlas with its loading and missing-file states; the theme screen embeds it too. */
export function TrainingAtlas({ root }: { root: string }) {
  const { data, err } = useTraining(root);
  if (err) return <div className="tr tr-embed"><p className="tr-note">Не нашёл данные: {err}. Их собирает <code>node {TRAINING_JSON.replace("training.json", "build.mjs")}</code> в vault.</p></div>;
  if (!data) return <div className="tr tr-embed"><p className="tr-note">Загружаю…</p></div>;
  return <div className="tr tr-embed"><Atlas d={data} root={root} /></div>;
}

/**
 * The atlas (rebuilt 2026-11-21 the way «Сегодня» is): the week of the program as seven tiles, the body on the left —
 * red the main muscle, orange the one that helps — and on the right one of three views: the picked day as exercise
 * cards, a muscle with what trains it, an exercise with its animation and cues. The state lives in the URL.
 */
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

  const P = d.PROGRAM;
  const wk = programWeek(P, today);
  const dow = (new Date(`${today}T12:00:00`).getDay() + 6) % 7;
  const day = P.days.find((x) => x.k === dayK)!;
  const [hit, caption]: [Hit, string] =
    tab === "m" ? [{ [muscle]: "p" }, mu[muscle].name]
    : tab === "e" ? [hitExercise(ex[exId]), ex[exId].name]
    : [hitDay(day, ex), day.name];

  const tags = (id: string) => (
    <>
      {(prog[id] ?? []).map((x) => <em key={x.k} className="prog">Д{x.k}</em>)}
      {ex[id].later && <em className="later">позже</em>}
    </>
  );
  const row = (e: Exercise, color: string) => (
    <button key={e.id} type="button" className="g-exrow" onClick={() => go({ tab: "e", ex: e.id })}>
      <i style={{ background: color }} /><span>{e.name}{tags(e.id)}</span><small>{eqName[e.eq]}</small>
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
        <Block title="Мышцы" right="нажми на тело слева или на название">
          {groups.map((g) => (
            <div key={g} className="g-mgroup"><span>{g}</span><div className="g-chips wrap">{d.MUSCLES.filter((x) => x.group === g).map((x) => <button key={x.id} type="button" className={x.id === m.id ? "on" : ""} aria-pressed={x.id === m.id} onClick={() => go({ m: x.id })}>{x.name}</button>)}</div></div>
          ))}
        </Block>
        <Block title={m.name} right={m.lat}>
          <p className="g-lead">{m.does}</p>
          <p className="g-cap">{m.how}</p>
          <h3 className="g-h3"><i style={{ background: "var(--tr-p)" }} />Качает главным образом · {main.length}</h3>
          {main.length ? main.map((e) => row(e, "var(--tr-p)")) : <p className="g-faint">Нет упражнений.</p>}
          {help.length > 0 && <><h3 className="g-h3"><i style={{ background: "var(--tr-s)" }} />Помогает · {help.length}</h3>{help.map((e) => row(e, "var(--tr-s)"))}</>}
        </Block>
      </>
    );
  } else if (tab === "e") {
    const e = ex[exId];
    const list = d.EX.filter((x) => (eq === "all" || x.eq === eq) && (!progOnly || prog[x.id]));
    const use = (prog[e.id] ?? []).map((x) => `день ${x.k}: ${x.sets} × ${x.reps}`).join(" · ");
    view = (
      <>
        <Block title={e.name} right={<>{eqName[e.eq]}{tags(e.id)}</>}>
          <div className="g-exdetail">
            {anim(e.id)}
            <div>
              <div className="g-chips wrap">
                {e.p.map((id) => <button key={id} type="button" onClick={() => go({ tab: "m", m: id })}><i className="g-dot" style={{ background: "var(--tr-p)" }} />{mu[id].name}</button>)}
                {e.s.map((id) => <button key={id} type="button" onClick={() => go({ tab: "m", m: id })}><i className="g-dot" style={{ background: "var(--tr-s)" }} />{mu[id].name}</button>)}
              </div>
              <h3 className="g-h3">Как делать</h3>
              <ol className="g-cues">{e.cues.map((c, k) => <li key={k}>{c}</li>)}</ol>
              {use && <p className="g-cap">В программе — {use}.</p>}
              {e.later && <p className="g-cap">Не в первые две недели.</p>}
            </div>
          </div>
        </Block>
        <Block title={`Все упражнения · ${list.length}`} right="красная точка — выбранное">
          <div className="g-chips wrap">
            <button type="button" className={eq === "all" ? "on" : ""} aria-pressed={eq === "all"} onClick={() => setEq("all")}>всё · {d.EX.length}</button>
            {d.EQUIP.map((x) => <button key={x.id} type="button" className={eq === x.id ? "on" : ""} aria-pressed={eq === x.id} onClick={() => setEq(x.id)}>{x.name}</button>)}
            <button type="button" className={progOnly ? "on" : ""} aria-pressed={progOnly} onClick={() => setProgOnly(!progOnly)}>только программа</button>
          </div>
          {d.EQUIP.map((x) => [x, list.filter((y) => y.eq === x.id)] as const).filter(([, l]) => l.length).map(([x, l]) => (
            <div key={x.id} className="g-mgroup col"><span>{x.name}{x.note ? ` · ${x.note}` : ""}</span>{l.map((y) => row(y, y.id === e.id ? "var(--tr-p)" : "var(--tr-muscle)"))}</div>
          ))}
        </Block>
      </>
    );
  } else {
    view = (
      <>
        <Block title={day.name} right={day.focus}>
          <div className="g-excards">
            {day.items.map(([id, sets, reps]) => (
              <button key={id} type="button" className="g-excard" onClick={() => go({ tab: "e", ex: id })}>
                {anim(id, true)}
                <span><b>{ex[id]?.name ?? id}</b><small>{setsNow(sets, wk)} × {reps}{wk && wk <= 2 && setsNow(sets, wk) !== sets ? ` · с 3-й недели ${sets}` : ""}</small></span>
              </button>
            ))}
          </div>
        </Block>
        {P.ladders && P.ladders.length > 0 && (
          <Block title="Лестницы силы" right="ступень за ступенью">
            <div className="g-ladders">{P.ladders.map((l) => <div key={l.name}><h3 className="g-h3">{l.name}</h3><ol className="g-cues">{l.steps.map((x, k) => <li key={k}>{x}</li>)}</ol></div>)}</div>
          </Block>
        )}
        <Block title="Правила программы" right="и почему так">
          <ul className="g-plain">{P.rules.map((r, k) => <li key={k}>{r}</li>)}</ul>
          <h3 className="g-h3">Почему так</h3><ul className="g-plain">{P.research.map((r, k) => <li key={k}>{r}</li>)}</ul>
          <h3 className="g-h3">Замеры</h3><p className="g-cap">{P.track}</p>
        </Block>
      </>
    );
  }

  return (
    <div className="g-play g-atlas">
      <Block title={`Неделя программы${wk ? ` · ${wk}-я` : ""}`} right={todayDay ? `сегодня ${todayDay.name.toLowerCase()}` : "сегодня без силовой"}>
        <div className="g-trweek">
          {P.week.map(([wd, v], k) => {
            const w = P.days.find((x) => x.k === v);
            const cls = `${k === dow ? "today" : ""}${w ? " w" : ""}${w && w.k === dayK && tab === "p" ? " on" : ""}`;
            return w
              ? <button key={wd} type="button" className={cls} onClick={() => go({ tab: "p", day: w.k })}><b>{wd}</b><span>{w.name}</span><small>{w.items.length} упр.</small></button>
              : <div key={wd} className={cls}><b>{wd}</b><span>{v}</span></div>;
          })}
        </div>
        <p className="g-cap">{P.goal}</p>
      </Block>
      <div className="g-atlas-grid">
        <aside className="g-body" aria-label="Тело">
          <div className="g-chips" role="tablist">{TABS.map(([k, t]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => go({ tab: k })}>{t}</button>)}</div>
          <Body d={d} hit={hit} names={mu} onPick={(id) => go({ tab: "m", m: id })} />
          <div className="cap"><b>{caption}</b><span><i style={{ background: "var(--tr-p)" }} />главная</span><span><i style={{ background: "var(--tr-s)" }} />помогает</span></div>
        </aside>
        <div className="g-stack">{view}</div>
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

/** The nutrition plan: the day's numbers, four meals, what to eat and what carefully, the rules, what to ask the doctor. */
export function NutritionPlan({ n, compact = false }: { n: Nutrition; compact?: boolean }) {
  return (
    <div className="tr tr-embed">
      <article className="tr-card">
        <p>{n.goal}</p>
        <div className="tr-targets">
          {n.targets.map((t) => <div key={t.k} className="tr-target"><span>{t.k}</span><b>{t.v}</b><small>{t.note}</small></div>)}
        </div>
      </article>
      <article className="tr-card">
        <h3>Четыре приёма</h3>
        <table className="tr-table"><tbody>
          {n.meals.map((m) => <tr key={m.t}><td className="tr-when">{m.when}</td><td><b>{m.t}</b> — {m.what}<div className="tr-reps">{m.protein}</div></td></tr>)}
        </tbody></table>
      </article>
      {!compact && (
        <>
          <div className="tr-two">
            <article className="tr-card"><h3>Есть</h3><div className="tr-chips">{n.yes.map((x) => <span key={x} className="tr-pill ok">{x}</span>)}</div></article>
            <article className="tr-card"><h3>Осторожно</h3><div className="tr-chips">{n.careful.map((x) => <span key={x} className="tr-pill warn">{x}</span>)}</div></article>
          </div>
          <article className="tr-card">
            <h3>Правила</h3><ul className="tr-rules">{n.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
            <h3>Спросить врача</h3><ul className="tr-rules">{n.doctor.map((r, i) => <li key={i}>{r}</li>)}</ul>
            <h3>Почему так</h3><ul className="tr-rules">{n.research.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </article>
        </>
      )}
    </div>
  );
}
