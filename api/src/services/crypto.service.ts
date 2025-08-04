import axios from 'axios';
import { CryptoPriceResponse, CryptoCurrency } from '../types/crypto.types';

// Cache configuration
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
interface CacheEntry {
  data: CryptoPriceResponse;
  timestamp: number;
}

let priceCache: CacheEntry | null = null;

/**
 * Checks if the cached data is still valid
 * @returns boolean indicating if cache is valid
 */
const isCacheValid = (): boolean => {
  if (!priceCache) return false;
  const now = Date.now();
  return now - priceCache.timestamp < CACHE_TTL;
};

/**
 * Fetches Bitcoin price from CoinGecko API with caching
 * @returns Object containing Bitcoin price information
 */
export const fetchBitcoinPrice = async (): Promise<CryptoPriceResponse> => {
  // Return cached data if it's still valid
  if (isCacheValid() && priceCache) {
    console.log('Returning cached Bitcoin price data');
    return priceCache.data;
  }

  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin',
        vs_currencies: 'usd',
        include_last_updated_at: true
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const result: Record<string, CryptoCurrency> = {
      'BTC': {
        symbol: 'BTC',
        price: response.data.bitcoin.usd,
        lastUpdated: new Date(response.data.bitcoin.last_updated_at * 1000).toISOString()
      }
    };

    const responseData = {
      data: result,
      timestamp: new Date().toISOString()
    };

    // Update cache
    priceCache = {
      data: responseData,
      timestamp: Date.now()
    };

    return responseData;
  } catch (error) {
    // If we have cached data, return it even if expired when API fails
    if (priceCache) {
      console.log('API request failed, returning expired cache data');
      return priceCache.data;
    }

    console.error('Error fetching Bitcoin price:', error);
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error('Failed to fetch Bitcoin price');
  }
};
