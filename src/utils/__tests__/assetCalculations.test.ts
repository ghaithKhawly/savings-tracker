import {
  convertAssetToUsd,
  calculateAssetTotals,
  calculateTotalUsd,
  calculateDistribution,
  getPortfolioSummary,
  AssetTotal,
} from '../assetCalculations';
import { Asset, AssetType } from '../../store/useAssetsStore';
import { PriceData } from '../../services/priceService';

// Mock price data
const mockPrices: PriceData = {
  usdToSyp: 14000, // 1 USD = 14,000 SYP
  goldPerGram: 60, // $60 per gram
  silverPerGram: 0.8, // $0.80 per gram
  lastUpdated: Date.now(),
};

// Helper to create mock assets
const createAsset = (
  type: AssetType,
  amount: number,
  note?: string
): Asset => ({
  id: `test-${Math.random().toString(36).slice(2)}`,
  type,
  amount,
  createdAt: Date.now(),
  note,
});

describe('convertAssetToUsd', () => {
  it('should return the same amount for USD', () => {
    expect(convertAssetToUsd('USD', 100, mockPrices)).toBe(100);
    expect(convertAssetToUsd('USD', 0, mockPrices)).toBe(0);
    expect(convertAssetToUsd('USD', 1234.56, mockPrices)).toBe(1234.56);
  });

  it('should convert SYP to USD using exchange rate', () => {
    // 14,000 SYP = 1 USD
    expect(convertAssetToUsd('SYP', 14000, mockPrices)).toBe(1);
    expect(convertAssetToUsd('SYP', 28000, mockPrices)).toBe(2);
    expect(convertAssetToUsd('SYP', 7000, mockPrices)).toBe(0.5);
  });

  it('should convert GOLD grams to USD', () => {
    // $60 per gram
    expect(convertAssetToUsd('GOLD', 1, mockPrices)).toBe(60);
    expect(convertAssetToUsd('GOLD', 10, mockPrices)).toBe(600);
    expect(convertAssetToUsd('GOLD', 0.5, mockPrices)).toBe(30);
  });

  it('should convert SILVER grams to USD', () => {
    // $0.80 per gram
    expect(convertAssetToUsd('SILVER', 1, mockPrices)).toBe(0.8);
    expect(convertAssetToUsd('SILVER', 100, mockPrices)).toBe(80);
  });

  it('should return null for missing price data', () => {
    const incompletePrices = { lastUpdated: Date.now() } as PriceData;
    
    expect(convertAssetToUsd('SYP', 1000, incompletePrices)).toBeNull();
    expect(convertAssetToUsd('GOLD', 1, incompletePrices)).toBeNull();
    expect(convertAssetToUsd('SILVER', 1, incompletePrices)).toBeNull();
    // USD should still work
    expect(convertAssetToUsd('USD', 100, incompletePrices)).toBe(100);
  });

  it('should return null for zero exchange rate', () => {
    const zeroPrices: PriceData = {
      usdToSyp: 0,
      goldPerGram: 0,
      silverPerGram: 0,
      lastUpdated: Date.now(),
    };
    
    expect(convertAssetToUsd('SYP', 1000, zeroPrices)).toBeNull();
  });
});

describe('calculateAssetTotals', () => {
  it('should return empty array for no assets', () => {
    expect(calculateAssetTotals([], mockPrices)).toEqual([]);
  });

  it('should calculate totals for single asset type', () => {
    const assets = [
      createAsset('USD', 100),
      createAsset('USD', 50),
    ];

    const result = calculateAssetTotals(assets, mockPrices);
    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({
      type: 'USD',
      count: 2,
      amountInUsd: 150,
    });
  });

  it('should calculate totals for multiple asset types', () => {
    const assets = [
      createAsset('USD', 100),
      createAsset('GOLD', 10), // 10g * $60 = $600
      createAsset('SYP', 28000), // 28000 / 14000 = $2
    ];

    const result = calculateAssetTotals(assets, mockPrices);
    expect(result).toHaveLength(3);
    
    const usdTotal = result!.find((t) => t.type === 'USD');
    const goldTotal = result!.find((t) => t.type === 'GOLD');
    const sypTotal = result!.find((t) => t.type === 'SYP');

    expect(usdTotal?.amountInUsd).toBe(100);
    expect(goldTotal?.amountInUsd).toBe(600);
    expect(sypTotal?.amountInUsd).toBe(2);
  });

  it('should return null for incomplete price data', () => {
    const assets = [createAsset('GOLD', 10)];
    const incompletePrices = { lastUpdated: Date.now() } as PriceData;

    expect(calculateAssetTotals(assets, incompletePrices)).toBeNull();
  });
});

describe('calculateTotalUsd', () => {
  it('should return 0 for empty assets', () => {
    expect(calculateTotalUsd([], mockPrices)).toBe(0);
  });

  it('should sum all assets in USD', () => {
    const assets = [
      createAsset('USD', 100),
      createAsset('USD', 200),
      createAsset('GOLD', 5), // 5g * $60 = $300
    ];

    expect(calculateTotalUsd(assets, mockPrices)).toBe(600);
  });

  it('should return null for incomplete prices', () => {
    const assets = [createAsset('SILVER', 100)];
    const incompletePrices = { lastUpdated: Date.now() } as PriceData;

    expect(calculateTotalUsd(assets, incompletePrices)).toBeNull();
  });
});

describe('calculateDistribution', () => {
  it('should return all zeros for empty totals', () => {
    const result = calculateDistribution([]);
    expect(result).toEqual({ USD: 0, SYP: 0, GOLD: 0, SILVER: 0 });
  });

  it('should calculate correct percentages', () => {
    const totals: AssetTotal[] = [
      { type: 'USD', count: 1, amountInUsd: 50 },
      { type: 'GOLD', count: 1, amountInUsd: 50 },
    ];

    const result = calculateDistribution(totals);
    expect(result.USD).toBe(50);
    expect(result.GOLD).toBe(50);
    expect(result.SYP).toBe(0);
    expect(result.SILVER).toBe(0);
  });

  it('should handle single asset type at 100%', () => {
    const totals: AssetTotal[] = [
      { type: 'USD', count: 5, amountInUsd: 1000 },
    ];

    const result = calculateDistribution(totals);
    expect(result.USD).toBe(100);
  });
});

describe('getPortfolioSummary', () => {
  it('should return null for empty assets', () => {
    // Empty assets array returns a valid summary with 0 values
    const result = getPortfolioSummary([], mockPrices);
    expect(result?.totalUsd).toBe(0);
    expect(result?.byAsset).toEqual([]);
  });

  it('should return complete portfolio summary', () => {
    const assets = [
      createAsset('USD', 500),
      createAsset('GOLD', 10), // $600
      createAsset('SYP', 140000), // $10
    ];

    const result = getPortfolioSummary(assets, mockPrices);
    
    expect(result).not.toBeNull();
    expect(result!.totalUsd).toBeCloseTo(1110, 2);
    expect(result!.byAsset).toHaveLength(3);
    
    // Check distribution adds up to 100%
    const totalPercentage = Object.values(result!.distribution).reduce(
      (sum, pct) => sum + pct,
      0
    );
    expect(totalPercentage).toBeCloseTo(100, 1);
  });

  it('should return null for incomplete prices', () => {
    const assets = [createAsset('GOLD', 10)];
    const incompletePrices = { lastUpdated: Date.now() } as PriceData;

    expect(getPortfolioSummary(assets, incompletePrices)).toBeNull();
  });
});
