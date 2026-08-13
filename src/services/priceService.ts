import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export interface PriceData {
  usdToSyp: number;
  goldPerGram: number; // USD per gram
  silverPerGram: number; // USD per gram
  lastUpdated: number;
  isDemo?: boolean; // Flag to indicate demo/fallback prices
  source?: 'live' | 'cache' | 'stale-cache' | 'demo' | 'manual';
}

interface CachedPrice {
  data: PriceData;
  timestamp: number;
}

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'price_cache';
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

let memoryCache: CachedPrice | null = null;

// Demo/fallback prices when APIs are unavailable
const DEMO_PRICES: PriceData = {
  usdToSyp: 14500, // Approximate SYP rate
  goldPerGram: 75.5, // Approximate gold price per gram in USD
  silverPerGram: 0.95, // Approximate silver price per gram in USD
  lastUpdated: Date.now(),
  isDemo: true,
  source: 'demo',
};

// Get API keys from environment/constants
const getApiKeys = () => ({
  exchangeRate: Constants.expoConfig?.extra?.exchangeRateApiKey || process.env.EXCHANGE_RATE_API_KEY || '',
  metals: Constants.expoConfig?.extra?.metalsApiKey || process.env.METALS_API_KEY || '',
});

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(url: string, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retry logic with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Load cached prices from AsyncStorage
 */
async function loadPersistedCache(): Promise<CachedPrice | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CachedPrice;
      // Validate the structure
      if (parsed.data && parsed.timestamp && 
          typeof parsed.data.usdToSyp === 'number' &&
          typeof parsed.data.goldPerGram === 'number' &&
          typeof parsed.data.silverPerGram === 'number') {
        return parsed;
      }
    }
  } catch (error) {
    console.error('[Price Service] Failed to load persisted cache:', error);
  }
  return null;
}

/**
 * Persist cache to AsyncStorage
 */
async function persistCache(cache: CachedPrice): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('[Price Service] Failed to persist cache:', error);
  }
}

async function fetchUsdToSyp(): Promise<number> {
  const { exchangeRate: apiKey } = getApiKeys();

  return withRetry(async () => {
    const openResponse = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD');
    if (openResponse.ok) {
      const openData = await openResponse.json();
      const openRate = Number(openData.rates?.SYP);
      if (Number.isFinite(openRate) && openRate > 0) {
        return openRate;
      }
    }

    if (!apiKey) {
      throw new Error('USD/SYP provider did not return a valid rate');
    }

    const response = await fetchWithTimeout(`https://api.exchangerate.host/latest?base=USD&symbols=SYP&access_key=${apiKey}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const rate = Number(data.rates?.SYP);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('SYP rate not found');
    
    return rate;
  });
}

async function fetchMetalPrices(): Promise<{ gold: number; silver: number }> {
  const { metals: apiKey } = getApiKeys();
  
  return withRetry(async () => {
    const [goldYahoo, silverYahoo] = await Promise.all([
      fetchYahooMetalPrice('GC=F'),
      fetchYahooMetalPrice('SI=F'),
    ]);

    if (goldYahoo && silverYahoo) {
      return { gold: goldYahoo, silver: silverYahoo };
    }

    if (!apiKey) {
      throw new Error('Metal providers did not return valid prices');
    }

    const [gold, silver] = await Promise.all([
      fetchMetalsDevSpotPrice('gold', apiKey),
      fetchMetalsDevSpotPrice('silver', apiKey),
    ]);

    if (!gold || !silver) {
      throw new Error('Metal prices not found in response');
    }

    return { gold, silver };
  });
}

async function fetchYahooMetalPrice(symbol: string): Promise<number | null> {
  const response = await fetchWithTimeout(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`);
  if (!response.ok) return null;

  const data = await response.json();
  const pricePerTroyOunce = Number(data.chart?.result?.[0]?.meta?.regularMarketPrice);
  return convertTroyOunceToGram(pricePerTroyOunce);
}

async function fetchMetalsDevSpotPrice(metal: 'gold' | 'silver', apiKey: string): Promise<number | null> {
  const url = `https://api.metals.dev/v1/metal/spot?api_key=${apiKey}&metal=${metal}&currency=USD`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;

  const data = await response.json();
  const candidate = Number(
    data.rate ??
    data.price ??
    data.spot ??
    data.metal?.price ??
    data.metal?.spot ??
    data.data?.price ??
    data.data?.rate
  );

  return convertTroyOunceToGram(candidate);
}

function convertTroyOunceToGram(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return value / 31.1035;
}

export async function getLivePrices(): Promise<{ data: PriceData; error?: string; isDemo?: boolean }> {
  // Check memory cache first
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION_MS) {
    return { data: { ...memoryCache.data, source: memoryCache.data.source ?? 'cache' } };
  }

  // Try to load from persisted storage if memory cache expired
  if (!memoryCache) {
    const persisted = await loadPersistedCache();
    if (persisted && Date.now() - persisted.timestamp < CACHE_DURATION_MS) {
      memoryCache = persisted;
      return { data: { ...persisted.data, source: persisted.data.source ?? 'cache' } };
    }
  }

  const results: Partial<PriceData> = { lastUpdated: Date.now() };
  const errors: string[] = [];

  // Fetch all prices in parallel
  const [usdToSypResult, metalsResult] = await Promise.allSettled([
    fetchUsdToSyp(),
    fetchMetalPrices(),
  ]);

  if (usdToSypResult.status === 'fulfilled') {
    results.usdToSyp = usdToSypResult.value;
  } else {
    errors.push(usdToSypResult.reason?.message || 'USD/SYP fetch failed');
  }

  if (metalsResult.status === 'fulfilled') {
    results.goldPerGram = metalsResult.value.gold;
    results.silverPerGram = metalsResult.value.silver;
  } else {
    errors.push(metalsResult.reason?.message || 'Metal prices fetch failed');
  }

  // If any critical price is missing, try to use stale cache as fallback
  if (!results.usdToSyp || !results.goldPerGram || !results.silverPerGram) {
    // Try stale memory cache
    if (memoryCache?.data) {
      return { 
        data: { ...memoryCache.data, source: 'stale-cache' },
        error: `Using cached data. ${errors.join('; ')}` 
      };
    }
    
    // Try stale persisted cache
    const persisted = await loadPersistedCache();
    if (persisted?.data) {
      memoryCache = persisted;
      return { 
        data: { ...persisted.data, source: 'stale-cache' },
        error: `Using offline data. ${errors.join('; ')}` 
      };
    }

    // No cache available - use demo prices as last resort
    const demoData: PriceData = {
      ...DEMO_PRICES,
      lastUpdated: Date.now(),
      source: 'demo',
    };
    return { 
      data: demoData, 
      error: `Using demo prices. ${errors.join('; ')}`,
      isDemo: true,
    };
  }

  const data: PriceData = { ...(results as PriceData), source: 'live' };

  // Cache the result
  const cache: CachedPrice = { data, timestamp: Date.now() };
  memoryCache = cache;
  await persistCache(cache);

  return { data };
}

export function getCachedPrices(): PriceData | null {
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION_MS) {
    return memoryCache.data;
  }
  return null;
}

export function clearPriceCache(): void {
  memoryCache = null;
  AsyncStorage.removeItem(STORAGE_KEY).catch(console.error);
}

export default {
  getLivePrices,
  getCachedPrices,
  clearPriceCache,
};
