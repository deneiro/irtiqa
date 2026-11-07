import { useSearchParams } from "react-router-dom";
import { defaultTab, type Tab } from "../lib/dashboard";
import { useDayToday } from "../lib/useDayToday";
import { useStore } from "../store";
import Today from "./main/Today";
import Week from "./main/Week";
import Month from "./main/Month";
import Levels from "./main/Levels";
import "./Main.css";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "day", label: "Сегодня", hint: "каждое утро" },
  { id: "week", label: "Неделя", hint: "в воскресенье" },
  { id: "month", label: "Месяц", hint: "1-го и когда сбился" },
  { id: "levels", label: "Уровни", hint: "банк заданий" },
];

/**
 * «Главный» (spec v3, 2026-11-05; the look is mockup v2 «Альманах на рассвете»):
 * a dashboard in three tabs, read only. Habit marks and answers come from the
 * evening bot, everything else from Claude; the tab opens by the day — the 1st
 * Месяц, a Sunday Неделя.
 */
export default function MainPage() {
  const today = useDayToday();
  const { life, vault } = useStore();
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab");
  const tab: Tab = asked === "day" || asked === "week" || asked === "month" || asked === "levels" ? asked : defaultTab(today);
  return (
    <div className="dash">
      <div className="dash-top">
        <div className="dash-brand">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <circle cx="15.5" cy="6" r="3" fill="#E7C27A" />
            <path d="M2 19h5v-4h5v-4h5" fill="none" stroke="#EDE7DA" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          IrtiQa · Главный
        </div>
        <nav className="dash-tabs">
          {TABS.map((t) => <button key={t.id} className={t.id === tab ? "on" : ""} aria-current={t.id === tab ? "page" : undefined} onClick={() => setParams({ tab: t.id })}>{t.label}<small>{t.hint}</small></button>)}
        </nav>
      </div>
      <div key={tab} className="dash-page">
        {!life || !vault ? <p className="d-faint">Загружаю vault…</p> : tab === "day" ? <Today life={life} today={today} /> : tab === "week" ? <Week life={life} today={today} /> : tab === "levels" ? <Levels life={life} today={today} /> : <Month life={life} vault={vault} today={today} />}
      </div>
    </div>
  );
}
