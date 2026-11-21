import { useMemo, useState } from "react";
import { BANNER, THEME_ART } from "../../assets/play";
import { Block, SceneFrame, SceneNumber, SceneTitle, SideCard } from "./Scene";
import { useSearchParams } from "react-router-dom";
import { BANK_THEME_ORDER, ROMAN, closeHeading, findItem, loadBank, moneyLeft, progress, type BankFile, type BankItem } from "../../lib/bank";
import { fmt, plainLinks } from "../../lib/dashboard";
import type { Life } from "../../lib/life";
import { themeColor, themeRu } from "../../lib/themes";
import { useStore } from "../../store";
import { Card, Status, short } from "./parts";

/** The day files' task lines, so a bank task ticked in a day counts. */
export function dayTaskLines(life: Life): string[] {
  const out: string[] = [];
  for (const d of life.days.values()) for (const t of d.tasks) if (t.done) out.push(`- [x] ${t.text}`);
  return out;
}

export function useBank(life: Life): BankFile[] {
  return useMemo(() => loadBank(life.goals, dayTaskLines(life)), [life]);
}

const order = (f: BankFile) => { const i = BANK_THEME_ORDER.indexOf(f.goals[0]?.id[0] ?? ""); return i < 0 ? 99 : i; };

/**
 * «Уровни» (2026-11-08): the pyramid of the task bank in place of month
 * and year goals. I → II → III → IV, each with its progress on the direct
 * children; a heading closes only at 100 %. The card beside the tree: what is
 * needed and how much money.
 */
export default function Levels({ life, today }: { life: Life; today: string }) {
  const files = useBank(life);
  const sorted = useMemo(() => [...files].sort((a, b) => order(a) - order(b)), [files]);
  const [params, setParams] = useSearchParams();
  const all = sorted.flatMap((f) => f.goals);
  const picked = params.get("id");
  const sel = (picked && findItem(sorted, picked)) || all[0];
  const pick = (id: string) => setParams({ tab: "levels", id }, { replace: true });
  const counts = useMemo(() => {
    // headings by level (I, II, III) and tasks apart, whatever level they hang at
    const c: Record<"1" | "2" | "3" | "task", [number, number]> = { 1: [0, 0], 2: [0, 0], 3: [0, 0], task: [0, 0] };
    const walk = (x: BankItem) => { const k = x.task ? "task" : (String(x.level) as "1" | "2" | "3"); c[k][1]++; if (x.done) c[k][0]++; x.children.forEach(walk); };
    all.forEach(walk);
    return c;
  }, [all]);
  if (!sorted.length) return <Card title="Уровни"><p className="d-faint">Банка заданий нет: файлы `life/goals/Банк/*.md` пишет Claude.</p></Card>;
  // one theme at a time: the one the selection stands in
  const selFile = sorted.find((f) => f.goals.some((g) => !!sel && (sel.id === g.id || sel.id.startsWith(g.id + ".")))) ?? sorted[0];
  const tasksOf = (f: BankFile) => { let done = 0, total = 0; const walk = (x: BankItem) => { if (x.task) { total++; if (x.done) done++; } x.children.forEach(walk); }; f.goals.forEach(walk); return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }; };
  const all4 = counts.task[1] ? Math.round((counts.task[0] / counts.task[1]) * 100) : 0;
  const rows: [string, string, [number, number]][] = [["I", "цели", counts[1]], ["II", "достижения", counts[2]], ["III", "результаты", counts[3]], ["IV", "задания", counts.task]];
  return (
    <div className="g-play">
      <div className="g-top">
        <SceneFrame art={BANNER.levels} svg={<Steps rows={rows} />}>
          <SceneTitle kicker="уровни · банк заданий" title="Уровни" />
          <SceneNumber value={all4} unit="%" label="заданий сделано" sub={`${counts.task[0]} из ${counts.task[1]} · по всем темам`} />
        </SceneFrame>
        <SideCard kicker="как это работает">
          <p className="g-rule">Каждую неделю берёшь из IV уровня до пяти заданий. Закрыл три — добираешь до пяти. III, II и I закрываются только на 100 %.</p>
          <div className="g-steps">
            {rows.map(([roman, name, [done, total]]) => (
              <div key={roman}><b>{roman}</b><span>{name}</span><i><u style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></i><em>{done} / {total}</em></div>
            ))}
          </div>
        </SideCard>
      </div>

      <div className="g-themes">
        {sorted.map((f) => {
          const t = tasksOf(f);
          return (
            <button key={f.rel} className={f === selFile ? "on" : ""} aria-pressed={f === selFile} style={{ ["--c" as string]: themeColor(f.theme) }} onClick={() => f.goals[0] && pick(f.goals[0].id)}>
              {f.theme && THEME_ART[f.theme] && <img src={THEME_ART[f.theme]} alt="" />}
              <b>{themeRu(f.theme)}</b>
              <i><u style={{ width: `${t.pct}%` }} /></i>
              <span>{t.done} / {t.total} заданий · {f.goals.length} {f.goals.length === 1 ? "цель" : "целей"}</span>
            </button>
          );
        })}
      </div>

      <div className="l-cols">
        <Block title={<><span className="g-dot" style={{ background: themeColor(selFile.theme) }} />{themeRu(selFile.theme)}</>} right={selFile.goals.map((g) => g.id).join(" · ")}>
          {selFile.goals.map((g) => <Branch key={g.id} it={g} sel={sel?.id} pick={pick} open={sel ? sel.id === g.id || sel.id.startsWith(g.id + ".") : false} />)}
        </Block>
        <div className="l-side">{sel && <ItemCard it={sel} today={today} pick={pick} />}</div>
      </div>
    </div>
  );
}

