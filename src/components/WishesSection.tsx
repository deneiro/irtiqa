import { useMemo, useState } from "react";
import { useStore } from "../store";
import { todayStr } from "../lib/dates";
import { WISHES_REL, WISH_STATES, parseWishes, serializeWishes, type Wish, type WishState } from "../lib/wishes";

/** Хочу → делаю → сделал. The same three states as memorisation, on a life. */
export default function WishesSection() {
  const { life, saveLedger, reload } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", note: "" });
  const today = todayStr();
  const wishes = useMemo(() => parseWishes(life?.wishes ?? ""), [life]);
  if (!life || (!wishes.length && !life.wishes)) return null;

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
    setAdding(false);
  };

  const done = wishes.filter((w) => w.state === "done").length;
  return (
    <section className="tblock">
      <h2 className="section">Хочу прожить <span className="n">{done} из {wishes.length} сделано</span></h2>
      <div className="card">
        {WISH_STATES.map((s) => {
          const list = wishes.filter((w) => w.state === s.key);
          if (!list.length) return null;
          return (
            <div key={s.key} className="cband">
              <div className="mrow-head">{s.label} <span className="faint">· {s.hint}</span></div>
              {list.map((w) => (
                <div key={w.title} className={`crow wish ${w.state}`}>
                  <div className="cwho">
                    <span className="cname">{w.title}</span>
                    {w.note && <span className="small faint">{w.note}</span>}
                  </div>
                  <div className="cwhen small mono faint">{w.since}</div>
                  <div className="cact">
                    {WISH_STATES.filter((x) => x.key !== w.state).map((x) => (
                      <button key={x.key} className="btn small" disabled={busy} onClick={() => setState(w, x.key)}>{x.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {adding ? (
          <div className="measure-form">
            <input className="text" autoFocus placeholder="что хочу прожить" autoCorrect="off" spellCheck={false} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="text wide" placeholder="заметка" autoCorrect="off" spellCheck={false} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <button className="btn" disabled={busy} onClick={add}>добавить</button>
          </div>
        ) : (
          <button className="btn small" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>добавить желание</button>
        )}
        {err && <div className="small err-text">{err}</div>}
      </div>
    </section>
  );
}
