/**
 * Pull the "what to actually do" bullets out of a Resource page body, so a
 * practice can become a habit or quest in one tap. Heuristic on headings;
 * the vault's extraction rules put techniques under headings like these.
 */
const HEAD_RE = /примен|практик|техник|что делать|actionable|apply|technique|protocol|протокол|упражнен|рекомендац|урок|lesson|инструмент|правил|шаги|steps|how to|как /i;

function plain(s: string): string {
  return s
    .replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, a, b) => b || a)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractPractices(body: string, max = 14): string[] {
  const lines = body.split(/\r?\n/);
  const out: string[] = [];
  let inSection = false;
  let level = 0;
  for (const line of lines) {
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      if (inSection && lvl <= level) inSection = false;
      if (HEAD_RE.test(h[2])) { inSection = true; level = lvl; }
      continue;
    }
    if (!inSection) continue;
    const b = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (!b) continue;
    const text = plain(b[1]);
    if (text.length < 6) continue;
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

/** A short habit-sized title from a long practice sentence. */
export function shortTitle(s: string, max = 60): string {
  const first = s.split(/[.;:—]\s/)[0].trim();
  return first.length > max ? first.slice(0, max - 1).trimEnd() + "…" : first;
}

// ---------- the apply plan ----------

/**
 * What a Resource page offers to do, written by Claude under `## Применить`
 * (vault CLAUDE.md, «Apply plan»): one quest with its steps, and habits apart.
 *
 *   ## Применить
 *   ### Квест: <название>
 *   <чего добиться, как понять, что готово>
 *   - [ ] шаг — ты
 *     деталь
 *   ### Привычки
 *   - <название> · <каждый день | раз в неделю | пн, ср, пт> · <зачем>
 *   ### Отказаться
 *   - <название> · <частота> · <зачем>
 */
export interface PlanStep { done: boolean; text: string; detail: string }
export interface PlanHabit { title: string; kind: "good" | "bad"; freq: string | string[]; why: string }
export interface ApplyPlan { quest?: { title: string; description: string; steps: PlanStep[] }; habits: PlanHabit[] }

export const APPLY_HEAD = "## Применить";
const WEEKDAY_RE = /^(пн|вт|ср|чт|пт|сб|вс)$/;

export function parseFreq(s: string): string | string[] {
  const t = s.trim().toLowerCase();
  if (/раз в неделю|еженедел|weekly/.test(t)) return "weekly";
  const days = t.split(/[,\s]+/).filter(Boolean);
  if (days.length && days.every((d) => WEEKDAY_RE.test(d))) return days;
  const range = t.match(/^(пн|вт|ср|чт|пт|сб|вс)\s*[–-]\s*(пн|вт|ср|чт|пт|сб|вс)$/);
  if (range) {
    const order = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
    const a = order.indexOf(range[1]), b = order.indexOf(range[2]);
    if (a <= b) return order.slice(a, b + 1);
  }
  return "daily";
}

export function parseApplyPlan(body: string): ApplyPlan | null {
  const at = body.indexOf(APPLY_HEAD);
  if (at < 0) return null;
  const rest = body.slice(at + APPLY_HEAD.length);
  const end = rest.search(/\n## /);
  const lines = (end < 0 ? rest : rest.slice(0, end)).split(/\r?\n/);
  const plan: ApplyPlan = { habits: [] };
  let sub: "quest" | "good" | "bad" | null = null;
  const desc: string[] = [];
  for (const line of lines) {
    const h = line.match(/^###\s+(.*)$/);
    if (h) {
      const q = h[1].match(/^Квест\s*[:—-]\s*(.+)$/i);
      if (q) { sub = "quest"; plan.quest = { title: plain(q[1]), description: "", steps: [] }; }
      else if (/^Привычк/i.test(h[1])) sub = "good";
      else if (/^Отказат/i.test(h[1])) sub = "bad";
      else sub = null;
      continue;
    }
    if (sub === "quest" && plan.quest) {
      const s = line.match(/^-\s*\[( |x|X)\]\s*(.*)$/);
      if (s) { plan.quest.steps.push({ done: false, text: s[2].trim(), detail: "" }); continue; }
      const last = plan.quest.steps[plan.quest.steps.length - 1];
      if (last && /^\s{2,}\S/.test(line)) { last.detail = (last.detail ? last.detail + "\n" : "") + line.trim(); continue; }
      if (!last && line.trim()) desc.push(line.trim());
      continue;
    }
    if (sub === "good" || sub === "bad") {
      const b = line.match(/^\s*-\s+(.*)$/);
      if (!b) continue;
      const [title, freq = "", ...why] = b[1].split(/\s+·\s+/);
      const t = plain(title);
      if (t) plan.habits.push({ title: t, kind: sub, freq: parseFreq(freq), why: plain(why.join(" · ")) });
    }
  }
  if (plan.quest) plan.quest.description = desc.join("\n");
  return plan.quest || plan.habits.length ? plan : null;
}

export function freqLabel(f: string | string[]): string {
  if (Array.isArray(f)) return f.join(", ");
  return f === "weekly" ? "раз в неделю" : "каждый день";
}
