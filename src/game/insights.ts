import { addDaysStr, habitDueOn, parseDay } from './engine';
import type { FailureRecord, Habit, HabitDayStatus, IconName, JournalEntry, Tx } from './types';

// The insights engine: honest correlations computed from data the player
// already generated. No AI, no guesses — just their own numbers held up as a
// mirror. Every insight self-suppresses until there's enough history to mean
// something, so the app never fabricates a pattern from three data points.

export interface Insight {
  id: string;
  icon: IconName;
  text: string;
}

interface InsightSource {
  habits: Habit[];
  habitLog: Record<string, Record<string, HabitDayStatus>>;
  journal: JournalEntry[];
  txs: Tx[];
  failures: FailureRecord[];
}

const WINDOW_DAYS = 42; // ~6 weeks of history feeds every calculation
const MIN_BUCKET = 3; // no comparison with fewer than this many days per side

interface DayFacts {
  day: string;
  due: number;
  done: number;
  perfect: boolean;
  mood?: number;
  stress?: number;
  spend: number;
}

function collectDays(src: InsightSource, today: string): DayFacts[] {
  const out: DayFacts[] = [];
  for (let i = 1; i <= WINDOW_DAYS; i++) {
    const day = addDaysStr(today, -i);
    const due = src.habits.filter(h => habitDueOn(h, day));
    const done = due.filter(h => src.habitLog[h.id]?.[day] === 'done').length;
    const entry = src.journal.find(e => e.date === day);
    const spend = src.txs
      .filter(t => t.type === 'expense' && t.date === day && !t.transferId)
      .reduce((a, t) => a + t.amount, 0);
    out.push({
      day,
      due: due.length,
      done,
      perfect: due.length > 0 && done === due.length,
      mood: entry?.mood,
      stress: entry?.stress,
      spend,
    });
  }
  return out;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const r1 = (n: number) => Math.round(n * 10) / 10;

export function buildInsights(src: InsightSource, today: string): Insight[] {
  const days = collectDays(src, today);
  const insights: Insight[] = [];

  // 1. Mood vs habit completion — the core "this app is a mirror" insight
  const withMoodAndHabits = days.filter(d => d.mood !== undefined && d.due > 0);
  const perfectMoods = withMoodAndHabits.filter(d => d.perfect).map(d => d.mood!);
  const slippedMoods = withMoodAndHabits.filter(d => !d.perfect).map(d => d.mood!);
  if (perfectMoods.length >= MIN_BUCKET && slippedMoods.length >= MIN_BUCKET) {
    const a = avg(perfectMoods);
    const b = avg(slippedMoods);
    if (Math.abs(a - b) >= 0.3) {
      insights.push({
        id: 'mood_habits',
        icon: a >= b ? 'flame' : 'brain',
        text:
          a >= b
            ? `On days you complete every habit, your mood averages ${r1(a)}/5 — versus ${r1(b)}/5 on days something slips. The discipline is literally making you happier.`
            : `Curious: your mood averages ${r1(b)}/5 on imperfect days but only ${r1(a)}/5 on perfect ones. Are the habits you chose actually yours?`,
      });
    }
  }

  // 2. Stress vs spending
  const withStress = days.filter(d => d.stress !== undefined);
  const highStress = withStress.filter(d => d.stress! >= 6);
  const lowStress = withStress.filter(d => d.stress! <= 4);
  if (highStress.length >= MIN_BUCKET && lowStress.length >= MIN_BUCKET) {
    const hi = avg(highStress.map(d => d.spend));
    const lo = avg(lowStress.map(d => d.spend));
    if (hi > lo * 1.5 && hi - lo >= 5) {
      insights.push({
        id: 'stress_spend',
        icon: 'banknote',
        text: `High-stress days cost you real money: you spend ${r1(hi)} on average when stress is 6+, versus ${r1(lo)} on calm days. The budget leak is emotional.`,
      });
    }
  }

  // 3. Strongest weekday
  const habitDays = days.filter(d => d.due > 0);
  if (habitDays.length >= 10) {
    const byWeekday = new Map<number, { done: number; due: number; n: number }>();
    for (const d of habitDays) {
      const wd = parseDay(d.day).getDay();
      const cur = byWeekday.get(wd) ?? { done: 0, due: 0, n: 0 };
      cur.done += d.done;
      cur.due += d.due;
      cur.n++;
      byWeekday.set(wd, cur);
    }
    const rates = [...byWeekday.entries()]
      .filter(([, v]) => v.n >= 2)
      .map(([wd, v]) => ({ wd, rate: v.done / v.due }));
    if (rates.length >= 4) {
      const best = rates.reduce((a, b) => (b.rate > a.rate ? b : a));
      const worst = rates.reduce((a, b) => (b.rate < a.rate ? b : a));
      if (best.rate - worst.rate >= 0.25) {
        const name = (wd: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][wd];
        insights.push({
          id: 'weekday',
          icon: 'calendar',
          text: `${name(best.wd)}s are your strongest day (${Math.round(best.rate * 100)}% of habits done); ${name(worst.wd)}s are where streaks go to die (${Math.round(worst.rate * 100)}%). Guard your ${name(worst.wd)}s.`,
        });
      }
    }
  }

  // 4. Mood trend, this week vs last
  const last7 = days.slice(0, 7).map(d => d.mood).filter((m): m is number => m !== undefined);
  const prev7 = days.slice(7, 14).map(d => d.mood).filter((m): m is number => m !== undefined);
  if (last7.length >= 4 && prev7.length >= 4) {
    const a = avg(last7);
    const b = avg(prev7);
    if (Math.abs(a - b) >= 0.5) {
      insights.push({
        id: 'mood_trend',
        icon: a > b ? 'arrowUp' : 'arrowDown',
        text:
          a > b
            ? `Mood is climbing: ${r1(a)}/5 this week, up from ${r1(b)}/5 last week. Whatever changed — keep it.`
            : `Mood dipped this week: ${r1(a)}/5, down from ${r1(b)}/5. Worth a look at what else changed.`,
      });
    }
  }

  // 5. Relapse triggers — the player's own confessions, surfaced
  const triggers = src.failures
    .filter(f => f.trigger?.trim())
    .slice(-4)
    .reverse();
  if (triggers.length >= 2) {
    insights.push({
      id: 'triggers',
      icon: 'indulgence',
      text: `Your recent relapse triggers, in your own words: ${triggers.map(f => `"${f.trigger!.trim()}"`).join(' · ')}. Name the pattern, then starve it.`,
    });
  }

  return insights;
}