/** The four steps of the painted mountain, each with its level: IV at the foot, I in the cloud. */
const STEP_AT: [number, number][] = [[1110, 175], [960, 265], [795, 360], [540, 453]];
function Steps({ rows }: { rows: [string, string, [number, number]][] }) {
  return (
    <g className="g-stepmarks">
      {rows.map(([roman, name, [done, total]], i) => {
        const [x, y] = STEP_AT[i];
        return (
          <g key={roman} transform={`translate(${x} ${y})`} className={total > 0 && done === total ? "full" : ""}>
            <rect x="-96" y="-30" width="192" height="60" rx="30" />
            <text className="r" x="-66" y="9" textAnchor="middle">{roman}</text>
            <text className="n" x="18" y="-2" textAnchor="middle">{done} / {total}</text>
            <text className="l" x="18" y="18" textAnchor="middle">{name}</text>
          </g>
        );
      })}
    </g>
  );
}

function Bar({ pct, done }: { pct: number; done: boolean }) {
  return <span className="l-bar"><span style={{ width: `${pct}%` }} className={done ? "done" : pct === 100 ? "full" : ""} /></span>;
}

/** One heading and, when it is on the way to the selection, its children. */
function Branch({ it, sel, pick, open }: { it: BankItem; sel: string | undefined; pick: (id: string) => void; open: boolean }) {
  const p = progress(it);
  const onPath = (c: BankItem) => !!sel && (sel === c.id || sel.startsWith(c.id + "."));
  return (
    <div className={`l-branch l${it.level}`}>
      <button className={`l-row${sel === it.id ? " on" : ""}${it.done ? " closed" : ""}`} onClick={() => pick(it.id)}>
        <span className="l-id">{it.id}</span>
        <span className="l-t">{it.title}</span>
        <Bar pct={it.done ? 100 : p.pct} done={it.done} />
        <span className="l-n">{it.done ? "✓" : `${p.done}/${p.total}`}</span>
      </button>
      {open && it.children.length > 0 && (
        <div className="l-kids">
          {it.children.map((c) => c.task
            ? <button key={c.id} className={`l-task${c.done ? " done" : ""}${sel === c.id ? " on" : ""}`} onClick={() => pick(c.id)}>
                <span className="l-id">{c.id}</span><span className="l-t">{plainLinks(c.title)}</span>{c.money && <span className="l-m">{c.money}</span>}
              </button>
            : <Branch key={c.id} it={c} sel={sel} pick={pick} open={onPath(c) || it.level >= 2} />)}
        </div>
      )}
    </div>
  );
}

/** The card of one item: what is needed, money, predecessors, the facts, its progress and, for a heading at 100 %, «Закрыть». */
function ItemCard({ it, today, pick }: { it: BankItem; today: string; pick: (id: string) => void }) {
  const { saveText, life } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const p = progress(it);
  const m = moneyLeft(it);
  const parentId = it.id.split(".").slice(0, -1).join(".");
  const close = async () => {
    const key = it.rel.replace(/^life\/goals\//, "").replace(/\.md$/, "");
    const content = life?.goals.get(key);
    if (!content || !p.canClose) return;
    setBusy(true); setErr(undefined);
    try { await saveText(it.rel, closeHeading(content, it.id, today)); }
    catch (e) { setErr(String(e)); }
    finally { setBusy(false); }
  };
  return (
    <Card title={<>уровень {ROMAN[it.level]} · {it.id}</>} right={parentId ? <button className="l-up" onClick={() => pick(parentId)}>↑ {parentId}</button> : undefined} className="l-card">
      <h3 className="l-title">{plainLinks(it.title)}</h3>
      <dl className="l-kv">
        <dt>Нужно</dt><dd className={it.need ? "" : "d-faint"}>{it.need ? plainLinks(it.need) : "не записано"}</dd>
        <dt>Деньги</dt><dd className={it.money ? "" : "d-faint"}>{it.money ?? "не записано"}</dd>
        {!it.task && m.count > 0 && <><dt>В заданиях</dt><dd>{m.estimated ? "~" : ""}{fmt(m.sum)} ₸ <span className="d-faint">· открытых с суммой: {m.count}{m.estimated ? ", есть оценки" : ""}</span></dd></>}
        {it.after && it.after !== "—" && <><dt>После</dt><dd>{it.after}</dd></>}
      </dl>
      {it.notes.length > 0 && <div className="l-notes">{it.notes.map((n, i) => <p key={i}>{plainLinks(n.replace(/^\*(.*)\*$/, "$1"))}</p>)}</div>}
      {it.task ? (
        <div className="l-foot">
          {it.done ? <Status tone="sage">сделано</Status> : <Status tone="smoke">открыто</Status>}
          <span className="d-faint">Отмечается в задачах недели или дня: «сделал {it.id}».</span>
        </div>
      ) : (
        <>
          <div className="l-prog"><Bar pct={it.done ? 100 : p.pct} done={it.done} /><b>{it.done ? "100" : p.pct} %</b><span className="d-faint">{p.done} из {p.total} {it.level === 3 ? "заданий" : "частей"} · задач всего {p.tasksDone}/{p.tasksTotal}</span></div>
          <div className="l-foot">
            {it.done ? <Status tone="sage">закрыто {it.doneOn ? short(it.doneOn) : ""}</Status>
              : <button className="l-close" disabled={!p.canClose || busy} onClick={close} title={p.canClose ? "" : "Закрыть можно, когда всё внутри сделано"}>{busy ? "Закрываю…" : "Закрыть ✓"}</button>}
            {!it.done && !p.canClose && <span className="d-faint">закрыть можно на 100 %</span>}
            {err && <span className="d-warn">{err}</span>}
          </div>
        </>
      )}
    </Card>
  );
}
