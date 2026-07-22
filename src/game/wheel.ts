import type { AttributeKey } from './types';

// The eight attributes are not invented for this app — they are the eight sectors
// of the Wheel of Life from *Extreme Time Management* (Mrochkovskiy & Tolkachev,
// Alpina Publisher, 2012), mapped 1:1. The book's diagnostic is the whole point:
// you score each sector 0–10, and the gap between sectors is the thing to fix.
//
//   Здоровье и спорт      → health
//   Окружение             → friends
//   Отношения             → family
//   Карьера и бизнес      → career
//   Финансы               → money
//   Духовность и творчество → spirituality
//   Личностный рост       → development
//   Яркость жизни         → brightness
//
// Definitions below are translated from the source, not paraphrased loosely —
// the attribute pages are the one place the app explains what it is measuring.

export interface AttributeContent {
  /** The sector's name in the book, which is broader than the one-word app label. */
  wheelName: string;
  /** What this sector covers. Straight from the source. */
  definition: string;
  /** Why it earns a place on the wheel. */
  why: string;
  /**
   * How this sector pulls on the others. The book's core claim is that sectors
   * are not independent: "хочешь отношения → нужна форма → нужна сфера здоровья".
   */
  connection: string;
  /** What neglect of this sector actually looks like day to day. */
  neglect: string;
}

export const WHEEL_ORDER: AttributeKey[] = [
  'health',
  'friends',
  'family',
  'career',
  'money',
  'spirituality',
  'development',
  'brightness',
];

export const ATTRIBUTE_CONTENT: Record<AttributeKey, AttributeContent> = {
  health: {
    wheelName: 'Health & Sport',
    definition: 'Wellbeing, tone, energy. Your physical condition and the habits that maintain it.',
    why:
      'The book puts this sector first for a reason: it feeds every other one. Energy is the currency the other seven sectors spend. When health drops, everything else costs more effort to do at the same level.',
    connection:
      'Nothing else on the wheel is independent of this. Career work needs stamina, relationships need presence, and the spiritual practices that ask you to get up early need a body that can.',
    neglect:
      'It rarely announces itself. It shows up as everything else being slightly harder than it used to be — shorter temper, worse sleep, work that takes longer for the same output.',
  },

  friends: {
    wheelName: 'Environment',
    definition: 'Friends and the people around you — the circle you actually spend your hours with.',
    why:
      'The book is blunt about this: "the people you spend the most time with are who you become." Your environment is not a backdrop to your habits, it is one of their strongest inputs.',
    connection:
      'This sector quietly sets the ceiling on the others. A circle where a given behaviour is normal makes that behaviour cheap for you; a circle where it is strange makes it expensive, however much you want it.',
    neglect:
      'Contact thins out without a decision ever being made. The friendships do not end, they just stop being maintained, and the circle narrows to whoever happens to be nearby.',
  },

  family: {
    wheelName: 'Relationships',
    definition: 'Family and close relationships — parents, siblings, and a partner if you have one.',
    why:
      'Separate from Environment because it works differently. These are the relationships you do not choose and cannot replace, which makes them both the most durable support available and the easiest to take for granted.',
    connection:
      'It is the sector most often sacrificed to Career, and the one that takes longest to rebuild afterwards. Unlike work, there is no way to catch up on it later at higher intensity.',
    neglect:
      'Silence that becomes routine. Nothing is wrong, nobody has argued, and the gap between calls just keeps getting longer until reaching out feels like an event.',
  },

  career: {
    wheelName: 'Career & Business',
    definition: 'Skills, professional standing, and the way you earn.',
    why:
      'The sector most people already over-invest in — which is why the book uses the one-sector "careerist" as its portrait of a broken wheel, not a successful one.',
    connection:
      'It converts into Money, but only through skill, which comes from Development. Career growth that skips Development is just more hours at the same rate.',
    neglect:
      'Drift. The work continues but the skills stop compounding, and a year passes that is functionally the same as the one before it.',
  },

  money: {
    wheelName: 'Finances',
    definition: 'Your level of financial freedom, what you owe, and what earns without your time.',
    why:
      'Distinct from Career: income is what you earn, this sector is what you keep and what you owe. High earnings with debt is a low score here, not a high one.',
    connection:
      'Debt is the clearest case of one sector taxing the rest. The book treats what you owe as something that "pulls you backwards and stops you developing freely" — it costs attention every day, not only money.',
    neglect:
      'Not knowing the numbers. The balance goes unchecked because checking it is unpleasant, which is precisely when it most needs checking.',
  },

  spirituality: {
    wheelName: 'Spirituality & Creativity',
    definition: 'Faith, prayer, meditation, art, and your inner life.',
    why:
      'The sector that answers "what is this all for". The book pairs spirituality with creativity deliberately: both are about producing meaning rather than consuming it.',
    connection:
      'It is the sector that makes the others survivable. Career and Money have no built-in stopping point — this one supplies the frame that decides when enough is enough.',
    neglect:
      'The practice does not stop all at once, it degrades. Same intention, later and later, until it is being fitted around the day instead of anchoring it.',
  },

  development: {
    wheelName: 'Personal Growth',
    definition: 'Learning, reading, courses, languages, and work on your own effectiveness.',
    why:
      'The compounding sector. It rarely produces a visible result this month, which is exactly why it loses every scheduling contest to something more urgent.',
    connection:
      'It is upstream of Career and Money. Skill is the mechanism by which effort turns into income, and this is the sector where skill is built.',
    neglect:
      'Consumption replaces learning. Hours still go to content, but nothing is practised, so nothing transfers.',
  },

  brightness: {
    wheelName: 'Vividness of Life',
    definition: 'Hobbies, adventure, and whatever supplies drive and adrenaline.',
    why:
      'The sector most likely to be dismissed as unserious, and the one whose absence is felt as "everything is fine, so why does nothing feel like anything."',
    connection:
      'It refills what the demanding sectors drain. Without it, discipline in Career and Health has nothing to spend itself on and quietly turns into grind.',
    neglect:
      'Weeks become interchangeable. Nothing goes wrong, but nothing is memorable either, and the year compresses into a handful of recalled days.',
  },
};

/** The book's central claim, quoted where the wheel is shown. */
export const WHEEL_RULE =
  'Only when your wheel is round can you move through life smoothly. Dips in one area hold back even a strong career — they are like weights tied to your arms and legs.';

export const WHEEL_SOURCE = 'Extreme Time Management — Mrochkovskiy & Tolkachev (2012), ch. 1';
