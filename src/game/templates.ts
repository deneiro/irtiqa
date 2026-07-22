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
