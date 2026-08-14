import type { AttributeKey, HabitKind, PersonalityArchetype, QuestDuration } from './types';
import { t } from '../i18n';

// A library of habits and quests the player can add without having to invent one.
//
// The hard part of a habit tracker is not tracking, it's the blank field: "add a
// habit" assumes you already know which habit. Every template here is a concrete,
// same-day-actionable behaviour, tagged to a Wheel of Life sector.
//
// Design rules, from Atomic Habits (Clear, 2018):
//   · Two-Minute Rule (ch. 13) — an entry-level version must take under two minutes.
//     Templates marked effort: 'micro' satisfy this and are the honest starting point.
//   · Habit Stacking (ch. 5) — "After [CURRENT HABIT], I will [NEW HABIT]". Where a
//     template has a natural anchor, `stack` states it.
//   · Implementation Intentions (ch. 5) — a habit with a time and a place gets done.
//   · Make it Obvious / Attractive / Easy / Satisfying — the four laws. `technique`
//     names which one a template is actually leaning on.
//
// `suits` / `avoid` carry the radical profile fit (Ponomarenko's 7 radicals, the
// same vocabulary the Social hub already uses for contacts). A habit that depends on
// sustained willpower is a fine habit — for an epileptoid. Recommending it to someone
// whose profile has no epileptoid is setting them up to fail and then feel bad, which
// is the exact loop this app is trying not to be.

export type TemplateEffort = 'micro' | 'moderate' | 'demanding';

export interface HabitTemplate {
  id: string;
  name: string;
  kind: HabitKind;
  /** Primary sector, plus any it genuinely feeds. Drives XP routing. */
  attrs: AttributeKey[];
  freq: 'daily' | 'weekly';
  /** 0 (Sun) .. 6 (Sat), for weekly templates */
  weekdays?: number[];
  /** One line on why this is worth doing. Shown under the name. */
  why: string;
  /** The behaviour-design mechanism this leans on, named so it's learnable. */
  technique: string;
  /** Habit-stacking anchor, where one exists. */
  stack?: string;
  effort: TemplateEffort;
  /** Radicals this genuinely fits. Empty = fits broadly. */
  suits: PersonalityArchetype[];
  /** Radicals this reliably fails for — filtered out of recommendations. */
  avoid?: PersonalityArchetype[];
  source: string;
}

export interface QuestTemplate {
  id: string;
  title: string;
  description: string;
  attrs: AttributeKey[];
  targetDuration: QuestDuration;
  /** Concrete first sessions, so the quest isn't a wish. */
  steps: string[];
  effort: TemplateEffort;
  suits: PersonalityArchetype[];
  avoid?: PersonalityArchetype[];
  source: string;
}

const CLEAR = 'Atomic Habits — James Clear (2018)';
const ETM = 'Extreme Time Management — Mrochkovskiy & Tolkachev (2012)';
/**
 * Not everything worth doing comes from a book.
 *
 * The library was, for a while, sourced entirely from the two titles above — which
 * made it read as a book summary with checkboxes, and left whole sectors with four
 * options. These two sources cover the rest: ordinary practice that needs no
 * citation, and religious practice, which is a real and load-bearing part of many
 * people's week and belongs in the Spirituality sector as itself rather than as a
 * generic "reflect daily".
 */
// The two book titles above are proper names and stay as authored. These two are
// copy rather than citations, so they resolve through the dictionary at read time.

