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
