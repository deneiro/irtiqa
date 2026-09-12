/** The profile page (Eldar Baurzhan.md) as a hub: one card per H2 section. */
import { splitSections, type OverviewSection } from "./overview";

export interface ProfileSection extends OverviewSection {
  slug: string;
  label: string;
  icon: string;
  /** Where in the app this part of life is lived. */
  live?: { to: string; label: string };
  words: number;
  excerpt: string;
}

const META: Record<string, { label: string; icon: string; live?: { to: string; label: string } }> = {
  "Identity": { label: "Кто я", icon: "🪞", live: { to: "/theme/Personal%20growth", label: "Личностный рост" } },
  "Family": { label: "Семья", icon: "🏠", live: { to: "/theme/Family%20%26%20relationship", label: "Семья и отношения" } },
  "Friends and circle": { label: "Друзья и круг", icon: "🤝", live: { to: "/people", label: "Люди" } },
  "Career": { label: "Карьера", icon: "💼", live: { to: "/theme/Business%20%26%20career", label: "Бизнес и карьера" } },
  "Skills": { label: "Навыки", icon: "🛠", live: { to: "/theme/Personal%20growth", label: "Инструменты" } },
  "Finances": { label: "Финансы", icon: "💰", live: { to: "/finance", label: "Финансы" } },
  "Health": { label: "Здоровье", icon: "🫀", live: { to: "/theme/Health%20%26%20sport", label: "Здоровье и спорт" } },
  "Faith": { label: "Вера", icon: "🕌", live: { to: "/theme/Spirituality%20%26%20Religion", label: "Духовность" } },
  "Romantic": { label: "Отношения", icon: "❤️", live: { to: "/theme/Family%20%26%20relationship", label: "Семья и отношения" } },
  "Goals": { label: "Цели", icon: "🎯", live: { to: "/quests", label: "Квесты" } },
  "Long-arc vision": { label: "Дальний горизонт", icon: "🧭" },
  "Reading": { label: "Чтение", icon: "📚", live: { to: "/vault", label: "Библиотека" } },
  "Delight and flow": { label: "Радость и поток", icon: "✨", live: { to: "/theme/Memories%20%26%20Fun", label: "Память и радость" } },
  "Habits methodology": { label: "Как работают привычки", icon: "🔁", live: { to: "/habits", label: "Привычки" } },
  "How to work with Eldar": { label: "Как со мной работать", icon: "🧩" },
};

function plain(md: string): string {
  return md
    .replace(/^#+ .*$/gm, "")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_, a, b) => b || a)
    .replace(/[*_`>]/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugOf(heading: string): string {
  return heading.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "");
}

export function profileSections(body: string): { intro: string; sections: ProfileSection[] } {
  const { intro, sections } = splitSections(body);
  const out = sections
    .filter((s) => s.heading !== "Changes")
    .map((s) => {
      const key = Object.keys(META).find((k) => s.heading.startsWith(k));
      const m = key ? META[key] : { label: s.heading, icon: "📄" as const };
      const text = plain(s.md);
      return { ...s, slug: slugOf(s.heading), label: s.heading.startsWith("Колесо") ? "Колесо жизни" : m.label, icon: s.heading.startsWith("Колесо") ? "☸️" : m.icon, live: s.heading.startsWith("Колесо") ? { to: "/wheel", label: "Колесо" } : m.live, words: s.md.split(/\s+/).length, excerpt: text.slice(0, 170) + (text.length > 170 ? "…" : "") };
    });
  return { intro, sections: out };
}

/** An H3 sub-block of a section, e.g. «Ближайшие лягушки» under Goals. */
export function subSection(md: string, titleRe: RegExp): string | undefined {
  const parts = md.split(/^### (.*)$/m);
  for (let i = 1; i < parts.length; i += 2) if (titleRe.test(parts[i])) return parts[i + 1].trim();
  return undefined;
}
