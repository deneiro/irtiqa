/**
 * The life audit: the ritual Eldar named himself on 2026-09-10 — «полный разбор
 * своей жизни» — and called regular rather than one-off. One file per audit
 * under `life/audits/`, four fixed questions, so the answers can be compared
 * across months instead of being lost in a journal entry.
 */
import type { MdFile } from "./types";
import { parseFrontmatter } from "./vault";

export const AUDIT_DIR = "life/audits";

export const AUDIT_PARTS = [
  { key: "down", heading: "Что тянет вниз", hint: "привычки, люди, обстоятельства — без смягчения" },
  { key: "holds", heading: "Что держит", hint: "что работает и на чём стоишь" },
  { key: "drop", heading: "Что убрать", hint: "одно-два, не десять" },
  { key: "add", heading: "Что добавить", hint: "то, что реально начнёшь на этой неделе" },
] as const;

export type AuditKey = (typeof AUDIT_PARTS)[number]["key"];

export interface Audit {
  rel: string;
  date: string;
  parts: Record<AuditKey, string>;
}

export function auditRel(date: string): string {
  return `${AUDIT_DIR}/${date}.md`;
}

export function parseAudit(f: MdFile): Audit {
  const { fm, body } = parseFrontmatter(f.content);
  const file = f.rel.split("/").pop()!.replace(/\.md$/i, "");
  const parts = { down: "", holds: "", drop: "", add: "" } as Record<AuditKey, string>;
  let cur: AuditKey | null = null;
  for (const line of body.split(/\r?\n/)) {
    const h = line.trim().startsWith("## ") ? line.trim().slice(3) : null;
    if (h) {
      cur = AUDIT_PARTS.find((p) => p.heading === h)?.key ?? null;
      continue;
    }
    if (cur) parts[cur] += (parts[cur] ? "\n" : "") + line;
  }
  for (const k of Object.keys(parts) as AuditKey[]) parts[k] = parts[k].trim();
  const d = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : String(fm.date ?? "").slice(0, 10);
  return { rel: f.rel, date: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : file, parts };
}

export function serializeAudit(a: Omit<Audit, "rel">): string {
  const out = ["---", `date: ${a.date}`, "type: audit", "theme: Personal growth", "---", "", `# Аудит ${a.date}`, ""];
  for (const p of AUDIT_PARTS) {
    out.push(`## ${p.heading}`, "");
    if (a.parts[p.key].trim()) out.push(a.parts[p.key].trim(), "");
  }
  return out.join("\n");
}

/** Days since the last audit; undefined when there has never been one. */
export function sinceAudit(audits: Audit[], today: string): number | undefined {
  const last = [...audits].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return undefined;
  const ms = Date.parse(`${today}T12:00:00`) - Date.parse(`${last.date}T12:00:00`);
  return Number.isFinite(ms) ? Math.round(ms / 86400000) : undefined;
}
