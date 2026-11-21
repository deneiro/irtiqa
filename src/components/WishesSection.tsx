import { useMemo, useState } from "react";
import { useStore } from "../store";
import { todayStr } from "../lib/dates";
import { WISHES_REL, WISH_STATES, parseWishes, serializeWishes, type Wish, type WishState } from "../lib/wishes";
import { shortDate } from "../lib/themeNumbers";
import { Block } from "../pages/main/Scene";
import { Err } from "./SectionBits";

/**
 * Хочу → делаю → сделал. The same three states as memorisation, on a life. Rebuilt 2026-11-21 as three columns: a
 * wish is a card that moves to another column by its buttons.
 */
export default function WishesSection() {
  const { life, saveLedger, reload } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", note: "" });
  const today = todayStr();
  const wishes = useMemo(() => parseWishes(life?.wishes ?? ""), [life]);
  if (!life || (!wishes.length && !life.wishes)) return <div className="g-play"><Block title="Хочу прожить"><p className="g-faint">Файла желаний ещё нет: его заводит Claude по твоему слову.</p></Block></div>;

  const write = async (next: Wish[]) => {
    setBusy(true);
    try {
      await saveLedger(WISHES_REL, serializeWishes(next, today), parseWishes);
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const setState = (w: Wish, state: WishState) => {
    const since = state === "want" ? "" : w.since || today;
    void write(wishes.map((x) => (x === w ? { ...x, state, since: state === "done" ? today : since } : x)));
  };
  const add = () => {
    const title = form.title.trim();
    if (!title) return;
    void write([...wishes, { title, state: "want", since: "", note: form.note.trim() }]);
    setForm({ title: "", note: "" });
  };

  return (
    <div className="g-play">
      <Block title="Новое желание">
        <form className="g-addrow flat" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <input className="text wide" placeholder="что хочу прожить" autoCorrect="off" spellCheck={false} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="text" placeholder="заметка" autoCorrect="off" spellCheck={false} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <button type="submit" disabled={busy || !form.title.trim()}>Добавить</button>
        </form>
        <Err text={err} />
      </Block>
      <div className="g-kanban">
        {WISH_STATES.map((s) => {
          const list = wishes.filter((w) => w.state === s.key);
          return (
            <Block key={s.key} className={s.key} title={<>{s.label} · {list.length}</>} right={s.hint}>
              {list.map((w) => (
                <div key={w.title} className="g-wish">
                  <b>{w.title}</b>
                  {w.note && <p>{w.note}</p>}
                  <div>
                    {w.since && <small>{/^\d{4}-\d{2}-\d{2}$/.test(w.since) ? shortDate(w.since) : w.since}</small>}
                    {WISH_STATES.filter((x) => x.key !== w.state).map((x) => (
                      <button type="button" key={x.key} className="g-btn" disabled={busy} onClick={() => setState(w, x.key)}>→ {x.label.toLowerCase()}</button>
                    ))}
                  </div>
                </div>
              ))}
              {!list.length && <p className="g-faint">—</p>}
            </Block>
          );
        })}
      </div>
    </div>
  );
}
