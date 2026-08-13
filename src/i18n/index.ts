/**
 * The translation layer.
 *
 * Deliberately dependency-free: `constants.ts` imports `t` to resolve its display
 * text, and the store imports `constants`. If this module reached back into the
 * store the cycle would bite at module-init time, so the current language lives
 * here as a plain module value and the store *pushes* into it (see setLang).
 *
 * `t` is a plain function rather than a hook so that non-React callers — the
 * chronicle generator, the engine, store toasts, the notification in App.tsx —
 * can translate too. React components subscribe via `useT`, which re-renders
 * them when the language changes.
 */
import { useSyncExternalStore } from 'react';
import { EN } from './dict/en';
import { RU } from './dict/ru';

export type Lang = 'en' | 'ru';
export const LANGS: Lang[] = ['en', 'ru'];

/** A value may be a plain string or a function of interpolation vars. */
export type Phrase = string | ((v: Record<string, unknown>) => string);
export type Dict = Record<string, Phrase>;

const DICTS: Record<Lang, Dict> = { en: EN, ru: RU };

/** Human name of each language, always written in that language. */
export const LANG_LABEL: Record<Lang, string> = { en: 'English', ru: 'Русский' };

/** BCP-47 tag for Intl formatting (dates, numbers, currency). */
export const LANG_LOCALE: Record<Lang, string> = { en: 'en-US', ru: 'ru-RU' };

let currentLang: Lang = 'en';
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return currentLang;
}

/**
 * Point the whole app at a language. Called by the store on hydrate and on every
 * user switch; calling it with the language already active is a no-op so it is
 * safe to call from a subscription.
 */
export function setLang(lang: Lang) {
  if (lang === currentLang || !DICTS[lang]) return;
  currentLang = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  listeners.forEach(fn => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The best starting language for a first-time visitor, from the browser locale. */
export function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'en';
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    const base = String(tag ?? '').toLowerCase().split('-')[0];
    // Russian is also the working language across much of the post-Soviet region,
    // so those locales start in Russian rather than in English.
    if (['ru', 'be', 'kk', 'ky', 'uk', 'uz', 'tg', 'hy', 'az'].includes(base)) return 'ru';
  }
  return 'en';
}

/**
 * Translate `key`, interpolating `vars`.
 *
 * A missing key falls back to English and then to the key itself, so a gap in a
 * dictionary degrades to readable English rather than to a blank screen. In dev
 * the miss is logged once so it gets noticed and filled.
 */
const warned = new Set<string>();
export function t(key: string, vars?: Record<string, unknown>): string {
  const phrase = DICTS[currentLang][key] ?? EN[key];
  if (phrase === undefined) {
    if (import.meta.env?.DEV && !warned.has(key)) {
      warned.add(key);
      console.warn(`[i18n] missing key: ${key}`);
    }
    return key;
  }
  return typeof phrase === 'function' ? phrase(vars ?? {}) : phrase;
}

/**
 * Hook form. Returns `t` itself; the subscription is the point — it re-renders
 * the component when the language changes so getter-backed constants
 * (CLASSES[].name and friends) are re-read.
 */
export function useT() {
  useSyncExternalStore(subscribe, getLang, () => 'en' as Lang);
  return t;
}

/** Reactive language, for components that need to branch on it (date formats, switcher). */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => 'en' as Lang);
}

// ---------------- Plurals ----------------

/**
 * Russian needs three forms where English needs two, and the choice is not a
 * simple `n === 1` test: 1 день, 2 дня, 5 дней, but also 21 день and 111 дней.
 *
 * `one`  — 1, 21, 31 … (but not 11)
 * `few`  — 2-4, 22-24 … (but not 12-14)
 * `many` — everything else, including 0
 */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

/** English two-form plural, for symmetry at the call site. */
export function pluralEn(n: number, one: string, other: string): string {
  return n === 1 ? one : other;
}

/**
 * Language-agnostic plural: pass every form and let the active language pick.
 * English ignores `many`.
 */
export function plural(n: number, one: string, few: string, many: string): string {
  return currentLang === 'ru' ? pluralRu(n, one, few, many) : pluralEn(n, one, few);
}
