/**
 * «Тренировки»: the muscle map, the exercises and the week's strength days.
 * The data is a vault file (`scripts/training/training.json`, built by the
 * vault's `scripts/training/build.mjs`) and the animations sit beside it in
 * `scripts/training/anim/`; the app carries no exercise text, no program and no
 * pictures of its own — only the drawing code.
 */
import { inTauri, mediaUrl } from "./native";

export const TRAINING_DIR = "scripts/training";
export const TRAINING_JSON = `${TRAINING_DIR}/training.json`;

export type Pt = [number, number];
/** A muscle (id) or a neutral part (null), its polygon, and whether it is drawn mirrored too. */
export type Part = [string | null, Pt[], boolean];
/** A neutral ellipse `['e', cx, cy, rx, ry]` or polygon `['p', points]`. */
export type Neutral = ["e", number, number, number, number] | ["p", Pt[]];

export interface Muscle { id: string; name: string; lat: string; group: string; does: string; how: string }
export interface Equip { id: string; name: string; note?: string }
export interface Exercise { id: string; eq: string; name: string; p: string[]; s: string[]; cues: string[]; later?: boolean }
/** [exercise id, sets, reps]. */
export type Item = [string, number | string, string];
export interface WorkDay { k: string; name: string; focus: string; items: Item[] }
export interface Program { source?: string; from: string; to?: string; goal: string; week: [string, string][]; days: WorkDay[]; rules: string[]; research: string[]; track: string }
export interface TrainingData {
  MUSCLES: Muscle[]; EQUIP: Equip[]; EX: Exercise[]; PROGRAM: Program;
  /** id → `gl:<path>` (one gif) or `fdb:<folder>` (two frames). */
  ANIM: Record<string, string>;
  BODY: { FRONT: Part[]; BACK: Part[]; NEUTRAL: Neutral[] };
}

/** 'p' — the main muscle, 's' — the one that helps. */
export type Hit = Record<string, "p" | "s">;

export async function loadTraining(root: string): Promise<TrainingData> {
  if (inTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    const text = await invoke<string>("read_text", { root, rel: TRAINING_JSON }).catch(() => null);
    if (text === null) throw new Error(`нет файла ${TRAINING_JSON}`);
    return JSON.parse(text) as TrainingData;
  }
  const r = await fetch(mediaUrl(root, TRAINING_JSON));
  if (!r.ok) throw new Error(`нет файла ${TRAINING_JSON}`);
  return (await r.json()) as TrainingData;
}

export const mirror = (p: Pt[]): Pt[] => p.map(([x, y]) => [200 - x, y]);
export const points = (p: Pt[]) => p.map(([x, y]) => `${x},${y}`).join(" ");

export function hitExercise(e: Exercise): Hit {
  const h: Hit = {};
  for (const m of e.s) h[m] = "s";
  for (const m of e.p) h[m] = "p";
  return h;
}

/** Every muscle a day works: main if any of its exercises makes it main. */
export function hitDay(d: WorkDay, ex: Record<string, Exercise>): Hit {
  const h: Hit = {};
  for (const [id] of d.items) {
    const e = ex[id];
    if (!e) continue;
    for (const m of e.s) h[m] ??= "s";
    for (const m of e.p) h[m] = "p";
  }
  return h;
}

/** Where an exercise stands in the program: the days and their sets × reps. */
export function inProgram(p: Program): Record<string, { k: string; sets: Item[1]; reps: string }[]> {
  const out: Record<string, { k: string; sets: Item[1]; reps: string }[]> = {};
  for (const d of p.days) for (const [id, sets, reps] of d.items) (out[id] ??= []).push({ k: d.k, sets, reps });
  return out;
}

/** Monday-first index of a date (пн 0 … вс 6). */
export const mondayIndex = (date: string) => (new Date(`${date}T12:00:00`).getDay() + 6) % 7;

/** The week of the program a date falls in, 1-based; undefined before it starts. */
export function programWeek(p: Program, date: string): number | undefined {
  const d = Math.floor((Date.parse(`${date}T12:00:00`) - Date.parse(`${p.from}T12:00:00`)) / 864e5);
  return d < 0 ? undefined : Math.floor(d / 7) + 1;
}

/** The strength day of a date, when the week's row names one. */
export function dayOf(p: Program, date: string): WorkDay | undefined {
  const v = p.week[mondayIndex(date)]?.[1];
  return p.days.find((d) => d.k === v);
}

export type Frames = { kind: "gif"; src: string } | { kind: "two"; src: [string, string] };

/** The animation of an exercise as files under `anim/`, or none. */
export function framesOf(root: string, anim: Record<string, string>, id: string): Frames | undefined {
  const a = anim[id];
  if (!a) return undefined;
  const at = (f: string) => mediaUrl(root, `${TRAINING_DIR}/anim/${f}`);
  return a.startsWith("gl:") ? { kind: "gif", src: at(`${id}.gif`) } : { kind: "two", src: [at(`${id}-0.jpg`), at(`${id}-1.jpg`)] };
}
