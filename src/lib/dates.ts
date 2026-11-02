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

export function monthOfToday(date: string): string {
  return date.slice(0, 7);
}

/** Russian plural agreement: plural(1, "запись", "записи", "записей"). */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
