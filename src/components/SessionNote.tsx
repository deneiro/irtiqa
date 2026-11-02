import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { confirmAction } from "../lib/native";

/**
 * A session is not finished until Eldar says what it produced. The clock stops,
 * this asks, and only then does the time reach the day file and the quest's
 * journal — so the log is never a row of anonymous minutes.
 */
export default function SessionNote() {
  const { pending, commitSession, discardSession } = useStore();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (pending) { setNote(""); setTimeout(() => ref.current?.focus(), 50); } }, [pending]);
  if (!pending) return null;

  const submit = async () => {
    if (!note.trim() || busy) return;
    setBusy(true);
    try { await commitSession(note.trim()); } finally { setBusy(false); }
  };
  const drop = async () => {
    if (await confirmAction(`Выбросить сессию на ${pending.minutes} мин без записи? Время не попадёт ни в день, ни в квест.`)) discardSession();
  };

  return (
    <div className="overlay">
      <div className="card sheet">
        <div className="eyebrow">сессия {pending.minutes} мин</div>
        <h3 style={{ marginTop: 4 }}>{pending.quest}</h3>
        <p className="small muted">Что сделано за это время? Без записи сессия не засчитывается.</p>
        <textarea
          ref={ref}
          className="text"
          autoCorrect="off" autoCapitalize="off" spellCheck={false}
          rows={4}
          placeholder="Разобрал первые две страницы, выписал незнакомые слова…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); } }}
          style={{ width: "100%", resize: "vertical" }}
        />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" disabled={!note.trim() || busy} onClick={() => void submit()}>записать</button>
          <span className="small faint">⌘↩</span>
          <span className="grow" />
          <button className="btn ghost" disabled={busy} onClick={() => void drop()}>выбросить</button>
        </div>
      </div>
    </div>
  );
}
