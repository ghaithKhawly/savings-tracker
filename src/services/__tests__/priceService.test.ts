import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLivePrices, getCachedPrices, clearPriceCache } from '../priceService';

// Mock fetch globally
const mockFetch = jest.fn();
(globalThis as unknown as { fetch: typeof fetch }).fetch = mockFetch;
// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      exchangeRateApiKey: '',
      metalsApiKey: '',
    },
  },
}));

describe('priceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    clearPriceCache();
  });

  describe('getLivePrices', () => {
    it('should fetch and return price data successfully', async () => {
      // Mock successful API responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ rates: { SYP: 14000 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              chart: { result: [{ meta: { regularMarketPrice: 1867.35 } }] },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              chart: { result: [{ meta: { regularMarketPrice: 24.85 } }] },
            }),
        });

      const result = await getLivePrices();

      expect(result.error).toBeUndefined();
      expect(result.data.usdToSyp).toBe(14000);
      expect(result.data.goldPerGram).toBeCloseTo(60.04, 1); // 1867.35 / 31.1035
      expect(result.data.silverPerGram).toBeCloseTo(0.8, 1);
      expect(result.data.lastUpdated).toBeDefined();
    });

    it('should return cached data when available and fresh', async () => {
      // First call - fetch fresh data
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ rates: { SYP: 14000 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              chart: { result: [{ meta: { regularMarketPrice: 1867.35 } }] },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              chart: { result: [{ meta: { regularMarketPrice: 24.85 } }] },
            }),
        });

      await getLivePrices();
      
      // Clear fetch mock to verify no new calls
      mockFetch.mockClear();
      
      // Second call should use cache
      const result = await getLivePrices();
      
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.data.usdToSyp).toBe(14000);
    });

    it('should return demo prices when API fails and no cache available', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await getLivePrices();

      // Should return demo prices with isDemo flag
      expect(result.data).toBeDefined();
      expect(result.isDemo).toBe(true);
      expect(result.data.usdToSyp).toBe(14500); // Demo price
    });

    it('should return persisted cache when APIs fail and memory cache is empty', async () => {
      const persisted = {
        timestamp: Date.now() - 10 * 60 * 1000,
        data: {
          usdToSyp: 15000,
          goldPerGram: 70,
          silverPerGram: 0.8,
          lastUpdated: Date.now() - 10 * 60 * 1000,
        },
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(persisted));
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await getLivePrices();

      expect(result.data).toEqual({ ...persisted.data, source: 'stale-cache' });
      expect(result.error).toContain('Using offline data');
      expect(result.isDemo).toBeUndefined();
    });

    it('should handle partial API failures gracefully', async () => {
      // Exchange rate succeeds, metals fails
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ rates: { SYP: 14000 } }),
        })
        .mockRejectedValueOnce(new Error('Gold API error'));

      const result = await getLivePrices();

      // Should return error since not all prices are available
      expect(result.error).toBeDefined();
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await getLivePrices();

      expect(result.error).toBeDefined();
    });
  });

  describe('getCachedPrices', () => {
    it('should return null when no cache exists', () => {
      expect(getCachedPrices()).toBeNull();
    });

    it('should return cached data after successful fetch', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ rates: { SYP: 14000 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              chart: { result: [{ meta: { regularMarketPrice: 1867.35 } }] },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              chart: { result: [{ meta: { regularMarketPrice: 24.85 } }] },
            }),
        });

      await getLivePrices();
      
      const cached = getCachedPrices();
      expect(cached).not.toBeNull();
      expect(cached?.usdToSyp).toBe(14000);
    });
  });

  describe('clearPriceCache', () => {
    it('should clear the cache', async () => {
      // First populate the cache
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ rates: { SYP: 14000 } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              chart: { result: [{ meta: { regularMarketPrice: 1867.35 } }] },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              chart: { result: [{ meta: { regularMarketPrice: 24.85 } }] },
            }),
        });

      await getLivePrices();
      expect(getCachedPrices()).not.toBeNull();
      
      // Clear and verify
      clearPriceCache();
      expect(getCachedPrices()).toBeNull();
    });
  });
});