export const HABIT_TEMPLATES: HabitTemplate[] = [
  // ---------- Health ----------
  {
    id: 'h_walk10',
    get name() { return t('tpl.h.h_walk10.name'); },
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    get why() { return t('tpl.h.h_walk10.why'); },
    get technique() { return t('tpl.h.h_walk10.technique'); },
    get stack() { return t('tpl.h.h_walk10.stack'); },
    effort: 'micro',
    suits: ['hyperthymic', 'schizoid', 'emotive', 'anxious'],
    source: CLEAR,
  },
  {
    id: 'h_nolate',
    get name() { return t('tpl.h.h_nolate.name'); },
    kind: 'bad',
    attrs: ['health'],
    freq: 'daily',
    get why() { return t('tpl.h.h_nolate.why'); },
    get technique() { return t('tpl.h.h_nolate.technique'); },
    effort: 'moderate',
    suits: ['epileptoid', 'anxious', 'paranoid'],
    source: CLEAR,
  },
  {
    id: 'h_lightsout',
    get name() { return t('tpl.h.h_lightsout.name'); },
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    get why() { return t('tpl.h.h_lightsout.why'); },
    get technique() { return t('tpl.h.h_lightsout.technique'); },
    effort: 'moderate',
    suits: ['epileptoid', 'anxious'],
    avoid: ['hyperthymic'],
    source: CLEAR,
  },
  {
    id: 'h_pushups',
    get name() { return t('tpl.h.h_pushups.name'); },
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    get why() { return t('tpl.h.h_pushups.why'); },
    get technique() { return t('tpl.h.h_pushups.technique'); },
    get stack() { return t('tpl.h.h_pushups.stack'); },
    effort: 'micro',
    suits: [],
    source: CLEAR,
  },
  {
    id: 'h_water',
    get name() { return t('tpl.h.h_water.name'); },
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    get why() { return t('tpl.h.h_water.why'); },
    get technique() { return t('tpl.h.h_water.technique'); },
    get stack() { return t('tpl.h.h_water.stack'); },
    effort: 'micro',
    suits: [],
    source: CLEAR,
  },
  {
    id: 'h_nosmoke',
    get name() { return t('tpl.h.h_nosmoke.name'); },
    kind: 'bad',
    attrs: ['health'],
    freq: 'daily',
    get why() { return t('tpl.h.h_nosmoke.why'); },
    get technique() { return t('tpl.h.h_nosmoke.technique'); },
    effort: 'demanding',
    suits: ['epileptoid', 'paranoid'],
    source: CLEAR,
  },

  // ---------- Friends ----------
  {
    id: 'f_reachout',
    get name() { return t('tpl.h.f_reachout.name'); },
    kind: 'good',
    attrs: ['friends'],
    freq: 'weekly',
    weekdays: [0],
    get why() { return t('tpl.h.f_reachout.why'); },
    get technique() { return t('tpl.h.f_reachout.technique'); },
    effort: 'micro',
    suits: ['hyperthymic', 'hysteroid', 'emotive'],
    source: CLEAR,
  },
  {
    id: 'f_meet',
    get name() { return t('tpl.h.f_meet.name'); },
    kind: 'good',
    attrs: ['friends', 'brightness'],
    freq: 'weekly',
    weekdays: [6],
    get why() { return t('tpl.h.f_meet.why'); },
    get technique() { return t('tpl.h.f_meet.technique'); },
    effort: 'moderate',
    suits: ['hyperthymic', 'hysteroid', 'emotive'],
    avoid: ['schizoid'],
    source: ETM,
  },
  {
    id: 'f_nodoom',
    get name() { return t('tpl.h.f_nodoom.name'); },
    kind: 'bad',
    attrs: ['friends', 'health'],
    freq: 'daily',
    get why() { return t('tpl.h.f_nodoom.why'); },
    get technique() { return t('tpl.h.f_nodoom.technique'); },
    effort: 'moderate',
    suits: ['emotive', 'anxious'],
    source: CLEAR,
  },

  // ---------- Family ----------
  {
    id: 'fa_call',
    get name() { return t('tpl.h.fa_call.name'); },
    kind: 'good',
    attrs: ['family'],
    freq: 'weekly',
    weekdays: [0],
    get why() { return t('tpl.h.fa_call.why'); },
    get technique() { return t('tpl.h.fa_call.technique'); },
    effort: 'micro',
    suits: ['emotive', 'anxious', 'hysteroid'],
    source: ETM,
  },
  {
    id: 'fa_meal',
    get name() { return t('tpl.h.fa_meal.name'); },
    kind: 'good',
    attrs: ['family'],
    freq: 'daily',
    get why() { return t('tpl.h.fa_meal.why'); },
    get technique() { return t('tpl.h.fa_meal.technique'); },
    effort: 'micro',
    suits: ['emotive'],
    source: CLEAR,
  },
  {
    id: 'fa_sibling',
    get name() { return t('tpl.h.fa_sibling.name'); },
    kind: 'good',
    attrs: ['family'],
    freq: 'weekly',
    weekdays: [5],
    get why() { return t('tpl.h.fa_sibling.why'); },
    get technique() { return t('tpl.h.fa_sibling.technique'); },
    effort: 'micro',
    suits: ['emotive', 'hyperthymic'],
    source: ETM,
  },

  // ---------- Career ----------
  {
    id: 'c_frog',
    get name() { return t('tpl.h.c_frog.name'); },
    kind: 'good',
    attrs: ['career'],
    freq: 'daily',
    get why() { return t('tpl.h.c_frog.why'); },
    get technique() { return t('tpl.h.c_frog.technique'); },
    get stack() { return t('tpl.h.c_frog.stack'); },
    effort: 'demanding',
    suits: ['epileptoid', 'paranoid'],
    avoid: ['hyperthymic', 'anxious'],
    source: ETM,
  },
  {
    id: 'c_plan',
    get name() { return t('tpl.h.c_plan.name'); },
    kind: 'good',
    attrs: ['career', 'development'],
    freq: 'daily',
    get why() { return t('tpl.h.c_plan.why'); },
    get technique() { return t('tpl.h.c_plan.technique'); },
    get stack() { return t('tpl.h.c_plan.stack'); },
    effort: 'micro',
    suits: ['epileptoid', 'paranoid', 'anxious'],
    source: ETM,
  },
  {
    id: 'c_deepblock',
    get name() { return t('tpl.h.c_deepblock.name'); },
    kind: 'good',
    attrs: ['career'],
    freq: 'daily',
    get why() { return t('tpl.h.c_deepblock.why'); },
    get technique() { return t('tpl.h.c_deepblock.technique'); },
    effort: 'moderate',
    suits: ['schizoid', 'paranoid', 'epileptoid'],
    source: ETM,
  },
  {
    id: 'c_ship',
    get name() { return t('tpl.h.c_ship.name'); },
    kind: 'good',
    attrs: ['career', 'brightness'],
    freq: 'weekly',
    weekdays: [5],
    get why() { return t('tpl.h.c_ship.why'); },
    get technique() { return t('tpl.h.c_ship.technique'); },
    effort: 'moderate',
    suits: ['hysteroid', 'hyperthymic', 'schizoid'],
    source: CLEAR,
  },

  // ---------- Money ----------
  {
    id: 'm_log',
    get name() { return t('tpl.h.m_log.name'); },
    kind: 'good',
    attrs: ['money'],
    freq: 'daily',
    get why() { return t('tpl.h.m_log.why'); },
    get technique() { return t('tpl.h.m_log.technique'); },
    effort: 'micro',
    suits: ['epileptoid', 'anxious', 'paranoid'],
    avoid: ['hyperthymic'],
    source: CLEAR,
  },
  {
    id: 'm_checkbalance',
    get name() { return t('tpl.h.m_checkbalance.name'); },
    kind: 'good',
    attrs: ['money'],
    freq: 'weekly',
    weekdays: [1],
    get why() { return t('tpl.h.m_checkbalance.why'); },
    get technique() { return t('tpl.h.m_checkbalance.technique'); },
    effort: 'micro',
    suits: ['anxious', 'epileptoid'],
    source: ETM,
  },
  {
    id: 'm_nodebt',
    get name() { return t('tpl.h.m_nodebt.name'); },
    kind: 'bad',
    attrs: ['money'],
    freq: 'daily',
    get why() { return t('tpl.h.m_nodebt.why'); },
    get technique() { return t('tpl.h.m_nodebt.technique'); },
    effort: 'moderate',
    suits: ['epileptoid', 'paranoid', 'anxious'],
    source: CLEAR,
  },
  {
    id: 'm_payday',
    get name() { return t('tpl.h.m_payday.name'); },
    kind: 'good',
    attrs: ['money'],
    freq: 'weekly',
    weekdays: [5],
    get why() { return t('tpl.h.m_payday.why'); },
    get technique() { return t('tpl.h.m_payday.technique'); },
    effort: 'micro',
    suits: [],
    source: CLEAR,
  },

  // ---------- Spirituality ----------
  {
    id: 's_fajr',
    get name() { return t('tpl.h.s_fajr.name'); },
    kind: 'good',
    attrs: ['spirituality', 'health'],
    freq: 'daily',
    get why() { return t('tpl.h.s_fajr.why'); },
    get technique() { return t('tpl.h.s_fajr.technique'); },
    effort: 'demanding',
    suits: ['emotive', 'epileptoid', 'anxious'],
    source: ETM,
  },
  {
    id: 's_quran',
    get name() { return t('tpl.h.s_quran.name'); },
    kind: 'good',
    attrs: ['spirituality'],
    freq: 'daily',
    get why() { return t('tpl.h.s_quran.why'); },
    get technique() { return t('tpl.h.s_quran.technique'); },
    get stack() { return t('tpl.h.s_quran.stack'); },
    effort: 'micro',
    suits: [],
    source: CLEAR,
  },
  {
    id: 's_gratitude',
    get name() { return t('tpl.h.s_gratitude.name'); },
    kind: 'good',
    attrs: ['spirituality', 'brightness'],
    freq: 'daily',
    get why() { return t('tpl.h.s_gratitude.why'); },
    get technique() { return t('tpl.h.s_gratitude.technique'); },
    get stack() { return t('tpl.h.s_gratitude.stack'); },
    effort: 'micro',
    suits: ['emotive', 'anxious', 'hysteroid'],
    source: ETM,
  },
  {
    id: 's_makecreate',
    get name() { return t('tpl.h.s_makecreate.name'); },
    kind: 'good',
    attrs: ['spirituality', 'development'],
    freq: 'weekly',
    weekdays: [6],
    get why() { return t('tpl.h.s_makecreate.why'); },
    get technique() { return t('tpl.h.s_makecreate.technique'); },
    effort: 'moderate',
    suits: ['schizoid', 'hysteroid', 'emotive'],
    source: ETM,
  },

  // ---------- Development ----------
  {
    id: 'd_read',
    get name() { return t('tpl.h.d_read.name'); },
    kind: 'good',
    attrs: ['development'],
    freq: 'daily',
    get why() { return t('tpl.h.d_read.why'); },
    get technique() { return t('tpl.h.d_read.technique'); },
    effort: 'moderate',
    suits: ['schizoid', 'paranoid'],
    source: ETM,
  },
  {
    id: 'd_onepage',
    get name() { return t('tpl.h.d_onepage.name'); },
    kind: 'good',
    attrs: ['development'],
    freq: 'daily',
    get why() { return t('tpl.h.d_onepage.why'); },
    get technique() { return t('tpl.h.d_onepage.technique'); },
    effort: 'micro',
    suits: [],
    source: CLEAR,
  },
  {
    id: 'd_language',
    get name() { return t('tpl.h.d_language.name'); },
    kind: 'good',
    attrs: ['development'],
    freq: 'daily',
    get why() { return t('tpl.h.d_language.why'); },
    get technique() { return t('tpl.h.d_language.technique'); },
    effort: 'moderate',
    suits: ['schizoid', 'paranoid', 'hyperthymic'],
    source: ETM,
  },
  {
    id: 'd_review',
    get name() { return t('tpl.h.d_review.name'); },
    kind: 'good',
    attrs: ['development', 'spirituality'],
    freq: 'weekly',
    weekdays: [0],
    get why() { return t('tpl.h.d_review.why'); },
    get technique() { return t('tpl.h.d_review.technique'); },
    effort: 'moderate',
    suits: ['schizoid', 'emotive', 'paranoid', 'anxious'],
    source: ETM,
  },
  {
    id: 'd_nopassive',
    get name() { return t('tpl.h.d_nopassive.name'); },
    kind: 'bad',
    attrs: ['development'],
    freq: 'daily',
    get why() { return t('tpl.h.d_nopassive.why'); },
    get technique() { return t('tpl.h.d_nopassive.technique'); },
    effort: 'demanding',
    suits: ['epileptoid', 'paranoid'],
    avoid: ['hyperthymic'],
    source: CLEAR,
  },

  // ---------- Brightness ----------
  {
    id: 'b_new',
    get name() { return t('tpl.h.b_new.name'); },
    kind: 'good',
    attrs: ['brightness'],
    freq: 'weekly',
    weekdays: [6],
    get why() { return t('tpl.h.b_new.why'); },
    get technique() { return t('tpl.h.b_new.technique'); },
    effort: 'moderate',
    suits: ['hyperthymic', 'hysteroid', 'schizoid'],
    avoid: ['anxious'],
    source: CLEAR,
  },
  {
    id: 'b_outside',
    get name() { return t('tpl.h.b_outside.name'); },
    kind: 'good',
    attrs: ['brightness', 'health'],
    freq: 'weekly',
    weekdays: [6],
    get why() { return t('tpl.h.b_outside.why'); },
    get technique() { return t('tpl.h.b_outside.technique'); },
    effort: 'micro',
    suits: [],
    source: ETM,
  },
  {
    id: 'b_morningjoy',
    get name() { return t('tpl.h.b_morningjoy.name'); },
    kind: 'good',
    attrs: ['brightness'],
    freq: 'daily',
    get why() { return t('tpl.h.b_morningjoy.why'); },
    get technique() { return t('tpl.h.b_morningjoy.technique'); },
    effort: 'micro',
    suits: ['hyperthymic', 'hysteroid', 'emotive'],
    source: ETM,
  },
  {
    id: 'b_noalarm',
    get name() { return t('tpl.h.b_noalarm.name'); },
    kind: 'good',
    attrs: ['brightness', 'health'],
    freq: 'weekly',
    weekdays: [0],
    get why() { return t('tpl.h.b_noalarm.why'); },
    get technique() { return t('tpl.h.b_noalarm.technique'); },
    effort: 'micro',
    suits: ['anxious', 'emotive', 'schizoid'],
    source: ETM,
  },

  // ============================================================================
  // Beyond the two books.
  //
  // Sectors with four options are sectors nobody browses. Everything below is
  // ordinary, same-day-actionable practice that a reader would recognise without
  // having read anything — plus the religious practices that are a real part of
  // many weeks and were previously represented by a single Fajr entry.
  // ============================================================================

  // ---------- Health ----------
  {
    id: 'h_steps',
    get name() { return t('tpl.h.h_steps.name'); },
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    get why() { return t('tpl.h.h_steps.why'); },
    get technique() { return t('tpl.h.h_steps.technique'); },
    get stack() { return t('tpl.h.h_steps.stack'); },
    effort: 'micro',
    suits: ['hyperthymic', 'emotive', 'anxious'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'h_stretch',
    get name() { return t('tpl.h.h_stretch.name'); },
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    get why() { return t('tpl.h.h_stretch.why'); },
    get technique() { return t('tpl.h.h_stretch.technique'); },
    get stack() { return t('tpl.h.h_stretch.stack'); },
    effort: 'micro',
    suits: [],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'h_realmeal',
    get name() { return t('tpl.h.h_realmeal.name'); },
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    get why() { return t('tpl.h.h_realmeal.why'); },
    get technique() { return t('tpl.h.h_realmeal.technique'); },
    effort: 'moderate',
    suits: ['anxious', 'epileptoid'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'h_noscreen_bed',
    get name() { return t('tpl.h.h_noscreen_bed.name'); },
    kind: 'bad',
    attrs: ['health', 'brightness'],
    freq: 'daily',
    get why() { return t('tpl.h.h_noscreen_bed.why'); },
    get technique() { return t('tpl.h.h_noscreen_bed.technique'); },
    effort: 'moderate',
    suits: ['epileptoid', 'paranoid', 'anxious'],
    avoid: ['hyperthymic'],
    get source() { return t('tpl.source.practice'); },
  },

  // ---------- Friends ----------
  {
    id: 'f_voice',
    get name() { return t('tpl.h.f_voice.name'); },
    kind: 'good',
    attrs: ['friends'],
    freq: 'weekly',
    weekdays: [3],
    get why() { return t('tpl.h.f_voice.why'); },
    get technique() { return t('tpl.h.f_voice.technique'); },
    effort: 'micro',
    suits: ['hyperthymic', 'hysteroid', 'emotive'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'f_invite',
    get name() { return t('tpl.h.f_invite.name'); },
    kind: 'good',
    attrs: ['friends', 'brightness'],
    freq: 'weekly',
    weekdays: [2],
    get why() { return t('tpl.h.f_invite.why'); },
    get technique() { return t('tpl.h.f_invite.technique'); },
    effort: 'moderate',
    suits: ['hyperthymic', 'hysteroid'],
    avoid: ['anxious'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'f_remember',
    get name() { return t('tpl.h.f_remember.name'); },
    kind: 'good',
    attrs: ['friends', 'family'],
    freq: 'weekly',
    weekdays: [4],
    get why() { return t('tpl.h.f_remember.why'); },
    get technique() { return t('tpl.h.f_remember.technique'); },
    effort: 'micro',
    suits: ['emotive', 'anxious'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'f_nogossip',
    get name() { return t('tpl.h.f_nogossip.name'); },
    kind: 'bad',
    attrs: ['friends', 'spirituality'],
    freq: 'daily',
    get why() { return t('tpl.h.f_nogossip.why'); },
    get technique() { return t('tpl.h.f_nogossip.technique'); },
    effort: 'demanding',
    suits: ['emotive', 'epileptoid'],
    get source() { return t('tpl.source.faith'); },
  },
  {
    id: 'f_thanks',
    get name() { return t('tpl.h.f_thanks.name'); },
    kind: 'good',
    attrs: ['friends', 'brightness'],
    freq: 'weekly',
    weekdays: [5],
    get why() { return t('tpl.h.f_thanks.why'); },
    get technique() { return t('tpl.h.f_thanks.technique'); },
    effort: 'micro',
    suits: ['emotive', 'hysteroid'],
    get source() { return t('tpl.source.practice'); },
  },

  // ---------- Family ----------
  {
    id: 'fa_help',
    get name() { return t('tpl.h.fa_help.name'); },
    kind: 'good',
    attrs: ['family'],
    freq: 'daily',
    get why() { return t('tpl.h.fa_help.why'); },
    get technique() { return t('tpl.h.fa_help.technique'); },
    effort: 'micro',
    suits: ['emotive', 'epileptoid', 'anxious'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'fa_listen',
    get name() { return t('tpl.h.fa_listen.name'); },
    kind: 'good',
    attrs: ['family'],
    freq: 'daily',
    get why() { return t('tpl.h.fa_listen.why'); },
    get technique() { return t('tpl.h.fa_listen.technique'); },
    effort: 'demanding',
    suits: ['emotive', 'anxious'],
    avoid: ['paranoid'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'fa_photo',
    get name() { return t('tpl.h.fa_photo.name'); },
    kind: 'good',
    attrs: ['family', 'brightness'],
    freq: 'weekly',
    weekdays: [6],
    get why() { return t('tpl.h.fa_photo.why'); },
    get technique() { return t('tpl.h.fa_photo.technique'); },
    effort: 'micro',
    suits: ['hysteroid', 'hyperthymic', 'emotive'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'fa_relative',
    get name() { return t('tpl.h.fa_relative.name'); },
    kind: 'good',
    attrs: ['family'],
    freq: 'weekly',
    weekdays: [0],
    get why() { return t('tpl.h.fa_relative.why'); },
    get technique() { return t('tpl.h.fa_relative.technique'); },
    effort: 'micro',
    suits: ['emotive', 'hyperthymic'],
    get source() { return t('tpl.source.faith'); },
  },
  {
    id: 'fa_noraise',
    get name() { return t('tpl.h.fa_noraise.name'); },
    kind: 'bad',
    attrs: ['family'],
    freq: 'daily',
    get why() { return t('tpl.h.fa_noraise.why'); },
    get technique() { return t('tpl.h.fa_noraise.technique'); },
    effort: 'demanding',
    suits: ['epileptoid', 'emotive', 'anxious'],
    get source() { return t('tpl.source.practice'); },
  },

  // ---------- Career ----------
  {
    id: 'c_shutdown',
    get name() { return t('tpl.h.c_shutdown.name'); },
    kind: 'good',
    attrs: ['career', 'health'],
    freq: 'daily',
    get why() { return t('tpl.h.c_shutdown.why'); },
    get technique() { return t('tpl.h.c_shutdown.technique'); },
    get stack() { return t('tpl.h.c_shutdown.stack'); },
    effort: 'moderate',
    suits: ['epileptoid', 'anxious', 'schizoid'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'c_onelesson',
    get name() { return t('tpl.h.c_onelesson.name'); },
    kind: 'good',
    attrs: ['career', 'development'],
    freq: 'daily',
    get why() { return t('tpl.h.c_onelesson.why'); },
    get technique() { return t('tpl.h.c_onelesson.technique'); },
    effort: 'micro',
    suits: ['schizoid', 'paranoid'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'c_reachout_pro',
    get name() { return t('tpl.h.c_reachout_pro.name'); },
    kind: 'good',
    attrs: ['career', 'money'],
    freq: 'weekly',
    weekdays: [1],
    get why() { return t('tpl.h.c_reachout_pro.why'); },
    get technique() { return t('tpl.h.c_reachout_pro.technique'); },
    effort: 'moderate',
    suits: ['hysteroid', 'paranoid', 'hyperthymic'],
    avoid: ['anxious'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'c_nomultitask',
    get name() { return t('tpl.h.c_nomultitask.name'); },
    kind: 'bad',
    attrs: ['career'],
    freq: 'daily',
    get why() { return t('tpl.h.c_nomultitask.why'); },
    get technique() { return t('tpl.h.c_nomultitask.technique'); },
    effort: 'moderate',
    suits: ['schizoid', 'epileptoid', 'paranoid'],
    avoid: ['hyperthymic'],
    get source() { return t('tpl.source.practice'); },
  },

  // ---------- Money ----------
  {
    id: 'm_nospend',
    get name() { return t('tpl.h.m_nospend.name'); },
    kind: 'good',
    attrs: ['money'],
    freq: 'weekly',
    weekdays: [2],
    get why() { return t('tpl.h.m_nospend.why'); },
    get technique() { return t('tpl.h.m_nospend.technique'); },
    effort: 'moderate',
    suits: ['epileptoid', 'anxious', 'paranoid'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'm_waitlist',
    get name() { return t('tpl.h.m_waitlist.name'); },
    kind: 'good',
    attrs: ['money'],
    freq: 'daily',
    get why() { return t('tpl.h.m_waitlist.why'); },
    get technique() { return t('tpl.h.m_waitlist.technique'); },
    effort: 'micro',
    suits: ['anxious', 'epileptoid'],
    avoid: ['hyperthymic'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'm_subs',
    get name() { return t('tpl.h.m_subs.name'); },
    kind: 'good',
    attrs: ['money'],
    freq: 'weekly',
    weekdays: [1],
    get why() { return t('tpl.h.m_subs.why'); },
    get technique() { return t('tpl.h.m_subs.technique'); },
    effort: 'micro',
    suits: ['epileptoid', 'anxious'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'm_charity',
    get name() { return t('tpl.h.m_charity.name'); },
    kind: 'good',
    attrs: ['money', 'spirituality'],
    freq: 'weekly',
    weekdays: [5],
    get why() { return t('tpl.h.m_charity.why'); },
    get technique() { return t('tpl.h.m_charity.technique'); },
    effort: 'micro',
    suits: ['emotive', 'hysteroid'],
    get source() { return t('tpl.source.faith'); },
  },
  {
    id: 'm_owed',
    get name() { return t('tpl.h.m_owed.name'); },
    kind: 'good',
    attrs: ['money', 'friends'],
    freq: 'weekly',
    weekdays: [4],
    get why() { return t('tpl.h.m_owed.why'); },
    get technique() { return t('tpl.h.m_owed.technique'); },
    effort: 'demanding',
    suits: ['emotive', 'epileptoid'],
    avoid: ['anxious'],
    get source() { return t('tpl.source.practice'); },
  },

  // ---------- Spirituality ----------
  {
    id: 's_fivedaily',
    get name() { return t('tpl.h.s_fivedaily.name'); },
    kind: 'good',
    attrs: ['spirituality'],
    freq: 'daily',
    get why() { return t('tpl.h.s_fivedaily.why'); },
    get technique() { return t('tpl.h.s_fivedaily.technique'); },
    effort: 'demanding',
    suits: ['epileptoid', 'emotive', 'anxious'],
    get source() { return t('tpl.source.faith'); },
  },
  {
    id: 's_jumua',
    get name() { return t('tpl.h.s_jumua.name'); },
    kind: 'good',
    attrs: ['spirituality', 'friends'],
    freq: 'weekly',
    weekdays: [5],
    get why() { return t('tpl.h.s_jumua.why'); },
    get technique() { return t('tpl.h.s_jumua.technique'); },
    effort: 'moderate',
    suits: ['emotive', 'epileptoid', 'hysteroid'],
    get source() { return t('tpl.source.faith'); },
  },
  {
    id: 's_fastmonthu',
    get name() { return t('tpl.h.s_fastmonthu.name'); },
    kind: 'good',
    attrs: ['spirituality', 'health'],
    freq: 'weekly',
    weekdays: [1, 4],
    get why() { return t('tpl.h.s_fastmonthu.why'); },
    get technique() { return t('tpl.h.s_fastmonthu.technique'); },
    effort: 'demanding',
    suits: ['epileptoid', 'paranoid', 'emotive'],
    get source() { return t('tpl.source.faith'); },
  },
  {
    id: 's_dhikr',
    get name() { return t('tpl.h.s_dhikr.name'); },
    kind: 'good',
    attrs: ['spirituality'],
    freq: 'daily',
    get why() { return t('tpl.h.s_dhikr.why'); },
    get technique() { return t('tpl.h.s_dhikr.technique'); },
    get stack() { return t('tpl.h.s_dhikr.stack'); },
    effort: 'micro',
    suits: ['schizoid', 'emotive', 'anxious'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 's_forgive',
    get name() { return t('tpl.h.s_forgive.name'); },
    kind: 'good',
    attrs: ['spirituality', 'friends'],
    freq: 'weekly',
    weekdays: [0],
    get why() { return t('tpl.h.s_forgive.why'); },
    get technique() { return t('tpl.h.s_forgive.technique'); },
    effort: 'moderate',
    suits: ['emotive', 'anxious'],
    get source() { return t('tpl.source.faith'); },
  },

  // ---------- Development ----------
  {
    id: 'd_teach',
    get name() { return t('tpl.h.d_teach.name'); },
    kind: 'good',
    attrs: ['development', 'friends'],
    freq: 'weekly',
    weekdays: [3],
    get why() { return t('tpl.h.d_teach.why'); },
    get technique() { return t('tpl.h.d_teach.technique'); },
    effort: 'moderate',
    suits: ['hysteroid', 'schizoid', 'hyperthymic'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'd_build',
    get name() { return t('tpl.h.d_build.name'); },
    kind: 'good',
    attrs: ['development', 'career'],
    freq: 'weekly',
    weekdays: [6],
    get why() { return t('tpl.h.d_build.why'); },
    get technique() { return t('tpl.h.d_build.technique'); },
    effort: 'demanding',
    suits: ['schizoid', 'paranoid'],
    avoid: ['anxious'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'd_notes',
    get name() { return t('tpl.h.d_notes.name'); },
    kind: 'good',
    attrs: ['development'],
    freq: 'daily',
    get why() { return t('tpl.h.d_notes.why'); },
    get technique() { return t('tpl.h.d_notes.technique'); },
    get stack() { return t('tpl.h.d_notes.stack'); },
    effort: 'micro',
    suits: ['schizoid', 'paranoid', 'anxious'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'd_askquestion',
    get name() { return t('tpl.h.d_askquestion.name'); },
    kind: 'good',
    attrs: ['development', 'career'],
    freq: 'weekly',
    weekdays: [2],
    get why() { return t('tpl.h.d_askquestion.why'); },
    get technique() { return t('tpl.h.d_askquestion.technique'); },
    effort: 'moderate',
    suits: ['hyperthymic', 'hysteroid', 'schizoid'],
    avoid: ['anxious'],
    get source() { return t('tpl.source.practice'); },
  },

  // ---------- Brightness ----------
  {
    id: 'b_music',
    get name() { return t('tpl.h.b_music.name'); },
    kind: 'good',
    attrs: ['brightness'],
    freq: 'weekly',
    weekdays: [4],
    get why() { return t('tpl.h.b_music.why'); },
    get technique() { return t('tpl.h.b_music.technique'); },
    effort: 'micro',
    suits: ['hyperthymic', 'hysteroid', 'schizoid'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'b_play',
    get name() { return t('tpl.h.b_play.name'); },
    kind: 'good',
    attrs: ['brightness'],
    freq: 'weekly',
    weekdays: [6],
    get why() { return t('tpl.h.b_play.why'); },
    get technique() { return t('tpl.h.b_play.technique'); },
    effort: 'micro',
    suits: ['epileptoid', 'paranoid', 'anxious'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'b_sport',
    get name() { return t('tpl.h.b_sport.name'); },
    kind: 'good',
    attrs: ['brightness', 'health'],
    freq: 'weekly',
    weekdays: [6],
    get why() { return t('tpl.h.b_sport.why'); },
    get technique() { return t('tpl.h.b_sport.technique'); },
    effort: 'micro',
    suits: ['hyperthymic', 'hysteroid'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'b_nocompare',
    get name() { return t('tpl.h.b_nocompare.name'); },
    kind: 'bad',
    attrs: ['brightness', 'spirituality'],
    freq: 'daily',
    get why() { return t('tpl.h.b_nocompare.why'); },
    get technique() { return t('tpl.h.b_nocompare.technique'); },
    effort: 'moderate',
    suits: ['emotive', 'anxious', 'hysteroid'],
    get source() { return t('tpl.source.practice'); },
  },
];

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: 'q_wheel',
    get title() { return t('tpl.q.q_wheel.title'); },
    get description() { return t('tpl.q.q_wheel.description'); },
    attrs: ['development'],
    targetDuration: '1d',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_wheel.step.${i}`));
    },
    effort: 'moderate',
    suits: [],
    source: ETM,
  },
  {
    id: 'q_declutter',
    get title() { return t('tpl.q.q_declutter.title'); },
    get description() { return t('tpl.q.q_declutter.description'); },
    attrs: ['brightness', 'development'],
    targetDuration: '1w',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_declutter.step.${i}`));
    },
    effort: 'moderate',
    suits: ['epileptoid', 'anxious'],
    source: ETM,
  },
  {
    id: 'q_debts',
    get title() { return t('tpl.q.q_debts.title'); },
    get description() { return t('tpl.q.q_debts.description'); },
    attrs: ['money', 'friends'],
    targetDuration: '2w',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_debts.step.${i}`));
    },
    effort: 'demanding',
    suits: ['epileptoid', 'paranoid'],
    source: ETM,
  },
  {
    id: 'q_energyaudit',
    get title() { return t('tpl.q.q_energyaudit.title'); },
    get description() { return t('tpl.q.q_energyaudit.description'); },
    attrs: ['health', 'brightness'],
    targetDuration: '1w',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_energyaudit.step.${i}`));
    },
    effort: 'moderate',
    suits: ['emotive', 'anxious', 'schizoid'],
    source: ETM,
  },
  {
    id: 'q_promise',
    get title() { return t('tpl.q.q_promise.title'); },
    get description() { return t('tpl.q.q_promise.description'); },
    attrs: ['career'],
    targetDuration: '1m',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_promise.step.${i}`));
    },
    effort: 'demanding',
    suits: ['hysteroid', 'paranoid'],
    avoid: ['anxious'],
    source: ETM,
  },
  {
    id: 'q_habitsystem',
    get title() { return t('tpl.q.q_habitsystem.title'); },
    get description() { return t('tpl.q.q_habitsystem.description'); },
    attrs: ['development', 'health'],
    targetDuration: '2w',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_habitsystem.step.${i}`));
    },
    effort: 'moderate',
    suits: [],
    source: CLEAR,
  },
  {
    id: 'q_reconnect',
    get title() { return t('tpl.q.q_reconnect.title'); },
    get description() { return t('tpl.q.q_reconnect.description'); },
    attrs: ['friends', 'family'],
    targetDuration: '1m',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_reconnect.step.${i}`));
    },
    effort: 'moderate',
    suits: ['hyperthymic', 'hysteroid', 'emotive'],
    avoid: ['schizoid'],
    source: ETM,
  },
  {
    id: 'q_anchor',
    get title() { return t('tpl.q.q_anchor.title'); },
    get description() { return t('tpl.q.q_anchor.description'); },
    attrs: ['spirituality'],
    targetDuration: '1m',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_anchor.step.${i}`));
    },
    effort: 'demanding',
    suits: ['emotive', 'epileptoid', 'anxious'],
    source: ETM,
  },
  {
    id: 'q_makeweekly',
    get title() { return t('tpl.q.q_makeweekly.title'); },
    get description() { return t('tpl.q.q_makeweekly.description'); },
    attrs: ['spirituality', 'brightness'],
    targetDuration: '1m',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_makeweekly.step.${i}`));
    },
    effort: 'moderate',
    suits: ['schizoid', 'hysteroid', 'emotive'],
    source: ETM,
  },
  {
    id: 'q_skill',
    get title() { return t('tpl.q.q_skill.title'); },
    get description() { return t('tpl.q.q_skill.description'); },
    attrs: ['development', 'career'],
    targetDuration: '3m',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_skill.step.${i}`));
    },
    effort: 'demanding',
    suits: ['schizoid', 'paranoid'],
    source: ETM,
  },

  // ---------- Beyond the two books ----------
  {
    id: 'q_healthcheck',
    get title() { return t('tpl.q.q_healthcheck.title'); },
    get description() { return t('tpl.q.q_healthcheck.description'); },
    attrs: ['health'],
    targetDuration: '1m',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_healthcheck.step.${i}`));
    },
    effort: 'demanding',
    suits: ['anxious', 'epileptoid', 'emotive'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'q_sleepreset',
    get title() { return t('tpl.q.q_sleepreset.title'); },
    get description() { return t('tpl.q.q_sleepreset.description'); },
    attrs: ['health', 'brightness'],
    targetDuration: '2w',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_sleepreset.step.${i}`));
    },
    effort: 'demanding',
    suits: ['epileptoid', 'anxious'],
    avoid: ['hyperthymic'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'q_emergencyfund',
    get title() { return t('tpl.q.q_emergencyfund.title'); },
    get description() { return t('tpl.q.q_emergencyfund.description'); },
    attrs: ['money'],
    targetDuration: '6m',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_emergencyfund.step.${i}`));
    },
    effort: 'demanding',
    suits: ['anxious', 'epileptoid', 'paranoid'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'q_raise',
    get title() { return t('tpl.q.q_raise.title'); },
    get description() { return t('tpl.q.q_raise.description'); },
    attrs: ['career', 'money'],
    targetDuration: '3m',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_raise.step.${i}`));
    },
    effort: 'demanding',
    suits: ['paranoid', 'hysteroid'],
    avoid: ['anxious'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'q_portfolio',
    get title() { return t('tpl.q.q_portfolio.title'); },
    get description() { return t('tpl.q.q_portfolio.description'); },
    attrs: ['career', 'brightness'],
    targetDuration: '1m',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_portfolio.step.${i}`));
    },
    effort: 'moderate',
    suits: ['hysteroid', 'schizoid', 'paranoid'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'q_hardconversation',
    get title() { return t('tpl.q.q_hardconversation.title'); },
    get description() { return t('tpl.q.q_hardconversation.description'); },
    attrs: ['family', 'friends'],
    targetDuration: '1m',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_hardconversation.step.${i}`));
    },
    effort: 'demanding',
    suits: ['emotive', 'paranoid'],
    avoid: ['anxious'],
    get source() { return t('tpl.source.practice'); },
  },
  {
    id: 'q_learnfaith',
    get title() { return t('tpl.q.q_learnfaith.title'); },
    get description() { return t('tpl.q.q_learnfaith.description'); },
    attrs: ['spirituality', 'development'],
    targetDuration: '3m',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_learnfaith.step.${i}`));
    },
    effort: 'moderate',
    suits: ['schizoid', 'emotive', 'epileptoid'],
    get source() { return t('tpl.source.faith'); },
  },
  {
    id: 'q_tryfive',
    get title() { return t('tpl.q.q_tryfive.title'); },
    get description() { return t('tpl.q.q_tryfive.description'); },
    attrs: ['brightness'],
    targetDuration: '3m',
    get steps() {
      return Array.from({ length: 3 }, (_, i) => t(`tpl.q.q_tryfive.step.${i}`));
    },
    effort: 'moderate',
    suits: ['hyperthymic', 'hysteroid', 'schizoid'],
    avoid: ['anxious'],
    get source() { return t('tpl.source.practice'); },
  },
];

/**
 * Recommendation filter. With no profile set the full library is returned in its
 * authored order — the app never pretends to know more about you than it does.
 *
 * With a profile, templates that explicitly `avoid` any of your radicals are
 * dropped, and the rest sort by how well they match. `suits: []` means "fits
 * broadly" and always survives, so filtering can never empty a sector.
 */
export function recommendedFor<T extends { suits: PersonalityArchetype[]; avoid?: PersonalityArchetype[]; effort: TemplateEffort }>(
  templates: T[],
  profile: PersonalityArchetype[] | undefined,
): T[] {
  if (!profile || profile.length === 0) return templates;

  const rank = new Map(profile.map((r, i) => [r, profile.length - i]));
  const effortBonus: Record<TemplateEffort, number> = { micro: 0.5, moderate: 0, demanding: -0.5 };

  return templates
    .filter(t => !t.avoid?.some(r => profile.includes(r)))
    .map(t => {
      const fit = t.suits.length === 0
        ? 0.75 // broad templates score just under a genuine match
        : t.suits.reduce((best, r) => Math.max(best, (rank.get(r) ?? 0) / profile.length), 0);
      return { t, score: fit + effortBonus[t.effort] };
    })
    .sort((a, b) => b.score - a.score)
    .map(x => x.t);
}

export function habitTemplatesFor(attr: AttributeKey): HabitTemplate[] {
  return HABIT_TEMPLATES.filter(t => t.attrs.includes(attr));
}

export function questTemplatesFor(attr: AttributeKey): QuestTemplate[] {
  return QUEST_TEMPLATES.filter(t => t.attrs.includes(attr));
}
