/**
 * People pages are the app's contact book. The app owns exactly these
 * frontmatter keys on a person page and nothing else (vault CLAUDE.md, `## life/`).
 */
import type { Page } from "./types";
import type { Debt } from "./life";

export const CONTACT_KEYS = ["phone", "telegram", "whatsapp", "instagram", "email", "birthday", "last_contact"] as const;
export type ContactKey = (typeof CONTACT_KEYS)[number];
export type Contacts = Partial<Record<ContactKey, string>>;

export const CONTACT_LABELS: Record<ContactKey, string> = {
  phone: "телефон", telegram: "telegram", whatsapp: "whatsapp", instagram: "instagram", email: "email", birthday: "день рождения", last_contact: "последний контакт",
};

function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  return s ? s : undefined;
}

export function contactsOf(page: Page): Contacts {
  const c: Contacts = {};
  for (const k of CONTACT_KEYS) { const v = str(page.fm[k]); if (v) c[k] = v; }
  return c;
}

const digits = (s: string) => s.replace(/[^\d]/g, "");
const handle = (s: string) => s.replace(/^@/, "").replace(/^https?:\/\/(t\.me|instagram\.com|www\.instagram\.com)\//, "").replace(/\/$/, "");

/** External links that open a chat with the person, not just the app. */
export function deepLinks(c: Contacts): { key: ContactKey; label: string; url: string }[] {
  const out: { key: ContactKey; label: string; url: string }[] = [];
  if (c.whatsapp || c.phone) out.push({ key: "whatsapp", label: "WhatsApp", url: `https://wa.me/${digits(c.whatsapp || c.phone || "")}` });
  if (c.telegram) out.push({ key: "telegram", label: "Telegram", url: /^\+?\d[\d\s-]+$/.test(c.telegram) ? `https://t.me/+${digits(c.telegram)}` : `https://t.me/${handle(c.telegram)}` });
  if (c.instagram) out.push({ key: "instagram", label: "Instagram", url: `https://instagram.com/${handle(c.instagram)}` });
  if (c.email) out.push({ key: "email", label: "Email", url: `mailto:${c.email}` });
  if (c.phone) out.push({ key: "phone", label: "Позвонить", url: `tel:${digits(c.phone)}` });
  return out;
}

/** Debts whose `Кто` points at this person: "[[Title]]", "[[Title|alias]]" or the plain title. */
export function debtsFor(page: Page, debts: Debt[]): Debt[] {
  const names = new Set([page.title, page.file, ...page.aliases].map((s) => s.toLowerCase()));
  return debts.filter((d) => {
    const m = d.who.match(/^\[\[([^\]|#]+)/);
    const who = (m ? m[1] : d.who).trim().toLowerCase();
    return names.has(who);
  });
}

/** Days until the next birthday (0 = today). Accepts YYYY-MM-DD, MM-DD or DD.MM(.YYYY). */
export function daysToBirthday(birthday: string | undefined, today: string): number | undefined {
  if (!birthday) return undefined;
  let mm: number | undefined, dd: number | undefined;
  let m = birthday.match(/^(?:\d{4}-)?(\d{2})-(\d{2})$/);
  if (m) { mm = Number(m[1]); dd = Number(m[2]); }
  else if ((m = birthday.match(/^(\d{1,2})\.(\d{1,2})(?:\.\d{2,4})?$/))) { dd = Number(m[1]); mm = Number(m[2]); }
  if (!mm || !dd) return undefined;
  const t = new Date(today + "T12:00:00");
  let next = new Date(t.getFullYear(), mm - 1, dd, 12);
  if (next < t) next = new Date(t.getFullYear() + 1, mm - 1, dd, 12);
  return Math.round((next.getTime() - t.getTime()) / 86400000);
}

export function daysSinceContact(last: string | undefined, today: string): number | undefined {
  if (!last || !/^\d{4}-\d{2}-\d{2}$/.test(last)) return undefined;
  return Math.round((new Date(today + "T12:00:00").getTime() - new Date(last + "T12:00:00").getTime()) / 86400000);
}

/** Voices, not relationships: authors of sources living in People/ (schema 3.1). */
const AUTHOR_RE = /^(author|translator|lecturer|channel|автор|переводчик|лектор|канал)\b/i;
export function isAuthor(page: Page): boolean {
  const c = typeof page.fm.connection === "string" ? page.fm.connection : "";
  return AUTHOR_RE.test(c.trim());
}

/**
 * Two things Eldar sorts people by in his head but the vault never stored:
 * what kind of tie it is, and how close it is on his own 1–10 scale. Both are
 * his to set; nothing here guesses them once they are written down.
 */
export const CATEGORIES = ["семья", "родня", "лучший друг", "друг", "знакомый", "коллега", "наставник", "экс", "автор"] as const;
export type Category = (typeof CATEGORIES)[number];

export function categoryOf(page: Page): Category | undefined {
  const raw = typeof page.fm.category === "string" ? page.fm.category.trim().toLowerCase() : "";
  const known = CATEGORIES.find((c) => c === raw);
  if (known) return known;
  return undefined;
}

export function closenessOf(page: Page): number | undefined {
  const v = Number(page.fm.closeness);
  return Number.isFinite(v) && v > 0 && v <= 10 ? Math.round(v) : undefined;
}

/** Best guess for a page that has never been sorted, used only to seed the field. */
export function guessCategory(page: Page): Category {
  const c = (typeof page.fm.connection === "string" ? page.fm.connection : "").toLowerCase();
  const close = closenessOf(page) ?? 0;
  if (isAuthor(page)) return "автор";
  if (/бывш/.test(c)) return "экс";
  if (page.theme === "Family & relationship") {
    // "дядя (брат отца)" names a brother but is not one: the relative wins.
    if (/(дяд|тёт|тет|куда|племян|двоюродн|родственник)/.test(c)) return "родня";
    if (/(мать|отец|брат|сестр|сын|дочь|мама|папа|жена|муж)/.test(c)) return "семья";
    return "родня";
  }
  if (/наставник/.test(c)) return "наставник";
  if (/(коллег|партнёр|партнер|студент|ученик|ученица|преподавател|инвестор|админист)/.test(c)) return "коллега";
  if (close >= 9 || /лучший друг/.test(c)) return "лучший друг";
  // "познакомил" is not "знакомый" — match the noun, not the verb.
  if (/знаком(ый|ая)/.test(c)) return "знакомый";
  return "друг";
}

/**
 * The rest of Eldar's own picture of a person: where they live, what they do,
 * and who belongs to them — wife, children, a brother. His to fill, like
 * category and closeness; nothing guesses these.
 *
 * `related:` is a list of "роль: [[Имя]]" (a person with a page) or
 * "роль: Имя" (someone who has none yet).
 */
export const ROLES = ["жена", "муж", "сын", "дочь", "мать", "отец", "брат", "сестра", "дедушка", "бабушка", "дядя", "тётя", "племянник", "племянница", "невеста", "девушка", "партнёр", "друг", "коллега"] as const;

export interface Relation { role: string; name: string }

export function textOf(page: Page, key: string): string {
  return str(page.fm[key]) ?? "";
}

function listOf(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
}

const linkName = (s: string) => {
  const m = s.trim().match(/^\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]$/);
  return (m ? m[1] : s).trim();
};

export function relationsOf(page: Page): Relation[] {
  return listOf(page.fm.related).map((item) => {
    const i = item.indexOf(":");
    return i > 0 ? { role: item.slice(0, i).trim(), name: linkName(item.slice(i + 1)) } : { role: "", name: linkName(item) };
  }).filter((r) => r.name);
}

/** "[[Имя]]" when the vault has that person, the plain name otherwise. */
export function formatRelation(r: Relation, known: (name: string) => boolean): string {
  const who = known(r.name) ? `[[${r.name}]]` : r.name;
  return r.role ? `${r.role}: ${who}` : who;
}

/** Who names this page in their own `related:` — the other side of a tie. */
export function relatedFrom(page: Page, pages: Page[]): { page: Page; role: string }[] {
  const names = new Set([page.title, page.file, ...page.aliases].map((s) => s.toLowerCase()));
  const out: { page: Page; role: string }[] = [];
  for (const p of pages) {
    if (p === page || p.zone !== "person") continue;
    for (const r of relationsOf(p)) if (names.has(r.name.toLowerCase())) out.push({ page: p, role: r.role });
  }
  return out;
}
