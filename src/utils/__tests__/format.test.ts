import {
  formatAssetAmount,
  formatAssetDisplay,
  formatCurrencyValue,
  formatRelativeDate,
  sanitizeAmountInput,
} from '../format';

describe('format utilities', () => {
  it('formats currencies with two decimals', () => {
    expect(formatCurrencyValue(12.5, { currencyDisplay: 'USD', showCents: true })).toContain('12.50');
    expect(formatCurrencyValue(12.5, { currencyDisplay: 'SYP', showCents: true }, 14500)).toContain('181,250.00');
  });

  it('formats asset amounts by type', () => {
    expect(formatAssetDisplay('USD', 1000)).toBe('1,000.00 USD');
    expect(formatAssetDisplay('GOLD', 12.3456)).toBe('12.346 g');
    expect(formatAssetAmount('SILVER', 0)).toBe('0');
  });

  it('formats recent and older dates', () => {
    const now = Date.UTC(2026, 0, 10, 12, 0, 0);

    expect(formatRelativeDate(now - 60_000, now)).toBe('1m ago');
    expect(formatRelativeDate(now - 8 * 86_400_000, now)).toContain('2026');
  });

  it('sanitizes amount input to digits and one decimal separator', () => {
    expect(sanitizeAmountInput('1a2.3.4')).toBe('12.34');
    expect(sanitizeAmountInput('1,5')).toBe('1.5');
  });
});
