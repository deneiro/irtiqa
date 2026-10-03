/**
 * Maghrib and the day it opens. Maghrib is sunset; the sunrise equation
 * (https://en.wikipedia.org/wiki/Sunrise_equation) is accurate to about a
 * minute. No network: the app and the bot must work offline.
 */
const RAD = Math.PI / 180;

/**
 * The sun on a local calendar date (YYYY-MM-DD) at lat/lon: solar noon, and the
 * hour angle at which it stands `alt` degrees high. Sunset is -0.833°.
 */
function sun(date: string, lat: number, lon: number) {
  const [y, m, d] = date.split("-").map(Number);
  const jDate = Date.UTC(y, m - 1, d, 12) / 86400000 + 2440587.5;
  const n = Math.round(jDate - 2451545 + 0.0008);
  const jStar = n - lon / 360;
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const jTransit = 2451545 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const sinDec = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const hourAngle = (alt: number) => {
    const cosW = (Math.sin(alt * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
    return Math.acos(Math.max(-1, Math.min(1, cosW))) / RAD;
  };
  const at = (j: number) => new Date((j - 2440587.5) * 86400000);
  return { jTransit, hourAngle, at };
}

/** Sunset on a local calendar date (YYYY-MM-DD) at lat/lon, as an instant. */
export function sunset(date: string, lat: number, lon: number): Date {
  const s = sun(date, lat, lon);
  return s.at(s.jTransit + s.hourAngle(-0.833) / 360);
}

/**
 * Fajr: the sun `angle` degrees below the horizon before sunrise. 15° is the
 * angle the Spiritual Administration of Muslims of Kazakhstan uses; the bot's
 * config can change it.
 */
export function fajrOn(date: string, lat = SHYMKENT.lat, lon = SHYMKENT.lon, angle = 15): Date {
  const s = sun(date, lat, lon);
  return s.at(s.jTransit - s.hourAngle(-angle) / 360);
}

/** Zuhr: just after solar noon (the sun's disc has to pass the meridian, ~2 min). */
export function zuhrOn(date: string, lat = SHYMKENT.lat, lon = SHYMKENT.lon): Date {
  const s = sun(date, lat, lon);
  return new Date(s.at(s.jTransit).getTime() + 2 * 60000);
}

// ---------- the day runs maghrib to maghrib ----------
// Eldar's rule (2026-09-21): a day file `life/days/D.md` starts at maghrib of
// D-1 and ends at maghrib of D. Files before the switch run midnight to midnight.

export const SHYMKENT = { lat: 42.3417, lon: 69.5901 };

/** The first day file that starts at the previous evening's maghrib. */
export const MAGHRIB_DAYS_FROM = "2026-09-22";

function localDate(t: Date): string {
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${t.getFullYear()}-${m}-${d}`;
}

function nextDate(date: string, n = 1): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return localDate(d);
}

export function maghribOn(date: string, lat = SHYMKENT.lat, lon = SHYMKENT.lon): Date {
  return sunset(date, lat, lon);
}

/** Minutes after local midnight, for comparing with «ЧЧ:ММ» session times. */
function minutesOf(t: Date): number {
  return t.getHours() * 60 + t.getMinutes();
}

/** The day file a moment belongs to: after maghrib it is already the next date. */
export function dayOf(t: Date, lat = SHYMKENT.lat, lon = SHYMKENT.lon): string {
  const cal = localDate(t);
  const next = nextDate(cal);
  return next >= MAGHRIB_DAYS_FROM && t >= maghribOn(cal, lat, lon) ? next : cal;
}

/** The day file open right now. Use this, not todayStr(), for anything written into `life/days/`. */
export function dayToday(): string {
  return dayOf(new Date());
}

/** Next moment the day file changes: maghrib today, or tomorrow's if it has passed. */
export function nextDayBoundary(now = new Date()): Date {
  const cal = localDate(now);
  if (nextDate(cal) < MAGHRIB_DAYS_FROM) return new Date(nextDate(cal) + "T00:00:00");
  const m = maghribOn(cal);
  return now < m ? m : maghribOn(nextDate(cal));
}

/**
 * Which calendar date a timed session in day file `file` happened on. An
 * evening session (at or after the previous maghrib) sits in the next file
 * but happened the evening before.
 */
export function sessionCalendarDate(file: string, at: string): string {
  if (file < MAGHRIB_DAYS_FROM) return file;
  const prev = nextDate(file, -1);
  const [h, m] = at.split(":").map(Number);
  return h * 60 + m >= minutesOf(maghribOn(prev)) ? prev : file;
}
