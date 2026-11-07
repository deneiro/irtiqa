import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { progress, type BankFile, type BankItem } from "../../lib/bank";
import { newWeekFile } from "../../lib/carry";
import { isoWeekKey, monthKey } from "../../lib/goals";
import { plainLinks } from "../../lib/dashboard";
import type { Life } from "../../lib/life";
import { MONTH_MAX, WEEK_MAX, appendTasks, bankResults, monthPicks, newMonthFile, pickLine, removePick, weekCandidates, weekPicks, weekSpan, type Pick } from "../../lib/picks";
import { themeColor, themeRu } from "../../lib/themes";
import { useStore } from "../../store";
import { TaskLine } from "./parts";

type Mode = "month" | "week";

/** Write into the month or week file (made when missing), or take an open pick back out. */
function usePickWriter(life: Life, today: string, mode: Mode) {
  const { saveText } = useStore();
  const key = mode === "month" ? monthKey(today) : isoWeekKey(today);
  const rel = `life/goals/${key}.md`;
  const current = () => life.goals.get(key) ?? (mode === "month" ? newMonthFile(key) : newWeekFile(key, ...weekSpan(today)));
  return {
    rel,
    add: (it: BankItem) => saveText(rel, appendTasks(current(), [pickLine(it)])),
    remove: (id: string) => { const c = life.goals.get(key); return c ? saveText(rel, removePick(c, id)) : Promise.resolve(); },
  };
}

/** The slots of a card: the picks, a ✕ on each open one, and «+ выбрать» for every free place. */
export function PickSlots({ life, today, bank, mode }: { life: Life; today: string; bank: BankFile[]; mode: Mode }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string>();
  const w = usePickWriter(life, today, mode);
  const month = monthPicks(life, bank, today);
  const picks: Pick[] = mode === "month" ? month : weekPicks(life, bank, today);
  const max = mode === "month" ? MONTH_MAX : WEEK_MAX;
  const openN = picks.filter((p) => !p.done).length;
  const free = Math.max(0, max - openN);
  const blocked = mode === "week" && !month.some((p) => !p.done);
  const drop = (id: string) => w.remove(id).catch((e) => setErr(String(e)));
  return (
    <div className="l-slots">
      {picks.map((p, i) => (
        <div key={i} className={`l-slot${p.done ? " done" : ""}`}>
          {mode === "month" && p.item ? <MonthRow it={p.item} /> : <TaskLine text={p.text} today={today} item={p.item} />}
          {!p.done && p.id && <button className="l-x" title="Убрать из выбора" onClick={() => drop(p.id!)}>×</button>}
        </div>
      ))}
      {Array.from({ length: free }, (_, i) => (
        <button key={`f${i}`} className="l-slot l-free" disabled={blocked} onClick={() => setOpen(true)}>
          + {mode === "month" ? "выбрать цель месяца — уровень III" : "выбрать задание недели — уровень IV"}
        </button>
      ))}
      {blocked && <p className="d-faint">Задания недели берутся из целей месяца — сначала выбери их на «Месяце».</p>}
      {!free && <p className="d-faint">Занято {openN} из {max}. Закроешь одно — освободится место.</p>}
      {err && <p className="d-warn">{err}</p>}
      <PickSheet open={open} onClose={() => setOpen(false)} life={life} today={today} bank={bank} mode={mode} free={free} add={w.add} />
    </div>
  );
}

function MonthRow({ it }: { it: BankItem }) {
  const p = progress(it);
  return (
    <Link className="l-goal" to={`/?tab=levels&id=${it.id}`}>
      <span className="d-dot" style={{ background: themeColor(it.theme) }} />
      <span className="l-id">{it.id}</span>
      <span className="l-t">{plainLinks(it.title)}</span>
      <span className="l-bar"><span style={{ width: `${it.done ? 100 : p.pct}%` }} className={it.done ? "done" : ""} /></span>
      <span className="l-n">{it.done ? "✓" : `${p.done}/${p.total}`}</span>
    </Link>
  );
}

/** The window: for the month every result of the bank, opened to its tasks; for the week the tasks of the month's results. */
function PickSheet({ open, onClose, life, today, bank, mode, free, add }: { open: boolean; onClose: () => void; life: Life; today: string; bank: BankFile[]; mode: Mode; free: number; add: (it: BankItem) => Promise<void> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [sel, setSel] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { setSel(undefined); setErr(undefined); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);
  const month = monthPicks(life, bank, today);
  const picked = new Set((mode === "month" ? month : weekPicks(life, bank, today)).map((p) => p.id));
  const take = async (it: BankItem) => {
    setBusy(true); setErr(undefined);
    try { await add(it); if (free <= 1) onClose(); } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };
  const Card = ({ it }: { it: BankItem }) => (it.need || it.money ? <span className="l-pk-card">{[it.need && `нужно: ${plainLinks(it.need)}`, it.money && `деньги: ${it.money}`].filter(Boolean).join(" · ")}</span> : null);
  return (
    <dialog ref={ref} className="l-sheet" onCancel={(e) => { e.preventDefault(); onClose(); }} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="l-sh-top">
        <span className="d-kick">{mode === "month" ? "Цели месяца · уровень III" : "Задания недели · уровень IV"}</span>
        <span className="d-faint">свободно {free}</span>
        <button className="l-x" aria-label="Закрыть" onClick={onClose}>×</button>
      </div>
      {err && <p className="d-warn">{err}</p>}
      <div className="l-sh-body">
        {mode === "month" ? bankResults(bank).map(({ file, items }) => (
          <section key={file.rel}>
            <h4><span className="d-dot" style={{ background: themeColor(file.theme) }} />{themeRu(file.theme)}</h4>
            {items.map((it) => {
              const p = progress(it), on = sel === it.id, has = picked.has(it.id);
              return (
                <div key={it.id} className={`l-pk${on ? " on" : ""}${it.done ? " done" : ""}`}>
                  <button className="l-pk-row" onClick={() => setSel(on ? undefined : it.id)}>
                    <span className="l-id">{it.id}</span><span className="l-t">{plainLinks(it.title)}</span>
                    <span className="l-n">{it.done ? "✓" : has ? "в месяце" : `${p.done}/${p.total}`}</span>
                  </button>
                  {on && (
                    <div className="l-pk-in">
                      <Card it={it} />
                      <ul>{it.children.filter((c) => c.task).map((c) => <li key={c.id} className={c.done ? "done" : ""}><span className="l-id">{c.id}</span>{plainLinks(c.title)}{c.money && <span className="l-m">{c.money}</span>}</li>)}</ul>
                      <button className="l-close" disabled={busy || has || it.done || free === 0} onClick={() => take(it)}>{has ? "уже в месяце" : free === 0 ? "мест нет" : "Взять на месяц"}</button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )) : weekCandidates(month, weekPicks(life, bank, today)).map(({ result, tasks }) => (
          <section key={result.id}>
            <h4><span className="d-dot" style={{ background: themeColor(result.theme) }} /><span className="l-id">{result.id}</span>{plainLinks(result.title)}</h4>
            {!tasks.length && <p className="d-faint">открытых заданий нет — все взяты или сделаны</p>}
            {tasks.map((t) => (
              <div key={t.id} className="l-pk">
                <div className="l-pk-row">
                  <span className="l-id">{t.id}</span><span className="l-t">{plainLinks(t.title)}<Card it={t} /></span>
                  <button className="l-close" disabled={busy || free === 0} onClick={() => take(t)}>{free === 0 ? "мест нет" : "Взять"}</button>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </dialog>
  );
}
