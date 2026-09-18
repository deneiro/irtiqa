/**
 * The subagents defined in the vault's `.claude/agents/`. The app only names
 * one; the definition — what it reads, what it may write, what it must never
 * forget about Eldar — lives in the vault next to the knowledge itself.
 *
 * Two kinds. A `theme` expert answers questions about its own theme. A `role`
 * operator runs a line of work instead of advising on it: its own style, its
 * own desk, and it drafts but never sends. Roles stay out of theme routing on
 * purpose — both live inside «Бизнес и карьера», and that theme's expert is
 * `karera`.
 */
export interface Agent {
  slug: string;
  label: string;
  theme: string | undefined;
  kind: "theme" | "role";
  /** Tooltip: the theme for an expert, what it actually does for a role. */
  hint?: string;
}

export const AGENTS: Agent[] = [
  { slug: "shturman", label: "Штурман", theme: undefined, kind: "theme", hint: "видит весь vault и маршрутизирует" },
  { slug: "duhovnost", label: "Духовность", theme: "Spirituality & Religion", kind: "theme" },
  { slug: "druzya", label: "Друзья", theme: "Social & friends", kind: "theme" },
  { slug: "rost", label: "Рост", theme: "Personal growth", kind: "theme" },
  { slug: "zdorovie", label: "Здоровье", theme: "Health & sport", kind: "theme" },
  { slug: "dengi", label: "Деньги", theme: "Finance & money", kind: "theme" },
  { slug: "semya", label: "Семья", theme: "Family & relationship", kind: "theme" },
  { slug: "karera", label: "Карьера", theme: "Business & career", kind: "theme" },
  { slug: "dosug", label: "Досуг", theme: "Memories & Fun", kind: "theme" },
  { slug: "eldar-et1", label: "ET1 · английский", theme: "Business & career", kind: "role", hint: "Eldar-ET1: уроки, методика, силлабус, воркшиты, группы, ученики, заявки" },
  { slug: "eldar-jh1", label: "JH1 · работа", theme: "Business & career", kind: "role", hint: "Eldar-JH1: вакансии, резюме, письма, ответы HR, мальдивская рассылка" },
];

export const EXPERTS = AGENTS.filter((a) => a.kind === "theme");
export const ROLES = AGENTS.filter((a) => a.kind === "role");

/** Theme routing never lands on a role: an expert owns the theme, a role owns a line of work. */
export function agentForTheme(theme: string | undefined): Agent {
  return EXPERTS.find((a) => a.theme && a.theme === theme) ?? EXPERTS[0];
}

export function agentLabel(slug: string | undefined): string {
  return AGENTS.find((a) => a.slug === slug)?.label ?? "Штурман";
}
