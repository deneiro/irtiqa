import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useStore, useVault } from "../store";
import { THEMES, themeColor } from "../lib/themes";
import { useT } from "../lib/i18n";
import { pageUrl } from "../lib/vault";
import { confirmAction } from "../lib/native";
import { deleteFile } from "../lib/fs";
import { todayStr } from "../lib/dates";
import { dayToday } from "../lib/maghrib";
import { shortWhen } from "../lib/person";
import { activityJournal, activityParts } from "../lib/activityPage";
import SourceLink from "../components/SourceLink";
import Markdown from "../components/Markdown";
import { fmtElapsed } from "../components/QuestRows";
import { Inline } from "./theme/parts";
import {
  nextStep, questJournal, questOutcome, withQuestOutcome, questMinutes, questSteps, questXp, serializeQuest, stepTally, withQuestSteps,
  type Quest, type QuestStatus, type QuestStep,
} from "../lib/life";
import "./Quest.css";

const STATUS: { key: QuestStatus; label: string }[] = [
  { key: "active", label: "в работе" },
  { key: "paused", label: "на паузе" },
  { key: "done", label: "сделана" },
];
// legacy values, still in life/archive/quests/: offered only to the file that has one
const LEGACY: { key: QuestStatus; label: string }[] = [
  { key: "passive", label: "в фоне (старое)" },
  { key: "proposed", label: "предложен (старое)" },
  { key: "dropped", label: "брошен (старое)" },
];

/** The journal shows this many lines before «ещё». */
const JOURNAL_LINES = 8;

/**
 * An activity (`life/activities/`, audit 2026-11-06): «Сейчас» first and largest, then the steps, then the journal;
 * on the side, one block of parameters. No calendar: the activity page does not plan time.
 */
