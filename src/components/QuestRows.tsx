import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../store";
import { useT } from "../lib/i18n";
import { questMinutes, questXp, type Quest } from "../lib/life";
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

/** Active quests with the shared timer. Used on the Day screen and the Quests screen. */
export default function QuestRows({ quests, onClose, compact }: { quests: Quest[]; onClose?: (q: Quest) => void; compact?: boolean }) {
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
                {!compact && q.source ? <> · <SourceLink source={q.source} /></> : null}
              </div>
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
