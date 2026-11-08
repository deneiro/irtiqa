/**
 * People pages are the app's contact book. The app owns exactly these
 * frontmatter keys on a person page and nothing else (vault CLAUDE.md, `## life/`).
 */
import type { Page } from "./types";
import { safeFilename, type Debt } from "./life";

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

/**
 * Where he knows a person from — a class (12C), a centre (Crocus), a town (Shym), a branch of the family (Куда).
 * His word, `group:` (Eldar, 2026-11-08: «тега нету только у моей семьи и самых близких друзей»). One word or a list.
 */
export function groupsOf(page: Page): string[] {
  const v = page.fm.group;
  const xs = Array.isArray(v) ? v.map(String) : typeof v === "string" || typeof v === "number" ? String(v).split(",") : [];
  return xs.map((s) => s.trim()).filter(Boolean);
}

/** Every group in use, the biggest first. */
export function allGroups(pages: Page[]): { name: string; n: number }[] {
  const m = new Map<string, number>();
  for (const p of pages) for (const g of groupsOf(p)) m.set(g, (m.get(g) ?? 0) + 1);
  return [...m].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
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

// ---------- a new person page (the Telegram bot's «👤 Человек») ----------

/** Since schema 4.1 every person page lives in one folder; `theme:` names the tie. */
export const PEOPLE_DIR = "wiki/People";

export const personRel = (title: string) => `${PEOPLE_DIR}/${title}.md`;

/** A name longer than this is a sentence, not a name. */
export const NAME_MAX = 60;

/**
 * A page title that is also a file name: what the vault forbids in a name
 * (`\ / : * ? " < > | # [ ] ^`) is dropped, spaces are single, and no leading
 * `.` or `_` (a hidden or a special file). Empty when nothing is left.
 */
export function safeTitle(name: string): string {
  return safeFilename(name).replace(/\s+/g, " ").replace(/^[._\s]+/, "").trim();
}

/** What the bot offers for «Кто он тебе?»: the words on the buttons and the theme each one means. «другое» is Social & friends too. */
export const PERSON_THEMES: { code: string; label: string; theme: string }[] = [
  { code: "friends", label: "друзья", theme: "Social & friends" },
  { code: "family", label: "семья", theme: "Family & relationship" },
  { code: "business", label: "бизнес", theme: "Business & career" },
  { code: "faith", label: "духовность", theme: "Spirituality & Religion" },
  { code: "other", label: "другое", theme: "Social & friends" },
];

/**
 * The form in which two spellings of one name are compared: Unicode NFC (a
 * macOS file name may be decomposed), lower case, «ё» as «е», single spaces,
 * trimmed. Two names are the same name when their keys are equal; the key of a
 * blank string is "".
 */
export function nameKey(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

/**
 * The person page a name means, or undefined. Names are compared by `nameKey`.
 * A page whose title or file name is the name wins over a page that has it
 * only as an alias; the first such page in `pages` is returned. A blank name
 * matches nothing. Pass the person pages (`zone === "person"`); nothing is
 * created here.
 */
export function findPerson<T extends Pick<Page, "title" | "file" | "aliases">>(pages: T[], name: string): T | undefined {
  const k = nameKey(name);
  if (!k) return undefined;
  return pages.find((p) => nameKey(p.title) === k || nameKey(p.file) === k) ?? pages.find((p) => p.aliases.some((a) => nameKey(a) === k));
}

/** A frontmatter value on one line; anything YAML could read as something else than text is quoted. */
function yamlText(v: string): string {
  return /[:#"'\[\]{}\\]|^[-?&*!|>%@`,.+~\d]|^(true|false|null|yes|no|on|off)$/i.test(v) ? JSON.stringify(v) : v;
}

/**
 * The markdown of a new person page, to be saved as `personRel(title)`.
 * - `title`: the page title and, by the vault's rule, the file name; pass it
 *   through `safeTitle` first.
 * - `theme`: one of the eight theme names, verbatim (see `PERSON_THEMES`).
 * - `connection`, `howWeMet`: one line each, as typed; a blank one is written
 *   as «—» (the app's own blank for `how_we_met`) and nothing is guessed.
 * - `date`: today, `YYYY-MM-DD`; it is `created`, `updated` and the date in the
 *   two lines of the body.
 * Frontmatter: `title`, `type: person`, `theme`, `connection`, `how_we_met`,
 * `created`, `updated`, `aliases: []`, `tags: []`; a value YAML could read as
 * something else than text is quoted. Body: `# title`, `## Об отношениях` with
 * one line, `## Changes` with one line. The keys that belong to the app and to
 * the owner (`last_contact`, `closeness`, `radicals`, `category`, `lives`,
 * `work`, `related`, the contact fields) are never written by the bot.
 * - `app`: the page of the app's «+ Добавить человека» (spec v5): `category`
 *   and `closeness` are written when he chose them there, and the body is
 *   `# title` and an empty `## Об отношениях`, as the app always wrote it.
 */
export function personPage(p: { title: string; theme: string; connection: string; howWeMet: string; date: string; app?: { category?: string; closeness?: number } }): string {
  const line = (s: string) => s.replace(/\s+/g, " ").trim() || "—";
  const own = [
    ...(p.app?.category ? [`category: ${yamlText(p.app.category)}`] : []),
    ...(p.app?.closeness ? [`closeness: "${p.app.closeness}"`] : []),
  ];
  const body = p.app ? [""] : [
    `Добавлен через бота ${p.date}.`,
    "",
    "## Changes",
    "",
    `- ${p.date} — страница создана через бота`,
    "",
  ];
  return [
    "---",
    `title: ${yamlText(p.title)}`,
    "type: person",
    `theme: ${p.theme}`,
    `connection: ${yamlText(line(p.connection))}`,
    `how_we_met: ${yamlText(line(p.howWeMet))}`,
    ...own,
    `created: ${p.date}`,
    `updated: ${p.date}`,
    "aliases: []",
    "tags: []",
    "---",
    "",
    `# ${p.title}`,
    "",
    "## Об отношениях",
    "",
    ...body,
  ].join("\n");
}

// ---------- a new person page in the app («+ Добавить человека») ----------

/** «Кем приходится» in «+ Добавить человека»: the eight kinds of tie; an author is not one. */
export const PERSON_CATEGORIES = CATEGORIES.filter((c) => c !== "автор");

export interface NewPerson { name: string; category?: string; closeness?: number; how: string; theme: string }

/**
 * «+ Добавить человека» (spec v5): the app's checks around the bot's
 * `personPage` — the name as `safeTitle`, the file `personRel`; `connection:`
 * is the chosen category or «знакомый», `how_we_met:` is «—» when skipped,
 * `category:` and `closeness:` only when he chose them. Throws when the name
 * makes no file name, is longer than a name, or the person is already there
 * (`rels`: the pages of the vault).
 */
export function newPersonPage(p: NewPerson, today: string, rels: string[]): { rel: string; content: string } {
  const title = safeTitle(p.name);
  if (!title) throw new Error("Такое имя не годится для файла");
  if (title.length > NAME_MAX) throw new Error(`Имя — не длиннее ${NAME_MAX} знаков`);
  const rel = personRel(title);
  if (rels.some((r) => nameKey(r) === nameKey(rel))) throw new Error("Такой человек уже есть");
  const category = PERSON_CATEGORIES.find((c) => c === p.category);
  const closeness = p.closeness !== undefined && Number.isInteger(p.closeness) && p.closeness >= 1 && p.closeness <= 10 ? p.closeness : undefined;
  return { rel, content: personPage({ title, theme: p.theme, connection: category ?? "знакомый", howWeMet: p.how, date: today, app: { category, closeness } }) };
}
