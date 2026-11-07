/**
 * An ayah a day in place of «Главное сегодня» (Eldar, 2026-11-08: «лучше
 * каждый день рандомная фраза, аят из Корана»). Taken from the vault's own sura
 * pages — `### S:k` blocks with a `**Кулиев:**` line — the same one all day,
 * another the next day. Short ones only: it is a line to read at a glance.
 */
import type { Vault } from "./types";
import { suras } from "./quran";

export interface Ayah { sura: number; ayah: number; name: string; text: string; rel: string }

/** A stable number for a date string: the same day gives the same ayah. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const BLOCK = /^### (\d+):(\d+)\s*$/;
const KULIEV = /^\*\*Кулиев:\*\*\s*(.+)$/;

/** Every ayah of a sura page's `## Текст` with its meaning, between `min` and `max` characters. */
export function ayahsOf(body: string, min = 40, max = 240): { ayah: number; text: string }[] {
  const out: { ayah: number; text: string }[] = [];
  const start = body.indexOf("## Текст");
  if (start < 0) return out;
  const end = body.indexOf("\n## ", start + 8);
  let cur: number | undefined;
  for (const line of body.slice(start, end < 0 ? undefined : end).split("\n")) {
    const b = line.match(BLOCK);
    if (b) { cur = Number(b[2]); continue; }
    const k = line.match(KULIEV);
    if (k && cur !== undefined) {
      const text = k[1].replace(/\s*\([^()]*\)/g, "").replace(/\s+([.,!?;:])/g, "$1").trim(); // Kuliev's own glosses in brackets: the ayah reads at a glance without them
      if (text.length >= min && text.length <= max) out.push({ ayah: cur, text });
      cur = undefined;
    }
  }
  return out;
}

export function ayahOfDay(vault: Vault, date: string): Ayah | undefined {
  const all = suras(vault);
  if (!all.length) return undefined;
  const h = hash(date);
  for (let k = 0; k < all.length; k++) {
    const s = all[(h + k) % all.length];
    const list = ayahsOf(s.page.body);
    if (!list.length) continue;
    const a = list[(h >>> 7) % list.length];
    return { sura: s.n, ayah: a.ayah, name: s.name, text: a.text, rel: s.page.rel };
  }
  return undefined;
}
