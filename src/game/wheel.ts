import type { AttributeKey } from './types';
import { t } from '../i18n';

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

// Field text lives in the dictionaries under `wheelc.<attr>.*`; the getters resolve
// against the active language on every read, like the other content constants.
export const ATTRIBUTE_CONTENT: Record<AttributeKey, AttributeContent> = Object.fromEntries(
  WHEEL_ORDER.map(k => [
    k,
    {
      get wheelName() {
        return t(`wheelc.${k}.wheelName`);
      },
      get definition() {
        return t(`wheelc.${k}.definition`);
      },
      get why() {
        return t(`wheelc.${k}.why`);
      },
      get connection() {
        return t(`wheelc.${k}.connection`);
      },
      get neglect() {
        return t(`wheelc.${k}.neglect`);
      },
    },
  ]),
) as Record<AttributeKey, AttributeContent>;

/** The book's central claim, quoted where the wheel is shown. */
export function wheelRule(): string {
  return t('wheelc.rule');
}

export function wheelSource(): string {
  return t('wheelc.source');
}
