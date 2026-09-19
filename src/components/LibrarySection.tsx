import { useMemo, useState } from "react";
import { useStore } from "../store";
import { todayStr } from "../lib/dates";
import { confirmAction } from "../lib/native";
import { LIBRARY_KINDS, LIBRARY_REL, parseLibrary, serializeLibrary, type LibraryItem, type LibraryKind } from "../lib/library";

type Filter = LibraryKind | "all";
const EMPTY = { title: "", kind: "film" as LibraryKind, score: "", comment: "" };

/** Фильмы, сериалы, книги: название, оценка, комментарий. One table, edited in place. */
export default function LibrarySection() {
  const { life, saveText, reload } = useStore();
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
      await saveText(LIBRARY_REL, serializeLibrary(next, today));
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const open = (it?: LibraryItem) => {
    setEditing(it ?? null);
    setForm(it ? { title: it.title, kind: it.kind, score: it.score ? String(it.score) : "", comment: it.comment } : { ...EMPTY, kind: filter === "all" ? "film" : filter });
  };

  const save = async () => {
    if (!form) return;
    const title = form.title.trim();
    if (!title) return;
    const dup = items.find((x) => x !== editing && x.kind === form.kind && x.title.toLowerCase() === title.toLowerCase());
    if (dup) { setErr(`«${title}» уже есть в списке`); return; }
    const item: LibraryItem = { title, kind: form.kind, score: form.score ? Number(form.score) : undefined, comment: form.comment.trim() };
    await write(editing ? items.map((x) => (x === editing ? item : x)) : [...items, item]);
    setForm(null);
    setEditing(null);
  };

  const remove = async (it: LibraryItem) => {
    if (!(await confirmAction(`Убрать «${it.title}» из списка?`))) return;
    await write(items.filter((x) => x !== it));
    setForm(null);
    setEditing(null);
  };

  const shown = items
    .filter((i) => filter === "all" || i.kind === filter)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.title.localeCompare(b.title, "ru"));
  const count = (k: LibraryKind) => items.filter((i) => i.kind === k).length;
  const kindLabel = (k: LibraryKind) => LIBRARY_KINDS.find((x) => x.key === k)!.label;

  return (
    <section className="tblock">
      <h2 className="section">Посмотрел и прочитал <span className="n">{items.length}</span></h2>
      <div className="card">
        <div className="row wrap" style={{ gap: 6, marginBottom: 8 }}>
          <button className={`chip link ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>всё · {items.length}</button>
          {LIBRARY_KINDS.map((k) => (
            <button key={k.key} className={`chip link ${filter === k.key ? "on" : ""}`} onClick={() => setFilter(k.key)}>{k.plural} · {count(k.key)}</button>
          ))}
        </div>

        {shown.length > 0 ? (
          <table className="tbl lib">
            <thead><tr><th>Что</th>{filter === "all" && <th>Тип</th>}<th className="num">Оценка</th><th>Комментарий</th><th /></tr></thead>
            <tbody>
              {shown.map((it) => (
                <tr key={`${it.kind}:${it.title}`}>
                  <td><b>{it.title}</b></td>
                  {filter === "all" && <td className="muted">{kindLabel(it.kind)}</td>}
                  <td className="num mono">{it.score ?? <span className="faint">—</span>}</td>
                  <td className="muted">{it.comment}</td>
                  <td className="num"><button className="btn small ghost" disabled={busy} onClick={() => open(it)}>изм.</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="small faint">Пока пусто.</div>
        )}

        {form ? (
          <form className="measure-form" onSubmit={(e) => { e.preventDefault(); void save(); }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); void save(); } if (e.key === "Escape") { setForm(null); setEditing(null); } }}>
            <input className="text wide" autoFocus placeholder="название" autoCorrect="off" spellCheck={false} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className="text" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as LibraryKind })}>
              {LIBRARY_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
            <select className="text" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} title="оценка от 1 до 10">
              <option value="">без оценки</option>
              {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <input className="text wide" placeholder="комментарий, если есть" autoCorrect="off" spellCheck={false} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            <button className="btn primary" type="submit" disabled={busy}>{editing ? "сохранить" : "добавить"}</button>
            {editing && <button className="btn ghost" type="button" disabled={busy} onClick={() => void remove(editing)}>убрать</button>}
            <button className="btn ghost" type="button" onClick={() => { setForm(null); setEditing(null); }}>отмена</button>
          </form>
        ) : (
          <button className="btn small" style={{ marginTop: 10 }} onClick={() => open()}>добавить</button>
        )}
        {err && <div className="small err-text">{err}</div>}
      </div>
    </section>
  );
}
