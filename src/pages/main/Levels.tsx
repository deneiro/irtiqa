import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BANK_THEME_ORDER, ROMAN, closeHeading, findItem, loadBank, moneyLeft, progress, type BankFile, type BankItem } from "../../lib/bank";
import { fmt, plainLinks } from "../../lib/dashboard";
import type { Life } from "../../lib/life";
import { themeColor, themeRu } from "../../lib/themes";
import { useStore } from "../../store";
import { Card, Glance, Hero, Status, short } from "./parts";

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
  return (
    <>
      <Hero top kicker="уровни · банк заданий" title="Уровни" side={<div className="l-rule">
        <div className="d-kick">как это работает</div>
        <p>Каждую неделю берёшь из IV уровня до пяти заданий. Закрыл три — добираешь до пяти. III, II и I закрываются только на 100 %.</p>
      </div>}>
        <Glance items={[
          { v: counts[1][0], of: `/ ${counts[1][1]}`, label: "целей I" },
          { v: counts[2][0], of: `/ ${counts[2][1]}`, label: "достижений II" },
          { v: counts.task[0], of: `/ ${counts.task[1]}`, label: "заданий сделано" },
          { v: counts[3][0], of: `/ ${counts[3][1]}`, label: "результатов III" },
        ]} />
      </Hero>
      <div className="l-cols">
        <div className="d-stack">
          {sorted.map((f) => (
            <Card key={f.rel} title={<><span className="d-dot" style={{ background: themeColor(f.theme) }} />{themeRu(f.theme)}</>} right={f.goals.map((g) => g.id).join(" · ")}>
              {f.goals.map((g) => <Branch key={g.id} it={g} sel={sel?.id} pick={pick} open={sel ? sel.id === g.id || sel.id.startsWith(g.id + ".") : false} />)}
            </Card>
          ))}
        </div>
        <div className="l-side">{sel && <ItemCard it={sel} today={today} pick={pick} />}</div>
      </div>
    </>
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
