/**
 * Surgical frontmatter edits for knowledge pages. The app may only touch its
 * own keys (`read`, `applied`, contact fields); everything else in the block
 * and the whole body must come out byte-for-byte unchanged.
 */
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/;

export type FmValue = string | string[] | null; // null removes the key

function scalar(s: string): string {
  if (s === "" || /[,:\[\]{}#"'\n]|^\s|\s$|^[-?&*!|>%@`]/.test(s) || /^(true|false|null|~|\d+(\.\d+)?)$/i.test(s)) return JSON.stringify(s);
  return s;
}

function render(key: string, v: string | string[]): string {
  return Array.isArray(v) ? `${key}: [${v.map(scalar).join(", ")}]` : `${key}: ${/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : scalar(v)}`;
}

export function setFrontmatterKeys(content: string, patch: Record<string, FmValue>): string {
  const m = content.match(FM_RE);
  if (!m) {
    const lines = Object.entries(patch).filter(([, v]) => v !== null).map(([k, v]) => render(k, v as string | string[]));
    return `---\n${lines.join("\n")}\n---\n${content}`;
  }
  const nl = m[0].includes("\r\n") ? "\r\n" : "\n";
  const lines = m[1].split(/\r?\n/);
  const out: string[] = [];
  const done = new Set<string>();
  let skipping = false; // inside a block-style value belonging to a replaced key
  for (const line of lines) {
    const km = line.match(/^([A-Za-z_][\w-]*):/);
    if (km) {
      skipping = false;
      const key = km[1];
      if (key in patch) {
        done.add(key);
        const v = patch[key];
        if (v !== null) out.push(render(key, v));
        skipping = true; // drop continuation lines (e.g. a block list) of the old value
        continue;
      }
    } else if (skipping && /^\s+\S/.test(line)) {
      continue;
    } else {
      skipping = false;
    }
    out.push(line);
  }
  for (const [k, v] of Object.entries(patch)) if (!done.has(k) && v !== null) out.push(render(k, v));
  return `---${nl}${out.join(nl)}${nl}---${m[2] || nl}` + content.slice(m[0].length);
}

/** Replace the body while keeping the frontmatter block byte-for-byte. */
export function setBody(content: string, body: string): string {
  const m = content.match(/^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/);
  const text = body.replace(/\s+$/, "") + "\n";
  return m ? m[0] + (m[0].endsWith("\n") ? "" : "\n") + text : text;
}
