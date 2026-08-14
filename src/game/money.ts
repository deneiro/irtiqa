import { t } from '../i18n';
/**
 * Real money — deliberately separate from Gold.
 *
 * The Finances page used to render every amount as a bare number next to the same
 * coin glyph the game economy uses, so "25000" (tenge owed to a friend) and "25"
 * (Gold for a potion) were typographically identical. They are not the same kind of
 * thing and must never look alike: Gold is earned inside the game and spent in the
 * Market, money is real and the app only ever records it.
 *
 * Formatting is done with an explicit locale rather than the ambient one. A save
 * moved between devices must render identically on both, and tests must not depend
 * on the host's ICU data.
 */

export interface CurrencyDef {
  code: string;
  /** Symbol as written, e.g. '₸'. */
  symbol: string;
  name: string;
  /** Where the symbol sits relative to the number. */
  position: 'before' | 'after';
  /** Minor units to show. Tenge and rouble are conventionally written whole. */
  decimals: number;
}

export const CURRENCIES: CurrencyDef[] = [
  { code: 'KZT', symbol: '₸', get name() { return t('currency.KZT'); }, position: 'after', decimals: 0 },
  { code: 'USD', symbol: '$', get name() { return t('currency.USD'); }, position: 'before', decimals: 2 },
  { code: 'EUR', symbol: '€', get name() { return t('currency.EUR'); }, position: 'before', decimals: 2 },
  { code: 'RUB', symbol: '₽', get name() { return t('currency.RUB'); }, position: 'after', decimals: 0 },
  { code: 'GBP', symbol: '£', get name() { return t('currency.GBP'); }, position: 'before', decimals: 2 },
  { code: 'TRY', symbol: '₺', get name() { return t('currency.TRY'); }, position: 'before', decimals: 2 },
  { code: 'AED', symbol: 'AED', get name() { return t('currency.AED'); }, position: 'after', decimals: 2 },
  { code: 'KGS', symbol: 'сом', get name() { return t('currency.KGS'); }, position: 'after', decimals: 0 },
  { code: 'UZS', symbol: "so'm", get name() { return t('currency.UZS'); }, position: 'after', decimals: 0 },
];

export const DEFAULT_CURRENCY = 'KZT';

export function currencyDef(code: string): CurrencyDef {
  return CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];
}

/**
 * U+202F NARROW NO-BREAK SPACE — the digit-group separator, and the gap before a
 * trailing symbol. Written as an escape rather than a literal because it is
 * invisible in an editor and would otherwise read as an ordinary space that
 * someone "tidies up" later. No-break matters: a balance must never wrap between
 * its thousands group and its symbol.
 */
const NBSP = '\u202f';

/**
 * Group digits without going through Intl.
 *
 * The separator is fixed rather than locale-derived so the result is identical on
 * every device, and it sidesteps the comma/period ambiguity that makes `1,234`
 * mean two different numbers in en-US and de-DE. A save opened on a second device
 * must render the same string as on the first.
 */
function group(n: number, decimals: number): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const [whole, frac] = fixed.split('.');
  const spaced = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return frac ? `${spaced},${frac}` : spaced;
}

/** A real-money amount, formatted for display. Never used for Gold. */
export function fmtMoney(amount: number, code: string): string {
  const def = currencyDef(code);
  const sign = amount < 0 ? '-' : '';
  const body = group(amount, def.decimals);
  return def.position === 'before'
    ? `${sign}${def.symbol}${body}`
    : `${sign}${body}${NBSP}${def.symbol}`;
}

/**
 * Compact form for tight spots (cards, list rows) where a seven-digit balance would
 * wrap. Keeps the symbol so it can never be mistaken for Gold.
 */
export function fmtMoneyCompact(amount: number, code: string): string {
  const def = currencyDef(code);
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  let body: string;
  if (abs >= 1_000_000) body = `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  else if (abs >= 10_000) body = `${(abs / 1000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  else return fmtMoney(amount, code);
  return def.position === 'before'
    ? `${sign}${def.symbol}${body}`
    : `${sign}${body}${NBSP}${def.symbol}`;
}
