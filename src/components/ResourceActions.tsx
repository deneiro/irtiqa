import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import type { Page } from "../lib/types";
import { asList } from "../lib/vault";
import { THEMES } from "../lib/themes";
import { useT } from "../lib/i18n";
import { plural, todayStr } from "../lib/dates";
import { HABIT_DIR, QUEST_DIR, XP, safeFilename, serializeHabit, serializeQuest, withQuestSteps, type HabitKind } from "../lib/life";
import { setFrontmatterKeys } from "../lib/frontmatter";
import { freqLabel, parseApplyPlan, type PlanHabit } from "../lib/practices";
import { rawPageText } from "../lib/rawpage";
import { startRun } from "../lib/claude";
import { useRuns } from "../lib/claudeRuns";

type Mode = { kind: "habit"; title: string } | { kind: "quest"; title: string } | null;

/**
 * The action bar on a Resource page: mark as read, and take what the source offers.
 * The offer is the page's `## Применить` section, written by Claude: one quest with
 * its steps, and habits apart. Without it, one button asks Claude to write it.
 */
export default function ResourceActions({ page }: { page: Page }) {
  const { vault, life, root, saveText, reload } = useStore();
  const { themeLabel } = useT();
  const runs = useRuns();
  const today = todayStr();
  const read = typeof page.fm.read === "string" || page.fm.read instanceof Date ? String(page.fm.read).slice(0, 10) : undefined;
  const applied = asList(page.fm.applied);
  const plan = parseApplyPlan(page.body);
  const [mode, setMode] = useState<Mode>(null);
  const [theme, setTheme] = useState(page.theme ?? THEMES[2].name);
  const [habitKind, setHabitKind] = useState<HabitKind>("good");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const source = `[[${page.file}]]`;
  const planning = runs.some((r) => r.op === "apply" && r.status === "running" && r.prompt.includes(page.rel));
  const anyRunning = runs.some((r) => r.status === "running");

  const writePage = async (patch: Parameters<typeof setFrontmatterKeys>[1]) => {
    const file = vault ? rawPageText(vault, page.rel) : null;
    if (file === null) throw new Error("не нашёл исходный текст страницы");
    await saveText(page.rel, setFrontmatterKeys(file, patch));
  };

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); setErr(null); await reload(); } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const toggleRead = () => act(() => writePage({ read: read ? null : today }));

  const questExists = (title: string) => !!life?.quests.some((q) => q.title === title);
  const habitExists = (title: string) => !!life?.habits.some((h) => h.title === title);

  const addHabit = async (title: string, kind: HabitKind, freq: string | string[], body = "") => {
    if (habitExists(title)) throw new Error("такая привычка уже есть");
    await saveText(`${HABIT_DIR}/${safeFilename(title)}.md`, serializeHabit({ title, theme, kind, freq, status: "active", created: today, source, body }));
    await writePage({ applied: [...applied.filter((a) => a !== title), title] });
  };

  const addQuest = async (title: string, body: string) => {
    if (questExists(title)) throw new Error("такой квест уже есть");
    await saveText(`${QUEST_DIR}/${safeFilename(title)}.md`, serializeQuest({ title, theme, status: "active", created: today, due: due || undefined, project: page.project, source, body }));
  };

  const takeQuest = () => act(async () => {
    const q = plan?.quest;
    if (!q) return;
    await addQuest(q.title, withQuestSteps(q.description, q.steps.map((s) => ({ ...s, done: false, dropped: false }))));
  });

  const takeHabit = (h: PlanHabit) => act(() => addHabit(h.title, h.kind, h.freq, h.why));

  const create = () => act(async () => {
    if (!mode) return;
    const title = mode.title.trim();
    if (!title || !safeFilename(title)) return;
    if (mode.kind === "habit") await addHabit(title, habitKind, "daily");
    else await addQuest(title, "");
    setMode(null);
  });

  const askPlan = () => { void startRun(root, "apply", page.rel, today, undefined); };

  const appliedHabits = applied.map((a) => ({ name: a, exists: habitExists(a) }));
  const planQuest = plan?.quest;
  const planHabits = plan?.habits ?? [];

  return (
    <div className="ractions">
      <div className="row wrap" style={{ gap: 10 }}>
        <button className={`btn ${read ? "" : "primary"}`} onClick={() => void toggleRead()} disabled={busy}>
          {read ? `✓ прочитано ${read}` : "Прочитано"}
        </button>
        {!read && <span className="small muted">+{XP.resourceRead} XP в тему «{page.theme ? themeLabel(page.theme) : "—"}», один раз</span>}
        <span className="grow" />
        <button className="btn ghost small" onClick={() => setMode({ kind: "habit", title: "" })} disabled={busy}>+ своя привычка</button>
        <button className="btn ghost small" onClick={() => setMode({ kind: "quest", title: "" })} disabled={busy}>+ свой квест</button>
      </div>

      {appliedHabits.length > 0 && (
        <div className="row wrap small" style={{ marginTop: 10, gap: 6 }}>
          <span className="muted">применено:</span>
          {appliedHabits.map((a) => (
            <Link key={a.name} to="/habits" className={`chip ${a.exists ? "c" : ""}`} style={{ ["--c" as string]: "var(--success)" }} title={a.exists ? "открыть привычки" : "привычка не найдена в life/habits"}>{a.name}</Link>
          ))}
        </div>
      )}

      {!plan && !mode && (
        <div className="plan empty">
          <div className="small muted">Источник ещё не разобран на квест и привычки.</div>
          {planning
            ? <Link to="/claude" className="btn small">Claude составляет… открыть</Link>
            : <button className="btn small" onClick={askPlan} disabled={anyRunning} title={anyRunning ? "Claude занят другой операцией" : "Claude прочитает страницу и допишет раздел «Применить»"}>Составить квест и привычки</button>}
        </div>
      )}

      {planQuest && !mode && (
        <div className="plan">
          <div className="plan-head">
            <span className="eyebrow">квест из источника</span>
            <b>{planQuest.title}</b>
            <span className="small muted">{planQuest.steps.length} {plural(planQuest.steps.length, "шаг", "шага", "шагов")}</span>
          </div>
          {planQuest.description && <div className="small plan-desc">{planQuest.description}</div>}
          <ol className="plan-steps">
            {planQuest.steps.map((s, i) => <li key={i}><span>{s.text}</span>{s.detail && <div className="small faint">{s.detail}</div>}</li>)}
          </ol>
          {questExists(planQuest.title) ? (
            <Link to="/quests" className="chip c" style={{ ["--c" as string]: "var(--success)" }}>✓ квест взят — открыть</Link>
          ) : (
            <div className="row wrap" style={{ gap: 8 }}>
              <select className="text" value={theme} onChange={(e) => setTheme(e.target.value)}>
                {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
              </select>
              <input className="text" type="date" value={due} onChange={(e) => setDue(e.target.value)} title="срок" />
              <button className="btn primary" onClick={() => void takeQuest()} disabled={busy}>Взять квест</button>
            </div>
          )}
        </div>
      )}

      {planHabits.length > 0 && !mode && (
        <div className="plan">
          <div className="plan-head"><span className="eyebrow">привычки из источника</span></div>
          <ul className="plan-habits">
            {planHabits.map((h) => (
              <li key={h.title}>
                <span className={`chip ${h.kind === "bad" ? "bad" : ""}`}>{h.kind === "bad" ? "отказаться" : freqLabel(h.freq)}</span>
                <span className="grow"><b>{h.title}</b>{h.why && <span className="small muted"> — {h.why}</span>}</span>
                {habitExists(h.title)
                  ? <span className="small" style={{ color: "var(--success)" }}>✓ взята</span>
                  : <button className="btn small" onClick={() => void takeHabit(h)} disabled={busy}>Взять</button>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan && !mode && (
        <div className="small faint" style={{ marginTop: 8 }}>
          План лежит в разделе «Применить» этой страницы.{" "}
          {!planning && <button className="linkbtn" onClick={askPlan} disabled={anyRunning}>пересоставить</button>}
        </div>
      )}

      {mode && (
        <form className="addrow rform" onSubmit={(e) => { e.preventDefault(); void create(); }}>
          <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} autoFocus placeholder={mode.kind === "habit" ? "Название привычки" : "Название квеста"} value={mode.title} onChange={(e) => setMode({ ...mode, title: e.target.value })} />
          <select className="text" value={theme} onChange={(e) => setTheme(e.target.value)}>
            {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
          </select>
          {mode.kind === "habit" ? (
            <select className="text" value={habitKind} onChange={(e) => setHabitKind(e.target.value as HabitKind)}>
              <option value="good">хорошая, ежедневно</option>
              <option value="bad">плохая</option>
            </select>
          ) : (
            <input className="text" autoCorrect="off" autoCapitalize="off" spellCheck={false} type="date" value={due} onChange={(e) => setDue(e.target.value)} title="срок" />
          )}
          <button className="btn primary" type="submit" disabled={busy}>{mode.kind === "habit" ? "создать привычку" : "создать квест"}</button>
          <button className="btn ghost" type="button" onClick={() => setMode(null)}>отмена</button>
          <div className="small faint" style={{ gridColumn: "1 / -1" }}>Источник: {source}. Дни недели и шаги можно поправить на экранах «Привычки» и «Квесты».</div>
        </form>
      )}
      {err && <div className="small" style={{ color: "var(--danger)", marginTop: 6 }}>{err}</div>}
    </div>
  );
}
