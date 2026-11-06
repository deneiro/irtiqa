import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, useVault } from "../store";
import { todayStr } from "../lib/dates";
import { rawPageText } from "../lib/rawpage";
import { closenessOf } from "../lib/people";
import type { Habit } from "../lib/life";
import type { Page } from "../lib/types";
import { DIRECTION_WORDS, addInfluence, habitLink, type Direction, type InfluenceItem } from "../lib/influence";
import "../pages/person/Person.css";
import "./Influence.css";

/** «+ влияние» of a direction, or «+» on an influence: the same bullet for more people. */
export type InfluenceSheetMode = { kind: "new"; dir: Direction } | { kind: "person"; item: InfluenceItem };

const TONE: Record<Direction, { th: string; tint: string }> = {
  up: { th: "#86C9A4", tint: "rgba(134, 201, 164, 0.15)" },
  down: { th: "#E26A61", tint: "rgba(226, 106, 97, 0.15)" },
};
const fold = (s: string) => s.toLowerCase().replace(/ё/g, "е");

/**
 * The sheet of «Влияние» (audit 2026-11-06): the influence — a phrase or one of his active habits — its direction,
 * the people and a short note; or, from an influence already written, only the people. Saving writes one bullet into
 * each chosen page (`addInfluence`); a page that already has it is left as it is.
 */
export default function InfluenceSheet({ mode, people, habits, onClose }: { mode: InfluenceSheetMode | null; people: Page[]; habits: Habit[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const v = useVault();
  const { saveText, reload } = useStore();
  const [name, setName] = useState("");
  const [habit, setHabit] = useState<Habit | null>(null);
  const [dir, setDir] = useState<Direction>("down");
  const [chosen, setChosen] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (mode && !d.open) {
      setName(""); setHabit(null); setDir(mode.kind === "new" ? mode.dir : mode.item.dir); setChosen([]); setQ(""); setNote(""); setErr(null);
      d.showModal();
      // the dialog stays mounted, so autoFocus would fire once; the field is focused on every opening
      (mode.kind === "new" ? nameRef : searchRef).current?.focus();
    }
    if (!mode && d.open) d.close();
  }, [mode]);

  const item = mode?.kind === "person" ? mode.item : undefined;
  const already = useMemo(() => new Set(item?.people.map((p) => p.page.rel) ?? []), [item]);
  const list = useMemo(() => {
    const t = fold(q.trim());
    return people
      .filter((p) => !already.has(p.rel))
      .filter((p) => !t || [p.title, p.file, ...p.aliases].some((s) => fold(s).includes(t)))
      .sort((a, b) => (closenessOf(b) ?? 0) - (closenessOf(a) ?? 0) || a.title.localeCompare(b.title, "ru"));
  }, [people, already, q]);
  // The habits that match the direction first: bad ones pull down, the others up.
  const own = useMemo(() => habits.filter((h) => h.status === "active")
    .sort((a, b) => Number((a.kind === "bad") !== (dir === "down")) - Number((b.kind === "bad") !== (dir === "down")) || a.title.localeCompare(b.title, "ru")), [habits, dir]);

  const md = item ? item.md : habit ? habitLink(habit) : name.replace(/\s+/g, " ").trim();
  const label = item ? item.label : habit ? habit.title : md;
  const toggle = (rel: string) => setChosen((c) => (c.includes(rel) ? c.filter((x) => x !== rel) : [...c, rel]));

  const save = async () => {
    if (busy || !md || !chosen.length) return;
    setBusy(true);
    let wrote = false;
    try {
      const today = todayStr();
      const edits = chosen.flatMap((rel) => {
        const raw = rawPageText(v, rel);
        if (raw === null) throw new Error("не нашёл страницу человека");
        const content = addInfluence(raw, { dir, md, note: item ? undefined : note }, today);
        return content === raw ? [] : [{ rel, content }];
      });
      if (!edits.length) { setErr("У выбранных это влияние уже записано."); return; }
      for (const e of edits) { await saveText(e.rel, e.content); wrote = true; }
      onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally {
      // a failure half-way still leaves pages written: the screen reads them back either way
      if (wrote) await reload().catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
      setBusy(false);
    }
  };

  const tone = TONE[dir];
  return (
    <dialog ref={ref} className="p-sheet t-inf-sheet" style={{ ["--th" as string]: tone.th, ["--tint" as string]: tone.tint }}
      aria-labelledby="t-inf-h" onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <form className="p-sh" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="p-sh-top">
          <span className="p-label" id="t-inf-h">{item ? "Добавить человека" : "Новое влияние"}</span>
          <button className="p-xb" type="button" aria-label="Закрыть" onClick={onClose}>×</button>
        </div>
        {item ? (
          <div className="p-fld"><span>Влияние</span><b className="t-inf-fixed">{item.label}<small>{DIRECTION_WORDS[item.dir].toLowerCase()}</small></b></div>
        ) : (
          <>
            <div className="p-fld">
              <span>Влияние</span>
              <div className="t-inf-stack">
                <input ref={nameRef} className="p-inp" autoComplete="off" spellCheck={false} placeholder="одной фразой: что даёт или куда тянет"
                  value={name} onChange={(e) => { setName(e.target.value); if (habit && e.target.value !== habit.title) setHabit(null); }} />
                {own.length > 0 && (
                  <div className="t-inf-pick" aria-label="или привычка">
                    {own.map((h) => (
                      <button key={h.rel} type="button" className="p-tg" aria-pressed={habit?.rel === h.rel}
                        onClick={() => { if (habit?.rel === h.rel) { setHabit(null); setName(""); } else { setHabit(h); setName(h.title); } }}>{h.title}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-fld">
              <span>Куда</span>
              <div className="p-chips">
                {(["up", "down"] as const).map((d) => (
                  <button key={d} type="button" className="p-tg" aria-pressed={dir === d} onClick={() => setDir(d)}>{d === "up" ? "↑" : "↓"} {DIRECTION_WORDS[d].toLowerCase()}</button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="p-fld">
          <span>Люди{chosen.length ? ` · ${chosen.length}` : ""}</span>
          <div className="t-inf-stack">
            <input ref={searchRef} className="p-inp" type="search" autoComplete="off" spellCheck={false} placeholder="найти по имени" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="t-inf-pick t-inf-people">
              {list.map((p) => <button key={p.rel} type="button" className="p-tg" aria-pressed={chosen.includes(p.rel)} onClick={() => toggle(p.rel)}>{p.title}</button>)}
              {!list.length && <span className="t-inf-none">{q.trim() ? "никого с таким именем" : "все уже здесь"}</span>}
            </div>
          </div>
        </div>
        {!item && (
          <label className="p-fld"><span>Заметка</span><input className="p-inp" autoComplete="off" spellCheck={false} placeholder="необязательно: когда, с чем" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        )}
        <div className="p-sh-acts">
          <button className="p-btn p-primary" type="submit" disabled={busy || !md || !chosen.length}>{busy ? "Записываю…" : "Записать"}</button>
          <button className="p-btn p-ghost" type="button" onClick={onClose}>отмена</button>
        </div>
        {err && <p className="p-sh-err">{err}</p>}
        <div className="p-sh-foot">→ <b>{label || "…"}</b> · строкой в «Влияние · {DIRECTION_WORDS[dir].toLowerCase()}» на странице каждого выбранного</div>
      </form>
    </dialog>
  );
}
