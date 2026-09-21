import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { useT } from "../lib/i18n";
import { nextStep, questMinutes, questSteps, questXp, serializeQuest, withQuestSteps, type Quest } from "../lib/life";
import SourceLink from "./SourceLink";

function useTick(active: boolean): number {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setN((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return Date.now();
}

export function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** A step's owner rides at the end of its text: «… — ты», «… — ET1». */
function splitOwner(text: string): { text: string; who: string } {
  const m = text.match(/^(.*\S)\s+—\s+([^—]{1,20})$/);
  return m ? { text: m[1], who: m[2].trim() } : { text, who: "" };
}

/** Day screen: not the quests themselves but the next undone step of each, nearest deadline first. */
function NextSteps({ quests }: { quests: Quest[] }) {
  const { life, timer, startTimer, stopTimer, saveText, reload } = useStore();
  const { themeLabel } = useT();
  const now = useTick(!!timer);
  const [busy, setBusy] = useState<string | null>(null);
  const days = life ? [...life.days.values()] : [];
  const today = new Date().toISOString().slice(0, 10);

  const rows = quests
    .map((q) => { const steps = questSteps(q.body); return { q, steps, next: nextStep(steps) }; })
    .sort((a, b) => (a.q.due || "9999").localeCompare(b.q.due || "9999"));
  if (!rows.length) return <div className="small muted">Активных квестов нет.</div>;

  const tick = async (q: Quest, i: number) => {
    setBusy(q.rel);
    try {
      const steps = questSteps(q.body).map((x, j) => (j === i ? { ...x, done: true } : x));
      await saveText(q.rel, serializeQuest({ ...q, body: withQuestSteps(q.body, steps) }));
      await reload();
    } finally { setBusy(null); }
  };

  return (
    <div className="qlist">
      {rows.map(({ q, steps, next }) => {
        const running = timer?.quest === q.title;
        const overdue = q.due && q.due < today;
        const step = next ? splitOwner(next.text) : null;
        return (
          <div className={`quest nstep ${running ? "running" : ""}`} key={q.rel}>
            <button
              className={`tbtn ${running ? "on" : ""}`}
              title={running ? "остановить и записать время" : "запустить таймер"}
              disabled={!!timer && !running}
              onClick={() => (running ? stopTimer() : startTimer(q.title))}
            >
              {running ? "■" : "▶"}
            </button>
            <div style={{ minWidth: 0 }}>
              <div className="name">
                {step ? step.text : <Link to={`/quest/${encodeURIComponent(q.rel)}`}>{q.title}</Link>}
                {step?.who && <span className="nwho">{step.who}</span>}
              </div>
              <div className="sub">
                {step ? <Link to={`/quest/${encodeURIComponent(q.rel)}`}>{q.title}</Link> : (q.theme ? themeLabel(q.theme) : "без темы")}
                {steps.length > 0 && <> · {steps.filter((x) => x.done).length}/{steps.length}</>}
                {q.due ? <span className={overdue ? "overdue" : ""}> · до {q.due.slice(5)}</span> : ""}
              </div>
            </div>
            <div className="qmeta">
              {running ? <b className="live">{fmtElapsed(now - timer!.startedAt)}</b> : <span>{questMinutes(q.title, days)} мин</span>}
            </div>
            {next && (
              <button className="qcheck" disabled={busy === q.rel} title="шаг сделан" onClick={() => void tick(q, steps.indexOf(next))} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Active quests with the shared timer. Used on the Quests and Theme screens; the Day screen shows next steps. */
export default function QuestRows({ quests, onClose, compact }: { quests: Quest[]; onClose?: (q: Quest) => void; compact?: boolean }) {
  if (compact) return <NextSteps quests={quests} />;
  return <FullRows quests={quests} onClose={onClose} />;
}

function FullRows({ quests, onClose }: { quests: Quest[]; onClose?: (q: Quest) => void }) {
  const { life, timer, startTimer, stopTimer } = useStore();
  const { themeLabel } = useT();
  const now = useTick(!!timer);
  const days = life ? [...life.days.values()] : [];

  if (!quests.length) return <div className="small muted">Активных квестов нет.</div>;
  return (
    <div className="qlist">
      {quests.map((q) => {
        const running = timer?.quest === q.title;
        const minutes = questMinutes(q.title, days);
        const overdue = q.due && q.due < new Date().toISOString().slice(0, 10);
        const steps = questSteps(q.body);
        const next = nextStep(steps);
        return (
          <div className={`quest ${running ? "running" : ""}`} key={q.rel}>
            <button
              className={`tbtn ${running ? "on" : ""}`}
              title={running ? "остановить и записать время" : "запустить таймер"}
              disabled={!!timer && !running}
              onClick={() => (running ? stopTimer() : startTimer(q.title))}
            >
              {running ? "■" : "▶"}
            </button>
            <div style={{ minWidth: 0 }}>
              <div className="name"><Link to={`/quest/${encodeURIComponent(q.rel)}`}>{q.title}</Link></div>
              <div className="sub">
                {q.theme ? themeLabel(q.theme) : "без темы"}
                {q.project ? ` · ${q.project}` : ""}
                {q.due ? <span className={overdue ? "overdue" : ""}> · до {q.due}</span> : ""}
                {steps.length > 0 && <> · шаги {steps.filter((x) => x.done).length}/{steps.length}</>}
                {q.source ? <> · <SourceLink source={q.source} /></> : null}
              </div>
              {next && <div className="qnextline">дальше: {next.text}</div>}
            </div>
            <div className="qmeta">
              {running ? <b className="live">{fmtElapsed(now - timer!.startedAt)}</b> : <span>{minutes} мин</span>}
              <span className="faint"> · +{questXp(minutes)} XP</span>
            </div>
            {onClose && <button className="btn small" onClick={() => onClose(q)} disabled={running}>закрыть</button>}
          </div>
        );
      })}
    </div>
  );
}
