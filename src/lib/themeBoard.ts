/**
 * The activities board of a theme page (spec v4 «Деятельности»): the theme's
 * active and paused activities in three lanes by stage — идёт · ждёт · стоит —
 * each card with four lists of its steps: делаю · не делаю · сделано · не сделано.
 */
import { activityView, plainLinks, plainStep, type ActivityView } from "./dashboard";
import { QUEST_STAGES, questDescription, questSteps, stepTally, type Life, type QuestStage, type QuestStep } from "./life";

export type Stage = QuestStage;
export const STAGES: readonly Stage[] = QUEST_STAGES;

export interface BoardCard {
  view: ActivityView;
  stage: Stage;
  /** `stage_note:` — his words about the stage, with a date. */
  note?: string;
  /** The first sentence of the description. */
  what: string;
  /** Делаю: the lines under `## Сейчас`. */
  doing: string[];
  /** Не делаю: the `- [-]` steps. */
  notDoing: string[];
  /** Сделано: the last three ticked steps, newest `✓` date first. */
  done: { text: string; on?: string }[];
  /** Не сделано: the first three open steps and who does each. */
  open: { text: string; who?: string }[];
  /** «N из M шагов», a `[-]` step in neither. */
  steps: { done: number; total: number };
}

/** Every line under `## Сейчас`: a bullet with its indented continuation, or a plain line. */
export function nowLines(body: string): string[] {
  const lines = body.split(/\r?\n/);
  const at = lines.findIndex((l) => /^## Сейчас\s*$/.test(l));
  const out: string[] = [];
  if (at < 0) return out;
  for (const l of lines.slice(at + 1)) {
    if (/^## /.test(l)) break;
    const m = l.match(/^[-*]\s+(?:\[[ xX-]\]\s*)?(.+)$/);
    if (m) out.push(m[1].trim());
    else if (/^\s+\S/.test(l) && out.length) out[out.length - 1] += " " + l.trim();
    else if (l.trim()) out.push(l.trim());
  }
  return out;
}

/** The first sentence of a description, in plain words. */
export function firstSentence(md: string): string {
  const flat = plainStep(md.replace(/\*\*|__/g, "").replace(/\s+/g, " ").trim());
  return (flat.match(/^(.+?[.!?])(?:\s|$)/)?.[1] ?? flat).trim();
}

/** A step as the card prints it: plain words, no bold. */
const plain = (s: string) => plainStep(s).replace(/\*\*/g, "");

const DOER = /^(?:\*\*)?(?:ты|Claude|вместе|Эльдар|дилер)(?:\*\*)?(?=$|[\s;,.+:)])/i;

/** «шаг — Claude», «шаг — ты и Gemini»: the step and who does it, cut at the first « — » that is followed by a doer. */
export function owner(text: string): { text: string; who?: string } {
  const parts = text.split(" — ");
  for (let i = 1; i < parts.length; i++) {
    if (DOER.test(parts[i].trim())) return { text: plain(parts.slice(0, i).join(" — ")), who: plainLinks(parts.slice(i).join(" — ")).replace(/\*\*/g, "").trim() };
  }
  return { text: plain(text) };
}

const TICK = /✓\s*(\d{4}-\d{2}-\d{2})/g;

function lastDone(steps: QuestStep[]): { text: string; on?: string }[] {
  return steps
    .map((s, i) => ({ s, i, on: [...`${s.text}\n${s.detail}`.matchAll(TICK)].map((m) => m[1]).sort().pop() }))
    .filter((x) => x.s.done && !x.s.dropped)
    .sort((a, b) => (b.on ?? "").localeCompare(a.on ?? "") || b.i - a.i)
    .slice(0, 3)
    .map((x) => {
      const text = owner(x.s.text.replace(/\s*✓\s*\d{4}-\d{2}-\d{2}/g, "").trim()).text;
      return x.on ? { text, on: x.on } : { text };
    });
}

function card(view: ActivityView): BoardCard {
  const q = view.quest;
  const steps = questSteps(q.body);
  const c: BoardCard = {
    view,
    stage: q.stage ?? (view.state === "moving" ? "идёт" : "стоит"),
    what: firstSentence(questDescription(q.body).split(/^## /m)[0]),
    doing: nowLines(q.body).map(plain),
    notDoing: steps.filter((s) => s.dropped).map((s) => plain(s.text)),
    done: lastDone(steps),
    open: steps.filter((s) => !s.done && !s.dropped).slice(0, 3).map((s) => owner(s.text)),
    steps: stepTally(steps),
  };
  if (q.stageNote) c.note = q.stageNote;
  return c;
}

/** The theme's active and paused activities; the stage is `stage:`, else «идёт» while it moves (v3), else «стоит». */
export function boardCards(life: Life, theme: string, today: string): BoardCard[] {
  return life.quests
    .filter((q) => q.theme === theme && (q.status === "active" || q.status === "paused"))
    .map((q) => card(activityView(q, life.days, today)))
    .sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || a.view.quest.title.localeCompare(b.view.quest.title, "ru"));
}
