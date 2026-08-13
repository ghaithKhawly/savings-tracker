import { AssetType } from '../store/useAssetsStore';
import { AppSettings, CurrencyDisplay } from '../contexts/SettingsContext';

const DEFAULT_LOCALE = undefined;

export function sanitizeAmountInput(value: string, locale = DEFAULT_LOCALE): string {
  const decimalSeparator = getDecimalSeparator(locale);
  let sanitized = '';
  let hasDecimal = false;

  for (const char of value) {
    const normalizedChar = char === ',' ? decimalSeparator : char;
    if (/\d/.test(normalizedChar)) {
      sanitized += normalizedChar;
      continue;
    }

    if (normalizedChar === decimalSeparator && !hasDecimal) {
      sanitized += '.';
      hasDecimal = true;
    }
  }

  return sanitized;
}

export function parseAmountInput(value: string): number {
  return Number.parseFloat(value.replace(',', '.'));
}

export function formatAssetAmount(type: AssetType, amount: number, locale = DEFAULT_LOCALE): string {
  const options: Intl.NumberFormatOptions =
    type === 'USD' || type === 'SYP'
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { minimumFractionDigits: 0, maximumFractionDigits: 3, useGrouping: false };

  return new Intl.NumberFormat(locale, options).format(amount);
}

export function formatAssetDisplay(type: AssetType, amount: number, locale = DEFAULT_LOCALE): string {
  const suffix = type === 'GOLD' || type === 'SILVER' ? 'g' : type;
  return `${formatAssetAmount(type, amount, locale)} ${suffix}`;
}

export function formatCurrencyValue(
  usdValue: number,
  settings: Pick<AppSettings, 'currencyDisplay' | 'showCents'>,
  usdToSyp?: number,
  locale = DEFAULT_LOCALE
): string {
  const currency: CurrencyDisplay = settings.currencyDisplay;
  const value = currency === 'SYP' && usdToSyp ? usdValue * usdToSyp : usdValue;
  const fractionDigits = currency === 'SYP' ? 2 : settings.showCents ? 2 : 0;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatSensitiveCurrencyValue(
  usdValue: number,
  settings: Pick<AppSettings, 'currencyDisplay' | 'showCents' | 'hideBalances'>,
  usdToSyp?: number,
  locale = DEFAULT_LOCALE
): string {
  if (settings.hideBalances) return '••••';
  return formatCurrencyValue(usdValue, settings, usdToSyp, locale);
}

export function formatPlainNumber(
  value: number,
  fractionDigits = 2,
  locale = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatRelativeDate(timestamp: number, now = Date.now(), locale = DEFAULT_LOCALE): string {
  const diff = Math.max(0, now - timestamp);

  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
}

function getDecimalSeparator(locale = DEFAULT_LOCALE): string {
  const parts = new Intl.NumberFormat(locale).formatToParts(1.1);
  return parts.find((part) => part.type === 'decimal')?.value ?? '.';
}
