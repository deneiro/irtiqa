import { useMemo, useState } from "react";
import { useStore } from "../store";
import { todayStr } from "../lib/dates";
import { confirmAction } from "../lib/native";
import { LIBRARY_KINDS, LIBRARY_REL, parseLibrary, serializeLibrary, type LibraryItem, type LibraryKind } from "../lib/library";
import { Block } from "../pages/main/Scene";
import { Err } from "./SectionBits";

type Filter = LibraryKind | "all";
const EMPTY = { title: "", kind: "film" as LibraryKind, score: "", comment: "" };

/**
 * Фильмы, сериалы, книги: название, оценка, комментарий. Rebuilt 2026-11-21 as a shelf: a card a title with his score
 * large, the best first; a tap on a card opens it for editing in the line above the shelf.
 */
export default function LibrarySection() {
  const { life, saveLedger, reload } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const today = todayStr();
  const items = useMemo(() => parseLibrary(life?.library ?? ""), [life]);
  if (!life) return null;

  const write = async (next: LibraryItem[]) => {
    setBusy(true);
    try {
      await saveLedger(LIBRARY_REL, serializeLibrary(next, today), parseLibrary);
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const open = (it?: LibraryItem) => {
    setEditing(it ?? null);
    setForm(it ? { title: it.title, kind: it.kind, score: it.score ? String(it.score) : "", comment: it.comment } : { ...EMPTY, kind: filter === "all" ? "film" : filter });
  };
  const close = () => { setForm(null); setEditing(null); };

  const save = async () => {
    if (!form) return;
    const title = form.title.trim();
    if (!title) return;
    const dup = items.find((x) => x !== editing && x.kind === form.kind && x.title.toLowerCase() === title.toLowerCase());
    if (dup) { setErr(`«${title}» уже есть в списке`); return; }
    const item: LibraryItem = { title, kind: form.kind, score: form.score ? Number(form.score) : undefined, comment: form.comment.trim() };
    await write(editing ? items.map((x) => (x === editing ? item : x)) : [...items, item]);
    close();
  };

  const remove = async (it: LibraryItem) => {
    if (!(await confirmAction(`Убрать «${it.title}» из списка?`))) return;
    await write(items.filter((x) => x !== it));
    close();
  };

  const shown = items
    .filter((i) => filter === "all" || i.kind === filter)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.title.localeCompare(b.title, "ru"));
  const count = (k: LibraryKind) => items.filter((i) => i.kind === k).length;
  const kindLabel = (k: LibraryKind) => LIBRARY_KINDS.find((x) => x.key === k)!.label;
  const tone = (s: number | undefined) => (s === undefined ? "none" : s >= 8 ? "top" : s >= 6 ? "mid" : "low");

  return (
    <div className="g-play">
      <Block title="Полка" right={form ? undefined : <button type="button" className="g-btn sun" onClick={() => open()}>+ добавить</button>}>
        <div className="g-chips wrap">
          <button type="button" className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>всё · {items.length}</button>
          {LIBRARY_KINDS.map((k) => (
            <button type="button" key={k.key} className={filter === k.key ? "on" : ""} onClick={() => setFilter(k.key)}>{k.plural} · {count(k.key)}</button>
          ))}
        </div>

        {form && (
          <form className="g-addrow flat" onSubmit={(e) => { e.preventDefault(); void save(); }}
            onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
            <input className="text wide" autoFocus placeholder="название" autoCorrect="off" spellCheck={false} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className="text" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as LibraryKind })}>
              {LIBRARY_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
            <select className="text" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} title="оценка от 1 до 10">
              <option value="">без оценки</option>
              {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <input className="text" placeholder="комментарий, если есть" autoCorrect="off" spellCheck={false} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            <button type="submit" disabled={busy || !form.title.trim()}>{editing ? "Сохранить" : "Добавить"}</button>
            {editing && <button className="g-btn ember" type="button" disabled={busy} onClick={() => void remove(editing)}>убрать</button>}
            <button className="g-btn" type="button" onClick={close}>отмена</button>
          </form>
        )}
        <Err text={err} />

        {shown.length > 0 ? (
          <div className="g-shelf">
            {shown.map((it) => (
              <button type="button" key={`${it.kind}:${it.title}`} className={`${tone(it.score)}${editing === it ? " on" : ""}`} disabled={busy} onClick={() => open(it)} title="изменить">
                <i>{it.score ?? "—"}</i>
                <b>{it.title}</b>
                <small>{kindLabel(it.kind)}</small>
                {it.comment && <span>{it.comment}</span>}
              </button>
            ))}
          </div>
        ) : <p className="g-faint">Пока пусто.</p>}
        <p className="g-cap">Оценка — твоя, от 1 до 10. Нажми на карточку, чтобы изменить.</p>
      </Block>
    </div>
  );
}