export default function QuestPage() {
  const { rel = "" } = useParams();
  const target = decodeURIComponent(rel);
  const v = useVault();
  const { life, timer, startTimer, stopTimer, saveText, reload, root, updateToday } = useStore();
  const { themeLabel } = useT();
  const nav = useNavigate();
  const q = life?.quests.find((x) => x.rel === target);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newStep, setNewStep] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [nowOpen, setNowOpen] = useState(false);
  const [closedOpen, setClosedOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  // Closing asks what came of it: «done» without a result is how two frogs closed with nothing settled.
  const [params] = useSearchParams();
  const [ending, setEnding] = useState<"done" | "dropped" | null>(() => (params.get("close") === "done" ? "done" : null));
  const [outcome, setOutcome] = useState("");
  const [, force] = useState(0);
  useEffect(() => { const id = window.setInterval(() => force((n) => n + 1), 1000); return () => window.clearInterval(id); }, []);

  const projects = useMemo(
    () => [...new Set(v.pages.filter((p) => p.project).map((p) => p.project!))].sort(),
    [v],
  );
  const parts = useMemo(() => activityParts(q?.body ?? ""), [q]);
  const journal = useMemo(() => activityJournal(q?.body ?? ""), [q]);

  if (!life) return null;
  if (!q) return <div className="empty">Деятельность не найдена. <Link to="/quests">К деятельностям</Link>.</div>;

  const today = todayStr();
  const days = [...life.days.values()];
  const minutes = questMinutes(q.title, days);
  const sessions = questJournal(q.body).length;
  const running = timer?.quest === q.title;
  const color = themeColor(q.theme);
  const projectPage = q.project ? v.pages.find((p) => p.file === "_Overview" && p.project === q.project) : undefined;
  const statuses = STATUS.some((s) => s.key === q.status) ? STATUS : [...STATUS, ...LEGACY.filter((s) => s.key === q.status)];

  const write = async (patch: Partial<Quest>) => {
    setBusy(true);
    try { await saveText(q.rel, serializeQuest({ ...q, ...patch })); setErr(null); await reload(); }
    catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const finish = async () => {
    const text = outcome.trim();
    if (!ending || !text) return;
    const date = dayToday();
    await write({ status: ending, body: withQuestOutcome(q.body, { date, kind: ending, text }) });
    if (ending === "done") await updateToday((d) => (d.questsClosed.includes(q.title) ? d : { ...d, questsClosed: [...d.questsClosed, q.title] }));
    setEnding(null);
    setOutcome("");
  };
  const ended = questOutcome(q.body);

  const steps = questSteps(q.body);
  const tally = stepTally(steps);
  const next = nextStep(steps);
  const indexed = steps.map((st, i) => ({ st, i }));
  const openSteps = indexed.filter((x) => !x.st.done && !x.st.dropped);
  const closedSteps = indexed.filter((x) => x.st.done || x.st.dropped);
  const dropped = closedSteps.filter((x) => x.st.dropped).length;
  const setSteps = (list: QuestStep[]) => write({ body: withQuestSteps(q.body, list) });
  // A «[-]» step is read only here: it is set and lifted by his words, in the file (spec v4).
  const toggleStep = (i: number) => { if (!steps[i].dropped) void setSteps(steps.map((x, j) => (j === i ? { ...x, done: !x.done } : x))); };
  const addStep = () => {
    const text = newStep.trim();
    if (!text) return;
    void setSteps([...steps, { done: false, dropped: false, text, detail: "" }]).then(() => setNewStep(""));
  };
  const removeStep = async (i: number) => {
    if (steps[i].dropped) return;
    if (!(await confirmAction(`Убрать шаг «${steps[i].text}»?`))) return;
    await setSteps(steps.filter((_, j) => j !== i));
  };

  const remove = async () => {
    if (!(await confirmAction(`Удалить деятельность «${q.title}» вместе с журналом?`))) return;
    setBusy(true);
    try { await deleteFile(root, q.rel); await reload(); nav("/quests"); }
    catch (e) { setErr(String(e)); setBusy(false); }
  };

  const stepRow = ({ st, i }: { st: QuestStep; i: number }) => {
    const isNext = st === next;
    return (
      <div className={`qstep ${st.done ? "done" : ""} ${st.dropped ? "dropped" : ""} ${isNext ? "next" : ""}`} key={i}>
        <button className="qcheck" disabled={busy || st.dropped} onClick={() => toggleStep(i)} title={st.dropped ? "не делаю — снимается словами, в файле" : st.done ? "вернуть в работу" : "отметить сделанным"}>{st.done ? "✓" : st.dropped ? "–" : ""}</button>
        <div style={{ minWidth: 0 }}>
          <div className="qstext" onClick={() => st.detail && setOpen(open === i ? null : i)} style={{ cursor: st.detail ? "pointer" : "default" }}>
            <Inline md={st.text} />{isNext && <span className="qnext">дальше</span>}{st.dropped && <span className="q-tag">не делаю</span>}{st.detail && <span className="faint small"> {open === i ? "▾" : "▸"}</span>}
          </div>
          {st.detail && open === i && <div className="q-detail">{st.detail.split(/\r?\n/).map((l, k) => <div key={k}><Inline md={l} /></div>)}</div>}
        </div>
        <button className="btn small ghost" disabled={busy || st.dropped} onClick={() => void removeStep(i)} title="убрать шаг">×</button>
      </div>
    );
  };

  const leadLong = parts.intro.length > 1 || parts.intro.join(" ").length > 240;
  // about four lines of «Сейчас» at its size
  const nowLong = parts.now.length > 2 || parts.now.join(" ").length > 260;
  const log = logOpen ? journal : journal.slice(0, JOURNAL_LINES);

  return (
    <div className="q-page" style={{ ["--c" as string]: color }}>
      <div className="eyebrow">
        <Link to="/quests" className="muted">Деятельности</Link>
        {q.theme && <> · <Link to={`/theme/${encodeURIComponent(q.theme)}`} style={{ color }}>{themeLabel(q.theme)}</Link></>}
        {q.project && <> · {projectPage ? <Link to={pageUrl(projectPage)}>{q.project}</Link> : q.project}</>}
      </div>
      <h1 className="title">{q.title}</h1>
      {parts.intro.length > 0 && (
        <div className={`q-lead${leadLong && !leadOpen ? " q-clamp" : ""}`}>
          <div className="q-lead-text">{parts.intro.map((p, i) => <p key={i}><Inline md={p} /></p>)}</div>
          {leadLong && <button className="q-link" type="button" onClick={() => setLeadOpen((o) => !o)}>{leadOpen ? "свернуть" : "полностью"}</button>}
        </div>
      )}

      <div className="q-head">
        <button
          className={`btn ${running ? "" : "primary"} big`}
          disabled={!!timer && !running}
          onClick={() => (running ? stopTimer() : startTimer(q.title))}
        >
          {running ? `■ остановить · ${fmtElapsed(Date.now() - timer!.startedAt)}` : "▶ начать сессию"}
        </button>
        {!!timer && !running && <span className="small muted">Сейчас идёт другой таймер: {timer.quest}.</span>}
        <span className="grow" />
        <div className="kpi"><b>{Math.floor(minutes / 60)} ч {minutes % 60} мин</b><span>всего</span></div>
        <div className="kpi"><b>{sessions}</b><span>сессий</span></div>
        <div className="kpi"><b>+{questXp(minutes)}</b><span>XP</span></div>
      </div>
      {err && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}

      <div className="q-cols">
        <div className="q-main">
          <section className={`q-now${nowLong && !nowOpen ? " q-clamp" : ""}`}>
            <span className="q-label">Сейчас</span>
            {parts.now.length
              ? <>
                  <div className="q-now-text">{parts.now.map((l, i) => <p key={i}><Inline md={l} /></p>)}</div>
                  {nowLong && <button className="q-link" type="button" onClick={() => setNowOpen((o) => !o)}>{nowOpen ? "свернуть" : "полностью"}</button>}
                </>
              : next
                ? <p><Inline md={next.text} /><small>первый открытый шаг: «Сейчас» в файле не записано</small></p>
                : <p className="q-none">Следующий шаг не записан.</p>}
          </section>

          <section className="q-block">
            <h2 className="q-h">Шаги <span>{tally.total ? `${tally.done} из ${tally.total}` : "нет"}</span></h2>
            <div className="card">
              {tally.total > 0 && (
                <div className="qprogress" title={`${tally.done} из ${tally.total}`}><i style={{ width: `${Math.round((tally.done / tally.total) * 100)}%` }} /></div>
              )}
              {steps.length === 0 && <div className="small muted">Шагов нет. Каждый шаг — одно действие, которое понятно, как сделать.</div>}
              {openSteps.map(stepRow)}
              {closedSteps.length > 0 && (
                <>
                  <button className="q-fold" type="button" aria-expanded={closedOpen} onClick={() => setClosedOpen((o) => !o)}>
                    {closedOpen ? "▾" : "▸"} сделано {closedSteps.length - dropped}{dropped ? ` · не делаю ${dropped}` : ""}
                  </button>
                  {closedOpen && closedSteps.map(stepRow)}
                </>
              )}
              <form className="row" style={{ marginTop: 10, gap: 8 }} onSubmit={(e) => { e.preventDefault(); addStep(); }}>
                <input className="text" style={{ flex: 1 }} placeholder="новый шаг: одно действие" value={newStep} onChange={(e) => setNewStep(e.target.value)} disabled={busy} />
                <button className="btn" type="submit" disabled={busy || !newStep.trim()}>добавить</button>
              </form>
            </div>
          </section>

          <section className="q-block">
            <h2 className="q-h">Журнал <span>{journal.length || "пусто"}</span></h2>
            {journal.length === 0 ? (
              <div className="q-none">Записей нет. «Начать сессию» в конце спросит, что сделано, и запишет сюда.</div>
            ) : (
              <div className="card q-log">
                {log.map((e, i) => (
                  <div className="q-entry" key={i}>
                    <span className="q-date">{e.date === today ? "сегодня" : shortWhen(e.date, today)}</span>
                    <span>{e.minutes !== undefined && <span className="q-min">{e.minutes} мин</span>}<Inline md={e.note} /></span>
                  </div>
                ))}
                {journal.length > JOURNAL_LINES && (
                  <button className="q-fold" type="button" aria-expanded={logOpen} onClick={() => setLogOpen((o) => !o)}>
                    {logOpen ? "▾ свернуть" : `▸ ещё ${journal.length - JOURNAL_LINES}`}
                  </button>
                )}
              </div>
            )}
          </section>

          {parts.other.map((s) => (
            <details key={s.heading} className="q-extra">
              <summary>{s.heading}</summary>
              <Markdown source={s.md} compact />
            </details>
          ))}
        </div>

        <aside className="q-side">
          <div className="card q-params">
            <span className="q-label">Параметры</span>
            <div className="q-kv">
              <label><span>состояние</span>
                <select className="text" value={q.status} disabled={busy} onChange={(e) => {
                  const status = e.target.value as QuestStatus;
                  // Ending an activity in work goes through the outcome form, not a bare status flip.
                  if ((q.status === "active" || q.status === "passive") && (status === "done" || status === "dropped")) { setEnding(status); return; }
                  void write({ status });
                }}>
                  {statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
              <label><span>тема</span>
                <select className="text" value={q.theme ?? ""} disabled={busy} onChange={(e) => void write({ theme: e.target.value })}>
                  {THEMES.map((t) => <option key={t.name} value={t.name}>{themeLabel(t.name)}</option>)}
                </select>
              </label>
              <label><span>проект</span>
                <select className="text" value={q.project ?? ""} disabled={busy} onChange={(e) => void write({ project: e.target.value || undefined })}>
                  <option value="">без проекта</option>
                  {projects.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              {q.due && <div><span>срок</span><b>{shortWhen(q.due, today)}</b></div>}
              {q.stage && <div><span>этап</span><b>{q.stage}{q.stageNote && <small>{q.stageNote}</small>}</b></div>}
              {q.goal && <div><span>цель</span><b><Inline md={q.goal} /></b></div>}
            </div>
            {q.source && <div className="q-rel"><span>Связано</span><SourceLink source={q.source} /></div>}
            {ended && q.status !== "active" && <div className="q-ended"><b>Итог {shortWhen(ended.date, today)}:</b> <Inline md={ended.text} /></div>}
            {ending && (
              <form className="q-ending" onSubmit={(e) => { e.preventDefault(); void finish(); }}>
                <div className="small muted">
                  {ending === "done" ? "Что вышло в итоге? Одной строкой: что решено, что теперь по-другому." : "Почему бросаешь? Одной строкой — чтобы через месяц было понятно."}
                </div>
                <input
                  className="text" autoFocus value={outcome} onChange={(e) => setOutcome(e.target.value)}
                  placeholder={ending === "done" ? "что решено" : "почему"}
                  autoCorrect="off" autoCapitalize="off" spellCheck={false} disabled={busy}
                />
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn primary" type="submit" disabled={busy || !outcome.trim()}>{ending === "done" ? "закрыть" : "бросить"}</button>
                  <button className="btn ghost" type="button" onClick={() => { setEnding(null); setOutcome(""); }}>отмена</button>
                </div>
              </form>
            )}
            <div className="q-acts">
              {(q.status === "active" || q.status === "passive") && !ending && <button className="btn small primary" disabled={busy || running} onClick={() => setEnding("done")}>закрыть</button>}
              {(q.status === "active" || q.status === "passive") && !ending && <button className="btn small ghost" disabled={busy || running} onClick={() => setEnding("dropped")}>бросить</button>}
              <span className="grow" />
              <button className="btn small ghost" disabled={busy} style={{ color: "var(--danger)" }} onClick={() => void remove()}>удалить</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
