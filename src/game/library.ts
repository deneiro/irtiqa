import type { AttributeKey } from './types';
import { t } from '../i18n';

/**
 * The Library: one sector, everything worth knowing about it.
 *
 * The Wheel pages already answer "what is this sector and what can I put in it".
 * They did not answer the question underneath it — *why would I*. A player who
 * has never thought about their Family sector does not need forty templates,
 * they need one honest page that changes how they see the sector, and then the
 * two habits that page argues for.
 *
 * So each entry is a distilled source — a book, a podcast, a lecture — written
 * out in full and ending in the practices it actually implies. Read it, then add
 * what it convinced you of, in one tap, without ever seeing a blank field.
 *
 * Rules this file holds to:
 *   · Knowledge only. No author biographies, no "about the guest", no filler.
 *     A name appears when a claim belongs to it, and nowhere else.
 *   · Every practice links a template that already exists in `templates.ts` by
 *     id — the library never mints a second, parallel habit model. `library.test.ts`
 *     fails the build if an id here does not resolve.
 *   · Claims stay attributed and hedged where the source hedged. A practitioner's
 *     clinical estimate is written as one, not promoted into a fact. This library
 *     is the one surface that teaches; teaching something false costs more than
 *     teaching nothing.
 *
 * Entries are distilled from the source notes in Eldar's vault (`vaultSource`),
 * rewritten into English for the app. Adding an entry is data-only: append here,
 * and it appears on its sector page.
 */

export type LibraryMedium = 'book' | 'podcast' | 'lecture' | 'paper';

/** A template this source argues for, and the sentence that makes the argument. */
export interface LibraryPractice {
  /** id in HABIT_TEMPLATES or QUEST_TEMPLATES. */
  id: string;
  /** Why *this* source puts you onto *this* practice. One line, its own reasoning. */
  because: string;
}

export interface LibraryIdea {
  name: string;
  body: string;
}

export interface LibraryEntry {
  /** URL segment: /attributes/:attr/library/:slug */
  slug: string;
  attr: AttributeKey;
  title: string;
  /** Where it came from — the work, not the person's CV. */
  origin: string;
  medium: LibraryMedium;
  /** Honest reading time for the entry itself, in minutes. */
  minutes: number;
  /** The card subtitle: what changes if you read this. */
  hook: string;
  /** The single claim the whole source rests on. */
  thesis: string;
  ideas: LibraryIdea[];
  /** Standalone facts and positions worth carrying out of it. */
  notes: string[];
  /** What the source says to actually do, in its own terms. */
  practices: string[];
  habits: LibraryPractice[];
  quests: LibraryPractice[];
  /** Provenance line, shown at the foot of the entry. */
  vaultSource: string;
}

// The Library entries themselves stay English for now; these four labels are chrome
// around them and follow the interface language. Real getters on the record, so
// `MEDIUM_LABEL[m]` is still a string at every call site.
export const MEDIUM_LABEL = (() => {
  const out = {} as Record<LibraryMedium, string>;
  for (const k of ['book', 'podcast', 'lecture', 'paper'] as LibraryMedium[]) {
    Object.defineProperty(out, k, { get: () => t(`medium.${k}`), enumerable: true });
  }
  return out;
})();

