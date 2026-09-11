import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import type { Page } from "../lib/types";
import { asList } from "../lib/vault";
import { THEMES } from "../lib/themes";
import { useT } from "../lib/i18n";
import { todayStr } from "../lib/dates";
import { HABIT_DIR, QUEST_DIR, XP, safeFilename, serializeHabit, serializeQuest, type HabitKind } from "../lib/life";
import { setFrontmatterKeys } from "../lib/frontmatter";
import { extractPractices, shortTitle } from "../lib/practices";
import { rawPageText } from "../lib/rawpage";

type Mode = { kind: "habit"; title: string } | { kind: "quest"; title: string } | null;

/** The action bar on a Resource page: mark as read, turn a practice into a habit or quest. */
export default function ResourceActions({ page }: { page: Page }) {
  const { vault, life, saveText, reload } = useStore();
  const { themeLabel } = useT();
  const today = todayStr();
  const read = typeof page.fm.read === "string" || page.fm.read instanceof Date ? String(page.fm.read).slice(0, 10) : undefined;
  const applied = asList(page.fm.applied);
  const practices = extractPractices(page.body);
  const [mode, setMode] = useState<Mode>(null);
  const [theme, setTheme] = useState(page.theme ?? THEMES[2].name);
  const [habitKind, setHabitKind] = useState<HabitKind>("good");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const source = `[[${page.file}]]`;

  const writePage = async (patch: Parameters<typeof setFrontmatterKeys>[1]) => {
    const file = vault ? rawPageText(vault, page.rel) : null;
    if (file === null) throw new Error("не нашёл исходный текст страницы");
    await saveText(page.rel, setFrontmatterKeys(file, patch));
  };

  const toggleRead = async () => {
    setBusy(true);
    try { await writePage({ read: read ? null : today }); setErr(null); await reload(); } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const create = async () => {
    if (!mode) return;
    const title = mode.title.trim();
    if (!title || !safeFilename(title)) return;
    setBusy(true);
    try {
      if (mode.kind === "habit") {
        if (life?.habits.some((h) => h.title === title)) throw new Error("такая привычка уже есть");
        await saveText(`${HABIT_DIR}/${safeFilename(title)}.md`, serializeHabit({ title, theme, kind: habitKind, freq: "daily", status: "active", created: today, source }));
        await writePage({ applied: [...applied.filter((a) => a !== title), title] });
      } else {
        if (life?.quests.some((q) => q.title === title)) throw new Error("такой квест уже есть");
        await saveText(`${QUEST_DIR}/${safeFilename(title)}.md`, serializeQuest({ title, theme, status: "active", created: today, due: due || undefined, project: page.project, source, body: "" }));
      }
      setMode(null);
      setErr(null);
      await reload();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const appliedHabits = applied.map((a) => ({ name: a, exists: !!life?.habits.some((h) => h.title === a) }));

  return (
    <div className="ractions">
      <div className="row wrap" style={{ gap: 10 }}>
        <button className={`btn ${read ? "" : "primary"}`} onClick={() => void toggleRead()} disabled={busy}>
          {read ? `✓ прочитано ${read}` : "Прочитано"}
        </button>
        {!read && <span className="small muted">+{XP.resourceRead} XP в тему «{page.theme ? themeLabel(page.theme) : "—"}», один раз</span>}
        <span className="grow" />
        <button className="btn" onClick={() => setMode({ kind: "habit", title: "" })} disabled={busy}>+ привычка из страницы</button>
        <button className="btn ghost" onClick={() => setMode({ kind: "quest", title: "" })} disabled={busy}>+ квест</button>
      </div>

      {appliedHabits.length > 0 && (
        <div className="row wrap small" style={{ marginTop: 10, gap: 6 }}>
          <span className="muted">применено:</span>
          {appliedHabits.map((a) => (
            <Link key={a.name} to="/habits" className={`chip ${a.exists ? "c" : ""}`} style={{ ["--c" as string]: "var(--success)" }} title={a.exists ? "открыть привычки" : "привычка не найдена в life/habits"}>{a.name}</Link>
          ))}
        </div>
      )}

      {practices.length > 0 && !mode && (
        <details className="practices" open={applied.length === 0}>
          <summary className="small muted">Что источник предлагает делать ({practices.length})</summary>
          <ul>
            {practices.map((p, i) => (
              <li key={i}>
                <span>{p}</span>
                <span className="pacts">
                  <button className="btn small ghost" onClick={() => setMode({ kind: "habit", title: shortTitle(p) })}>→ привычка</button>
                  <button className="btn small ghost" onClick={() => setMode({ kind: "quest", title: shortTitle(p) })}>→ квест</button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {mode && (
        <form className="addrow rform" onSubmit={(e) => { e.preventDefault(); void create(); }}>
          <input className="text" autoFocus placeholder={mode.kind === "habit" ? "Название привычки" : "Название квеста"} value={mode.title} onChange={(e) => setMode({ ...mode, title: e.target.value })} />
          <select className="text" value={theme} onChange={(e) => setTheme(e.target.value)}>
            {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
          </select>
          {mode.kind === "habit" ? (
            <select className="text" value={habitKind} onChange={(e) => setHabitKind(e.target.value as HabitKind)}>
              <option value="good">хорошая, ежедневно</option>
              <option value="bad">плохая</option>
            </select>
          ) : (
            <input className="text" type="date" value={due} onChange={(e) => setDue(e.target.value)} title="срок" />
          )}
          <button className="btn primary" type="submit" disabled={busy}>{mode.kind === "habit" ? "создать привычку" : "создать квест"}</button>
          <button className="btn ghost" type="button" onClick={() => setMode(null)}>отмена</button>
          <div className="small faint" style={{ gridColumn: "1 / -1" }}>Источник: {source}. Дни недели и заметку можно поправить на экране «Привычки».</div>
        </form>
      )}
      {err && <div className="small" style={{ color: "var(--danger)", marginTop: 6 }}>{err}</div>}
    </div>
  );
}
