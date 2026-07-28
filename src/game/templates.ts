import type { AttributeKey, HabitKind, PersonalityArchetype, QuestDuration } from './types';

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
const PRACTICE = 'Common practice';
const FAITH = 'Religious practice';

export const HABIT_TEMPLATES: HabitTemplate[] = [
  // ---------- Health ----------
  {
    id: 'h_walk10',
    name: 'Walk 10 minutes after waking',
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    why: 'The cheapest possible entry into the health sector. Light and movement early set the sleep cycle that everything else depends on.',
    technique: 'Two-Minute Rule — scaled to a version you cannot argue with',
    stack: 'After I get out of bed, I will put shoes on and go outside.',
    effort: 'micro',
    suits: ['hyperthymic', 'schizoid', 'emotive', 'anxious'],
    source: CLEAR,
  },
  {
    id: 'h_nolate',
    name: 'No food after 22:00',
    kind: 'bad',
    attrs: ['health'],
    freq: 'daily',
    why: 'Late eating is the single most common cause of bad sleep and morning heartburn. Removing it is subtraction, not addition — no new time required.',
    technique: 'Make it Difficult — the inverse of the third law, applied to a bad habit',
    effort: 'moderate',
    suits: ['epileptoid', 'anxious', 'paranoid'],
    source: CLEAR,
  },
  {
    id: 'h_lightsout',
    name: 'Lights out by midnight',
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    why: 'A fixed end to the day is worth more than a fixed start. The wake time follows from it on its own.',
    technique: 'Implementation Intention — a time, not an intention',
    effort: 'moderate',
    suits: ['epileptoid', 'anxious'],
    avoid: ['hyperthymic'],
    source: CLEAR,
  },
  {
    id: 'h_pushups',
    name: 'Ten push-ups',
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    why: 'Small enough to do without changing clothes or leaving the room. The point is the streak, not the volume — volume follows.',
    technique: 'Two-Minute Rule — standardize before you optimize',
    stack: 'After I brush my teeth, I will do ten push-ups.',
    effort: 'micro',
    suits: [],
    source: CLEAR,
  },
  {
    id: 'h_water',
    name: 'A glass of water before coffee',
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    why: 'Attaches to something you already do without fail, which is why it survives the weeks when nothing else does.',
    technique: 'Habit Stacking',
    stack: 'Before I make coffee, I will drink a glass of water.',
    effort: 'micro',
    suits: [],
    source: CLEAR,
  },
  {
    id: 'h_nosmoke',
    name: 'No smoking',
    kind: 'bad',
    attrs: ['health'],
    freq: 'daily',
    why: 'Tracked as a daily hold rather than a quit date, because the failure mode is social and situational, not chemical.',
    technique: 'Make it Invisible — the trigger is usually a specific place and specific people',
    effort: 'demanding',
    suits: ['epileptoid', 'paranoid'],
    source: CLEAR,
  },

  // ---------- Friends ----------
  {
    id: 'f_reachout',
    name: 'Message one person I have not spoken to in a month',
    kind: 'good',
    attrs: ['friends'],
    freq: 'weekly',
    weekdays: [0],
    why: 'Friendships rarely end in a decision — they lapse. One message a week is enough to stop the lapse.',
    technique: 'Make it Easy — one person, not "catch up with everyone"',
    effort: 'micro',
    suits: ['hyperthymic', 'hysteroid', 'emotive'],
    source: CLEAR,
  },
  {
    id: 'f_meet',
    name: 'See a friend in person',
    kind: 'good',
    attrs: ['friends', 'brightness'],
    freq: 'weekly',
    weekdays: [6],
    why: 'The book\'s Environment sector is about hours actually spent together, not contact maintained. Messaging does not substitute.',
    technique: 'Implementation Intention — a fixed day beats good intentions',
    effort: 'moderate',
    suits: ['hyperthymic', 'hysteroid', 'emotive'],
    avoid: ['schizoid'],
    source: ETM,
  },
  {
    id: 'f_nodoom',
    name: 'No scrolling before I have spoken to someone',
    kind: 'bad',
    attrs: ['friends', 'health'],
    freq: 'daily',
    why: 'Replaces a low-quality social substitute with the real thing, at the hour when the substitute is most tempting.',
    technique: 'Make it Unattractive — name the trade the scroll is actually making',
    effort: 'moderate',
    suits: ['emotive', 'anxious'],
    source: CLEAR,
  },

  // ---------- Family ----------
  {
    id: 'fa_call',
    name: 'Call a parent',
    kind: 'good',
    attrs: ['family'],
    freq: 'weekly',
    weekdays: [0],
    why: 'The gap between calls grows on its own if nothing holds it. A fixed day removes the question of whether today is a good time.',
    technique: 'Implementation Intention',
    effort: 'micro',
    suits: ['emotive', 'anxious', 'hysteroid'],
    source: ETM,
  },
  {
    id: 'fa_meal',
    name: 'Eat one meal with family, no phone',
    kind: 'good',
    attrs: ['family'],
    freq: 'daily',
    why: 'Presence, not time. A shared meal already happens most days — this only changes what happens during it.',
    technique: 'Make it Obvious — the phone goes in another room, not face-down',
    effort: 'micro',
    suits: ['emotive'],
    source: CLEAR,
  },
  {
    id: 'fa_sibling',
    name: 'Ask a sibling about their week',
    kind: 'good',
    attrs: ['family'],
    freq: 'weekly',
    weekdays: [5],
    why: 'Sibling relationships decay quietly because nobody is responsible for maintaining them. One question makes someone responsible.',
    technique: 'Make it Easy — a question, not a plan',
    effort: 'micro',
    suits: ['emotive', 'hyperthymic'],
    source: ETM,
  },

  // ---------- Career ----------
  {
    id: 'c_frog',
    name: 'Eat the frog — worst task first',
    kind: 'good',
    attrs: ['career'],
    freq: 'daily',
    why: 'The book\'s signature move: do the task you have been avoiding before anything else, while everyone else defers it to the last moment.',
    technique: 'Eat the Frog — the unpleasant task goes first, not when you feel ready',
    stack: 'After I sit down to work, the first thing I open is the thing I least want to.',
    effort: 'demanding',
    suits: ['epileptoid', 'paranoid'],
    avoid: ['hyperthymic', 'anxious'],
    source: ETM,
  },
  {
    id: 'c_plan',
    name: 'Plan tomorrow before sleep',
    kind: 'good',
    attrs: ['career', 'development'],
    freq: 'daily',
    why: 'The book insists the plan is made the night before so the morning is spent acting, not deciding. Sleep does the preparation for you.',
    technique: 'Make it Obvious — tomorrow is decided while today is still fresh',
    stack: 'After I put my phone on charge, I will write tomorrow\'s three tasks.',
    effort: 'micro',
    suits: ['epileptoid', 'paranoid', 'anxious'],
    source: ETM,
  },
  {
    id: 'c_deepblock',
    name: 'One uninterrupted work block',
    kind: 'good',
    attrs: ['career'],
    freq: 'daily',
    why: 'The book compares constant interruption to revving an engine while yanking the handbrake. One protected block beats a whole day of fragments.',
    technique: 'Choice Architecture — notifications off before the block, not during',
    effort: 'moderate',
    suits: ['schizoid', 'paranoid', 'epileptoid'],
    source: ETM,
  },
  {
    id: 'c_ship',
    name: 'Show my work to one person',
    kind: 'good',
    attrs: ['career', 'brightness'],
    freq: 'weekly',
    weekdays: [5],
    why: 'Work with no audience loses energy over time. A single named person each week is enough of an audience to keep it alive.',
    technique: 'Cardinal Rule — a response is an immediate reward, which is what makes it repeat',
    effort: 'moderate',
    suits: ['hysteroid', 'hyperthymic', 'schizoid'],
    source: CLEAR,
  },

  // ---------- Money ----------
  {
    id: 'm_log',
    name: 'Log every expense',
    kind: 'good',
    attrs: ['money'],
    freq: 'daily',
    why: 'The book\'s Finances sector starts with knowing the number. Nothing about money improves while the balance goes unchecked.',
    technique: 'Habits Scorecard — awareness before change',
    effort: 'micro',
    suits: ['epileptoid', 'anxious', 'paranoid'],
    avoid: ['hyperthymic'],
    source: CLEAR,
  },
  {
    id: 'm_checkbalance',
    name: 'Check the balance',
    kind: 'good',
    attrs: ['money'],
    freq: 'weekly',
    weekdays: [1],
    why: 'A weekly look is enough to catch a problem while it is small, and infrequent enough that it does not become anxiety.',
    technique: 'Implementation Intention — a fixed day removes the dread of choosing one',
    effort: 'micro',
    suits: ['anxious', 'epileptoid'],
    source: ETM,
  },
  {
    id: 'm_nodebt',
    name: 'No new borrowing',
    kind: 'bad',
    attrs: ['money'],
    freq: 'daily',
    why: 'Held as a daily line rather than a goal, because the decision that creates debt is always a single moment, not a period.',
    technique: 'Make it Difficult — remove the one-tap credit path from your phone',
    effort: 'moderate',
    suits: ['epileptoid', 'paranoid', 'anxious'],
    source: CLEAR,
  },
  {
    id: 'm_payday',
    name: 'Move something to savings on payday',
    kind: 'good',
    attrs: ['money'],
    freq: 'weekly',
    weekdays: [5],
    why: 'Amount does not matter at the start. Establishing that money moves before it is spent is the behaviour being built.',
    technique: 'Make it Easy — automate it once and the habit maintains itself',
    effort: 'micro',
    suits: [],
    source: CLEAR,
  },

  // ---------- Spirituality ----------
  {
    id: 's_fajr',
    name: 'Fajr on time',
    kind: 'good',
    attrs: ['spirituality', 'health'],
    freq: 'daily',
    why: 'An anchor at the start of the day that the rest of the day organizes itself around — the spiritual equivalent of eating the frog first.',
    technique: 'Implementation Intention — the time is fixed externally, which is its advantage',
    effort: 'demanding',
    suits: ['emotive', 'epileptoid', 'anxious'],
    source: ETM,
  },
  {
    id: 's_quran',
    name: 'Read one page',
    kind: 'good',
    attrs: ['spirituality'],
    freq: 'daily',
    why: 'One page is deliberately below the level that requires deciding. The consistency is the point, not the volume.',
    technique: 'Two-Minute Rule',
    stack: 'After I finish praying, I will read one page.',
    effort: 'micro',
    suits: [],
    source: CLEAR,
  },
  {
    id: 's_gratitude',
    name: 'Name three things that went right',
    kind: 'good',
    attrs: ['spirituality', 'brightness'],
    freq: 'daily',
    why: 'The book\'s success diary, reduced to its working part: the day is reviewed for what worked rather than what did not.',
    technique: 'Success Diary — five achievements a day, scaled down to a version that survives',
    stack: 'After I get into bed, I will name three.',
    effort: 'micro',
    suits: ['emotive', 'anxious', 'hysteroid'],
    source: ETM,
  },
  {
    id: 's_makecreate',
    name: 'Make something for 20 minutes',
    kind: 'good',
    attrs: ['spirituality', 'development'],
    freq: 'weekly',
    weekdays: [6],
    why: 'The book pairs spirituality with creativity deliberately — both are about producing meaning rather than consuming it.',
    technique: 'Goldilocks Rule — pick something just past your current ability',
    effort: 'moderate',
    suits: ['schizoid', 'hysteroid', 'emotive'],
    source: ETM,
  },

  // ---------- Development ----------
  {
    id: 'd_read',
    name: 'Read for 30 minutes',
    kind: 'good',
    attrs: ['development'],
    freq: 'daily',
    why: 'The book asks for a minimum of thirty minutes of self-education daily, and treats it as non-negotiable rather than aspirational.',
    technique: 'Implementation Intention — a fixed slot, or it loses to everything urgent',
    effort: 'moderate',
    suits: ['schizoid', 'paranoid'],
    source: ETM,
  },
  {
    id: 'd_onepage',
    name: 'Read one page',
    kind: 'good',
    attrs: ['development'],
    freq: 'daily',
    why: 'The version that survives a bad week. Thirty minutes is the goal; one page is what keeps the streak alive when thirty is impossible.',
    technique: 'Two-Minute Rule — never miss twice matters more than never missing',
    effort: 'micro',
    suits: [],
    source: CLEAR,
  },
  {
    id: 'd_language',
    name: 'Fifteen minutes of a language',
    kind: 'good',
    attrs: ['development'],
    freq: 'daily',
    why: 'One of the book\'s explicit chapter tasks. Languages reward frequency far more than session length.',
    technique: 'Make it Easy — same app, same time, no decision',
    effort: 'moderate',
    suits: ['schizoid', 'paranoid', 'hyperthymic'],
    source: ETM,
  },
  {
    id: 'd_review',
    name: 'Weekly review — 20 minutes, no phone',
    kind: 'good',
    attrs: ['development', 'spirituality'],
    freq: 'weekly',
    weekdays: [0],
    why: 'Four questions: what happened, what worked, what did not, what actually matters next week. The habit that makes the other habits work.',
    technique: 'Reflection & Review — the book\'s "mark your progress on the wheel weekly"',
    effort: 'moderate',
    suits: ['schizoid', 'emotive', 'paranoid', 'anxious'],
    source: ETM,
  },
  {
    id: 'd_nopassive',
    name: 'No video before I have made something',
    kind: 'bad',
    attrs: ['development'],
    freq: 'daily',
    why: 'Targets the specific failure where consumption feels like learning. Order matters more than the ban.',
    technique: 'Temptation Bundling, reversed — the reward comes after the work',
    effort: 'demanding',
    suits: ['epileptoid', 'paranoid'],
    avoid: ['hyperthymic'],
    source: CLEAR,
  },

  // ---------- Brightness ----------
  {
    id: 'b_new',
    name: 'Do one thing I have never done',
    kind: 'good',
    attrs: ['brightness'],
    freq: 'weekly',
    weekdays: [6],
    why: 'The sector exists to stop weeks becoming interchangeable. One unfamiliar thing a week is enough to make a week distinguishable.',
    technique: 'Goldilocks Rule — the threat to motivation is boredom, not difficulty',
    effort: 'moderate',
    suits: ['hyperthymic', 'hysteroid', 'schizoid'],
    avoid: ['anxious'],
    source: CLEAR,
  },
  {
    id: 'b_outside',
    name: 'Get outside, properly',
    kind: 'good',
    attrs: ['brightness', 'health'],
    freq: 'weekly',
    weekdays: [6],
    why: 'The book prescribes nature explicitly as an energy source rather than a leisure activity.',
    technique: 'Make it Attractive — pair it with something you already look forward to',
    effort: 'micro',
    suits: [],
    source: ETM,
  },
  {
    id: 'b_morningjoy',
    name: 'One small pleasure in the morning',
    kind: 'good',
    attrs: ['brightness'],
    freq: 'daily',
    why: 'The book\'s "small morning joys": five to seven pleasant small things, rotated, so anticipation is what gets you out of bed.',
    technique: 'Make it Attractive — anticipation is the mechanism, so it has to vary',
    effort: 'micro',
    suits: ['hyperthymic', 'hysteroid', 'emotive'],
    source: ETM,
  },
  {
    id: 'b_noalarm',
    name: 'One day a week without an alarm',
    kind: 'good',
    attrs: ['brightness', 'health'],
    freq: 'weekly',
    weekdays: [0],
    why: 'An explicit instruction in the book, and the only habit here whose content is rest.',
    technique: 'Recovery as a scheduled input, not what is left over',
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
    name: 'Walk after the biggest meal',
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    why: 'Ten minutes after eating does more for how you feel that evening than the same ten minutes at any other hour, and the meal is already a reliable cue.',
    technique: 'Habit Stacking — the meal is the anchor, so no new slot is needed',
    stack: 'After I finish dinner, I will walk around the block.',
    effort: 'micro',
    suits: ['hyperthymic', 'emotive', 'anxious'],
    source: PRACTICE,
  },
  {
    id: 'h_stretch',
    name: 'Five minutes of back and neck',
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    why: 'For anyone whose work is a chair. Five minutes daily beats an hour weekly, because the problem accumulates daily.',
    technique: 'Two-Minute Rule — a version short enough to do on a bad day',
    stack: 'After I close my laptop, I will stretch for five minutes.',
    effort: 'micro',
    suits: [],
    source: PRACTICE,
  },
  {
    id: 'h_realmeal',
    name: 'Eat a real meal before evening',
    kind: 'good',
    attrs: ['health'],
    freq: 'daily',
    why: 'For the pattern where the whole day is coffee and then everything arrives at once at midnight. Fixing the timing is easier than fixing the food.',
    technique: 'Implementation Intention — the target is the hour, not the menu',
    effort: 'moderate',
    suits: ['anxious', 'epileptoid'],
    source: PRACTICE,
  },
  {
    id: 'h_noscreen_bed',
    name: 'No phone in bed',
    kind: 'bad',
    attrs: ['health', 'brightness'],
    freq: 'daily',
    why: 'The single change with the largest effect on how the next morning feels, and it requires buying nothing and scheduling nothing.',
    technique: 'Make it Difficult — the charger moves to the other side of the room',
    effort: 'moderate',
    suits: ['epileptoid', 'paranoid', 'anxious'],
    avoid: ['hyperthymic'],
    source: PRACTICE,
  },

  // ---------- Friends ----------
  {
    id: 'f_voice',
    name: 'Send one voice message instead of typing',
    kind: 'good',
    attrs: ['friends'],
    freq: 'weekly',
    weekdays: [3],
    why: 'A voice note carries tone that a text cannot, and takes less time. It reliably restarts conversations that text had let go flat.',
    technique: 'Make it Easy — thirty seconds of talking beats a message you draft and never send',
    effort: 'micro',
    suits: ['hyperthymic', 'hysteroid', 'emotive'],
    source: PRACTICE,
  },
  {
    id: 'f_invite',
    name: 'Invite someone to something',
    kind: 'good',
    attrs: ['friends', 'brightness'],
    freq: 'weekly',
    weekdays: [2],
    why: 'Most people wait to be invited, which is why plans stop happening. Being the one who invites is a role, and it can be taken deliberately.',
    technique: 'Implementation Intention — a fixed day for the ask, not for the plan',
    effort: 'moderate',
    suits: ['hyperthymic', 'hysteroid'],
    avoid: ['anxious'],
    source: PRACTICE,
  },
  {
    id: 'f_remember',
    name: 'Ask about the thing they told me last time',
    kind: 'good',
    attrs: ['friends', 'family'],
    freq: 'weekly',
    weekdays: [4],
    why: 'Following up on the interview, the illness, the trip — this is what separates a friend from a contact, and it only needs a note and a question.',
    technique: 'Make it Obvious — keep it in their contact notes so it is there next time',
    effort: 'micro',
    suits: ['emotive', 'anxious'],
    source: PRACTICE,
  },
  {
    id: 'f_nogossip',
    name: 'No talking about someone who is not there',
    kind: 'bad',
    attrs: ['friends', 'spirituality'],
    freq: 'daily',
    why: 'Costs nothing to hold and changes how conversations feel within a week. It also makes people trust what you say to them.',
    technique: 'Make it Unattractive — name the trade out loud once and it gets easier',
    effort: 'demanding',
    suits: ['emotive', 'epileptoid'],
    source: FAITH,
  },
  {
    id: 'f_thanks',
    name: 'Thank one person specifically',
    kind: 'good',
    attrs: ['friends', 'brightness'],
    freq: 'weekly',
    weekdays: [5],
    why: 'Specific beats general: "thanks for covering Tuesday" lands, "thanks for everything" does not. One message, no occasion required.',
    technique: 'Cardinal Rule — the reply is the reward, which is what makes it repeat',
    effort: 'micro',
    suits: ['emotive', 'hysteroid'],
    source: PRACTICE,
  },

  // ---------- Family ----------
  {
    id: 'fa_help',
    name: 'Do one thing at home without being asked',
    kind: 'good',
    attrs: ['family'],
    freq: 'daily',
    why: 'Living with family and contributing nothing visible is the fastest route to friction that nobody names. One unasked thing a day changes the read.',
    technique: 'Make it Easy — the smallest visible thing counts',
    effort: 'micro',
    suits: ['emotive', 'epileptoid', 'anxious'],
    source: PRACTICE,
  },
  {
    id: 'fa_listen',
    name: 'Let a parent finish without arguing',
    kind: 'good',
    attrs: ['family'],
    freq: 'daily',
    why: 'For the specific case where you are not fighting but nothing gets through either. Changing only your half is the part you control.',
    technique: 'Make it Difficult — the rule is silence until they stop, not agreement',
    effort: 'demanding',
    suits: ['emotive', 'anxious'],
    avoid: ['paranoid'],
    source: PRACTICE,
  },
  {
    id: 'fa_photo',
    name: 'Send the family something from my week',
    kind: 'good',
    attrs: ['family', 'brightness'],
    freq: 'weekly',
    weekdays: [6],
    why: 'A photo of something ordinary keeps people in your life without a conversation being scheduled. It is the lowest-effort form of being present.',
    technique: 'Make it Easy — one photo, no caption required',
    effort: 'micro',
    suits: ['hysteroid', 'hyperthymic', 'emotive'],
    source: PRACTICE,
  },
  {
    id: 'fa_relative',
    name: 'Contact one relative outside the household',
    kind: 'good',
    attrs: ['family'],
    freq: 'weekly',
    weekdays: [0],
    why: 'Aunts, uncles, cousins and grandparents fall out of contact by default because no one is assigned to them. Rotating through one a week fixes it.',
    technique: 'Implementation Intention — rotate a list so there is no choosing',
    effort: 'micro',
    suits: ['emotive', 'hyperthymic'],
    source: FAITH,
  },
  {
    id: 'fa_noraise',
    name: 'No raised voice at home',
    kind: 'bad',
    attrs: ['family'],
    freq: 'daily',
    why: 'Held daily rather than as a resolution, because it is decided in single moments and those moments are what the streak measures.',
    technique: 'Make it Obvious — leave the room first, resume the conversation after',
    effort: 'demanding',
    suits: ['epileptoid', 'emotive', 'anxious'],
    source: PRACTICE,
  },

  // ---------- Career ----------
  {
    id: 'c_shutdown',
    name: 'A clean end to the working day',
    kind: 'good',
    attrs: ['career', 'health'],
    freq: 'daily',
    why: 'Without a defined end, work leaks into the evening in a form that is neither work nor rest. Closing it deliberately is what makes the evening real.',
    technique: 'Implementation Intention — a ritual, not a time you drift past',
    stack: 'After my last task, I will write tomorrow\'s first task and close everything.',
    effort: 'moderate',
    suits: ['epileptoid', 'anxious', 'schizoid'],
    source: PRACTICE,
  },
  {
    id: 'c_onelesson',
    name: 'Note one thing that worked at work',
    kind: 'good',
    attrs: ['career', 'development'],
    freq: 'daily',
    why: 'Craft improves from noticing, not from hours. One line a day compounds into the thing you can actually teach or charge more for.',
    technique: 'Reflection & Review — one line, same place every day',
    effort: 'micro',
    suits: ['schizoid', 'paranoid'],
    source: PRACTICE,
  },
  {
    id: 'c_reachout_pro',
    name: 'One message that could lead to work',
    kind: 'good',
    attrs: ['career', 'money'],
    freq: 'weekly',
    weekdays: [1],
    why: 'Opportunity arrives through people, and the pipeline goes quiet the moment you stop sending. One a week is enough to keep it warm.',
    technique: 'Make it Easy — one message, not a networking strategy',
    effort: 'moderate',
    suits: ['hysteroid', 'paranoid', 'hyperthymic'],
    avoid: ['anxious'],
    source: PRACTICE,
  },
  {
    id: 'c_nomultitask',
    name: 'One tab, one task',
    kind: 'bad',
    attrs: ['career'],
    freq: 'daily',
    why: 'Aimed at the specific failure of finishing a day busy and unable to name what got done. The constraint is on the screen, not on the effort.',
    technique: 'Choice Architecture — close everything else before starting, not during',
    effort: 'moderate',
    suits: ['schizoid', 'epileptoid', 'paranoid'],
    avoid: ['hyperthymic'],
    source: PRACTICE,
  },

  // ---------- Money ----------
  {
    id: 'm_nospend',
    name: 'One no-spend day',
    kind: 'good',
    attrs: ['money'],
    freq: 'weekly',
    weekdays: [2],
    why: 'A day with zero discretionary spending shows you which purchases were habit rather than need, faster than any budget does.',
    technique: 'Make it Difficult — leave the card at home for the day',
    effort: 'moderate',
    suits: ['epileptoid', 'anxious', 'paranoid'],
    source: PRACTICE,
  },
  {
    id: 'm_waitlist',
    name: 'Wait a day before buying anything unplanned',
    kind: 'good',
    attrs: ['money'],
    freq: 'daily',
    why: 'Most regretted purchases are decided in under a minute. A single day of delay removes almost all of them and forbids nothing.',
    technique: 'Make it Difficult — add friction to the moment, not to the month',
    effort: 'micro',
    suits: ['anxious', 'epileptoid'],
    avoid: ['hyperthymic'],
    source: PRACTICE,
  },
  {
    id: 'm_subs',
    name: 'Check what renewed this week',
    kind: 'good',
    attrs: ['money'],
    freq: 'weekly',
    weekdays: [1],
    why: 'Subscriptions are the one expense designed to be forgotten. A weekly glance is the whole defence.',
    technique: 'Implementation Intention — same day, same list',
    effort: 'micro',
    suits: ['epileptoid', 'anxious'],
    source: PRACTICE,
  },
  {
    id: 'm_charity',
    name: 'Give something away',
    kind: 'good',
    attrs: ['money', 'spirituality'],
    freq: 'weekly',
    weekdays: [5],
    why: 'Regular giving, however small, changes your relationship to money faster than saving does — it establishes that money leaving is a decision you make.',
    technique: 'Make it Easy — a fixed small amount, automated where possible',
    effort: 'micro',
    suits: ['emotive', 'hysteroid'],
    source: FAITH,
  },
  {
    id: 'm_owed',
    name: 'Message one person about money between us',
    kind: 'good',
    attrs: ['money', 'friends'],
    freq: 'weekly',
    weekdays: [4],
    why: 'Unspoken debt costs the friendship long before it costs the money. One message a week clears the backlog without a confrontation.',
    technique: 'Two-Minute Rule — a message, not a repayment plan',
    effort: 'demanding',
    suits: ['emotive', 'epileptoid'],
    avoid: ['anxious'],
    source: PRACTICE,
  },

  // ---------- Spirituality ----------
  {
    id: 's_fivedaily',
    name: 'All five prayers',
    kind: 'good',
    attrs: ['spirituality'],
    freq: 'daily',
    why: 'The full practice rather than a single anchor. Tracked as one daily hold, because the day either held it or did not.',
    technique: 'Implementation Intention — the times are fixed externally, which is the advantage',
    effort: 'demanding',
    suits: ['epileptoid', 'emotive', 'anxious'],
    source: FAITH,
  },
  {
    id: 's_jumua',
    name: 'Jumu\'ah',
    kind: 'good',
    attrs: ['spirituality', 'friends'],
    freq: 'weekly',
    weekdays: [5],
    why: 'A weekly practice that is also the reliable social contact of the week — it feeds two sectors at once, which is why it survives busy months.',
    technique: 'Implementation Intention — a fixed hour on a fixed day',
    effort: 'moderate',
    suits: ['emotive', 'epileptoid', 'hysteroid'],
    source: FAITH,
  },
  {
    id: 's_fastmonthu',
    name: 'Fast Monday and Thursday',
    kind: 'good',
    attrs: ['spirituality', 'health'],
    freq: 'weekly',
    weekdays: [1, 4],
    why: 'A twice-weekly practice with a physical component, which makes it one of the few habits that genuinely serves two sectors rather than being filed under both.',
    technique: 'Implementation Intention — the days are named, so there is no deciding',
    effort: 'demanding',
    suits: ['epileptoid', 'paranoid', 'emotive'],
    source: FAITH,
  },
  {
    id: 's_dhikr',
    name: 'Five quiet minutes before the day starts',
    kind: 'good',
    attrs: ['spirituality'],
    freq: 'daily',
    why: 'Remembrance, meditation, or simply sitting without input. The content varies by what you believe; the effect of starting the day unhurried does not.',
    technique: 'Habit Stacking — attach it to the practice or the coffee that already happens',
    stack: 'After I finish my first prayer or my first coffee, I will sit for five minutes.',
    effort: 'micro',
    suits: ['schizoid', 'emotive', 'anxious'],
    source: PRACTICE,
  },
  {
    id: 's_forgive',
    name: 'Let one thing go',
    kind: 'good',
    attrs: ['spirituality', 'friends'],
    freq: 'weekly',
    weekdays: [0],
    why: 'One grudge, resentment or unsent angry message, deliberately dropped. Carrying them is the cost people most consistently underestimate.',
    technique: 'Reflection & Review — name it in writing, then decide',
    effort: 'moderate',
    suits: ['emotive', 'anxious'],
    source: FAITH,
  },

  // ---------- Development ----------
  {
    id: 'd_teach',
    name: 'Explain one thing I learned to someone',
    kind: 'good',
    attrs: ['development', 'friends'],
    freq: 'weekly',
    weekdays: [3],
    why: 'You find out what you actually understood at the moment you try to say it out loud. Nothing else surfaces the gaps as fast.',
    technique: 'Cardinal Rule — their question is the immediate feedback',
    effort: 'moderate',
    suits: ['hysteroid', 'schizoid', 'hyperthymic'],
    source: PRACTICE,
  },
  {
    id: 'd_build',
    name: 'Build something with the thing I am learning',
    kind: 'good',
    attrs: ['development', 'career'],
    freq: 'weekly',
    weekdays: [6],
    why: 'Courses finish and leave nothing behind. One small built thing a week converts study into something you can show and something you retain.',
    technique: 'Goldilocks Rule — just past what you can already do',
    effort: 'demanding',
    suits: ['schizoid', 'paranoid'],
    avoid: ['anxious'],
    source: PRACTICE,
  },
  {
    id: 'd_notes',
    name: 'Write down what I read, in my own words',
    kind: 'good',
    attrs: ['development'],
    freq: 'daily',
    why: 'Reading without capture feels productive and leaves nothing recoverable a month later. Three sentences in your own words is the whole difference.',
    technique: 'Two-Minute Rule — three sentences, not a summary',
    stack: 'After I stop reading, I will write three sentences about it.',
    effort: 'micro',
    suits: ['schizoid', 'paranoid', 'anxious'],
    source: PRACTICE,
  },
  {
    id: 'd_askquestion',
    name: 'Ask one question I would normally not ask',
    kind: 'good',
    attrs: ['development', 'career'],
    freq: 'weekly',
    weekdays: [2],
    why: 'Most of what stays unknown stays unknown because asking felt costly. The cost is almost always lower than it looks from inside.',
    technique: 'Make it Easy — one question, and it does not have to be a good one',
    effort: 'moderate',
    suits: ['hyperthymic', 'hysteroid', 'schizoid'],
    avoid: ['anxious'],
    source: PRACTICE,
  },

  // ---------- Brightness ----------
  {
    id: 'b_music',
    name: 'Listen to something new',
    kind: 'good',
    attrs: ['brightness'],
    freq: 'weekly',
    weekdays: [4],
    why: 'The cheapest possible way to make a week distinguishable from the one before it. No planning, no cost, no other person required.',
    technique: 'Make it Attractive — novelty is the mechanism, so it has to actually be new',
    effort: 'micro',
    suits: ['hyperthymic', 'hysteroid', 'schizoid'],
    source: PRACTICE,
  },
  {
    id: 'b_play',
    name: 'Do something with no purpose',
    kind: 'good',
    attrs: ['brightness'],
    freq: 'weekly',
    weekdays: [6],
    why: 'For the pattern where every hour has to justify itself. An hour that produces nothing is the point, not a failure of the hour.',
    technique: 'Recovery as a scheduled input, not what is left over',
    effort: 'micro',
    suits: ['epileptoid', 'paranoid', 'anxious'],
    source: PRACTICE,
  },
  {
    id: 'b_sport',
    name: 'Watch or play the sport I actually like',
    kind: 'good',
    attrs: ['brightness', 'health'],
    freq: 'weekly',
    weekdays: [6],
    why: 'A named, protected slot for the thing you enjoy without justification. Naming it is what stops it being the first thing cut from a busy week.',
    technique: 'Implementation Intention — a fixed slot, or it loses to everything urgent',
    effort: 'micro',
    suits: ['hyperthymic', 'hysteroid'],
    source: PRACTICE,
  },
  {
    id: 'b_nocompare',
    name: 'No scrolling other people\'s lives',
    kind: 'bad',
    attrs: ['brightness', 'spirituality'],
    freq: 'daily',
    why: 'The most reliable way to feel worse about a week that was objectively fine. Removing the input is easier than arguing with the feeling.',
    technique: 'Make it Invisible — the app comes off the home screen, not off the phone',
    effort: 'moderate',
    suits: ['emotive', 'anxious', 'hysteroid'],
    source: PRACTICE,
  },
];

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    id: 'q_wheel',
    title: 'Score my Wheel of Life',
    description:
      'The book\'s first assignment. Score all eight sectors 0–10 honestly, then write one concrete two-month goal for each and the intermediate steps to get there. Everything else in this app is downstream of this.',
    attrs: ['development'],
    targetDuration: '1d',
    steps: [
      'Score each of the eight sectors 0–10 as they actually are today',
      'Write one specific two-month goal per sector',
      'Break the three lowest sectors into weekly steps',
    ],
    effort: 'moderate',
    suits: [],
    source: ETM,
  },
  {
    id: 'q_declutter',
    title: 'Clear the space',
    description:
      'Throw out everything you have not used in over a year, physical and digital. The book\'s claim: new things need somewhere to arrive, in your head and in your flat.',
    attrs: ['brightness', 'development'],
    targetDuration: '1w',
    steps: ['One room or one drawer per session', 'Unsubscribe from every list you do not read', 'Clear the phone home screen to what you actually use'],
    effort: 'moderate',
    suits: ['epileptoid', 'anxious'],
    source: ETM,
  },
  {
    id: 'q_debts',
    title: 'Face the debts',
    description:
      'List every debt with the real number and a date you will speak to each person. Not a repayment plan — the goal of this quest is that nothing is unknown and nobody is being avoided.',
    attrs: ['money', 'friends'],
    targetDuration: '2w',
    steps: ['Write every debt down with the exact amount', 'Contact one person per session', 'Agree a real date with each, even if it is far out'],
    effort: 'demanding',
    suits: ['epileptoid', 'paranoid'],
    source: ETM,
  },
  {
    id: 'q_energyaudit',
    title: 'Energy audit',
    description:
      'Two lists: what drains your energy and what supplies it. Then three actions a day to reduce the first list and one thing daily from the second.',
    attrs: ['health', 'brightness'],
    targetDuration: '1w',
    steps: ['List everything that drains you', 'List everything that restores you', 'Pick three drains to cut this week'],
    effort: 'moderate',
    suits: ['emotive', 'anxious', 'schizoid'],
    source: ETM,
  },
  {
    id: 'q_promise',
    title: 'Make one public commitment',
    description:
      'Promise something specific, to a person whose opinion matters to you, with a deadline. The book\'s ninth-chapter assignment — the point is removing the retreat, not the promise itself.',
    attrs: ['career'],
    targetDuration: '1m',
    steps: ['Decide the specific, measurable promise', 'Name the person and the deadline', 'Tell them'],
    effort: 'demanding',
    suits: ['hysteroid', 'paranoid'],
    avoid: ['anxious'],
    source: ETM,
  },
  {
    id: 'q_habitsystem',
    title: 'Build the habit stack',
    description:
      'Audit what you already do without thinking, then attach one new behaviour to each reliable anchor. Environment design over willpower.',
    attrs: ['development', 'health'],
    targetDuration: '2w',
    steps: ['Write your current habits scorecard — everything you do daily', 'Pick three anchors that never fail', 'Attach one two-minute habit to each'],
    effort: 'moderate',
    suits: [],
    source: CLEAR,
  },
  {
    id: 'q_reconnect',
    title: 'Reconnect with five people',
    description:
      'Five people you have lost contact with and would like back. One real conversation each — not a message, a conversation.',
    attrs: ['friends', 'family'],
    targetDuration: '1m',
    steps: ['Name the five', 'One call per session', 'Note what you learned about each after'],
    effort: 'moderate',
    suits: ['hyperthymic', 'hysteroid', 'emotive'],
    avoid: ['schizoid'],
    source: ETM,
  },
  {
    id: 'q_anchor',
    title: 'Anchor the day to one practice',
    description:
      'Pick the single practice that, when it happens, makes the rest of the day fall into place — and build the morning around it rather than fitting it in. The book\'s frog-first logic applied to the sector that sets the frame for the others.',
    attrs: ['spirituality'],
    targetDuration: '1m',
    steps: [
      'Name the practice and the exact time it happens',
      'Remove the two things that most reliably push it later',
      'Run it for a week before changing anything else',
    ],
    effort: 'demanding',
    suits: ['emotive', 'epileptoid', 'anxious'],
    source: ETM,
  },
  {
    id: 'q_makeweekly',
    title: 'Finish one thing you made',
    description:
      'Not start — finish. Something small enough to complete: an essay, a track, a drawing, a chapter. The sector pairs spirituality with creativity because both are about producing meaning rather than consuming it, and unfinished work produces none.',
    attrs: ['spirituality', 'brightness'],
    targetDuration: '1m',
    steps: ['Decide what "done" means before starting', 'Work it in sessions, not in bursts of mood', 'Show it to one person once it is finished'],
    effort: 'moderate',
    suits: ['schizoid', 'hysteroid', 'emotive'],
    source: ETM,
  },
  {
    id: 'q_skill',
    title: 'Learn one concrete skill',
    description:
      'The book\'s closing assignment names speed reading or touch typing. Anything counts if it is specific, practisable daily, and finishable.',
    attrs: ['development', 'career'],
    targetDuration: '3m',
    steps: ['Pick the skill and the finish line', 'Find the one resource you will actually use', 'Practise in sessions, log each one'],
    effort: 'demanding',
    suits: ['schizoid', 'paranoid'],
    source: ETM,
  },

  // ---------- Beyond the two books ----------
  {
    id: 'q_healthcheck',
    title: 'Deal with the health thing I have been ignoring',
    description:
      'Everyone has one — the tooth, the back, the test never booked. This quest is finished when it has been seen by someone qualified, not when it stops hurting.',
    attrs: ['health'],
    targetDuration: '1m',
    steps: ['Name the specific thing, out loud, in one sentence', 'Book the appointment — this is the session that matters', 'Go, and write down what they actually said'],
    effort: 'demanding',
    suits: ['anxious', 'epileptoid', 'emotive'],
    source: PRACTICE,
  },
  {
    id: 'q_sleepreset',
    title: 'Reset the sleep schedule',
    description:
      'Two weeks of a fixed lights-out and a fixed wake time, including weekends. Not more sleep — the same sleep at the same hours, which is what actually changes how days feel.',
    attrs: ['health', 'brightness'],
    targetDuration: '2w',
    steps: ['Pick the lights-out time and work backwards from the wake time you need', 'Move the phone charger out of the bedroom tonight', 'Hold both times through one full weekend'],
    effort: 'demanding',
    suits: ['epileptoid', 'anxious'],
    avoid: ['hyperthymic'],
    source: PRACTICE,
  },
  {
    id: 'q_emergencyfund',
    title: 'Build one month of breathing room',
    description:
      'One month of expenses, held somewhere you will not spend it. The number matters far less than the fact that an unexpected bill stops being a crisis.',
    attrs: ['money'],
    targetDuration: '6m',
    steps: ['Work out what one ordinary month actually costs', 'Open somewhere separate to hold it', 'Move a fixed amount on every payday, before anything else'],
    effort: 'demanding',
    suits: ['anxious', 'epileptoid', 'paranoid'],
    source: PRACTICE,
  },
  {
    id: 'q_raise',
    title: 'Ask for more money, or find who will pay it',
    description:
      'Either the conversation with the person who decides, or three concrete applications elsewhere. Done means the ask happened — not that it was granted.',
    attrs: ['career', 'money'],
    targetDuration: '3m',
    steps: ['Write down what you actually do, with numbers', 'Find out what that is worth elsewhere', 'Have the conversation, or send the three applications'],
    effort: 'demanding',
    suits: ['paranoid', 'hysteroid'],
    avoid: ['anxious'],
    source: PRACTICE,
  },
  {
    id: 'q_portfolio',
    title: 'Put my work somewhere it can be found',
    description:
      'A page, a profile, a repository — one place that shows what you can do without you being in the room to explain it. Done means the link exists and has been sent to one person.',
    attrs: ['career', 'brightness'],
    targetDuration: '1m',
    steps: ['Pick the three pieces of work worth showing', 'Put them somewhere with a URL', 'Send the link to one person whose opinion you respect'],
    effort: 'moderate',
    suits: ['hysteroid', 'schizoid', 'paranoid'],
    source: PRACTICE,
  },
  {
    id: 'q_hardconversation',
    title: 'Have the conversation I have been avoiding',
    description:
      'The one with the parent, the friend, or the partner that keeps getting postponed. Done means it happened — the outcome is not the deliverable.',
    attrs: ['family', 'friends'],
    targetDuration: '1m',
    steps: ['Write down what you actually want them to understand', 'Decide when and where, and tell them you want to talk', 'Have it — and listen for longer than you argue'],
    effort: 'demanding',
    suits: ['emotive', 'paranoid'],
    avoid: ['anxious'],
    source: PRACTICE,
  },
  {
    id: 'q_learnfaith',
    title: 'Study one thing properly',
    description:
      'One surah, one book, one topic in your tradition — taken slowly and finished, rather than read about endlessly. Done means you could explain it to someone else.',
    attrs: ['spirituality', 'development'],
    targetDuration: '3m',
    steps: ['Pick the one thing and the finish line', 'Find the teacher, translation or commentary you will actually use', 'Study in sessions, and write what you understood after each'],
    effort: 'moderate',
    suits: ['schizoid', 'emotive', 'epileptoid'],
    source: FAITH,
  },
  {
    id: 'q_tryfive',
    title: 'Try five things I have never tried',
    description:
      'Five distinct new experiences, however small — a food, a route, a class, a place, a person. The sector exists so weeks stop being interchangeable, and this is the fastest way to test that.',
    attrs: ['brightness'],
    targetDuration: '3m',
    steps: ['Write a list of ten candidates now, without filtering', 'Do one per session and log what it was actually like', 'Keep the two worth repeating'],
    effort: 'moderate',
    suits: ['hyperthymic', 'hysteroid', 'schizoid'],
    avoid: ['anxious'],
    source: PRACTICE,
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
