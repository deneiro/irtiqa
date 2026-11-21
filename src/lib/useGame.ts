import { useMemo } from "react";
import { useStore } from "../store";
import { habitRows } from "./dashboard";
import { fire } from "./game";
import { overallLevelProgress, themeXps, xpByDay, type LevelProgress, type ThemeXp } from "./levels";
import type { Habit } from "./life";
import { useDayToday } from "./useDayToday";

export interface Game {
  today: string;
  habits: Habit[];
  /** XP of one day over all themes. */
  xpOf: (date: string) => number;
  total: number;
  level: LevelProgress;
  flame: { days: number; today: boolean };
  themes: ThemeXp[];
}

/** The game as every page sees it: the level, the fire and the XP by day and by theme — counted from the vault, null while it loads. */
export function useGame(): Game | null {
  const { life, vault } = useStore();
  const today = useDayToday();
  return useMemo(() => {
    if (!life || !vault) return null;
    const perDay = new Map<string, number>();
    let total = 0;
    for (const [date, m] of xpByDay(life, vault.pages)) { let n = 0; for (const v of m.values()) n += v; perDay.set(date, n); total += n; }
    const habits = habitRows(life);
    return { today, habits, xpOf: (d: string) => perDay.get(d) ?? 0, total, level: overallLevelProgress(total), flame: fire(habits, life.days, today), themes: themeXps(life, vault.pages, today) };
  }, [life, vault, today]);
}
