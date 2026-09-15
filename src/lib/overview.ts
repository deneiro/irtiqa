/**
 * A theme's _Overview.md is its dashboard. Schema 3.1 gives it a fixed
 * skeleton (Где стою / В движении / На радаре / own sections / Заметки /
 * Changes) and a `sections:` list that says what the theme holds.
 */
import type { Page } from "./types";
import { asList } from "./vault";

export interface OverviewSection { heading: string; md: string }

export type SectionKey =
  | "state" | "resource" | "wiki" | "people" | "projects" | "profile"
  | "tools" | "template" | "summary" | "reverend" | "habits" | "finance" | "events" | "skills"
  | "nutrition" | "sport";

const DEFAULT_SECTIONS: SectionKey[] = ["state", "resource", "wiki", "people"];

export function themeSections(overview: Page | undefined): SectionKey[] {
  const list = overview ? asList(overview.fm.sections) : [];
  return list.length ? (list as SectionKey[]) : DEFAULT_SECTIONS;
}

export function splitSections(body: string): { intro: string; sections: OverviewSection[] } {
  const clean = body.replace(/^\s*# [^\n]*\n/, "");
  const parts = clean.split(/^## (.*)$/m);
  const sections: OverviewSection[] = [];
  for (let i = 1; i < parts.length; i += 2) sections.push({ heading: parts[i].trim(), md: parts[i + 1].trim() });
  return { intro: parts[0].trim(), sections };
}

const RE = {
  stand: /^(Где стою|Where things stand)/i,
  motion: /^(В движении|In motion)/i,
  radar: /^(На радаре|On the radar)/i,
  notes: /^(Заметки|Notes)$/i,
  changes: /^Changes$/i,
  why: /^(Зачем эта тема|What this folder is for)$/i,
};

export interface ThemeState {
  intro: string;
  stand: OverviewSection[];
  motion: OverviewSection[];
  radar: OverviewSection[];
  extra: OverviewSection[];
  notes: string | undefined;
}

/** Suffix after " — " (Семья / Отношения), or "" for the plain heading. */
export function sectionSuffix(heading: string): string {
  const i = heading.indexOf(" — ");
  return i >= 0 ? heading.slice(i + 3) : "";
}

export function themeState(overview: Page | undefined): ThemeState {
  const st: ThemeState = { intro: "", stand: [], motion: [], radar: [], extra: [], notes: undefined };
  if (!overview) return st;
  const { intro, sections } = splitSections(overview.body);
  st.intro = intro;
  for (const s of sections) {
    if (RE.changes.test(s.heading)) continue;
    if (RE.why.test(s.heading)) { st.intro = [st.intro, s.md].filter(Boolean).join("\n\n"); continue; }
    if (RE.stand.test(s.heading)) st.stand.push(s);
    else if (RE.motion.test(s.heading)) st.motion.push(s);
    else if (RE.radar.test(s.heading)) st.radar.push(s);
    else if (RE.notes.test(s.heading)) st.notes = s.md;
    else st.extra.push(s);
  }
  return st;
}