export const LIBRARY: LibraryEntry[] = [
  // ---------------- Health ----------------

  // ---------------- Family ----------------

  // ---------------- Development ----------------

  // ---------------- Career ----------------

  // ---------------- Development (2) ----------------

  // ---------------- Health (2) ----------------

  // ---------------- Money ----------------

  // ---------------- Friends ----------------

  // ---------------- Spirituality ----------------

  // ---------------- Brightness ----------------
  {
    slug: 'health-is-cumulative',
    attr: 'health',
    get title() { return t('lib.health-is-cumulative.title'); },
    get origin() { return t('lib.health-is-cumulative.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.health-is-cumulative.hook'); },
    get thesis() { return t('lib.health-is-cumulative.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.health-is-cumulative.idea.${i}.name`),
        body: t(`lib.health-is-cumulative.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.health-is-cumulative.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.health-is-cumulative.practice.${i}`));
    },
    habits: [
      { id: 'h_nolate', get because() { return t('lib.health-is-cumulative.habit.h_nolate.because'); } },
      { id: 'h_realmeal', get because() { return t('lib.health-is-cumulative.habit.h_realmeal.because'); } },
      { id: 'h_steps', get because() { return t('lib.health-is-cumulative.habit.h_steps.because'); } },
      { id: 'h_lightsout', get because() { return t('lib.health-is-cumulative.habit.h_lightsout.because'); } },
    ],
    quests: [
      { id: 'q_healthcheck', get because() { return t('lib.health-is-cumulative.quest.q_healthcheck.because'); } },
      { id: 'q_energyaudit', get because() { return t('lib.health-is-cumulative.quest.q_energyaudit.because'); } },
    ],
    get vaultSource() { return t('lib.health-is-cumulative.vaultSource'); },
  },
  {
    slug: 'cheap-and-expensive-dopamine',
    attr: 'health',
    get title() { return t('lib.cheap-and-expensive-dopamine.title'); },
    get origin() { return t('lib.cheap-and-expensive-dopamine.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.cheap-and-expensive-dopamine.hook'); },
    get thesis() { return t('lib.cheap-and-expensive-dopamine.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.cheap-and-expensive-dopamine.idea.${i}.name`),
        body: t(`lib.cheap-and-expensive-dopamine.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.cheap-and-expensive-dopamine.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.cheap-and-expensive-dopamine.practice.${i}`));
    },
    habits: [
      { id: 'h_noscreen_bed', get because() { return t('lib.cheap-and-expensive-dopamine.habit.h_noscreen_bed.because'); } },
      { id: 'd_nopassive', get because() { return t('lib.cheap-and-expensive-dopamine.habit.d_nopassive.because'); } },
      { id: 'h_walk10', get because() { return t('lib.cheap-and-expensive-dopamine.habit.h_walk10.because'); } },
      { id: 'b_outside', get because() { return t('lib.cheap-and-expensive-dopamine.habit.b_outside.because'); } },
    ],
    quests: [
      { id: 'q_sleepreset', get because() { return t('lib.cheap-and-expensive-dopamine.quest.q_sleepreset.because'); } },
      { id: 'q_energyaudit', get because() { return t('lib.cheap-and-expensive-dopamine.quest.q_energyaudit.because'); } },
    ],
    get vaultSource() { return t('lib.cheap-and-expensive-dopamine.vaultSource'); },
  },
  {
    slug: 'infatuation-and-mature-love',
    attr: 'family',
    get title() { return t('lib.infatuation-and-mature-love.title'); },
    get origin() { return t('lib.infatuation-and-mature-love.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.infatuation-and-mature-love.hook'); },
    get thesis() { return t('lib.infatuation-and-mature-love.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.infatuation-and-mature-love.idea.${i}.name`),
        body: t(`lib.infatuation-and-mature-love.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.infatuation-and-mature-love.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.infatuation-and-mature-love.practice.${i}`));
    },
    habits: [
      { id: 'fa_listen', get because() { return t('lib.infatuation-and-mature-love.habit.fa_listen.because'); } },
      { id: 'fa_noraise', get because() { return t('lib.infatuation-and-mature-love.habit.fa_noraise.because'); } },
      { id: 'f_remember', get because() { return t('lib.infatuation-and-mature-love.habit.f_remember.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.infatuation-and-mature-love.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.infatuation-and-mature-love.vaultSource'); },
  },
  {
    slug: 'relationships-without-nerves',
    attr: 'family',
    get title() { return t('lib.relationships-without-nerves.title'); },
    get origin() { return t('lib.relationships-without-nerves.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.relationships-without-nerves.hook'); },
    get thesis() { return t('lib.relationships-without-nerves.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.relationships-without-nerves.idea.${i}.name`),
        body: t(`lib.relationships-without-nerves.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.relationships-without-nerves.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.relationships-without-nerves.practice.${i}`));
    },
    habits: [
      { id: 'fa_meal', get because() { return t('lib.relationships-without-nerves.habit.fa_meal.because'); } },
      { id: 'f_thanks', get because() { return t('lib.relationships-without-nerves.habit.f_thanks.because'); } },
      { id: 'f_remember', get because() { return t('lib.relationships-without-nerves.habit.f_remember.because'); } },
      { id: 'fa_noraise', get because() { return t('lib.relationships-without-nerves.habit.fa_noraise.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.relationships-without-nerves.quest.q_hardconversation.because'); } },
      { id: 'q_reconnect', get because() { return t('lib.relationships-without-nerves.quest.q_reconnect.because'); } },
    ],
    get vaultSource() { return t('lib.relationships-without-nerves.vaultSource'); },
  },
  {
    slug: 'attachment-and-the-four-horsemen',
    attr: 'family',
    get title() { return t('lib.attachment-and-the-four-horsemen.title'); },
    get origin() { return t('lib.attachment-and-the-four-horsemen.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.attachment-and-the-four-horsemen.hook'); },
    get thesis() { return t('lib.attachment-and-the-four-horsemen.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.attachment-and-the-four-horsemen.idea.${i}.name`),
        body: t(`lib.attachment-and-the-four-horsemen.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.attachment-and-the-four-horsemen.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.attachment-and-the-four-horsemen.practice.${i}`));
    },
    habits: [
      { id: 'fa_noraise', get because() { return t('lib.attachment-and-the-four-horsemen.habit.fa_noraise.because'); } },
      { id: 'f_invite', get because() { return t('lib.attachment-and-the-four-horsemen.habit.f_invite.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.attachment-and-the-four-horsemen.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.attachment-and-the-four-horsemen.vaultSource'); },
  },
  {
    slug: 'lust-romance-attachment',
    attr: 'family',
    get title() { return t('lib.lust-romance-attachment.title'); },
    get origin() { return t('lib.lust-romance-attachment.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.lust-romance-attachment.hook'); },
    get thesis() { return t('lib.lust-romance-attachment.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.lust-romance-attachment.idea.${i}.name`),
        body: t(`lib.lust-romance-attachment.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 2 }, (_, i) => t(`lib.lust-romance-attachment.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.lust-romance-attachment.practice.${i}`));
    },
    habits: [
      { id: 'b_new', get because() { return t('lib.lust-romance-attachment.habit.b_new.because'); } },
      { id: 'fa_meal', get because() { return t('lib.lust-romance-attachment.habit.fa_meal.because'); } },
    ],
    quests: [],
    get vaultSource() { return t('lib.lust-romance-attachment.vaultSource'); },
  },
  {
    slug: 'self-regulation-in-conflict',
    attr: 'family',
    get title() { return t('lib.self-regulation-in-conflict.title'); },
    get origin() { return t('lib.self-regulation-in-conflict.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.self-regulation-in-conflict.hook'); },
    get thesis() { return t('lib.self-regulation-in-conflict.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.self-regulation-in-conflict.idea.${i}.name`),
        body: t(`lib.self-regulation-in-conflict.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.self-regulation-in-conflict.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.self-regulation-in-conflict.practice.${i}`));
    },
    habits: [
      { id: 'fa_listen', get because() { return t('lib.self-regulation-in-conflict.habit.fa_listen.because'); } },
      { id: 'fa_help', get because() { return t('lib.self-regulation-in-conflict.habit.fa_help.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.self-regulation-in-conflict.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.self-regulation-in-conflict.vaultSource'); },
  },
  {
    slug: 'the-third-in-the-room',
    attr: 'family',
    get title() { return t('lib.the-third-in-the-room.title'); },
    get origin() { return t('lib.the-third-in-the-room.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.the-third-in-the-room.hook'); },
    get thesis() { return t('lib.the-third-in-the-room.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.the-third-in-the-room.idea.${i}.name`),
        body: t(`lib.the-third-in-the-room.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.the-third-in-the-room.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-third-in-the-room.practice.${i}`));
    },
    habits: [
      { id: 'f_meet', get because() { return t('lib.the-third-in-the-room.habit.f_meet.because'); } },
      { id: 'fa_meal', get because() { return t('lib.the-third-in-the-room.habit.fa_meal.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.the-third-in-the-room.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.the-third-in-the-room.vaultSource'); },
  },
  {
    slug: 'do-versus-talk',
    attr: 'family',
    get title() { return t('lib.do-versus-talk.title'); },
    get origin() { return t('lib.do-versus-talk.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.do-versus-talk.hook'); },
    get thesis() { return t('lib.do-versus-talk.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.do-versus-talk.idea.${i}.name`),
        body: t(`lib.do-versus-talk.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.do-versus-talk.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.do-versus-talk.practice.${i}`));
    },
    habits: [
      { id: 'fa_help', get because() { return t('lib.do-versus-talk.habit.fa_help.because'); } },
      { id: 'f_thanks', get because() { return t('lib.do-versus-talk.habit.f_thanks.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.do-versus-talk.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.do-versus-talk.vaultSource'); },
  },
  {
    slug: 'sex-as-communication',
    attr: 'family',
    get title() { return t('lib.sex-as-communication.title'); },
    get origin() { return t('lib.sex-as-communication.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.sex-as-communication.hook'); },
    get thesis() { return t('lib.sex-as-communication.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.sex-as-communication.idea.${i}.name`),
        body: t(`lib.sex-as-communication.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.sex-as-communication.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.sex-as-communication.practice.${i}`));
    },
    habits: [
      { id: 'f_invite', get because() { return t('lib.sex-as-communication.habit.f_invite.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.sex-as-communication.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.sex-as-communication.vaultSource'); },
  },
  {
    slug: 'atomic-habits',
    attr: 'development',
    get title() { return t('lib.atomic-habits.title'); },
    get origin() { return t('lib.atomic-habits.origin'); },
    medium: 'book',
    minutes: 6,
    get hook() { return t('lib.atomic-habits.hook'); },
    get thesis() { return t('lib.atomic-habits.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.atomic-habits.idea.${i}.name`),
        body: t(`lib.atomic-habits.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.atomic-habits.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.atomic-habits.practice.${i}`));
    },
    habits: [
      { id: 'd_onepage', get because() { return t('lib.atomic-habits.habit.d_onepage.because'); } },
      { id: 'h_pushups', get because() { return t('lib.atomic-habits.habit.h_pushups.because'); } },
      { id: 'c_plan', get because() { return t('lib.atomic-habits.habit.c_plan.because'); } },
      { id: 'd_notes', get because() { return t('lib.atomic-habits.habit.d_notes.because'); } },
    ],
    quests: [
      { id: 'q_habitsystem', get because() { return t('lib.atomic-habits.quest.q_habitsystem.because'); } },
    ],
    get vaultSource() { return t('lib.atomic-habits.vaultSource'); },
  },
  {
    slug: 'extreme-time-management',
    attr: 'development',
    get title() { return t('lib.extreme-time-management.title'); },
    get origin() { return t('lib.extreme-time-management.origin'); },
    medium: 'book',
    minutes: 5,
    get hook() { return t('lib.extreme-time-management.hook'); },
    get thesis() { return t('lib.extreme-time-management.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.extreme-time-management.idea.${i}.name`),
        body: t(`lib.extreme-time-management.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.extreme-time-management.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.extreme-time-management.practice.${i}`));
    },
    habits: [
      { id: 'c_frog', get because() { return t('lib.extreme-time-management.habit.c_frog.because'); } },
      { id: 'c_plan', get because() { return t('lib.extreme-time-management.habit.c_plan.because'); } },
      { id: 'd_review', get because() { return t('lib.extreme-time-management.habit.d_review.because'); } },
    ],
    quests: [
      { id: 'q_wheel', get because() { return t('lib.extreme-time-management.quest.q_wheel.because'); } },
    ],
    get vaultSource() { return t('lib.extreme-time-management.vaultSource'); },
  },
  {
    slug: 'porters-five-forces',
    attr: 'career',
    get title() { return t('lib.porters-five-forces.title'); },
    get origin() { return t('lib.porters-five-forces.origin'); },
    medium: 'book',
    minutes: 6,
    get hook() { return t('lib.porters-five-forces.hook'); },
    get thesis() { return t('lib.porters-five-forces.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.porters-five-forces.idea.${i}.name`),
        body: t(`lib.porters-five-forces.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 2 }, (_, i) => t(`lib.porters-five-forces.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.porters-five-forces.practice.${i}`));
    },
    habits: [
      { id: 'c_ship', get because() { return t('lib.porters-five-forces.habit.c_ship.because'); } },
    ],
    quests: [
      { id: 'q_portfolio', get because() { return t('lib.porters-five-forces.quest.q_portfolio.because'); } },
    ],
    get vaultSource() { return t('lib.porters-five-forces.vaultSource'); },
  },
  {
    slug: 'unit-economics',
    attr: 'career',
    get title() { return t('lib.unit-economics.title'); },
    get origin() { return t('lib.unit-economics.origin'); },
    medium: 'book',
    minutes: 6,
    get hook() { return t('lib.unit-economics.hook'); },
    get thesis() { return t('lib.unit-economics.thesis'); },
    get ideas() {
      return Array.from({ length: 4 }, (_, i) => ({
        name: t(`lib.unit-economics.idea.${i}.name`),
        body: t(`lib.unit-economics.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.unit-economics.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.unit-economics.practice.${i}`));
    },
    habits: [
      { id: 'm_log', get because() { return t('lib.unit-economics.habit.m_log.because'); } },
      { id: 'c_reachout_pro', get because() { return t('lib.unit-economics.habit.c_reachout_pro.because'); } },
    ],
    quests: [
      { id: 'q_raise', get because() { return t('lib.unit-economics.quest.q_raise.because'); } },
    ],
    get vaultSource() { return t('lib.unit-economics.vaultSource'); },
  },
  {
    slug: 'seven-radicals',
    attr: 'development',
    get title() { return t('lib.seven-radicals.title'); },
    get origin() { return t('lib.seven-radicals.origin'); },
    medium: 'book',
    minutes: 7,
    get hook() { return t('lib.seven-radicals.hook'); },
    get thesis() { return t('lib.seven-radicals.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.seven-radicals.idea.${i}.name`),
        body: t(`lib.seven-radicals.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.seven-radicals.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.seven-radicals.practice.${i}`));
    },
    habits: [
      { id: 'd_review', get because() { return t('lib.seven-radicals.habit.d_review.because'); } },
      { id: 'd_notes', get because() { return t('lib.seven-radicals.habit.d_notes.because'); } },
    ],
    quests: [],
    get vaultSource() { return t('lib.seven-radicals.vaultSource'); },
  },
  {
    slug: 'energy-in-quarters',
    attr: 'health',
    get title() { return t('lib.energy-in-quarters.title'); },
    get origin() { return t('lib.energy-in-quarters.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.energy-in-quarters.hook'); },
    get thesis() { return t('lib.energy-in-quarters.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.energy-in-quarters.idea.${i}.name`),
        body: t(`lib.energy-in-quarters.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.energy-in-quarters.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.energy-in-quarters.practice.${i}`));
    },
    habits: [
      { id: 'h_water', get because() { return t('lib.energy-in-quarters.habit.h_water.because'); } },
      { id: 'h_steps', get because() { return t('lib.energy-in-quarters.habit.h_steps.because'); } },
    ],
    quests: [
      { id: 'q_energyaudit', get because() { return t('lib.energy-in-quarters.quest.q_energyaudit.because'); } },
    ],
    get vaultSource() { return t('lib.energy-in-quarters.vaultSource'); },
  },
  {
    slug: 'rich-versus-wealthy',
    attr: 'money',
    get title() { return t('lib.rich-versus-wealthy.title'); },
    get origin() { return t('lib.rich-versus-wealthy.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.rich-versus-wealthy.hook'); },
    get thesis() { return t('lib.rich-versus-wealthy.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.rich-versus-wealthy.idea.${i}.name`),
        body: t(`lib.rich-versus-wealthy.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 6 }, (_, i) => t(`lib.rich-versus-wealthy.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.rich-versus-wealthy.practice.${i}`));
    },
    habits: [
      { id: 'm_checkbalance', get because() { return t('lib.rich-versus-wealthy.habit.m_checkbalance.because'); } },
      { id: 'm_payday', get because() { return t('lib.rich-versus-wealthy.habit.m_payday.because'); } },
      { id: 'm_waitlist', get because() { return t('lib.rich-versus-wealthy.habit.m_waitlist.because'); } },
      { id: 'm_nodebt', get because() { return t('lib.rich-versus-wealthy.habit.m_nodebt.because'); } },
    ],
    quests: [
      { id: 'q_emergencyfund', get because() { return t('lib.rich-versus-wealthy.quest.q_emergencyfund.because'); } },
      { id: 'q_debts', get because() { return t('lib.rich-versus-wealthy.quest.q_debts.because'); } },
      { id: 'q_raise', get because() { return t('lib.rich-versus-wealthy.quest.q_raise.because'); } },
    ],
    get vaultSource() { return t('lib.rich-versus-wealthy.vaultSource'); },
  },
  {
    slug: 'social-health-5-3-1',
    attr: 'friends',
    get title() { return t('lib.social-health-5-3-1.title'); },
    get origin() { return t('lib.social-health-5-3-1.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.social-health-5-3-1.hook'); },
    get thesis() { return t('lib.social-health-5-3-1.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.social-health-5-3-1.idea.${i}.name`),
        body: t(`lib.social-health-5-3-1.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.social-health-5-3-1.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.social-health-5-3-1.practice.${i}`));
    },
    habits: [
      { id: 'f_nodoom', get because() { return t('lib.social-health-5-3-1.habit.f_nodoom.because'); } },
      { id: 'f_reachout', get because() { return t('lib.social-health-5-3-1.habit.f_reachout.because'); } },
      { id: 'f_meet', get because() { return t('lib.social-health-5-3-1.habit.f_meet.because'); } },
      { id: 'f_voice', get because() { return t('lib.social-health-5-3-1.habit.f_voice.because'); } },
    ],
    quests: [
      { id: 'q_reconnect', get because() { return t('lib.social-health-5-3-1.quest.q_reconnect.because'); } },
      { id: 'q_hardconversation', get because() { return t('lib.social-health-5-3-1.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.social-health-5-3-1.vaultSource'); },
  },
  {
    slug: 'the-virtue-that-hides-the-flaw',
    attr: 'spirituality',
    get title() { return t('lib.the-virtue-that-hides-the-flaw.title'); },
    get origin() { return t('lib.the-virtue-that-hides-the-flaw.origin'); },
    medium: 'lecture',
    minutes: 7,
    get hook() { return t('lib.the-virtue-that-hides-the-flaw.hook'); },
    get thesis() { return t('lib.the-virtue-that-hides-the-flaw.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.the-virtue-that-hides-the-flaw.idea.${i}.name`),
        body: t(`lib.the-virtue-that-hides-the-flaw.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-virtue-that-hides-the-flaw.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-virtue-that-hides-the-flaw.practice.${i}`));
    },
    habits: [
      { id: 'd_review', get because() { return t('lib.the-virtue-that-hides-the-flaw.habit.d_review.because'); } },
      { id: 's_dhikr', get because() { return t('lib.the-virtue-that-hides-the-flaw.habit.s_dhikr.because'); } },
      { id: 'f_nogossip', get because() { return t('lib.the-virtue-that-hides-the-flaw.habit.f_nogossip.because'); } },
      { id: 's_forgive', get because() { return t('lib.the-virtue-that-hides-the-flaw.habit.s_forgive.because'); } },
    ],
    quests: [
      { id: 'q_anchor', get because() { return t('lib.the-virtue-that-hides-the-flaw.quest.q_anchor.because'); } },
      { id: 'q_learnfaith', get because() { return t('lib.the-virtue-that-hides-the-flaw.quest.q_learnfaith.because'); } },
    ],
    get vaultSource() { return t('lib.the-virtue-that-hides-the-flaw.vaultSource'); },
  },
  {
    slug: 'the-curse-of-knowledge',
    attr: 'brightness',
    get title() { return t('lib.the-curse-of-knowledge.title'); },
    get origin() { return t('lib.the-curse-of-knowledge.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.the-curse-of-knowledge.hook'); },
    get thesis() { return t('lib.the-curse-of-knowledge.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.the-curse-of-knowledge.idea.${i}.name`),
        body: t(`lib.the-curse-of-knowledge.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.the-curse-of-knowledge.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-curse-of-knowledge.practice.${i}`));
    },
    habits: [
      { id: 'c_ship', get because() { return t('lib.the-curse-of-knowledge.habit.c_ship.because'); } },
      { id: 'd_teach', get because() { return t('lib.the-curse-of-knowledge.habit.d_teach.because'); } },
      { id: 'd_notes', get because() { return t('lib.the-curse-of-knowledge.habit.d_notes.because'); } },
    ],
    quests: [
      { id: 'q_makeweekly', get because() { return t('lib.the-curse-of-knowledge.quest.q_makeweekly.because'); } },
      { id: 'q_portfolio', get because() { return t('lib.the-curse-of-knowledge.quest.q_portfolio.because'); } },
    ],
    get vaultSource() { return t('lib.the-curse-of-knowledge.vaultSource'); },
  },
  {
    slug: 'focus-then-rest',
    attr: 'development',
    get title() { return t('lib.focus-then-rest.title'); },
    get origin() { return t('lib.focus-then-rest.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.focus-then-rest.hook'); },
    get thesis() { return t('lib.focus-then-rest.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.focus-then-rest.idea.${i}.name`),
        body: t(`lib.focus-then-rest.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.focus-then-rest.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.focus-then-rest.practice.${i}`));
    },
    habits: [
      { id: 'c_plan', get because() { return t('lib.focus-then-rest.habit.c_plan.because'); } },
      { id: 'd_nopassive', get because() { return t('lib.focus-then-rest.habit.d_nopassive.because'); } },
      { id: 'd_review', get because() { return t('lib.focus-then-rest.habit.d_review.because'); } },
    ],
    quests: [
      { id: 'q_habitsystem', get because() { return t('lib.focus-then-rest.quest.q_habitsystem.because'); } },
      { id: 'q_skill', get because() { return t('lib.focus-then-rest.quest.q_skill.because'); } },
    ],
    get vaultSource() { return t('lib.focus-then-rest.vaultSource'); },
  },
  {
    slug: 'minimum-effective-dose-strength',
    attr: 'health',
    get title() { return t('lib.minimum-effective-dose-strength.title'); },
    get origin() { return t('lib.minimum-effective-dose-strength.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.minimum-effective-dose-strength.hook'); },
    get thesis() { return t('lib.minimum-effective-dose-strength.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.minimum-effective-dose-strength.idea.${i}.name`),
        body: t(`lib.minimum-effective-dose-strength.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.minimum-effective-dose-strength.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.minimum-effective-dose-strength.practice.${i}`));
    },
    habits: [
      { id: 'h_pushups', get because() { return t('lib.minimum-effective-dose-strength.habit.h_pushups.because'); } },
      { id: 'h_steps', get because() { return t('lib.minimum-effective-dose-strength.habit.h_steps.because'); } },
      { id: 'b_sport', get because() { return t('lib.minimum-effective-dose-strength.habit.b_sport.because'); } },
      { id: 'h_stretch', get because() { return t('lib.minimum-effective-dose-strength.habit.h_stretch.because'); } },
    ],
    quests: [
      { id: 'q_habitsystem', get because() { return t('lib.minimum-effective-dose-strength.quest.q_habitsystem.because'); } },
      { id: 'q_energyaudit', get because() { return t('lib.minimum-effective-dose-strength.quest.q_energyaudit.because'); } },
    ],
    get vaultSource() { return t('lib.minimum-effective-dose-strength.vaultSource'); },
  },
  {
    slug: 'the-delta-and-the-debt',
    attr: 'money',
    get title() { return t('lib.the-delta-and-the-debt.title'); },
    get origin() { return t('lib.the-delta-and-the-debt.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.the-delta-and-the-debt.hook'); },
    get thesis() { return t('lib.the-delta-and-the-debt.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.the-delta-and-the-debt.idea.${i}.name`),
        body: t(`lib.the-delta-and-the-debt.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-delta-and-the-debt.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.the-delta-and-the-debt.practice.${i}`));
    },
    habits: [
      { id: 'm_payday', get because() { return t('lib.the-delta-and-the-debt.habit.m_payday.because'); } },
      { id: 'm_log', get because() { return t('lib.the-delta-and-the-debt.habit.m_log.because'); } },
      { id: 'm_subs', get because() { return t('lib.the-delta-and-the-debt.habit.m_subs.because'); } },
      { id: 'm_nospend', get because() { return t('lib.the-delta-and-the-debt.habit.m_nospend.because'); } },
    ],
    quests: [
      { id: 'q_debts', get because() { return t('lib.the-delta-and-the-debt.quest.q_debts.because'); } },
      { id: 'q_emergencyfund', get because() { return t('lib.the-delta-and-the-debt.quest.q_emergencyfund.because'); } },
    ],
    get vaultSource() { return t('lib.the-delta-and-the-debt.vaultSource'); },
  },
  {
    slug: 'manage-emotions-dont-control-them',
    attr: 'friends',
    get title() { return t('lib.manage-emotions-dont-control-them.title'); },
    get origin() { return t('lib.manage-emotions-dont-control-them.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.manage-emotions-dont-control-them.hook'); },
    get thesis() { return t('lib.manage-emotions-dont-control-them.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.manage-emotions-dont-control-them.idea.${i}.name`),
        body: t(`lib.manage-emotions-dont-control-them.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.manage-emotions-dont-control-them.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.manage-emotions-dont-control-them.practice.${i}`));
    },
    habits: [
      { id: 'f_remember', get because() { return t('lib.manage-emotions-dont-control-them.habit.f_remember.because'); } },
      { id: 'f_thanks', get because() { return t('lib.manage-emotions-dont-control-them.habit.f_thanks.because'); } },
      { id: 'f_nogossip', get because() { return t('lib.manage-emotions-dont-control-them.habit.f_nogossip.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.manage-emotions-dont-control-them.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.manage-emotions-dont-control-them.vaultSource'); },
  },
  {
    slug: 'the-pleasure-pain-balance',
    attr: 'development',
    get title() { return t('lib.the-pleasure-pain-balance.title'); },
    get origin() { return t('lib.the-pleasure-pain-balance.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.the-pleasure-pain-balance.hook'); },
    get thesis() { return t('lib.the-pleasure-pain-balance.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.the-pleasure-pain-balance.idea.${i}.name`),
        body: t(`lib.the-pleasure-pain-balance.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.the-pleasure-pain-balance.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.the-pleasure-pain-balance.practice.${i}`));
    },
    habits: [
      { id: 'd_nopassive', get because() { return t('lib.the-pleasure-pain-balance.habit.d_nopassive.because'); } },
      { id: 'f_nodoom', get because() { return t('lib.the-pleasure-pain-balance.habit.f_nodoom.because'); } },
      { id: 'b_nocompare', get because() { return t('lib.the-pleasure-pain-balance.habit.b_nocompare.because'); } },
    ],
    quests: [
      { id: 'q_declutter', get because() { return t('lib.the-pleasure-pain-balance.quest.q_declutter.because'); } },
      { id: 'q_habitsystem', get because() { return t('lib.the-pleasure-pain-balance.quest.q_habitsystem.because'); } },
    ],
    get vaultSource() { return t('lib.the-pleasure-pain-balance.vaultSource'); },
  },
  {
    slug: 'resist-less',
    attr: 'brightness',
    get title() { return t('lib.resist-less.title'); },
    get origin() { return t('lib.resist-less.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.resist-less.hook'); },
    get thesis() { return t('lib.resist-less.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.resist-less.idea.${i}.name`),
        body: t(`lib.resist-less.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.resist-less.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.resist-less.practice.${i}`));
    },
    habits: [
      { id: 's_makecreate', get because() { return t('lib.resist-less.habit.s_makecreate.because'); } },
      { id: 'b_play', get because() { return t('lib.resist-less.habit.b_play.because'); } },
      { id: 'd_notes', get because() { return t('lib.resist-less.habit.d_notes.because'); } },
    ],
    quests: [
      { id: 'q_makeweekly', get because() { return t('lib.resist-less.quest.q_makeweekly.because'); } },
    ],
    get vaultSource() { return t('lib.resist-less.vaultSource'); },
  },
  {
    slug: 'escalate-dont-subvert',
    attr: 'brightness',
    get title() { return t('lib.escalate-dont-subvert.title'); },
    get origin() { return t('lib.escalate-dont-subvert.origin'); },
    medium: 'lecture',
    minutes: 6,
    get hook() { return t('lib.escalate-dont-subvert.hook'); },
    get thesis() { return t('lib.escalate-dont-subvert.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.escalate-dont-subvert.idea.${i}.name`),
        body: t(`lib.escalate-dont-subvert.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 2 }, (_, i) => t(`lib.escalate-dont-subvert.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.escalate-dont-subvert.practice.${i}`));
    },
    habits: [
      { id: 'c_ship', get because() { return t('lib.escalate-dont-subvert.habit.c_ship.because'); } },
      { id: 's_makecreate', get because() { return t('lib.escalate-dont-subvert.habit.s_makecreate.because'); } },
    ],
    quests: [
      { id: 'q_makeweekly', get because() { return t('lib.escalate-dont-subvert.quest.q_makeweekly.because'); } },
      { id: 'q_portfolio', get because() { return t('lib.escalate-dont-subvert.quest.q_portfolio.because'); } },
    ],
    get vaultSource() { return t('lib.escalate-dont-subvert.vaultSource'); },
  },
  {
    slug: 'heart-soul-body-mind',
    attr: 'spirituality',
    get title() { return t('lib.heart-soul-body-mind.title'); },
    get origin() { return t('lib.heart-soul-body-mind.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.heart-soul-body-mind.hook'); },
    get thesis() { return t('lib.heart-soul-body-mind.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.heart-soul-body-mind.idea.${i}.name`),
        body: t(`lib.heart-soul-body-mind.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.heart-soul-body-mind.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.heart-soul-body-mind.practice.${i}`));
    },
    habits: [
      { id: 's_dhikr', get because() { return t('lib.heart-soul-body-mind.habit.s_dhikr.because'); } },
      { id: 'd_review', get because() { return t('lib.heart-soul-body-mind.habit.d_review.because'); } },
      { id: 's_gratitude', get because() { return t('lib.heart-soul-body-mind.habit.s_gratitude.because'); } },
    ],
    quests: [
      { id: 'q_learnfaith', get because() { return t('lib.heart-soul-body-mind.quest.q_learnfaith.because'); } },
    ],
    get vaultSource() { return t('lib.heart-soul-body-mind.vaultSource'); },
  },
  {
    slug: 'the-map-and-the-support',
    attr: 'spirituality',
    get title() { return t('lib.the-map-and-the-support.title'); },
    get origin() { return t('lib.the-map-and-the-support.origin'); },
    medium: 'lecture',
    minutes: 6,
    get hook() { return t('lib.the-map-and-the-support.hook'); },
    get thesis() { return t('lib.the-map-and-the-support.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.the-map-and-the-support.idea.${i}.name`),
        body: t(`lib.the-map-and-the-support.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.the-map-and-the-support.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.the-map-and-the-support.practice.${i}`));
    },
    habits: [
      { id: 's_fivedaily', get because() { return t('lib.the-map-and-the-support.habit.s_fivedaily.because'); } },
      { id: 's_quran', get because() { return t('lib.the-map-and-the-support.habit.s_quran.because'); } },
      { id: 'm_charity', get because() { return t('lib.the-map-and-the-support.habit.m_charity.because'); } },
    ],
    quests: [
      { id: 'q_anchor', get because() { return t('lib.the-map-and-the-support.quest.q_anchor.because'); } },
      { id: 'q_learnfaith', get because() { return t('lib.the-map-and-the-support.quest.q_learnfaith.because'); } },
    ],
    get vaultSource() { return t('lib.the-map-and-the-support.vaultSource'); },
  },
  {
    slug: 'goal-audience-format-moment',
    attr: 'career',
    get title() { return t('lib.goal-audience-format-moment.title'); },
    get origin() { return t('lib.goal-audience-format-moment.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.goal-audience-format-moment.hook'); },
    get thesis() { return t('lib.goal-audience-format-moment.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.goal-audience-format-moment.idea.${i}.name`),
        body: t(`lib.goal-audience-format-moment.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.goal-audience-format-moment.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.goal-audience-format-moment.practice.${i}`));
    },
    habits: [
      { id: 'c_plan', get because() { return t('lib.goal-audience-format-moment.habit.c_plan.because'); } },
      { id: 'c_ship', get because() { return t('lib.goal-audience-format-moment.habit.c_ship.because'); } },
      { id: 'd_askquestion', get because() { return t('lib.goal-audience-format-moment.habit.d_askquestion.because'); } },
    ],
    quests: [
      { id: 'q_skill', get because() { return t('lib.goal-audience-format-moment.quest.q_skill.because'); } },
      { id: 'q_promise', get because() { return t('lib.goal-audience-format-moment.quest.q_promise.because'); } },
    ],
    get vaultSource() { return t('lib.goal-audience-format-moment.vaultSource'); },
  },
  {
    slug: 'psychology-over-technique',
    attr: 'career',
    get title() { return t('lib.psychology-over-technique.title'); },
    get origin() { return t('lib.psychology-over-technique.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.psychology-over-technique.hook'); },
    get thesis() { return t('lib.psychology-over-technique.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.psychology-over-technique.idea.${i}.name`),
        body: t(`lib.psychology-over-technique.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.psychology-over-technique.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.psychology-over-technique.practice.${i}`));
    },
    habits: [
      { id: 'h_lightsout', get because() { return t('lib.psychology-over-technique.habit.h_lightsout.because'); } },
      { id: 'c_plan', get because() { return t('lib.psychology-over-technique.habit.c_plan.because'); } },
      { id: 'c_onelesson', get because() { return t('lib.psychology-over-technique.habit.c_onelesson.because'); } },
    ],
    quests: [
      { id: 'q_skill', get because() { return t('lib.psychology-over-technique.quest.q_skill.because'); } },
    ],
    get vaultSource() { return t('lib.psychology-over-technique.vaultSource'); },
  },
  {
    slug: 'budget-from-facts',
    attr: 'money',
    get title() { return t('lib.budget-from-facts.title'); },
    get origin() { return t('lib.budget-from-facts.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.budget-from-facts.hook'); },
    get thesis() { return t('lib.budget-from-facts.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.budget-from-facts.idea.${i}.name`),
        body: t(`lib.budget-from-facts.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 6 }, (_, i) => t(`lib.budget-from-facts.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.budget-from-facts.practice.${i}`));
    },
    habits: [
      { id: 'm_log', get because() { return t('lib.budget-from-facts.habit.m_log.because'); } },
      { id: 'm_checkbalance', get because() { return t('lib.budget-from-facts.habit.m_checkbalance.because'); } },
      { id: 'm_subs', get because() { return t('lib.budget-from-facts.habit.m_subs.because'); } },
    ],
    quests: [
      { id: 'q_emergencyfund', get because() { return t('lib.budget-from-facts.quest.q_emergencyfund.because'); } },
      { id: 'q_debts', get because() { return t('lib.budget-from-facts.quest.q_debts.because'); } },
    ],
    get vaultSource() { return t('lib.budget-from-facts.vaultSource'); },
  },
  {
    slug: 'investing-is-not-trading',
    attr: 'money',
    get title() { return t('lib.investing-is-not-trading.title'); },
    get origin() { return t('lib.investing-is-not-trading.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.investing-is-not-trading.hook'); },
    get thesis() { return t('lib.investing-is-not-trading.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.investing-is-not-trading.idea.${i}.name`),
        body: t(`lib.investing-is-not-trading.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.investing-is-not-trading.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.investing-is-not-trading.practice.${i}`));
    },
    habits: [
      { id: 'm_waitlist', get because() { return t('lib.investing-is-not-trading.habit.m_waitlist.because'); } },
      { id: 'm_nodebt', get because() { return t('lib.investing-is-not-trading.habit.m_nodebt.because'); } },
      { id: 'm_owed', get because() { return t('lib.investing-is-not-trading.habit.m_owed.because'); } },
    ],
    quests: [
      { id: 'q_emergencyfund', get because() { return t('lib.investing-is-not-trading.quest.q_emergencyfund.because'); } },
    ],
    get vaultSource() { return t('lib.investing-is-not-trading.vaultSource'); },
  },
  {
    slug: 'notice-the-manipulation',
    attr: 'friends',
    get title() { return t('lib.notice-the-manipulation.title'); },
    get origin() { return t('lib.notice-the-manipulation.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.notice-the-manipulation.hook'); },
    get thesis() { return t('lib.notice-the-manipulation.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.notice-the-manipulation.idea.${i}.name`),
        body: t(`lib.notice-the-manipulation.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.notice-the-manipulation.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.notice-the-manipulation.practice.${i}`));
    },
    habits: [
      { id: 'f_nogossip', get because() { return t('lib.notice-the-manipulation.habit.f_nogossip.because'); } },
      { id: 'f_thanks', get because() { return t('lib.notice-the-manipulation.habit.f_thanks.because'); } },
      { id: 'm_owed', get because() { return t('lib.notice-the-manipulation.habit.m_owed.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.notice-the-manipulation.quest.q_hardconversation.because'); } },
      { id: 'q_debts', get because() { return t('lib.notice-the-manipulation.quest.q_debts.because'); } },
    ],
    get vaultSource() { return t('lib.notice-the-manipulation.vaultSource'); },
  },
  {
    slug: 'comparison-is-learned',
    attr: 'friends',
    get title() { return t('lib.comparison-is-learned.title'); },
    get origin() { return t('lib.comparison-is-learned.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.comparison-is-learned.hook'); },
    get thesis() { return t('lib.comparison-is-learned.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.comparison-is-learned.idea.${i}.name`),
        body: t(`lib.comparison-is-learned.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.comparison-is-learned.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.comparison-is-learned.practice.${i}`));
    },
    habits: [
      { id: 'b_nocompare', get because() { return t('lib.comparison-is-learned.habit.b_nocompare.because'); } },
      { id: 'f_nodoom', get because() { return t('lib.comparison-is-learned.habit.f_nodoom.because'); } },
      { id: 's_gratitude', get because() { return t('lib.comparison-is-learned.habit.s_gratitude.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.comparison-is-learned.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.comparison-is-learned.vaultSource'); },
  },
  {
    slug: 'three-sources-of-fatigue',
    attr: 'health',
    get title() { return t('lib.three-sources-of-fatigue.title'); },
    get origin() { return t('lib.three-sources-of-fatigue.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.three-sources-of-fatigue.hook'); },
    get thesis() { return t('lib.three-sources-of-fatigue.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.three-sources-of-fatigue.idea.${i}.name`),
        body: t(`lib.three-sources-of-fatigue.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.three-sources-of-fatigue.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.three-sources-of-fatigue.practice.${i}`));
    },
    habits: [
      { id: 'h_lightsout', get because() { return t('lib.three-sources-of-fatigue.habit.h_lightsout.because'); } },
      { id: 'f_nodoom', get because() { return t('lib.three-sources-of-fatigue.habit.f_nodoom.because'); } },
      { id: 'b_noalarm', get because() { return t('lib.three-sources-of-fatigue.habit.b_noalarm.because'); } },
    ],
    quests: [
      { id: 'q_sleepreset', get because() { return t('lib.three-sources-of-fatigue.quest.q_sleepreset.because'); } },
      { id: 'q_energyaudit', get because() { return t('lib.three-sources-of-fatigue.quest.q_energyaudit.because'); } },
    ],
    get vaultSource() { return t('lib.three-sources-of-fatigue.vaultSource'); },
  },
  {
    slug: 'plaques-and-risk-factors',
    attr: 'health',
    get title() { return t('lib.plaques-and-risk-factors.title'); },
    get origin() { return t('lib.plaques-and-risk-factors.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.plaques-and-risk-factors.hook'); },
    get thesis() { return t('lib.plaques-and-risk-factors.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.plaques-and-risk-factors.idea.${i}.name`),
        body: t(`lib.plaques-and-risk-factors.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.plaques-and-risk-factors.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.plaques-and-risk-factors.practice.${i}`));
    },
    habits: [
      { id: 'h_nosmoke', get because() { return t('lib.plaques-and-risk-factors.habit.h_nosmoke.because'); } },
      { id: 'h_realmeal', get because() { return t('lib.plaques-and-risk-factors.habit.h_realmeal.because'); } },
      { id: 'h_steps', get because() { return t('lib.plaques-and-risk-factors.habit.h_steps.because'); } },
    ],
    quests: [
      { id: 'q_healthcheck', get because() { return t('lib.plaques-and-risk-factors.quest.q_healthcheck.because'); } },
      { id: 'q_energyaudit', get because() { return t('lib.plaques-and-risk-factors.quest.q_energyaudit.because'); } },
    ],
    get vaultSource() { return t('lib.plaques-and-risk-factors.vaultSource'); },
  },
  {
    slug: 'critical-mass-of-a-habit',
    attr: 'development',
    get title() { return t('lib.critical-mass-of-a-habit.title'); },
    get origin() { return t('lib.critical-mass-of-a-habit.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.critical-mass-of-a-habit.hook'); },
    get thesis() { return t('lib.critical-mass-of-a-habit.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.critical-mass-of-a-habit.idea.${i}.name`),
        body: t(`lib.critical-mass-of-a-habit.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.critical-mass-of-a-habit.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.critical-mass-of-a-habit.practice.${i}`));
    },
    habits: [
      { id: 'h_lightsout', get because() { return t('lib.critical-mass-of-a-habit.habit.h_lightsout.because'); } },
      { id: 'f_nodoom', get because() { return t('lib.critical-mass-of-a-habit.habit.f_nodoom.because'); } },
      { id: 'd_nopassive', get because() { return t('lib.critical-mass-of-a-habit.habit.d_nopassive.because'); } },
    ],
    quests: [
      { id: 'q_habitsystem', get because() { return t('lib.critical-mass-of-a-habit.quest.q_habitsystem.because'); } },
      { id: 'q_declutter', get because() { return t('lib.critical-mass-of-a-habit.quest.q_declutter.because'); } },
    ],
    get vaultSource() { return t('lib.critical-mass-of-a-habit.vaultSource'); },
  },
  {
    slug: 'mindlessness-and-novelty',
    attr: 'development',
    get title() { return t('lib.mindlessness-and-novelty.title'); },
    get origin() { return t('lib.mindlessness-and-novelty.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.mindlessness-and-novelty.hook'); },
    get thesis() { return t('lib.mindlessness-and-novelty.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.mindlessness-and-novelty.idea.${i}.name`),
        body: t(`lib.mindlessness-and-novelty.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.mindlessness-and-novelty.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.mindlessness-and-novelty.practice.${i}`));
    },
    habits: [
      { id: 'b_new', get because() { return t('lib.mindlessness-and-novelty.habit.b_new.because'); } },
      { id: 's_gratitude', get because() { return t('lib.mindlessness-and-novelty.habit.s_gratitude.because'); } },
      { id: 'b_morningjoy', get because() { return t('lib.mindlessness-and-novelty.habit.b_morningjoy.because'); } },
    ],
    quests: [
      { id: 'q_tryfive', get because() { return t('lib.mindlessness-and-novelty.quest.q_tryfive.because'); } },
      { id: 'q_wheel', get because() { return t('lib.mindlessness-and-novelty.quest.q_wheel.because'); } },
    ],
    get vaultSource() { return t('lib.mindlessness-and-novelty.vaultSource'); },
  },
  {
    slug: 'yes-comma-but',
    attr: 'brightness',
    get title() { return t('lib.yes-comma-but.title'); },
    get origin() { return t('lib.yes-comma-but.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.yes-comma-but.hook'); },
    get thesis() { return t('lib.yes-comma-but.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.yes-comma-but.idea.${i}.name`),
        body: t(`lib.yes-comma-but.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.yes-comma-but.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.yes-comma-but.practice.${i}`));
    },
    habits: [
      { id: 'c_shutdown', get because() { return t('lib.yes-comma-but.habit.c_shutdown.because'); } },
      { id: 'd_read', get because() { return t('lib.yes-comma-but.habit.d_read.because'); } },
      { id: 'd_notes', get because() { return t('lib.yes-comma-but.habit.d_notes.because'); } },
    ],
    quests: [
      { id: 'q_makeweekly', get because() { return t('lib.yes-comma-but.quest.q_makeweekly.because'); } },
      { id: 'q_tryfive', get because() { return t('lib.yes-comma-but.quest.q_tryfive.because'); } },
    ],
    get vaultSource() { return t('lib.yes-comma-but.vaultSource'); },
  },
  {
    slug: 'morphology-of-the-tale',
    attr: 'brightness',
    get title() { return t('lib.morphology-of-the-tale.title'); },
    get origin() { return t('lib.morphology-of-the-tale.origin'); },
    medium: 'lecture',
    minutes: 6,
    get hook() { return t('lib.morphology-of-the-tale.hook'); },
    get thesis() { return t('lib.morphology-of-the-tale.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.morphology-of-the-tale.idea.${i}.name`),
        body: t(`lib.morphology-of-the-tale.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.morphology-of-the-tale.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.morphology-of-the-tale.practice.${i}`));
    },
    habits: [
      { id: 'd_read', get because() { return t('lib.morphology-of-the-tale.habit.d_read.because'); } },
      { id: 'd_notes', get because() { return t('lib.morphology-of-the-tale.habit.d_notes.because'); } },
      { id: 's_makecreate', get because() { return t('lib.morphology-of-the-tale.habit.s_makecreate.because'); } },
    ],
    quests: [
      { id: 'q_learnfaith', get because() { return t('lib.morphology-of-the-tale.quest.q_learnfaith.because'); } },
      { id: 'q_makeweekly', get because() { return t('lib.morphology-of-the-tale.quest.q_makeweekly.because'); } },
    ],
    get vaultSource() { return t('lib.morphology-of-the-tale.vaultSource'); },
  },
  {
    slug: 'means-not-end',
    attr: 'spirituality',
    get title() { return t('lib.means-not-end.title'); },
    get origin() { return t('lib.means-not-end.origin'); },
    medium: 'lecture',
    minutes: 7,
    get hook() { return t('lib.means-not-end.hook'); },
    get thesis() { return t('lib.means-not-end.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.means-not-end.idea.${i}.name`),
        body: t(`lib.means-not-end.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.means-not-end.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.means-not-end.practice.${i}`));
    },
    habits: [
      { id: 'f_remember', get because() { return t('lib.means-not-end.habit.f_remember.because'); } },
      { id: 'm_charity', get because() { return t('lib.means-not-end.habit.m_charity.because'); } },
      { id: 's_gratitude', get because() { return t('lib.means-not-end.habit.s_gratitude.because'); } },
    ],
    quests: [
      { id: 'q_learnfaith', get because() { return t('lib.means-not-end.quest.q_learnfaith.because'); } },
      { id: 'q_debts', get because() { return t('lib.means-not-end.quest.q_debts.because'); } },
    ],
    get vaultSource() { return t('lib.means-not-end.vaultSource'); },
  },
  {
    slug: 'the-prayer-of-yunus',
    attr: 'spirituality',
    get title() { return t('lib.the-prayer-of-yunus.title'); },
    get origin() { return t('lib.the-prayer-of-yunus.origin'); },
    medium: 'lecture',
    minutes: 6,
    get hook() { return t('lib.the-prayer-of-yunus.hook'); },
    get thesis() { return t('lib.the-prayer-of-yunus.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.the-prayer-of-yunus.idea.${i}.name`),
        body: t(`lib.the-prayer-of-yunus.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.the-prayer-of-yunus.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-prayer-of-yunus.practice.${i}`));
    },
    habits: [
      { id: 'd_review', get because() { return t('lib.the-prayer-of-yunus.habit.d_review.because'); } },
      { id: 's_dhikr', get because() { return t('lib.the-prayer-of-yunus.habit.s_dhikr.because'); } },
      { id: 's_forgive', get because() { return t('lib.the-prayer-of-yunus.habit.s_forgive.because'); } },
    ],
    quests: [
      { id: 'q_anchor', get because() { return t('lib.the-prayer-of-yunus.quest.q_anchor.because'); } },
      { id: 'q_learnfaith', get because() { return t('lib.the-prayer-of-yunus.quest.q_learnfaith.because'); } },
    ],
    get vaultSource() { return t('lib.the-prayer-of-yunus.vaultSource'); },
  },
  {
    slug: 'beliefs-under-habits',
    attr: 'career',
    get title() { return t('lib.beliefs-under-habits.title'); },
    get origin() { return t('lib.beliefs-under-habits.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.beliefs-under-habits.hook'); },
    get thesis() { return t('lib.beliefs-under-habits.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.beliefs-under-habits.idea.${i}.name`),
        body: t(`lib.beliefs-under-habits.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.beliefs-under-habits.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.beliefs-under-habits.practice.${i}`));
    },
    habits: [
      { id: 'd_review', get because() { return t('lib.beliefs-under-habits.habit.d_review.because'); } },
      { id: 's_makecreate', get because() { return t('lib.beliefs-under-habits.habit.s_makecreate.because'); } },
      { id: 'c_onelesson', get because() { return t('lib.beliefs-under-habits.habit.c_onelesson.because'); } },
    ],
    quests: [
      { id: 'q_skill', get because() { return t('lib.beliefs-under-habits.quest.q_skill.because'); } },
      { id: 'q_portfolio', get because() { return t('lib.beliefs-under-habits.quest.q_portfolio.because'); } },
    ],
    get vaultSource() { return t('lib.beliefs-under-habits.vaultSource'); },
  },
  {
    slug: 'the-idea-is-a-multiplier',
    attr: 'career',
    get title() { return t('lib.the-idea-is-a-multiplier.title'); },
    get origin() { return t('lib.the-idea-is-a-multiplier.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.the-idea-is-a-multiplier.hook'); },
    get thesis() { return t('lib.the-idea-is-a-multiplier.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.the-idea-is-a-multiplier.idea.${i}.name`),
        body: t(`lib.the-idea-is-a-multiplier.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.the-idea-is-a-multiplier.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-idea-is-a-multiplier.practice.${i}`));
    },
    habits: [
      { id: 'd_build', get because() { return t('lib.the-idea-is-a-multiplier.habit.d_build.because'); } },
      { id: 'c_onelesson', get because() { return t('lib.the-idea-is-a-multiplier.habit.c_onelesson.because'); } },
      { id: 'd_askquestion', get because() { return t('lib.the-idea-is-a-multiplier.habit.d_askquestion.because'); } },
    ],
    quests: [
      { id: 'q_skill', get because() { return t('lib.the-idea-is-a-multiplier.quest.q_skill.because'); } },
      { id: 'q_promise', get because() { return t('lib.the-idea-is-a-multiplier.quest.q_promise.because'); } },
    ],
    get vaultSource() { return t('lib.the-idea-is-a-multiplier.vaultSource'); },
  },
  {
    slug: 'the-bottom-is-still-your-life',
    attr: 'friends',
    get title() { return t('lib.the-bottom-is-still-your-life.title'); },
    get origin() { return t('lib.the-bottom-is-still-your-life.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.the-bottom-is-still-your-life.hook'); },
    get thesis() { return t('lib.the-bottom-is-still-your-life.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.the-bottom-is-still-your-life.idea.${i}.name`),
        body: t(`lib.the-bottom-is-still-your-life.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.the-bottom-is-still-your-life.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.the-bottom-is-still-your-life.practice.${i}`));
    },
    habits: [
      { id: 'f_reachout', get because() { return t('lib.the-bottom-is-still-your-life.habit.f_reachout.because'); } },
      { id: 's_gratitude', get because() { return t('lib.the-bottom-is-still-your-life.habit.s_gratitude.because'); } },
      { id: 'b_morningjoy', get because() { return t('lib.the-bottom-is-still-your-life.habit.b_morningjoy.because'); } },
    ],
    quests: [
      { id: 'q_reconnect', get because() { return t('lib.the-bottom-is-still-your-life.quest.q_reconnect.because'); } },
      { id: 'q_hardconversation', get because() { return t('lib.the-bottom-is-still-your-life.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.the-bottom-is-still-your-life.vaultSource'); },
  },
  {
    slug: 'fixing-the-car-instead-of-driving',
    attr: 'friends',
    get title() { return t('lib.fixing-the-car-instead-of-driving.title'); },
    get origin() { return t('lib.fixing-the-car-instead-of-driving.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.fixing-the-car-instead-of-driving.hook'); },
    get thesis() { return t('lib.fixing-the-car-instead-of-driving.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.fixing-the-car-instead-of-driving.idea.${i}.name`),
        body: t(`lib.fixing-the-car-instead-of-driving.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.fixing-the-car-instead-of-driving.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.fixing-the-car-instead-of-driving.practice.${i}`));
    },
    habits: [
      { id: 'f_remember', get because() { return t('lib.fixing-the-car-instead-of-driving.habit.f_remember.because'); } },
      { id: 'f_meet', get because() { return t('lib.fixing-the-car-instead-of-driving.habit.f_meet.because'); } },
      { id: 'f_thanks', get because() { return t('lib.fixing-the-car-instead-of-driving.habit.f_thanks.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.fixing-the-car-instead-of-driving.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.fixing-the-car-instead-of-driving.vaultSource'); },
  },
  {
    slug: 'the-cost-of-ownership',
    attr: 'money',
    get title() { return t('lib.the-cost-of-ownership.title'); },
    get origin() { return t('lib.the-cost-of-ownership.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.the-cost-of-ownership.hook'); },
    get thesis() { return t('lib.the-cost-of-ownership.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.the-cost-of-ownership.idea.${i}.name`),
        body: t(`lib.the-cost-of-ownership.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-cost-of-ownership.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.the-cost-of-ownership.practice.${i}`));
    },
    habits: [
      { id: 'm_waitlist', get because() { return t('lib.the-cost-of-ownership.habit.m_waitlist.because'); } },
      { id: 'm_payday', get because() { return t('lib.the-cost-of-ownership.habit.m_payday.because'); } },
      { id: 'm_log', get because() { return t('lib.the-cost-of-ownership.habit.m_log.because'); } },
    ],
    quests: [
      { id: 'q_emergencyfund', get because() { return t('lib.the-cost-of-ownership.quest.q_emergencyfund.because'); } },
      { id: 'q_debts', get because() { return t('lib.the-cost-of-ownership.quest.q_debts.because'); } },
    ],
    get vaultSource() { return t('lib.the-cost-of-ownership.vaultSource'); },
  },
  {
    slug: 'money-shame-and-courage',
    attr: 'money',
    get title() { return t('lib.money-shame-and-courage.title'); },
    get origin() { return t('lib.money-shame-and-courage.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.money-shame-and-courage.hook'); },
    get thesis() { return t('lib.money-shame-and-courage.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.money-shame-and-courage.idea.${i}.name`),
        body: t(`lib.money-shame-and-courage.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.money-shame-and-courage.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.money-shame-and-courage.practice.${i}`));
    },
    habits: [
      { id: 'm_owed', get because() { return t('lib.money-shame-and-courage.habit.m_owed.because'); } },
      { id: 'm_checkbalance', get because() { return t('lib.money-shame-and-courage.habit.m_checkbalance.because'); } },
      { id: 'm_log', get because() { return t('lib.money-shame-and-courage.habit.m_log.because'); } },
    ],
    quests: [
      { id: 'q_raise', get because() { return t('lib.money-shame-and-courage.quest.q_raise.because'); } },
      { id: 'q_debts', get because() { return t('lib.money-shame-and-courage.quest.q_debts.because'); } },
    ],
    get vaultSource() { return t('lib.money-shame-and-courage.vaultSource'); },
  },
  {
    slug: 'the-cycle-is-the-enemy',
    attr: 'family',
    get title() { return t('lib.the-cycle-is-the-enemy.title'); },
    get origin() { return t('lib.the-cycle-is-the-enemy.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.the-cycle-is-the-enemy.hook'); },
    get thesis() { return t('lib.the-cycle-is-the-enemy.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.the-cycle-is-the-enemy.idea.${i}.name`),
        body: t(`lib.the-cycle-is-the-enemy.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-cycle-is-the-enemy.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.the-cycle-is-the-enemy.practice.${i}`));
    },
    habits: [
      { id: 'f_remember', get because() { return t('lib.the-cycle-is-the-enemy.habit.f_remember.because'); } },
      { id: 'f_voice', get because() { return t('lib.the-cycle-is-the-enemy.habit.f_voice.because'); } },
      { id: 'f_thanks', get because() { return t('lib.the-cycle-is-the-enemy.habit.f_thanks.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.the-cycle-is-the-enemy.quest.q_hardconversation.because'); } },
      { id: 'q_reconnect', get because() { return t('lib.the-cycle-is-the-enemy.quest.q_reconnect.because'); } },
    ],
    get vaultSource() { return t('lib.the-cycle-is-the-enemy.vaultSource'); },
  },
  {
    slug: 'dont-collect-stamps',
    attr: 'family',
    get title() { return t('lib.dont-collect-stamps.title'); },
    get origin() { return t('lib.dont-collect-stamps.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.dont-collect-stamps.hook'); },
    get thesis() { return t('lib.dont-collect-stamps.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.dont-collect-stamps.idea.${i}.name`),
        body: t(`lib.dont-collect-stamps.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.dont-collect-stamps.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.dont-collect-stamps.practice.${i}`));
    },
    habits: [
      { id: 'f_meet', get because() { return t('lib.dont-collect-stamps.habit.f_meet.because'); } },
      { id: 'f_remember', get because() { return t('lib.dont-collect-stamps.habit.f_remember.because'); } },
      { id: 'f_nogossip', get because() { return t('lib.dont-collect-stamps.habit.f_nogossip.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.dont-collect-stamps.quest.q_hardconversation.because'); } },
      { id: 'q_reconnect', get because() { return t('lib.dont-collect-stamps.quest.q_reconnect.because'); } },
    ],
    get vaultSource() { return t('lib.dont-collect-stamps.vaultSource'); },
  },
  {
    slug: 'count-it-in-grams',
    attr: 'health',
    get title() { return t('lib.count-it-in-grams.title'); },
    get origin() { return t('lib.count-it-in-grams.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.count-it-in-grams.hook'); },
    get thesis() { return t('lib.count-it-in-grams.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.count-it-in-grams.idea.${i}.name`),
        body: t(`lib.count-it-in-grams.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.count-it-in-grams.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.count-it-in-grams.practice.${i}`));
    },
    habits: [
      { id: 'h_nolate', get because() { return t('lib.count-it-in-grams.habit.h_nolate.because'); } },
      { id: 'h_realmeal', get because() { return t('lib.count-it-in-grams.habit.h_realmeal.because'); } },
      { id: 'h_water', get because() { return t('lib.count-it-in-grams.habit.h_water.because'); } },
    ],
    quests: [
      { id: 'q_healthcheck', get because() { return t('lib.count-it-in-grams.quest.q_healthcheck.because'); } },
      { id: 'q_energyaudit', get because() { return t('lib.count-it-in-grams.quest.q_energyaudit.because'); } },
    ],
    get vaultSource() { return t('lib.count-it-in-grams.vaultSource'); },
  },
  {
    slug: 'cut-the-middle-out',
    attr: 'health',
    get title() { return t('lib.cut-the-middle-out.title'); },
    get origin() { return t('lib.cut-the-middle-out.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.cut-the-middle-out.hook'); },
    get thesis() { return t('lib.cut-the-middle-out.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.cut-the-middle-out.idea.${i}.name`),
        body: t(`lib.cut-the-middle-out.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.cut-the-middle-out.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.cut-the-middle-out.practice.${i}`));
    },
    habits: [
      { id: 'h_steps', get because() { return t('lib.cut-the-middle-out.habit.h_steps.because'); } },
      { id: 'h_pushups', get because() { return t('lib.cut-the-middle-out.habit.h_pushups.because'); } },
      { id: 'b_sport', get because() { return t('lib.cut-the-middle-out.habit.b_sport.because'); } },
    ],
    quests: [
      { id: 'q_habitsystem', get because() { return t('lib.cut-the-middle-out.quest.q_habitsystem.because'); } },
      { id: 'q_energyaudit', get because() { return t('lib.cut-the-middle-out.quest.q_energyaudit.because'); } },
    ],
    get vaultSource() { return t('lib.cut-the-middle-out.vaultSource'); },
  },
  {
    slug: 'weakness-and-goal',
    attr: 'brightness',
    get title() { return t('lib.weakness-and-goal.title'); },
    get origin() { return t('lib.weakness-and-goal.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.weakness-and-goal.hook'); },
    get thesis() { return t('lib.weakness-and-goal.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.weakness-and-goal.idea.${i}.name`),
        body: t(`lib.weakness-and-goal.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.weakness-and-goal.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.weakness-and-goal.practice.${i}`));
    },
    habits: [
      { id: 'd_notes', get because() { return t('lib.weakness-and-goal.habit.d_notes.because'); } },
      { id: 'd_read', get because() { return t('lib.weakness-and-goal.habit.d_read.because'); } },
      { id: 's_makecreate', get because() { return t('lib.weakness-and-goal.habit.s_makecreate.because'); } },
    ],
    quests: [
      { id: 'q_makeweekly', get because() { return t('lib.weakness-and-goal.quest.q_makeweekly.because'); } },
      { id: 'q_portfolio', get because() { return t('lib.weakness-and-goal.quest.q_portfolio.because'); } },
    ],
    get vaultSource() { return t('lib.weakness-and-goal.vaultSource'); },
  },
  {
    slug: 'plan-so-the-poetic-brain-is-free',
    attr: 'brightness',
    get title() { return t('lib.plan-so-the-poetic-brain-is-free.title'); },
    get origin() { return t('lib.plan-so-the-poetic-brain-is-free.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.plan-so-the-poetic-brain-is-free.hook'); },
    get thesis() { return t('lib.plan-so-the-poetic-brain-is-free.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.plan-so-the-poetic-brain-is-free.idea.${i}.name`),
        body: t(`lib.plan-so-the-poetic-brain-is-free.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 2 }, (_, i) => t(`lib.plan-so-the-poetic-brain-is-free.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.plan-so-the-poetic-brain-is-free.practice.${i}`));
    },
    habits: [
      { id: 'c_plan', get because() { return t('lib.plan-so-the-poetic-brain-is-free.habit.c_plan.because'); } },
      { id: 'd_read', get because() { return t('lib.plan-so-the-poetic-brain-is-free.habit.d_read.because'); } },
      { id: 'd_notes', get because() { return t('lib.plan-so-the-poetic-brain-is-free.habit.d_notes.because'); } },
    ],
    quests: [
      { id: 'q_makeweekly', get because() { return t('lib.plan-so-the-poetic-brain-is-free.quest.q_makeweekly.because'); } },
      { id: 'q_tryfive', get because() { return t('lib.plan-so-the-poetic-brain-is-free.quest.q_tryfive.because'); } },
    ],
    get vaultSource() { return t('lib.plan-so-the-poetic-brain-is-free.vaultSource'); },
  },
  {
    slug: 'different-doors',
    attr: 'spirituality',
    get title() { return t('lib.different-doors.title'); },
    get origin() { return t('lib.different-doors.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.different-doors.hook'); },
    get thesis() { return t('lib.different-doors.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.different-doors.idea.${i}.name`),
        body: t(`lib.different-doors.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.different-doors.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.different-doors.practice.${i}`));
    },
    habits: [
      { id: 'm_charity', get because() { return t('lib.different-doors.habit.m_charity.because'); } },
      { id: 'f_remember', get because() { return t('lib.different-doors.habit.f_remember.because'); } },
      { id: 's_forgive', get because() { return t('lib.different-doors.habit.s_forgive.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.different-doors.quest.q_hardconversation.because'); } },
      { id: 'q_learnfaith', get because() { return t('lib.different-doors.quest.q_learnfaith.because'); } },
    ],
    get vaultSource() { return t('lib.different-doors.vaultSource'); },
  },
  {
    slug: 'environment-is-fuel',
    attr: 'spirituality',
    get title() { return t('lib.environment-is-fuel.title'); },
    get origin() { return t('lib.environment-is-fuel.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.environment-is-fuel.hook'); },
    get thesis() { return t('lib.environment-is-fuel.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.environment-is-fuel.idea.${i}.name`),
        body: t(`lib.environment-is-fuel.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.environment-is-fuel.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.environment-is-fuel.practice.${i}`));
    },
    habits: [
      { id: 's_quran', get because() { return t('lib.environment-is-fuel.habit.s_quran.because'); } },
      { id: 'f_meet', get because() { return t('lib.environment-is-fuel.habit.f_meet.because'); } },
      { id: 's_dhikr', get because() { return t('lib.environment-is-fuel.habit.s_dhikr.because'); } },
    ],
    quests: [
      { id: 'q_learnfaith', get because() { return t('lib.environment-is-fuel.quest.q_learnfaith.because'); } },
      { id: 'q_reconnect', get because() { return t('lib.environment-is-fuel.quest.q_reconnect.because'); } },
    ],
    get vaultSource() { return t('lib.environment-is-fuel.vaultSource'); },
  },
  {
    slug: 'three-sources-of-an-idea',
    attr: 'career',
    get title() { return t('lib.three-sources-of-an-idea.title'); },
    get origin() { return t('lib.three-sources-of-an-idea.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.three-sources-of-an-idea.hook'); },
    get thesis() { return t('lib.three-sources-of-an-idea.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.three-sources-of-an-idea.idea.${i}.name`),
        body: t(`lib.three-sources-of-an-idea.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.three-sources-of-an-idea.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.three-sources-of-an-idea.practice.${i}`));
    },
    habits: [
      { id: 'd_askquestion', get because() { return t('lib.three-sources-of-an-idea.habit.d_askquestion.because'); } },
      { id: 'd_read', get because() { return t('lib.three-sources-of-an-idea.habit.d_read.because'); } },
      { id: 'c_onelesson', get because() { return t('lib.three-sources-of-an-idea.habit.c_onelesson.because'); } },
    ],
    quests: [
      { id: 'q_promise', get because() { return t('lib.three-sources-of-an-idea.quest.q_promise.because'); } },
      { id: 'q_skill', get because() { return t('lib.three-sources-of-an-idea.quest.q_skill.because'); } },
    ],
    get vaultSource() { return t('lib.three-sources-of-an-idea.vaultSource'); },
  },
  {
    slug: 'narrow-then-infinite',
    attr: 'career',
    get title() { return t('lib.narrow-then-infinite.title'); },
    get origin() { return t('lib.narrow-then-infinite.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.narrow-then-infinite.hook'); },
    get thesis() { return t('lib.narrow-then-infinite.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.narrow-then-infinite.idea.${i}.name`),
        body: t(`lib.narrow-then-infinite.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.narrow-then-infinite.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.narrow-then-infinite.practice.${i}`));
    },
    habits: [
      { id: 'd_build', get because() { return t('lib.narrow-then-infinite.habit.d_build.because'); } },
      { id: 'c_ship', get because() { return t('lib.narrow-then-infinite.habit.c_ship.because'); } },
      { id: 'c_plan', get because() { return t('lib.narrow-then-infinite.habit.c_plan.because'); } },
    ],
    quests: [
      { id: 'q_portfolio', get because() { return t('lib.narrow-then-infinite.quest.q_portfolio.because'); } },
      { id: 'q_skill', get because() { return t('lib.narrow-then-infinite.quest.q_skill.because'); } },
    ],
    get vaultSource() { return t('lib.narrow-then-infinite.vaultSource'); },
  },
  {
    slug: 'truth-then-plan',
    attr: 'money',
    get title() { return t('lib.truth-then-plan.title'); },
    get origin() { return t('lib.truth-then-plan.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.truth-then-plan.hook'); },
    get thesis() { return t('lib.truth-then-plan.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.truth-then-plan.idea.${i}.name`),
        body: t(`lib.truth-then-plan.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.truth-then-plan.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.truth-then-plan.practice.${i}`));
    },
    habits: [
      { id: 'm_owed', get because() { return t('lib.truth-then-plan.habit.m_owed.because'); } },
      { id: 'm_checkbalance', get because() { return t('lib.truth-then-plan.habit.m_checkbalance.because'); } },
      { id: 'm_log', get because() { return t('lib.truth-then-plan.habit.m_log.because'); } },
    ],
    quests: [
      { id: 'q_debts', get because() { return t('lib.truth-then-plan.quest.q_debts.because'); } },
      { id: 'q_hardconversation', get because() { return t('lib.truth-then-plan.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.truth-then-plan.vaultSource'); },
  },
  {
    slug: 'name-it-to-lower-it',
    attr: 'friends',
    get title() { return t('lib.name-it-to-lower-it.title'); },
    get origin() { return t('lib.name-it-to-lower-it.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.name-it-to-lower-it.hook'); },
    get thesis() { return t('lib.name-it-to-lower-it.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.name-it-to-lower-it.idea.${i}.name`),
        body: t(`lib.name-it-to-lower-it.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.name-it-to-lower-it.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.name-it-to-lower-it.practice.${i}`));
    },
    habits: [
      { id: 'd_review', get because() { return t('lib.name-it-to-lower-it.habit.d_review.because'); } },
      { id: 'b_morningjoy', get because() { return t('lib.name-it-to-lower-it.habit.b_morningjoy.because'); } },
      { id: 'f_thanks', get because() { return t('lib.name-it-to-lower-it.habit.f_thanks.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.name-it-to-lower-it.quest.q_hardconversation.because'); } },
      { id: 'q_wheel', get because() { return t('lib.name-it-to-lower-it.quest.q_wheel.because'); } },
    ],
    get vaultSource() { return t('lib.name-it-to-lower-it.vaultSource'); },
  },
  {
    slug: 'rupture-and-repair',
    attr: 'family',
    get title() { return t('lib.rupture-and-repair.title'); },
    get origin() { return t('lib.rupture-and-repair.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.rupture-and-repair.hook'); },
    get thesis() { return t('lib.rupture-and-repair.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.rupture-and-repair.idea.${i}.name`),
        body: t(`lib.rupture-and-repair.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.rupture-and-repair.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.rupture-and-repair.practice.${i}`));
    },
    habits: [
      { id: 'f_voice', get because() { return t('lib.rupture-and-repair.habit.f_voice.because'); } },
      { id: 'f_meet', get because() { return t('lib.rupture-and-repair.habit.f_meet.because'); } },
      { id: 'f_remember', get because() { return t('lib.rupture-and-repair.habit.f_remember.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.rupture-and-repair.quest.q_hardconversation.because'); } },
      { id: 'q_reconnect', get because() { return t('lib.rupture-and-repair.quest.q_reconnect.because'); } },
    ],
    get vaultSource() { return t('lib.rupture-and-repair.vaultSource'); },
  },
  {
    slug: 'speech-markers',
    attr: 'family',
    get title() { return t('lib.speech-markers.title'); },
    get origin() { return t('lib.speech-markers.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.speech-markers.hook'); },
    get thesis() { return t('lib.speech-markers.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.speech-markers.idea.${i}.name`),
        body: t(`lib.speech-markers.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.speech-markers.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.speech-markers.practice.${i}`));
    },
    habits: [
      { id: 'd_review', get because() { return t('lib.speech-markers.habit.d_review.because'); } },
      { id: 'f_thanks', get because() { return t('lib.speech-markers.habit.f_thanks.because'); } },
      { id: 'f_nogossip', get because() { return t('lib.speech-markers.habit.f_nogossip.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.speech-markers.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.speech-markers.vaultSource'); },
  },
  {
    slug: 'fear-as-fuel',
    attr: 'development',
    get title() { return t('lib.fear-as-fuel.title'); },
    get origin() { return t('lib.fear-as-fuel.origin'); },
    medium: 'podcast',
    minutes: 7,
    get hook() { return t('lib.fear-as-fuel.hook'); },
    get thesis() { return t('lib.fear-as-fuel.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.fear-as-fuel.idea.${i}.name`),
        body: t(`lib.fear-as-fuel.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.fear-as-fuel.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.fear-as-fuel.practice.${i}`));
    },
    habits: [
      { id: 'f_nodoom', get because() { return t('lib.fear-as-fuel.habit.f_nodoom.because'); } },
      { id: 'h_lightsout', get because() { return t('lib.fear-as-fuel.habit.h_lightsout.because'); } },
      { id: 'c_plan', get because() { return t('lib.fear-as-fuel.habit.c_plan.because'); } },
    ],
    quests: [
      { id: 'q_habitsystem', get because() { return t('lib.fear-as-fuel.quest.q_habitsystem.because'); } },
      { id: 'q_skill', get because() { return t('lib.fear-as-fuel.quest.q_skill.because'); } },
    ],
    get vaultSource() { return t('lib.fear-as-fuel.vaultSource'); },
  },
  {
    slug: 'the-choice-makes-you',
    attr: 'development',
    get title() { return t('lib.the-choice-makes-you.title'); },
    get origin() { return t('lib.the-choice-makes-you.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.the-choice-makes-you.hook'); },
    get thesis() { return t('lib.the-choice-makes-you.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.the-choice-makes-you.idea.${i}.name`),
        body: t(`lib.the-choice-makes-you.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.the-choice-makes-you.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.the-choice-makes-you.practice.${i}`));
    },
    habits: [
      { id: 'd_build', get because() { return t('lib.the-choice-makes-you.habit.d_build.because'); } },
      { id: 'd_nopassive', get because() { return t('lib.the-choice-makes-you.habit.d_nopassive.because'); } },
      { id: 'c_onelesson', get because() { return t('lib.the-choice-makes-you.habit.c_onelesson.because'); } },
    ],
    quests: [
      { id: 'q_promise', get because() { return t('lib.the-choice-makes-you.quest.q_promise.because'); } },
      { id: 'q_wheel', get because() { return t('lib.the-choice-makes-you.quest.q_wheel.because'); } },
    ],
    get vaultSource() { return t('lib.the-choice-makes-you.vaultSource'); },
  },
  {
    slug: 'build-backward-from-the-ending',
    attr: 'brightness',
    get title() { return t('lib.build-backward-from-the-ending.title'); },
    get origin() { return t('lib.build-backward-from-the-ending.origin'); },
    medium: 'lecture',
    minutes: 6,
    get hook() { return t('lib.build-backward-from-the-ending.hook'); },
    get thesis() { return t('lib.build-backward-from-the-ending.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.build-backward-from-the-ending.idea.${i}.name`),
        body: t(`lib.build-backward-from-the-ending.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.build-backward-from-the-ending.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.build-backward-from-the-ending.practice.${i}`));
    },
    habits: [
      { id: 'c_plan', get because() { return t('lib.build-backward-from-the-ending.habit.c_plan.because'); } },
      { id: 'd_notes', get because() { return t('lib.build-backward-from-the-ending.habit.d_notes.because'); } },
      { id: 'd_read', get because() { return t('lib.build-backward-from-the-ending.habit.d_read.because'); } },
    ],
    quests: [
      { id: 'q_makeweekly', get because() { return t('lib.build-backward-from-the-ending.quest.q_makeweekly.because'); } },
      { id: 'q_portfolio', get because() { return t('lib.build-backward-from-the-ending.quest.q_portfolio.because'); } },
    ],
    get vaultSource() { return t('lib.build-backward-from-the-ending.vaultSource'); },
  },
  {
    slug: 'check-the-adjacent-markers',
    attr: 'health',
    get title() { return t('lib.check-the-adjacent-markers.title'); },
    get origin() { return t('lib.check-the-adjacent-markers.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.check-the-adjacent-markers.hook'); },
    get thesis() { return t('lib.check-the-adjacent-markers.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.check-the-adjacent-markers.idea.${i}.name`),
        body: t(`lib.check-the-adjacent-markers.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.check-the-adjacent-markers.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.check-the-adjacent-markers.practice.${i}`));
    },
    habits: [
      { id: 'h_water', get because() { return t('lib.check-the-adjacent-markers.habit.h_water.because'); } },
      { id: 'h_nolate', get because() { return t('lib.check-the-adjacent-markers.habit.h_nolate.because'); } },
      { id: 'h_realmeal', get because() { return t('lib.check-the-adjacent-markers.habit.h_realmeal.because'); } },
    ],
    quests: [
      { id: 'q_healthcheck', get because() { return t('lib.check-the-adjacent-markers.quest.q_healthcheck.because'); } },
      { id: 'q_energyaudit', get because() { return t('lib.check-the-adjacent-markers.quest.q_energyaudit.because'); } },
    ],
    get vaultSource() { return t('lib.check-the-adjacent-markers.vaultSource'); },
  },
  {
    slug: 'message-in-a-bottle',
    attr: 'career',
    get title() { return t('lib.message-in-a-bottle.title'); },
    get origin() { return t('lib.message-in-a-bottle.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.message-in-a-bottle.hook'); },
    get thesis() { return t('lib.message-in-a-bottle.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.message-in-a-bottle.idea.${i}.name`),
        body: t(`lib.message-in-a-bottle.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.message-in-a-bottle.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.message-in-a-bottle.practice.${i}`));
    },
    habits: [
      { id: 'c_deepblock', get because() { return t('lib.message-in-a-bottle.habit.c_deepblock.because'); } },
      { id: 'c_plan', get because() { return t('lib.message-in-a-bottle.habit.c_plan.because'); } },
      { id: 'd_build', get because() { return t('lib.message-in-a-bottle.habit.d_build.because'); } },
    ],
    quests: [
      { id: 'q_skill', get because() { return t('lib.message-in-a-bottle.quest.q_skill.because'); } },
      { id: 'q_portfolio', get because() { return t('lib.message-in-a-bottle.quest.q_portfolio.because'); } },
    ],
    get vaultSource() { return t('lib.message-in-a-bottle.vaultSource'); },
  },
  {
    slug: 'against-essentialism',
    attr: 'spirituality',
    get title() { return t('lib.against-essentialism.title'); },
    get origin() { return t('lib.against-essentialism.origin'); },
    medium: 'lecture',
    minutes: 6,
    get hook() { return t('lib.against-essentialism.hook'); },
    get thesis() { return t('lib.against-essentialism.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.against-essentialism.idea.${i}.name`),
        body: t(`lib.against-essentialism.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.against-essentialism.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.against-essentialism.practice.${i}`));
    },
    habits: [
      { id: 'd_read', get because() { return t('lib.against-essentialism.habit.d_read.because'); } },
      { id: 'd_notes', get because() { return t('lib.against-essentialism.habit.d_notes.because'); } },
      { id: 'd_askquestion', get because() { return t('lib.against-essentialism.habit.d_askquestion.because'); } },
    ],
    quests: [
      { id: 'q_learnfaith', get because() { return t('lib.against-essentialism.quest.q_learnfaith.because'); } },
    ],
    get vaultSource() { return t('lib.against-essentialism.vaultSource'); },
  },
  {
    slug: 'three-solutions-to-debt',
    attr: 'money',
    get title() { return t('lib.three-solutions-to-debt.title'); },
    get origin() { return t('lib.three-solutions-to-debt.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.three-solutions-to-debt.hook'); },
    get thesis() { return t('lib.three-solutions-to-debt.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.three-solutions-to-debt.idea.${i}.name`),
        body: t(`lib.three-solutions-to-debt.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.three-solutions-to-debt.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.three-solutions-to-debt.practice.${i}`));
    },
    habits: [
      { id: 'm_payday', get because() { return t('lib.three-solutions-to-debt.habit.m_payday.because'); } },
      { id: 'm_nodebt', get because() { return t('lib.three-solutions-to-debt.habit.m_nodebt.because'); } },
      { id: 'm_subs', get because() { return t('lib.three-solutions-to-debt.habit.m_subs.because'); } },
    ],
    quests: [
      { id: 'q_emergencyfund', get because() { return t('lib.three-solutions-to-debt.quest.q_emergencyfund.because'); } },
      { id: 'q_debts', get because() { return t('lib.three-solutions-to-debt.quest.q_debts.because'); } },
    ],
    get vaultSource() { return t('lib.three-solutions-to-debt.vaultSource'); },
  },
  {
    slug: 'the-formula-is-memory',
    attr: 'brightness',
    get title() { return t('lib.the-formula-is-memory.title'); },
    get origin() { return t('lib.the-formula-is-memory.origin'); },
    medium: 'lecture',
    minutes: 6,
    get hook() { return t('lib.the-formula-is-memory.hook'); },
    get thesis() { return t('lib.the-formula-is-memory.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.the-formula-is-memory.idea.${i}.name`),
        body: t(`lib.the-formula-is-memory.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.the-formula-is-memory.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-formula-is-memory.practice.${i}`));
    },
    habits: [
      { id: 'd_read', get because() { return t('lib.the-formula-is-memory.habit.d_read.because'); } },
      { id: 'd_onepage', get because() { return t('lib.the-formula-is-memory.habit.d_onepage.because'); } },
      { id: 'd_notes', get because() { return t('lib.the-formula-is-memory.habit.d_notes.because'); } },
    ],
    quests: [
      { id: 'q_learnfaith', get because() { return t('lib.the-formula-is-memory.quest.q_learnfaith.because'); } },
      { id: 'q_makeweekly', get because() { return t('lib.the-formula-is-memory.quest.q_makeweekly.because'); } },
    ],
    get vaultSource() { return t('lib.the-formula-is-memory.vaultSource'); },
  },
  {
    slug: 'the-asymmetric-bet',
    attr: 'career',
    get title() { return t('lib.the-asymmetric-bet.title'); },
    get origin() { return t('lib.the-asymmetric-bet.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.the-asymmetric-bet.hook'); },
    get thesis() { return t('lib.the-asymmetric-bet.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.the-asymmetric-bet.idea.${i}.name`),
        body: t(`lib.the-asymmetric-bet.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.the-asymmetric-bet.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-asymmetric-bet.practice.${i}`));
    },
    habits: [
      { id: 'd_build', get because() { return t('lib.the-asymmetric-bet.habit.d_build.because'); } },
      { id: 'c_onelesson', get because() { return t('lib.the-asymmetric-bet.habit.c_onelesson.because'); } },
      { id: 'c_ship', get because() { return t('lib.the-asymmetric-bet.habit.c_ship.because'); } },
    ],
    quests: [
      { id: 'q_skill', get because() { return t('lib.the-asymmetric-bet.quest.q_skill.because'); } },
      { id: 'q_portfolio', get because() { return t('lib.the-asymmetric-bet.quest.q_portfolio.because'); } },
    ],
    get vaultSource() { return t('lib.the-asymmetric-bet.vaultSource'); },
  },
  {
    slug: 'understanding-without-forgiving',
    attr: 'friends',
    get title() { return t('lib.understanding-without-forgiving.title'); },
    get origin() { return t('lib.understanding-without-forgiving.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.understanding-without-forgiving.hook'); },
    get thesis() { return t('lib.understanding-without-forgiving.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.understanding-without-forgiving.idea.${i}.name`),
        body: t(`lib.understanding-without-forgiving.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.understanding-without-forgiving.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.understanding-without-forgiving.practice.${i}`));
    },
    habits: [
      { id: 'd_review', get because() { return t('lib.understanding-without-forgiving.habit.d_review.because'); } },
      { id: 's_forgive', get because() { return t('lib.understanding-without-forgiving.habit.s_forgive.because'); } },
      { id: 'f_nogossip', get because() { return t('lib.understanding-without-forgiving.habit.f_nogossip.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.understanding-without-forgiving.quest.q_hardconversation.because'); } },
      { id: 'q_reconnect', get because() { return t('lib.understanding-without-forgiving.quest.q_reconnect.because'); } },
    ],
    get vaultSource() { return t('lib.understanding-without-forgiving.vaultSource'); },
  },
  {
    slug: 'the-image-comes-first',
    attr: 'brightness',
    get title() { return t('lib.the-image-comes-first.title'); },
    get origin() { return t('lib.the-image-comes-first.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.the-image-comes-first.hook'); },
    get thesis() { return t('lib.the-image-comes-first.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.the-image-comes-first.idea.${i}.name`),
        body: t(`lib.the-image-comes-first.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.the-image-comes-first.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-image-comes-first.practice.${i}`));
    },
    habits: [
      { id: 'd_notes', get because() { return t('lib.the-image-comes-first.habit.d_notes.because'); } },
      { id: 's_makecreate', get because() { return t('lib.the-image-comes-first.habit.s_makecreate.because'); } },
      { id: 'd_read', get because() { return t('lib.the-image-comes-first.habit.d_read.because'); } },
    ],
    quests: [
      { id: 'q_makeweekly', get because() { return t('lib.the-image-comes-first.quest.q_makeweekly.because'); } },
      { id: 'q_portfolio', get because() { return t('lib.the-image-comes-first.quest.q_portfolio.because'); } },
    ],
    get vaultSource() { return t('lib.the-image-comes-first.vaultSource'); },
  },
  {
    slug: 'dopamine-capture',
    attr: 'development',
    get title() { return t('lib.dopamine-capture.title'); },
    get origin() { return t('lib.dopamine-capture.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.dopamine-capture.hook'); },
    get thesis() { return t('lib.dopamine-capture.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.dopamine-capture.idea.${i}.name`),
        body: t(`lib.dopamine-capture.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.dopamine-capture.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.dopamine-capture.practice.${i}`));
    },
    habits: [
      { id: 'f_nodoom', get because() { return t('lib.dopamine-capture.habit.f_nodoom.because'); } },
      { id: 'h_lightsout', get because() { return t('lib.dopamine-capture.habit.h_lightsout.because'); } },
      { id: 'd_nopassive', get because() { return t('lib.dopamine-capture.habit.d_nopassive.because'); } },
    ],
    quests: [
      { id: 'q_habitsystem', get because() { return t('lib.dopamine-capture.quest.q_habitsystem.because'); } },
      { id: 'q_declutter', get because() { return t('lib.dopamine-capture.quest.q_declutter.because'); } },
    ],
    get vaultSource() { return t('lib.dopamine-capture.vaultSource'); },
  },
  {
    slug: 'equal-but-not-identical',
    attr: 'spirituality',
    get title() { return t('lib.equal-but-not-identical.title'); },
    get origin() { return t('lib.equal-but-not-identical.origin'); },
    medium: 'lecture',
    minutes: 6,
    get hook() { return t('lib.equal-but-not-identical.hook'); },
    get thesis() { return t('lib.equal-but-not-identical.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.equal-but-not-identical.idea.${i}.name`),
        body: t(`lib.equal-but-not-identical.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.equal-but-not-identical.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.equal-but-not-identical.practice.${i}`));
    },
    habits: [
      { id: 'f_remember', get because() { return t('lib.equal-but-not-identical.habit.f_remember.because'); } },
      { id: 'f_thanks', get because() { return t('lib.equal-but-not-identical.habit.f_thanks.because'); } },
      { id: 's_gratitude', get because() { return t('lib.equal-but-not-identical.habit.s_gratitude.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.equal-but-not-identical.quest.q_hardconversation.because'); } },
      { id: 'q_learnfaith', get because() { return t('lib.equal-but-not-identical.quest.q_learnfaith.because'); } },
    ],
    get vaultSource() { return t('lib.equal-but-not-identical.vaultSource'); },
  },
  {
    slug: 'are-you-in-the-boat',
    attr: 'family',
    get title() { return t('lib.are-you-in-the-boat.title'); },
    get origin() { return t('lib.are-you-in-the-boat.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.are-you-in-the-boat.hook'); },
    get thesis() { return t('lib.are-you-in-the-boat.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.are-you-in-the-boat.idea.${i}.name`),
        body: t(`lib.are-you-in-the-boat.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.are-you-in-the-boat.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.are-you-in-the-boat.practice.${i}`));
    },
    habits: [
      { id: 'f_remember', get because() { return t('lib.are-you-in-the-boat.habit.f_remember.because'); } },
      { id: 'f_thanks', get because() { return t('lib.are-you-in-the-boat.habit.f_thanks.because'); } },
      { id: 'f_meet', get because() { return t('lib.are-you-in-the-boat.habit.f_meet.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.are-you-in-the-boat.quest.q_hardconversation.because'); } },
      { id: 'q_reconnect', get because() { return t('lib.are-you-in-the-boat.quest.q_reconnect.because'); } },
    ],
    get vaultSource() { return t('lib.are-you-in-the-boat.vaultSource'); },
  },
  {
    slug: 'calibrating-future-regret',
    attr: 'money',
    get title() { return t('lib.calibrating-future-regret.title'); },
    get origin() { return t('lib.calibrating-future-regret.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.calibrating-future-regret.hook'); },
    get thesis() { return t('lib.calibrating-future-regret.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.calibrating-future-regret.idea.${i}.name`),
        body: t(`lib.calibrating-future-regret.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.calibrating-future-regret.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.calibrating-future-regret.practice.${i}`));
    },
    habits: [
      { id: 'm_waitlist', get because() { return t('lib.calibrating-future-regret.habit.m_waitlist.because'); } },
      { id: 'm_payday', get because() { return t('lib.calibrating-future-regret.habit.m_payday.because'); } },
      { id: 'm_log', get because() { return t('lib.calibrating-future-regret.habit.m_log.because'); } },
    ],
    quests: [
      { id: 'q_emergencyfund', get because() { return t('lib.calibrating-future-regret.quest.q_emergencyfund.because'); } },
      { id: 'q_raise', get because() { return t('lib.calibrating-future-regret.quest.q_raise.because'); } },
    ],
    get vaultSource() { return t('lib.calibrating-future-regret.vaultSource'); },
  },
  {
    slug: 'i-notice-the-thought',
    attr: 'development',
    get title() { return t('lib.i-notice-the-thought.title'); },
    get origin() { return t('lib.i-notice-the-thought.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.i-notice-the-thought.hook'); },
    get thesis() { return t('lib.i-notice-the-thought.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.i-notice-the-thought.idea.${i}.name`),
        body: t(`lib.i-notice-the-thought.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.i-notice-the-thought.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.i-notice-the-thought.practice.${i}`));
    },
    habits: [
      { id: 'd_review', get because() { return t('lib.i-notice-the-thought.habit.d_review.because'); } },
      { id: 'b_nocompare', get because() { return t('lib.i-notice-the-thought.habit.b_nocompare.because'); } },
      { id: 'c_onelesson', get because() { return t('lib.i-notice-the-thought.habit.c_onelesson.because'); } },
    ],
    quests: [
      { id: 'q_wheel', get because() { return t('lib.i-notice-the-thought.quest.q_wheel.because'); } },
      { id: 'q_skill', get because() { return t('lib.i-notice-the-thought.quest.q_skill.because'); } },
    ],
    get vaultSource() { return t('lib.i-notice-the-thought.vaultSource'); },
  },
  {
    slug: 'anger-with-a-function',
    attr: 'friends',
    get title() { return t('lib.anger-with-a-function.title'); },
    get origin() { return t('lib.anger-with-a-function.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.anger-with-a-function.hook'); },
    get thesis() { return t('lib.anger-with-a-function.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.anger-with-a-function.idea.${i}.name`),
        body: t(`lib.anger-with-a-function.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.anger-with-a-function.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.anger-with-a-function.practice.${i}`));
    },
    habits: [
      { id: 'f_thanks', get because() { return t('lib.anger-with-a-function.habit.f_thanks.because'); } },
      { id: 'd_review', get because() { return t('lib.anger-with-a-function.habit.d_review.because'); } },
      { id: 'f_voice', get because() { return t('lib.anger-with-a-function.habit.f_voice.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.anger-with-a-function.quest.q_hardconversation.because'); } },
    ],
    get vaultSource() { return t('lib.anger-with-a-function.vaultSource'); },
  },
  {
    slug: 'you-cannot-write-to-a-trend',
    attr: 'brightness',
    get title() { return t('lib.you-cannot-write-to-a-trend.title'); },
    get origin() { return t('lib.you-cannot-write-to-a-trend.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.you-cannot-write-to-a-trend.hook'); },
    get thesis() { return t('lib.you-cannot-write-to-a-trend.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.you-cannot-write-to-a-trend.idea.${i}.name`),
        body: t(`lib.you-cannot-write-to-a-trend.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.you-cannot-write-to-a-trend.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.you-cannot-write-to-a-trend.practice.${i}`));
    },
    habits: [
      { id: 's_makecreate', get because() { return t('lib.you-cannot-write-to-a-trend.habit.s_makecreate.because'); } },
      { id: 'd_notes', get because() { return t('lib.you-cannot-write-to-a-trend.habit.d_notes.because'); } },
      { id: 'c_ship', get because() { return t('lib.you-cannot-write-to-a-trend.habit.c_ship.because'); } },
    ],
    quests: [
      { id: 'q_makeweekly', get because() { return t('lib.you-cannot-write-to-a-trend.quest.q_makeweekly.because'); } },
      { id: 'q_portfolio', get because() { return t('lib.you-cannot-write-to-a-trend.quest.q_portfolio.because'); } },
    ],
    get vaultSource() { return t('lib.you-cannot-write-to-a-trend.vaultSource'); },
  },
  {
    slug: 'three-positions',
    attr: 'family',
    get title() { return t('lib.three-positions.title'); },
    get origin() { return t('lib.three-positions.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.three-positions.hook'); },
    get thesis() { return t('lib.three-positions.thesis'); },
    get ideas() {
      return Array.from({ length: 6 }, (_, i) => ({
        name: t(`lib.three-positions.idea.${i}.name`),
        body: t(`lib.three-positions.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.three-positions.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.three-positions.practice.${i}`));
    },
    habits: [
      { id: 'f_voice', get because() { return t('lib.three-positions.habit.f_voice.because'); } },
      { id: 'f_meet', get because() { return t('lib.three-positions.habit.f_meet.because'); } },
      { id: 'f_remember', get because() { return t('lib.three-positions.habit.f_remember.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.three-positions.quest.q_hardconversation.because'); } },
      { id: 'q_reconnect', get because() { return t('lib.three-positions.quest.q_reconnect.because'); } },
    ],
    get vaultSource() { return t('lib.three-positions.vaultSource'); },
  },
  {
    slug: 'ask-for-the-number',
    attr: 'career',
    get title() { return t('lib.ask-for-the-number.title'); },
    get origin() { return t('lib.ask-for-the-number.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.ask-for-the-number.hook'); },
    get thesis() { return t('lib.ask-for-the-number.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.ask-for-the-number.idea.${i}.name`),
        body: t(`lib.ask-for-the-number.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.ask-for-the-number.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.ask-for-the-number.practice.${i}`));
    },
    habits: [
      { id: 'd_askquestion', get because() { return t('lib.ask-for-the-number.habit.d_askquestion.because'); } },
      { id: 'c_onelesson', get because() { return t('lib.ask-for-the-number.habit.c_onelesson.because'); } },
      { id: 'd_build', get because() { return t('lib.ask-for-the-number.habit.d_build.because'); } },
    ],
    quests: [
      { id: 'q_skill', get because() { return t('lib.ask-for-the-number.quest.q_skill.because'); } },
      { id: 'q_raise', get because() { return t('lib.ask-for-the-number.quest.q_raise.because'); } },
    ],
    get vaultSource() { return t('lib.ask-for-the-number.vaultSource'); },
  },
  {
    slug: 'five-components',
    attr: 'development',
    get title() { return t('lib.five-components.title'); },
    get origin() { return t('lib.five-components.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.five-components.hook'); },
    get thesis() { return t('lib.five-components.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.five-components.idea.${i}.name`),
        body: t(`lib.five-components.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.five-components.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.five-components.practice.${i}`));
    },
    habits: [
      { id: 's_gratitude', get because() { return t('lib.five-components.habit.s_gratitude.because'); } },
      { id: 'b_morningjoy', get because() { return t('lib.five-components.habit.b_morningjoy.because'); } },
      { id: 'd_review', get because() { return t('lib.five-components.habit.d_review.because'); } },
    ],
    quests: [
      { id: 'q_wheel', get because() { return t('lib.five-components.quest.q_wheel.because'); } },
      { id: 'q_energyaudit', get because() { return t('lib.five-components.quest.q_energyaudit.because'); } },
    ],
    get vaultSource() { return t('lib.five-components.vaultSource'); },
  },
  {
    slug: 'contempt-not-anger',
    attr: 'family',
    get title() { return t('lib.contempt-not-anger.title'); },
    get origin() { return t('lib.contempt-not-anger.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.contempt-not-anger.hook'); },
    get thesis() { return t('lib.contempt-not-anger.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.contempt-not-anger.idea.${i}.name`),
        body: t(`lib.contempt-not-anger.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.contempt-not-anger.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.contempt-not-anger.practice.${i}`));
    },
    habits: [
      { id: 'f_meet', get because() { return t('lib.contempt-not-anger.habit.f_meet.because'); } },
      { id: 'f_thanks', get because() { return t('lib.contempt-not-anger.habit.f_thanks.because'); } },
      { id: 'f_remember', get because() { return t('lib.contempt-not-anger.habit.f_remember.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.contempt-not-anger.quest.q_hardconversation.because'); } },
      { id: 'q_reconnect', get because() { return t('lib.contempt-not-anger.quest.q_reconnect.because'); } },
    ],
    get vaultSource() { return t('lib.contempt-not-anger.vaultSource'); },
  },
  {
    slug: 'five-pillars-of-resilience',
    attr: 'development',
    get title() { return t('lib.five-pillars-of-resilience.title'); },
    get origin() { return t('lib.five-pillars-of-resilience.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.five-pillars-of-resilience.hook'); },
    get thesis() { return t('lib.five-pillars-of-resilience.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.five-pillars-of-resilience.idea.${i}.name`),
        body: t(`lib.five-pillars-of-resilience.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.five-pillars-of-resilience.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.five-pillars-of-resilience.practice.${i}`));
    },
    habits: [
      { id: 'h_lightsout', get because() { return t('lib.five-pillars-of-resilience.habit.h_lightsout.because'); } },
      { id: 'b_outside', get because() { return t('lib.five-pillars-of-resilience.habit.b_outside.because'); } },
      { id: 'f_reachout', get because() { return t('lib.five-pillars-of-resilience.habit.f_reachout.because'); } },
    ],
    quests: [
      { id: 'q_habitsystem', get because() { return t('lib.five-pillars-of-resilience.quest.q_habitsystem.because'); } },
      { id: 'q_sleepreset', get because() { return t('lib.five-pillars-of-resilience.quest.q_sleepreset.because'); } },
    ],
    get vaultSource() { return t('lib.five-pillars-of-resilience.vaultSource'); },
  },
  {
    slug: 'the-personality-layer',
    attr: 'money',
    get title() { return t('lib.the-personality-layer.title'); },
    get origin() { return t('lib.the-personality-layer.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.the-personality-layer.hook'); },
    get thesis() { return t('lib.the-personality-layer.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.the-personality-layer.idea.${i}.name`),
        body: t(`lib.the-personality-layer.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.the-personality-layer.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.the-personality-layer.practice.${i}`));
    },
    habits: [
      { id: 'm_waitlist', get because() { return t('lib.the-personality-layer.habit.m_waitlist.because'); } },
      { id: 'b_morningjoy', get because() { return t('lib.the-personality-layer.habit.b_morningjoy.because'); } },
      { id: 'm_log', get because() { return t('lib.the-personality-layer.habit.m_log.because'); } },
    ],
    quests: [
      { id: 'q_raise', get because() { return t('lib.the-personality-layer.quest.q_raise.because'); } },
      { id: 'q_skill', get because() { return t('lib.the-personality-layer.quest.q_skill.because'); } },
    ],
    get vaultSource() { return t('lib.the-personality-layer.vaultSource'); },
  },
  {
    slug: 'the-soul-of-the-intention',
    attr: 'spirituality',
    get title() { return t('lib.the-soul-of-the-intention.title'); },
    get origin() { return t('lib.the-soul-of-the-intention.origin'); },
    medium: 'lecture',
    minutes: 6,
    get hook() { return t('lib.the-soul-of-the-intention.hook'); },
    get thesis() { return t('lib.the-soul-of-the-intention.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.the-soul-of-the-intention.idea.${i}.name`),
        body: t(`lib.the-soul-of-the-intention.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-soul-of-the-intention.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.the-soul-of-the-intention.practice.${i}`));
    },
    habits: [
      { id: 's_dhikr', get because() { return t('lib.the-soul-of-the-intention.habit.s_dhikr.because'); } },
      { id: 'm_charity', get because() { return t('lib.the-soul-of-the-intention.habit.m_charity.because'); } },
      { id: 's_gratitude', get because() { return t('lib.the-soul-of-the-intention.habit.s_gratitude.because'); } },
    ],
    quests: [
      { id: 'q_learnfaith', get because() { return t('lib.the-soul-of-the-intention.quest.q_learnfaith.because'); } },
      { id: 'q_debts', get because() { return t('lib.the-soul-of-the-intention.quest.q_debts.because'); } },
    ],
    get vaultSource() { return t('lib.the-soul-of-the-intention.vaultSource'); },
  },
  {
    slug: 'when-a-symptom-stops-on-its-own',
    attr: 'health',
    get title() { return t('lib.when-a-symptom-stops-on-its-own.title'); },
    get origin() { return t('lib.when-a-symptom-stops-on-its-own.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.when-a-symptom-stops-on-its-own.hook'); },
    get thesis() { return t('lib.when-a-symptom-stops-on-its-own.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.when-a-symptom-stops-on-its-own.idea.${i}.name`),
        body: t(`lib.when-a-symptom-stops-on-its-own.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.when-a-symptom-stops-on-its-own.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.when-a-symptom-stops-on-its-own.practice.${i}`));
    },
    habits: [
      { id: 'd_notes', get because() { return t('lib.when-a-symptom-stops-on-its-own.habit.d_notes.because'); } },
      { id: 'h_realmeal', get because() { return t('lib.when-a-symptom-stops-on-its-own.habit.h_realmeal.because'); } },
      { id: 'h_nolate', get because() { return t('lib.when-a-symptom-stops-on-its-own.habit.h_nolate.because'); } },
    ],
    quests: [
      { id: 'q_healthcheck', get because() { return t('lib.when-a-symptom-stops-on-its-own.quest.q_healthcheck.because'); } },
      { id: 'q_energyaudit', get because() { return t('lib.when-a-symptom-stops-on-its-own.quest.q_energyaudit.because'); } },
    ],
    get vaultSource() { return t('lib.when-a-symptom-stops-on-its-own.vaultSource'); },
  },
  {
    slug: 'separate-the-three',
    attr: 'health',
    get title() { return t('lib.separate-the-three.title'); },
    get origin() { return t('lib.separate-the-three.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.separate-the-three.hook'); },
    get thesis() { return t('lib.separate-the-three.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.separate-the-three.idea.${i}.name`),
        body: t(`lib.separate-the-three.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.separate-the-three.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.separate-the-three.practice.${i}`));
    },
    habits: [
      { id: 'h_nosmoke', get because() { return t('lib.separate-the-three.habit.h_nosmoke.because'); } },
      { id: 'h_water', get because() { return t('lib.separate-the-three.habit.h_water.because'); } },
      { id: 'c_plan', get because() { return t('lib.separate-the-three.habit.c_plan.because'); } },
    ],
    quests: [
      { id: 'q_healthcheck', get because() { return t('lib.separate-the-three.quest.q_healthcheck.because'); } },
      { id: 'q_habitsystem', get because() { return t('lib.separate-the-three.quest.q_habitsystem.because'); } },
    ],
    get vaultSource() { return t('lib.separate-the-three.vaultSource'); },
  },
  {
    slug: 'expectations-as-a-joint-project',
    attr: 'family',
    get title() { return t('lib.expectations-as-a-joint-project.title'); },
    get origin() { return t('lib.expectations-as-a-joint-project.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.expectations-as-a-joint-project.hook'); },
    get thesis() { return t('lib.expectations-as-a-joint-project.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.expectations-as-a-joint-project.idea.${i}.name`),
        body: t(`lib.expectations-as-a-joint-project.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.expectations-as-a-joint-project.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.expectations-as-a-joint-project.practice.${i}`));
    },
    habits: [
      { id: 'f_thanks', get because() { return t('lib.expectations-as-a-joint-project.habit.f_thanks.because'); } },
      { id: 'f_remember', get because() { return t('lib.expectations-as-a-joint-project.habit.f_remember.because'); } },
      { id: 'd_review', get because() { return t('lib.expectations-as-a-joint-project.habit.d_review.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.expectations-as-a-joint-project.quest.q_hardconversation.because'); } },
      { id: 'q_reconnect', get because() { return t('lib.expectations-as-a-joint-project.quest.q_reconnect.because'); } },
    ],
    get vaultSource() { return t('lib.expectations-as-a-joint-project.vaultSource'); },
  },
  {
    slug: 'no-one-left-to-blame',
    attr: 'career',
    get title() { return t('lib.no-one-left-to-blame.title'); },
    get origin() { return t('lib.no-one-left-to-blame.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.no-one-left-to-blame.hook'); },
    get thesis() { return t('lib.no-one-left-to-blame.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.no-one-left-to-blame.idea.${i}.name`),
        body: t(`lib.no-one-left-to-blame.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 2 }, (_, i) => t(`lib.no-one-left-to-blame.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.no-one-left-to-blame.practice.${i}`));
    },
    habits: [
      { id: 'c_onelesson', get because() { return t('lib.no-one-left-to-blame.habit.c_onelesson.because'); } },
      { id: 'c_ship', get because() { return t('lib.no-one-left-to-blame.habit.c_ship.because'); } },
      { id: 'd_askquestion', get because() { return t('lib.no-one-left-to-blame.habit.d_askquestion.because'); } },
    ],
    quests: [
      { id: 'q_promise', get because() { return t('lib.no-one-left-to-blame.quest.q_promise.because'); } },
      { id: 'q_skill', get because() { return t('lib.no-one-left-to-blame.quest.q_skill.because'); } },
    ],
    get vaultSource() { return t('lib.no-one-left-to-blame.vaultSource'); },
  },
  {
    slug: 'independence-plus-purpose',
    attr: 'money',
    get title() { return t('lib.independence-plus-purpose.title'); },
    get origin() { return t('lib.independence-plus-purpose.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.independence-plus-purpose.hook'); },
    get thesis() { return t('lib.independence-plus-purpose.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.independence-plus-purpose.idea.${i}.name`),
        body: t(`lib.independence-plus-purpose.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.independence-plus-purpose.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.independence-plus-purpose.practice.${i}`));
    },
    habits: [
      { id: 'b_nocompare', get because() { return t('lib.independence-plus-purpose.habit.b_nocompare.because'); } },
      { id: 'm_nospend', get because() { return t('lib.independence-plus-purpose.habit.m_nospend.because'); } },
      { id: 'm_charity', get because() { return t('lib.independence-plus-purpose.habit.m_charity.because'); } },
    ],
    quests: [
      { id: 'q_wheel', get because() { return t('lib.independence-plus-purpose.quest.q_wheel.because'); } },
      { id: 'q_emergencyfund', get because() { return t('lib.independence-plus-purpose.quest.q_emergencyfund.because'); } },
    ],
    get vaultSource() { return t('lib.independence-plus-purpose.vaultSource'); },
  },
  {
    slug: 'push-them-to-the-wall',
    attr: 'brightness',
    get title() { return t('lib.push-them-to-the-wall.title'); },
    get origin() { return t('lib.push-them-to-the-wall.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.push-them-to-the-wall.hook'); },
    get thesis() { return t('lib.push-them-to-the-wall.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.push-them-to-the-wall.idea.${i}.name`),
        body: t(`lib.push-them-to-the-wall.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.push-them-to-the-wall.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.push-them-to-the-wall.practice.${i}`));
    },
    habits: [
      { id: 'c_ship', get because() { return t('lib.push-them-to-the-wall.habit.c_ship.because'); } },
      { id: 'd_notes', get because() { return t('lib.push-them-to-the-wall.habit.d_notes.because'); } },
      { id: 's_makecreate', get because() { return t('lib.push-them-to-the-wall.habit.s_makecreate.because'); } },
    ],
    quests: [
      { id: 'q_makeweekly', get because() { return t('lib.push-them-to-the-wall.quest.q_makeweekly.because'); } },
      { id: 'q_portfolio', get because() { return t('lib.push-them-to-the-wall.quest.q_portfolio.because'); } },
    ],
    get vaultSource() { return t('lib.push-them-to-the-wall.vaultSource'); },
  },
  {
    slug: 'context-before-the-verse',
    attr: 'spirituality',
    get title() { return t('lib.context-before-the-verse.title'); },
    get origin() { return t('lib.context-before-the-verse.origin'); },
    medium: 'lecture',
    minutes: 6,
    get hook() { return t('lib.context-before-the-verse.hook'); },
    get thesis() { return t('lib.context-before-the-verse.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.context-before-the-verse.idea.${i}.name`),
        body: t(`lib.context-before-the-verse.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 2 }, (_, i) => t(`lib.context-before-the-verse.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.context-before-the-verse.practice.${i}`));
    },
    habits: [
      { id: 's_quran', get because() { return t('lib.context-before-the-verse.habit.s_quran.because'); } },
      { id: 'd_read', get because() { return t('lib.context-before-the-verse.habit.d_read.because'); } },
      { id: 'd_notes', get because() { return t('lib.context-before-the-verse.habit.d_notes.because'); } },
    ],
    quests: [
      { id: 'q_learnfaith', get because() { return t('lib.context-before-the-verse.quest.q_learnfaith.because'); } },
      { id: 'q_anchor', get because() { return t('lib.context-before-the-verse.quest.q_anchor.because'); } },
    ],
    get vaultSource() { return t('lib.context-before-the-verse.vaultSource'); },
  },
  {
    slug: 'energy-relationships-tasks',
    attr: 'development',
    get title() { return t('lib.energy-relationships-tasks.title'); },
    get origin() { return t('lib.energy-relationships-tasks.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.energy-relationships-tasks.hook'); },
    get thesis() { return t('lib.energy-relationships-tasks.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.energy-relationships-tasks.idea.${i}.name`),
        body: t(`lib.energy-relationships-tasks.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.energy-relationships-tasks.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.energy-relationships-tasks.practice.${i}`));
    },
    habits: [
      { id: 'c_plan', get because() { return t('lib.energy-relationships-tasks.habit.c_plan.because'); } },
      { id: 'b_morningjoy', get because() { return t('lib.energy-relationships-tasks.habit.b_morningjoy.because'); } },
      { id: 'd_review', get because() { return t('lib.energy-relationships-tasks.habit.d_review.because'); } },
    ],
    quests: [
      { id: 'q_habitsystem', get because() { return t('lib.energy-relationships-tasks.quest.q_habitsystem.because'); } },
      { id: 'q_energyaudit', get because() { return t('lib.energy-relationships-tasks.quest.q_energyaudit.because'); } },
    ],
    get vaultSource() { return t('lib.energy-relationships-tasks.vaultSource'); },
  },
  {
    slug: 'trauma-as-a-marketing-term',
    attr: 'family',
    get title() { return t('lib.trauma-as-a-marketing-term.title'); },
    get origin() { return t('lib.trauma-as-a-marketing-term.origin'); },
    medium: 'podcast',
    minutes: 6,
    get hook() { return t('lib.trauma-as-a-marketing-term.hook'); },
    get thesis() { return t('lib.trauma-as-a-marketing-term.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.trauma-as-a-marketing-term.idea.${i}.name`),
        body: t(`lib.trauma-as-a-marketing-term.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.trauma-as-a-marketing-term.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.trauma-as-a-marketing-term.practice.${i}`));
    },
    habits: [
      { id: 'd_review', get because() { return t('lib.trauma-as-a-marketing-term.habit.d_review.because'); } },
      { id: 'f_meet', get because() { return t('lib.trauma-as-a-marketing-term.habit.f_meet.because'); } },
      { id: 'b_nocompare', get because() { return t('lib.trauma-as-a-marketing-term.habit.b_nocompare.because'); } },
    ],
    quests: [
      { id: 'q_hardconversation', get because() { return t('lib.trauma-as-a-marketing-term.quest.q_hardconversation.because'); } },
      { id: 'q_wheel', get because() { return t('lib.trauma-as-a-marketing-term.quest.q_wheel.because'); } },
    ],
    get vaultSource() { return t('lib.trauma-as-a-marketing-term.vaultSource'); },
  },
  {
    slug: 'equity-instead-of-collateral',
    attr: 'career',
    get title() { return t('lib.equity-instead-of-collateral.title'); },
    get origin() { return t('lib.equity-instead-of-collateral.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.equity-instead-of-collateral.hook'); },
    get thesis() { return t('lib.equity-instead-of-collateral.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.equity-instead-of-collateral.idea.${i}.name`),
        body: t(`lib.equity-instead-of-collateral.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.equity-instead-of-collateral.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.equity-instead-of-collateral.practice.${i}`));
    },
    habits: [
      { id: 'c_onelesson', get because() { return t('lib.equity-instead-of-collateral.habit.c_onelesson.because'); } },
      { id: 'm_log', get because() { return t('lib.equity-instead-of-collateral.habit.m_log.because'); } },
      { id: 'd_askquestion', get because() { return t('lib.equity-instead-of-collateral.habit.d_askquestion.because'); } },
    ],
    quests: [
      { id: 'q_raise', get because() { return t('lib.equity-instead-of-collateral.quest.q_raise.because'); } },
      { id: 'q_portfolio', get because() { return t('lib.equity-instead-of-collateral.quest.q_portfolio.because'); } },
    ],
    get vaultSource() { return t('lib.equity-instead-of-collateral.vaultSource'); },
  },
  {
    slug: 'stand-where-you-are-placed',
    attr: 'spirituality',
    get title() { return t('lib.stand-where-you-are-placed.title'); },
    get origin() { return t('lib.stand-where-you-are-placed.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.stand-where-you-are-placed.hook'); },
    get thesis() { return t('lib.stand-where-you-are-placed.thesis'); },
    get ideas() {
      return Array.from({ length: 4 }, (_, i) => ({
        name: t(`lib.stand-where-you-are-placed.idea.${i}.name`),
        body: t(`lib.stand-where-you-are-placed.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.stand-where-you-are-placed.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 4 }, (_, i) => t(`lib.stand-where-you-are-placed.practice.${i}`));
    },
    habits: [
      { id: 's_dhikr', get because() { return t('lib.stand-where-you-are-placed.habit.s_dhikr.because'); } },
      { id: 'f_thanks', get because() { return t('lib.stand-where-you-are-placed.habit.f_thanks.because'); } },
      { id: 'd_review', get because() { return t('lib.stand-where-you-are-placed.habit.d_review.because'); } },
    ],
    quests: [
      { id: 'q_anchor', get because() { return t('lib.stand-where-you-are-placed.quest.q_anchor.because'); } },
      { id: 'q_learnfaith', get because() { return t('lib.stand-where-you-are-placed.quest.q_learnfaith.because'); } },
    ],
    get vaultSource() { return t('lib.stand-where-you-are-placed.vaultSource'); },
  },
  {
    slug: 'take-it-to-the-end',
    attr: 'development',
    get title() { return t('lib.take-it-to-the-end.title'); },
    get origin() { return t('lib.take-it-to-the-end.origin'); },
    medium: 'podcast',
    minutes: 5,
    get hook() { return t('lib.take-it-to-the-end.hook'); },
    get thesis() { return t('lib.take-it-to-the-end.thesis'); },
    get ideas() {
      return Array.from({ length: 5 }, (_, i) => ({
        name: t(`lib.take-it-to-the-end.idea.${i}.name`),
        body: t(`lib.take-it-to-the-end.idea.${i}.body`),
      }));
    },
    get notes() {
      return Array.from({ length: 3 }, (_, i) => t(`lib.take-it-to-the-end.note.${i}`));
    },
    get practices() {
      return Array.from({ length: 5 }, (_, i) => t(`lib.take-it-to-the-end.practice.${i}`));
    },
    habits: [
      { id: 'c_plan', get because() { return t('lib.take-it-to-the-end.habit.c_plan.because'); } },
      { id: 'd_build', get because() { return t('lib.take-it-to-the-end.habit.d_build.because'); } },
      { id: 'h_lightsout', get because() { return t('lib.take-it-to-the-end.habit.h_lightsout.because'); } },
    ],
    quests: [
      { id: 'q_promise', get because() { return t('lib.take-it-to-the-end.quest.q_promise.because'); } },
      { id: 'q_habitsystem', get because() { return t('lib.take-it-to-the-end.quest.q_habitsystem.because'); } },
    ],
    get vaultSource() { return t('lib.take-it-to-the-end.vaultSource'); },
  },

];

/** Entries filed under a sector, in listing order. */
export function libraryFor(attr: AttributeKey): LibraryEntry[] {
  return LIBRARY.filter(e => e.attr === attr);
}

export function libraryEntry(slug: string): LibraryEntry | undefined {
  return LIBRARY.find(e => e.slug === slug);
}

/** XP/Gold for finishing an entry. One-time per entry — the library is finite by design. */
export const LIBRARY_READ_REWARD = { xp: 10, gold: 3 };
