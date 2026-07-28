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
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani tenge', position: 'after', decimals: 0 },
  { code: 'USD', symbol: '$', name: 'US dollar', position: 'before', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', position: 'before', decimals: 2 },
  { code: 'RUB', symbol: '₽', name: 'Russian rouble', position: 'after', decimals: 0 },
  { code: 'GBP', symbol: '£', name: 'Pound sterling', position: 'before', decimals: 2 },
  { code: 'TRY', symbol: '₺', name: 'Turkish lira', position: 'before', decimals: 2 },
  { code: 'AED', symbol: 'AED', name: 'UAE dirham', position: 'after', decimals: 2 },
  { code: 'KGS', symbol: 'сом', name: 'Kyrgyzstani som', position: 'after', decimals: 0 },
  { code: 'UZS', symbol: "so'm", name: 'Uzbekistani som', position: 'after', decimals: 0 },
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
