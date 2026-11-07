/**
 * The week of training (Eldar, 2026-11-08: «шесть дней в неделю — три силовые и
 * три кардио»). The plan is a vault page, a table one row a weekday:
 *
 *   | День | Тип | Что | Упражнения |
 *   | пн | силовая | грудь и трицепс | отжимания; жим лёжа; … |
 *
 * The page is his to change; the app only reads today's row.
 */
import type { Vault } from "./types";

export const TRAINING_REL = "wiki/Health & sport/Wiki/План тренировок.md";

export interface Training { day: string; kind: string; what: string; exercises: string[]; rel: string }

const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function parseTraining(body: string, rel = TRAINING_REL): Training[] {
  const out: Training[] = [];
  let head: string[] | undefined;
  for (const line of body.split("\n")) {
    if (!line.trim().startsWith("|")) { head = undefined; continue; }
    const c = cells(line);
    if (!head) { if (c[0].toLowerCase() === "день") head = c.map((x) => x.toLowerCase()); continue; }
    if (c.every((x) => /^:?-+:?$/.test(x))) continue;
    const at = (k: string) => c[head!.indexOf(k)] ?? "";
    const day = at("день").toLowerCase().slice(0, 2);
    if (!WD.includes(day)) continue;
    out.push({ day, kind: at("тип"), what: at("что"), exercises: at("упражнения").split(/\s*;\s*/).filter((x) => x && x !== "—"), rel });
  }
  return out;
}

/** Today's row of the plan, when there is a plan. */
export function trainingFor(vault: Vault, date: string): Training | undefined {
  const page = vault.pages.find((p) => p.rel === TRAINING_REL || p.rel === TRAINING_REL.normalize("NFD"));
  if (!page) return undefined;
  const wd = WD[new Date(`${date}T12:00:00`).getDay()];
  return parseTraining(page.body, page.rel).find((t) => t.day === wd);
}
