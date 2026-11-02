/**
 * Работы. Eldar's own framing of the problem is a pattern — «6 работ за 27
 * месяцев» — so the theme has to show duration, not a list of titles. Dates
 * live in `life/jobs.md`; what each job meant lives in the knowledge page.
 */
import type { Day } from "./life";

export { JOBS_REL } from "./life";

export interface Job {
  start: string; // YYYY-MM
  end: string | undefined; // undefined = still running
  place: string;
  role: string;
  channel: string;
  money: string;
  months: number;
}

const MONTH = /^\d{4}-\d{2}$/;

/** Whole months between two YYYY-MM, at least 1. */
export function monthsBetween(start: string, end: string): number {
  const [ys, ms] = start.split("-").map(Number);
  const [ye, me] = end.split("-").map(Number);
  return Math.max(1, (ye - ys) * 12 + (me - ms));
}

export function parseJobs(content: string, today: string): Job[] {
  const out: Job[] = [];
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const c = t.slice(1, t.endsWith("|") ? -1 : undefined).split("|").map((x) => x.trim());
    if (c.length < 4 || !MONTH.test(c[0])) continue;
    const end = MONTH.test(c[1]) ? c[1] : undefined;
    out.push({
      start: c[0], end, place: c[2] ?? "", role: c[3] ?? "", channel: c[4] ?? "", money: c[5] ?? "",
      months: monthsBetween(c[0], end ?? today.slice(0, 7)),
    });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

export function serializeJobs(jobs: Job[], today: string, header: string): string {
  const rows = [...jobs]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((j) => `| ${j.start} | ${j.end ?? ""} | ${j.place} | ${j.role} | ${j.channel} | ${j.money} |`);
  return header.replace(/^updated:.*$/m, `updated: ${today}`).trimEnd() + "\n" + rows.join("\n") + "\n";
}

/** Everything above the table, kept byte-for-byte on a rewrite. */
export function jobsHeader(content: string): string {
  const lines = content.split(/\r?\n/);
  const i = lines.findIndex((l) => /^\|\s*\d{4}-\d{2}\s*\|/.test(l.trim()));
  return (i < 0 ? lines : lines.slice(0, i)).join("\n");
}

export interface JobStats {
  count: number;
  current: Job | undefined;
  avgMonths: number;
  longest: Job | undefined;
  byChannel: { channel: string; count: number }[];
  unknownChannel: number;
  /** Months of the whole span, first start to today. */
  span: number;
}

export function jobStats(jobs: Job[], today: string): JobStats {
  const finished = jobs.filter((j) => j.end);
  const current = jobs.find((j) => !j.end);
  const avg = finished.length ? finished.reduce((s, j) => s + j.months, 0) / finished.length : 0;
  const m = new Map<string, number>();
  for (const j of jobs) if (j.channel) m.set(j.channel, (m.get(j.channel) ?? 0) + 1);
  return {
    count: jobs.length,
    current,
    avgMonths: avg,
    longest: [...jobs].sort((a, b) => b.months - a.months)[0],
    byChannel: [...m.entries()].map(([channel, count]) => ({ channel, count })).sort((a, b) => b.count - a.count),
    unknownChannel: jobs.filter((j) => !j.channel).length,
    span: jobs.length ? monthsBetween(jobs[0].start, today.slice(0, 7)) : 0,
  };
}

/** Earnings this month from day transactions, for the income line. */
export function earnedThisMonth(days: Map<string, Day>, today: string): number {
  const ym = today.slice(0, 7);
  let n = 0;
  for (const [date, d] of days) if (date.startsWith(ym)) for (const t of d.txs) if (t.amount > 0) n += t.amount;
  return n;
}
