/**
 * Sunset, which is the time of maghrib. The sunrise equation
 * (https://en.wikipedia.org/wiki/Sunrise_equation) is accurate to about a
 * minute, enough for a reminder. No network: the bot must work offline.
 */
const RAD = Math.PI / 180;

/** Sunset on a local calendar date (YYYY-MM-DD) at lat/lon, as an instant. */
export function sunset(date: string, lat: number, lon: number): Date {
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
  const cosW = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
  const w = Math.acos(Math.max(-1, Math.min(1, cosW))) / RAD;
  const jSet = jTransit + w / 360;
  return new Date((jSet - 2440587.5) * 86400000);
}
