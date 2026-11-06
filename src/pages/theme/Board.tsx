import { Link } from "react-router-dom";
import { STAGES, type BoardCard, type Stage } from "../../lib/themeBoard";
import { shortDate } from "../../lib/themeNumbers";
import { Status } from "./parts";

const TONE: Record<Stage, "sage" | "honey" | "ember"> = { "идёт": "sage", "ждёт": "honey", "стоит": "ember" };
const LANE: Record<Stage, string> = { "идёт": "Идёт", "ждёт": "Ждёт", "стоит": "Стоит" };

/** One of the four lists; a long line is cut to four lines, the whole of it (with the owner or date the cut may take) in the tooltip. */
function List({ kind, label, items }: { kind: "doing" | "not" | "done" | "open"; label: string; items: { text: string; small?: string }[] }) {
  return (
    <div className={`t-s4 t-s4-${kind}`}>
      <span className="t-s4-l">{label}</span>
      <ul>{items.length ? items.map((x, i) => <li key={i} title={x.small ? `${x.text} ${x.small}` : x.text}>{x.text}{x.small && <small> {x.small}</small>}</li>) : <li className="t-s4-none">—</li>}</ul>
    </div>
  );
}

/** «(2026-11-05)» at the end of his words about the stage becomes a pale date. */
function Note({ text }: { text: string }) {
  const m = text.match(/^(.*?)\s*\((\d{4}-\d{2}-\d{2})\)\s*$/);
  return <p className="t-proj-his" title={text}>«{m ? m[1] : text}»{m && <small> · {shortDate(m[2])}</small>}</p>;
}

function Card({ c }: { c: BoardCard }) {
  const q = c.view.quest;
  const pct = c.steps.total ? Math.round((c.steps.done / c.steps.total) * 100) : 0;
  return (
    <Link className="t-proj" to={`/quest/${encodeURIComponent(q.rel)}`}>
      <header><b>{q.project ?? q.title}</b><Status tone={TONE[c.stage]}>{c.stage}</Status></header>
      {q.project && <p className="t-proj-title">{q.title}</p>}
      {c.what && <p className="t-proj-what">{c.what}</p>}
      {c.note && <Note text={c.note} />}
      <div className="t-pbar">{c.steps.total ? <><span><i style={{ width: `${pct}%` }} /></span>{c.steps.done} из {c.steps.total} шагов</> : "шагов нет"}</div>
      <div className="t-steps4">
        <List kind="doing" label="Делаю" items={c.doing.map((text) => ({ text }))} />
        <List kind="not" label="Не делаю" items={c.notDoing.map((text) => ({ text }))} />
        <List kind="done" label="Сделано" items={c.done.map((d) => ({ text: d.text, small: d.on && shortDate(d.on) }))} />
        <List kind="open" label="Не сделано" items={c.open.map((o) => ({ text: o.text, small: o.who && `— ${o.who}` }))} />
      </div>
    </Link>
  );
}

/** The board «идёт · ждёт · стоит» (spec v4 «Деятельности»): a lane without cards is not drawn; no activities, no board. */
export default function Board({ cards }: { cards: BoardCard[] }) {
  if (!cards.length) return null;
  const lanes = STAGES.map((stage) => ({ stage, cards: cards.filter((c) => c.stage === stage) })).filter((l) => l.cards.length);
  return (
    <>
      <div className="t-rule"><span className="t-label">Деятельности</span></div>
      <div className="t-board">
        {lanes.map((l) => (
          <div key={l.stage} className="t-lane">
            <div className="t-lane-h"><i className={`t-dot t-dot-${TONE[l.stage]}`} /><b>{LANE[l.stage]}</b><span className="t-lane-n">{l.cards.length}</span></div>
            {l.cards.map((c) => <Card key={c.view.quest.rel} c={c} />)}
          </div>
        ))}
      </div>
    </>
  );
}
