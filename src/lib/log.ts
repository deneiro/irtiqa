import type { LogEntry } from "./types";

const HEAD = /^## \[(\d{4}-\d{2}-\d{2})([^\]]*)\]\s*(.*)$/;

export function parseLog(text: string): LogEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: LogEntry[] = [];
  let cur: LogEntry | null = null;
  const buf: string[] = [];

  const flush = () => {
    if (cur) {
      cur.body = buf.join("\n").trim();
      entries.push(cur);
    }
    buf.length = 0;
  };

  lines.forEach((line, i) => {
    const m = line.match(HEAD);
    if (m) {
      flush();
      const rest = m[3].trim();
      let op = rest;
      let subject = "";
      const bar = rest.indexOf("|");
      if (bar >= 0) {
        op = rest.slice(0, bar).trim();
        subject = rest.slice(bar + 1).trim();
      }
      cur = {
        id: `${m[1]}-${i}`,
        date: m[1],
        dateRaw: (m[1] + m[2]).trim(),
        op: op.toLowerCase() || "note",
        subject,
        body: "",
        index: entries.length,
      };
    } else if (cur) {
      buf.push(line);
    }
  });
  flush();
  return entries;
}

/** Group operation names into a small set of families for colouring/filters. */
export function opFamily(op: string): string {
  if (op.startsWith("ingest")) return "ingest";
  if (/build|implement|spec|architect|design|create|wheel|setup|init|plan/.test(op)) return "build";
  if (/expand|extend|update|deepen|revision|edit|fix|correct|rebuild|restructure|move|migration|schema|reconcile|structure/.test(op)) return "revise";
  if (/query|research|analy|diagnostic|brainstorm|decide|strategy|concept|synthesis|deep-read|validation/.test(op)) return "think";
  if (/lint|sync/.test(op)) return "audit";
  return "other";
}

export const FAMILY_COLORS: Record<string, string> = {
  ingest: "#4FB286",
  build: "#7C8CF0",
  revise: "#E0A93F",
  think: "#AE7FE0",
  audit: "#45B6C6",
  other: "#8B9099",
};
