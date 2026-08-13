import { Asset, AssetType } from '../store/useAssetsStore';
import { PriceData } from '../services/priceService';

export interface AssetTotal {
  type: AssetType;
  count: number;
  amountInUsd: number;
}

export interface PortfolioSummary {
  totalUsd: number;
  byAsset: AssetTotal[];
  distribution: Record<AssetType, number>; // percentage
}

/**
 * Convert a single asset amount to USD
 * Returns USD value or null if prices unavailable
 */
export function convertAssetToUsd(
  type: AssetType,
  amount: number,
  prices: PriceData
): number | null {
  switch (type) {
    case 'USD':
      return amount;
    case 'SYP':
      return prices.usdToSyp ? amount / prices.usdToSyp : null;
    case 'GOLD':
      return prices.goldPerGram ? amount * prices.goldPerGram : null;
    case 'SILVER':
      return prices.silverPerGram ? amount * prices.silverPerGram : null;
    default:
      return null;
  }
}

/**
 * Calculate per-asset totals in USD
 */
export function calculateAssetTotals(
  assets: Asset[],
  prices: PriceData
): AssetTotal[] | null {
  if (!assets.length) return [];

  const assetMap = new Map<AssetType, { count: number; total: number }>();

  for (const asset of assets) {
    const usdValue = convertAssetToUsd(asset.type, asset.amount, prices);
    if (usdValue === null) return null; // prices incomplete

    const existing = assetMap.get(asset.type) || { count: 0, total: 0 };
    assetMap.set(asset.type, {
      count: existing.count + 1,
      total: existing.total + usdValue,
    });
  }

  const result: AssetTotal[] = [];
  for (const [type, { count, total }] of assetMap) {
    result.push({ type, count, amountInUsd: total });
  }

  return result;
}

/**
 * Calculate total USD value of all assets
 */
export function calculateTotalUsd(
  assets: Asset[],
  prices: PriceData
): number | null {
  let total = 0;

  for (const asset of assets) {
    const usdValue = convertAssetToUsd(asset.type, asset.amount, prices);
    if (usdValue === null) return null; // prices incomplete
    total += usdValue;
  }

  return total;
}

/**
 * Calculate percentage distribution by asset type
 */
export function calculateDistribution(
  totals: AssetTotal[]
): Record<AssetType, number> {
  const totalUsd = totals.reduce((sum, t) => sum + t.amountInUsd, 0);

  if (totalUsd === 0) {
    return { USD: 0, SYP: 0, GOLD: 0, SILVER: 0 };
  }

  const distribution = {
    USD: 0,
    SYP: 0,
    GOLD: 0,
    SILVER: 0,
  };

  for (const asset of totals) {
    distribution[asset.type] = (asset.amountInUsd / totalUsd) * 100;
  }

  return distribution;
}

/**
 * Get complete portfolio summary
 * Returns null if prices are incomplete
 */
export function getPortfolioSummary(
  assets: Asset[],
  prices: PriceData
): PortfolioSummary | null {
  const totals = calculateAssetTotals(assets, prices);
  if (totals === null) return null;

  const totalUsd = calculateTotalUsd(assets, prices);
  if (totalUsd === null) return null;

  const distribution = calculateDistribution(totals);

  return {
    totalUsd,
    byAsset: totals,
    distribution,
  };
}

export default {
  convertAssetToUsd,
  calculateAssetTotals,
  calculateTotalUsd,
  calculateDistribution,
  getPortfolioSummary,
};
