/**
 * The nine experts defined in the vault's `.claude/agents/`. The app only names
 * one; the definition — what it reads, what it may write, what it must never
 * forget about Eldar — lives in the vault next to the knowledge itself.
 */
export interface Agent {
  slug: string;
  label: string;
  theme: string | undefined;
}

export const AGENTS: Agent[] = [
  { slug: "shturman", label: "Штурман", theme: undefined },
  { slug: "duhovnost", label: "Духовность", theme: "Spirituality & Religion" },
  { slug: "druzya", label: "Друзья", theme: "Social & friends" },
  { slug: "rost", label: "Рост", theme: "Personal growth" },
  { slug: "zdorovie", label: "Здоровье", theme: "Health & sport" },
  { slug: "dengi", label: "Деньги", theme: "Finance & money" },
  { slug: "semya", label: "Семья", theme: "Family & relationship" },
  { slug: "karera", label: "Карьера", theme: "Business & career" },
  { slug: "dosug", label: "Досуг", theme: "Memories & Fun" },
];

export function agentForTheme(theme: string | undefined): Agent {
  return AGENTS.find((a) => a.theme && a.theme === theme) ?? AGENTS[0];
}

export function agentLabel(slug: string | undefined): string {
  return AGENTS.find((a) => a.slug === slug)?.label ?? "Штурман";
}
