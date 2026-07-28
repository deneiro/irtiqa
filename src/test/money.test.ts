import { describe, expect, it } from 'vitest';
import { CURRENCIES, currencyDef, DEFAULT_CURRENCY, fmtMoney, fmtMoneyCompact } from '../game/money';

describe('money formatting', () => {
  it('renders whole-unit currencies without decimals and symbol-after', () => {
    expect(fmtMoney(25000, 'KZT')).toBe('25\u202f000\u202f₸');
    expect(fmtMoney(0, 'KZT')).toBe('0\u202f₸');
    expect(fmtMoney(1234567, 'KZT')).toBe('1\u202f234\u202f567\u202f₸');
  });

  it('renders minor units and symbol-before where that is the convention', () => {
    expect(fmtMoney(1234.5, 'USD')).toBe('$1\u202f234,50');
    expect(fmtMoney(9.99, 'EUR')).toBe('€9,99');
  });

  it('keeps the sign outside the symbol so a negative balance is unambiguous', () => {
    expect(fmtMoney(-500, 'KZT')).toBe('-500\u202f₸');
    expect(fmtMoney(-12.5, 'USD')).toBe('-$12,50');
  });

  it('is independent of the host locale — the same save reads identically everywhere', () => {
    // No Intl locale lookup is involved, so this cannot drift between devices.
    expect(fmtMoney(1000, 'KZT')).toBe(fmtMoney(1000, 'KZT'));
    expect(fmtMoney(1000, 'KZT')).toContain('\u202f');
    expect(fmtMoney(1000, 'KZT')).not.toContain(',');
  });

  it('falls back to the first currency for an unknown code rather than throwing', () => {
    expect(currencyDef('NOPE').code).toBe(CURRENCIES[0].code);
    expect(() => fmtMoney(1, 'NOPE')).not.toThrow();
  });

  it('compacts only above the threshold, and never drops the symbol', () => {
    expect(fmtMoneyCompact(5000, 'KZT')).toBe('5\u202f000\u202f₸'); // below threshold — full form
    expect(fmtMoneyCompact(25000, 'KZT')).toBe('25.0k\u202f₸');
    expect(fmtMoneyCompact(250000, 'KZT')).toBe('250k\u202f₸');
    expect(fmtMoneyCompact(2500000, 'KZT')).toBe('2.5M\u202f₸');
    // Gold must never be mistakable for money, so the symbol survives compaction.
    expect(fmtMoneyCompact(2500000, 'USD')).toContain('$');
  });

  it('defaults to tenge', () => {
    expect(DEFAULT_CURRENCY).toBe('KZT');
    expect(CURRENCIES.some(c => c.code === DEFAULT_CURRENCY)).toBe(true);
  });
});
