/**
 * Locale-aware date and number formatting.
 *
 * Everything here follows the *app's* language rather than the browser's. Those
 * used to be the same thing — `toLocaleDateString(undefined, …)` reads the browser
 * locale — but once the player can switch the interface to Russian, a browser set
 * to en-US would keep printing "Aug 13" on an otherwise Russian page.
 */
import { LANG_LOCALE, getLang } from '../i18n';

/** The BCP-47 tag matching the language the UI is currently rendered in. */
export function locale(): string {
  return LANG_LOCALE[getLang()];
}

/** Accepts a Date, an epoch number, or a 'YYYY-MM-DD' / ISO string. */
function toDate(v: Date | string | number): Date {
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  // A bare 'YYYY-MM-DD' parses as UTC midnight, which renders as the previous day
  // in any negative-offset timezone. Split it out and build a local date instead.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(v);
}

/** "13 августа 2026 г." / "August 13, 2026" */
export function fmtDate(v: Date | string | number): string {
  return toDate(v).toLocaleDateString(locale(), { year: 'numeric', month: 'long', day: 'numeric' });
}

/** "13 авг." / "Aug 13" — the compact form used in lists and logs. */
export function fmtDateShort(v: Date | string | number): string {
  return toDate(v).toLocaleDateString(locale(), { month: 'short', day: 'numeric' });
}

/** Date plus clock, for sync timestamps. */
export function fmtDateTime(v: Date | string | number): string {
  return toDate(v).toLocaleString(locale());
}

/** "среда" / "Wednesday" */
export function fmtWeekday(v: Date | string | number, style: 'long' | 'short' = 'long'): string {
  return toDate(v).toLocaleDateString(locale(), { weekday: style });
}

/** "август 2026" / "August 2026" — calendar headers. */
export function fmtMonthYear(v: Date | string | number): string {
  return toDate(v).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
}

/** Grouped thousands in the active locale. */
export function fmtNum(n: number, opts?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(locale(), opts);
}

/**
 * The seven weekday initials for a calendar header, starting Monday — which is the
 * first day of the week in both locales this app ships.
 */
export function weekdayInitials(style: 'short' | 'narrow' = 'short'): string[] {
  const fmt = new Intl.DateTimeFormat(locale(), { weekday: style });
  // 2024-01-01 was a Monday; seven consecutive days give the whole cycle.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
}

/**
 * Weekday names indexed the way `Date.getDay()` numbers them — 0 = Sunday. Habit
 * schedules store those raw indices, so this ordering is the one they can be
 * looked up with directly.
 */
export function weekdayNames(style: 'short' | 'long' | 'narrow' = 'short'): string[] {
  const fmt = new Intl.DateTimeFormat(locale(), { weekday: style });
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + i)));
}
