import { useMemo, useState } from "react";
import { useStore, useVault } from "../store";
import { THEMES } from "../lib/themes";
import { useT } from "../lib/i18n";
import { todayStr } from "../lib/dates";
import { eventDir, serializeEvent } from "../lib/events";
import { isAuthor } from "../lib/people";

/** Create one event: date, name, place, who was there. Photos come after. */
export default function EventForm({ theme, onDone }: { theme: string; onDone: (rel: string) => void }) {
  const v = useVault();
  const { life, saveText, reload } = useStore();
  const { themeLabel } = useT();
  const [f, setF] = useState({ date: todayStr(), title: "", place: "", theme, people: [] as string[] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const candidates = useMemo(
    () => v.pages.filter((p) => p.zone === "person" && p.type !== "template" && !p.file.startsWith("_") && !isAuthor(p)).map((p) => p.title).sort(),
    [v],
  );

  const toggle = (name: string) => setF((s) => ({ ...s, people: s.people.includes(name) ? s.people.filter((x) => x !== name) : [...s.people, name] }));

  const submit = async () => {
    const title = f.title.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const dir = eventDir(f.date, title);
      if (life?.events.some((e) => e.dir === dir)) throw new Error("Событие с таким названием в этот день уже есть");
      const rel = `${dir}/event.md`;
      await saveText(rel, serializeEvent({ title, date: f.date, theme: f.theme, place: f.place.trim(), people: f.people.map((p) => `[[${p}]]`), tags: [], body: "" }));
      setErr(null);
      await reload();
      onDone(rel);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="evform" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="addrow ev">
        <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} autoFocus placeholder="Что это было: ночёвка в горах, день рождения…" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="где" value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} />
        <select className="text" value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value })}>
          {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
        </select>
        <button className="btn primary" type="submit" disabled={!f.title.trim() || busy}>создать</button>
      </div>
      {candidates.length > 0 && (
        <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
          <span className="small muted">с кем:</span>
          {candidates.map((name) => (
            <button key={name} type="button" className={`chip link ${f.people.includes(name) ? "on" : ""}`} onClick={() => toggle(name)}>{name}</button>
          ))}
        </div>
      )}
      {err && <div className="small" style={{ color: "var(--danger)", marginTop: 6 }}>{err}</div>}
    </form>
  );
}
