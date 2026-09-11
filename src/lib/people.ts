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
