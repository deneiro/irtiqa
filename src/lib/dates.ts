/** Local calendar dates as YYYY-MM-DD. The app never uses UTC for "today". */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(now = new Date()): string {
  return toDateStr(now);
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export const WEEKDAYS_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"] as const;
export const WEEKDAYS_EN = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function weekdayIndex(date: string): number {
  return new Date(date + "T12:00:00").getDay();
}

export function formatDayTitle(date: string): string {
  const d = new Date(date + "T12:00:00");
  const s = d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
