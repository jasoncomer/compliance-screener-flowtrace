import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { modelFactory } from '@src/db/modelFactory';
import { BtcAttribution } from '@src/models';
import { getSOT } from './sot.service';
import environmentConfig from '@src/configs/custom-environment-variables.config';

// Caching system to reduce API calls
const newsCache: Map<string, { articles: NewsArticle[]; timestamp: number }> = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache
const MAX_CACHE_SIZE = 20; // Maximum number of cached entries
const SEARCH_API_KEY = environmentConfig.SEARCH_API_KEY;
// Types for news and tweet data
export interface NewsArticle {
  title: string;
  link: string;
  published: string;
  source?: string;
  description?: string;
  logoUrl?: string; // <-- Add this
}

export interface Tweet {
  content: string;
  url: string;
  date: string;
  username: string;
  userDisplayName?: string;
  retweetCount?: number;
  likeCount?: number;
}

export interface NewsData {
  news: NewsArticle[];
  tweets: Tweet[];
  searchContext: 'address' | 'beneficial_owner' | 'entity';
  searchTerm: string;
}

/**
 * Get cached news results
 */
const getCachedNews = (searchTerms: string[]): NewsArticle[] | null => {
  const cacheKey = generateCacheKey(searchTerms);
  const cached = newsCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    // Cache expired, remove it
    newsCache.delete(cacheKey);
    return null;
  }

  console.log(`Cache HIT for search terms: ${searchTerms.join(', ')} (${cached.articles.length} articles)`);
  return cached.articles;
};

/**
 * Cache news results
 */
const cacheNews = (searchTerms: string[], articles: NewsArticle[]): void => {
  const cacheKey = generateCacheKey(searchTerms);

  // Clean up old cache entries if we're approaching the limit
  if (newsCache.size >= MAX_CACHE_SIZE) {
    cleanupCache();
  }

  newsCache.set(cacheKey, {
    articles: [...articles], // Create a copy to avoid reference issues
    timestamp: Date.now()
  });

  console.log(`Cache MISS for search terms: ${searchTerms.join(', ')} (cached ${articles.length} articles)`);
};

/**
 * Generate a consistent cache key for search terms
 */
const generateCacheKey = (searchTerms: string[]): string => {
  return `news:${searchTerms.sort().join('|').toLowerCase()}`;
};

/**
 * Clean up expired cache entries
 */
const cleanupCache = (): void => {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [key, value] of newsCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      expiredKeys.push(key);
    }
  }

  // Remove expired entries
  expiredKeys.forEach(key => newsCache.delete(key));

  // If still too many entries, remove oldest ones
  if (newsCache.size >= MAX_CACHE_SIZE) {
    const entries = Array.from(newsCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2)); // Remove 20% oldest
    toRemove.forEach(([key]) => newsCache.delete(key));
  }

  console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
};

/**
 * Get cache statistics
 */
export const getNewsCacheStats = (): { size: number; maxSize: number; duration: number } => {
  return {
    size: newsCache.size,
    maxSize: MAX_CACHE_SIZE,
    duration: CACHE_DURATION
  };
};

/**
 * Get entity information for an address
 */
export const getEntityInfo = async (address: string): Promise<{
  entityId?: string;
  beneficialOwner?: string;
  entityName?: string;
  entityTwitterHandle?: string;
  beneficialOwnerTwitterHandle?: string;
}> => {
  try {
    // Get attribution data
    const BtcAttribution = await modelFactory.getModel('BtcAttribution');
    const attribution = await BtcAttribution.findOne({ addr: address }).lean();

    if (!attribution) {
      return {};
    }

    let entityName: string | undefined;
    let beneficialOwner: string | undefined;
    let entityTwitterHandle: string | undefined;
    let beneficialOwnerTwitterHandle: string | undefined;

    // Get entity name and Twitter handle if entity ID exists
    if (attribution.entity) {
      const entityData = await getSOT(attribution.entity);
      entityName = entityData?.proper_name;
      entityTwitterHandle = entityData?.contact_twitter;
    }

    // Get beneficial owner name and Twitter handle if BO ID exists
    if (attribution.bo) {
      const boData = await getSOT(attribution.bo);
      beneficialOwner = boData?.proper_name;
      beneficialOwnerTwitterHandle = boData?.contact_twitter;
    }

    return {
      entityId: attribution.entity,
      beneficialOwner,
      entityName,
      entityTwitterHandle,
      beneficialOwnerTwitterHandle
    };
  } catch (error) {
    console.error('Error getting entity info:', error);
    return {};
  }
};

/**
 * Fetch tweets using Google search with site:x.com
 */
const fetchTweets = async (
  searchTerms: string[],
  maxResults: number = 5
): Promise<Tweet[]> => {
  console.log(`Fetching tweets for terms: ${searchTerms.join(', ')}`);

  // Check cache first
  const cacheKey = `tweets:${searchTerms.sort().join('|').toLowerCase()}`;
  const cached = newsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Cache HIT for tweets: ${searchTerms.join(', ')}`);
    return (cached.articles as any).slice(0, maxResults);
  }

  try {
    const tweets: Tweet[] = [];

    // Search for each term individually to get better results
    for (const term of searchTerms) {
      if (tweets.length >= maxResults) break;

      const query = `site:x.com ${term}`;
      const url = `https://www.searchapi.io/api/v1/search?engine=google&q=${encodeURIComponent(query)}&api_key=${SEARCH_API_KEY}&num=10&gl=us&hl=en`;

      console.log(`Searching tweets with query: ${query}`);

      const response = await axios.get(url);

      // Print the full response for debugging
      console.log('SearchAPI.io tweet response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.organic_results) {
        response.data.organic_results.forEach((item: any) => {
          if (tweets.length >= maxResults) return;

          // Only include actual X.com/twitter.com links
          if (item.link && (item.link.includes('x.com') || item.link.includes('twitter.com'))) {
            // Extract username from URL
            const urlMatch = item.link.match(/(?:x\.com|twitter\.com)\/([^/?]+)/);
            const username = urlMatch ? urlMatch[1] : 'unknown';

            tweets.push({
              content: item.snippet || item.title || 'No content',
              url: item.link,
              date: item.date || new Date().toISOString(),
              username: username,
              userDisplayName: username,
              retweetCount: 0,
              likeCount: 0
            });
          }
        });
      }
    }

    console.log(`Found ${tweets.length} tweets from Google search`);

    // Cache the results
    newsCache.set(cacheKey, {
      articles: tweets as any,
      timestamp: Date.now()
    });

    return tweets.slice(0, maxResults);

  } catch (error: any) {
    console.error('Error fetching tweets from Google search:', error);
    if (error.response) {
      console.error('Google Search Error Response:', error.response.data);
    }
    return [];
  }
};

// Whitelist of preferred news domains
const NEWS_WHITELIST = [
  'treasury.gov',
  'ofac.treasury.gov',
  '.gov'
];

function prioritizeWhitelistedNewsFirst(articles: NewsArticle[]): NewsArticle[] {
  // Separate whitelisted and non-whitelisted articles
  const whitelisted = articles.filter(a => NEWS_WHITELIST.some(domain => a.link && a.link.includes(domain)));
  const nonWhitelisted = articles.filter(a => !NEWS_WHITELIST.some(domain => a.link && a.link.includes(domain)));
  // Sort non-whitelisted by source priority
  const rankedNonWhitelisted = sortNewsBySourcePriority(nonWhitelisted);
  // Return whitelisted first, then ranked non-whitelisted
  return [...whitelisted, ...rankedNonWhitelisted];
}

// News & Regulatory sources ranked by priority
const newsAndRegulatorySources = [
  // Government Regulatory Sources
  'ofac',
  'fbi',
  'doj',
  'treasury',
  'un sanctions',
  'un.org',
  'ofsi',
  'gov.uk',
  'canada sanctions',
  'australia sanctions',
  'eu sanctions',
  'fatf',
  // News Sources
  'coindesk',
  'cointelegraph',
  'crypto.news',
  'cryptoslate',
  'decrypt',
  'bitcoinmagazine',
  'theblock',
  'beincrypto',
  'blockworks',
  'reuters',
  'bloomberg',
  'cnbc',
  'forbes',
];

// Social media sources (for future use)
const socialMediaSources = [
  'twitter',
  'x.com',
  'reddit',
  'github',
  'bitcointalk',
  'stackexchange',
];

function getSourceRank(linkOrSource: string) {
  const lower = (linkOrSource || '').toLowerCase();
  for (let i = 0; i < newsAndRegulatorySources.length; i++) {
    if (lower.includes(newsAndRegulatorySources[i])) {
      return i;
    }
  }
  return newsAndRegulatorySources.length; // lowest priority if not found
}

function sortNewsBySourcePriority(articles: NewsArticle[]): NewsArticle[] {
  return articles.sort((a, b) => {
    const aRank = getSourceRank(a.link || a.source || '');
    const bRank = getSourceRank(b.link || b.source || '');
    return aRank - bRank;
  });
}

function getArticleCategory(linkOrSource: string) {
  const lower = (linkOrSource || '').toLowerCase();
  if (socialMediaSources.some(src => lower.includes(src))) return 'social_media';
  if (newsAndRegulatorySources.some(src => lower.includes(src))) return 'news_regulatory';
  return 'other';
}

function isBitcoinAddress(term: string): boolean {
  // Simple check for Bitcoin address patterns (starts with 1, 3, bc1, etc.)
  return /^([13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{11,71})$/.test(term);
}

/**
 * Fetch news articles for given search terms using SearchAPI.io
 */
const fetchNews = async (
  searchTerms: string[],
  maxResults: number = 10
): Promise<NewsArticle[]> => {
  console.log(`Fetching news for terms: ${searchTerms.join(', ')}`);

  // Check cache first to avoid API calls
  const cachedArticles = getCachedNews(searchTerms);
  if (cachedArticles) {
    console.log(`Returning cached results for: ${searchTerms.join(', ')}`);
    return cachedArticles.slice(0, maxResults);
  }

  try {
    const query = searchTerms.join(' OR ');
    // Use Google Web for address, Google News for others
    const useGoogleWeb = searchTerms.length === 1 && isBitcoinAddress(searchTerms[0]);
    const engine = useGoogleWeb ? 'google' : 'google_news';
    const url = `https://www.searchapi.io/api/v1/search?engine=${engine}&q=${encodeURIComponent(query)}&api_key=${SEARCH_API_KEY}&num=10&gl=us&hl=en`;

    const response = await axios.get(url);
    console.log('SearchAPI.io news response:', JSON.stringify(response.data, null, 2));

    const articles: NewsArticle[] = [];
    if (response.data && response.data.news_results) {
      response.data.news_results.forEach((item: any) => {
        const domain = getDomainFromUrl(item.link || '');
        const logoUrl = domain ? getFaviconUrl(domain) : undefined;
        articles.push({
          title: item.title || 'No title',
          link: item.link || '#',
          published: item.date || new Date().toISOString(),
          source: item.source || 'Unknown',
          description: item.snippet || '',
          logoUrl,
        });
      });
    } else if (response.data && response.data.organic_results) {
      response.data.organic_results.forEach((item: any) => {
        const domain = getDomainFromUrl(item.link || '');
        const logoUrl = domain ? getFaviconUrl(domain) : undefined;
        articles.push({
          title: item.title || 'No title',
          link: item.link || '#',
          published: item.date || new Date().toISOString(),
          source: item.source || 'Unknown',
          description: item.snippet || '',
          logoUrl,
        });
      });
    }

    // Prioritize whitelisted news articles (e.g., treasury.gov) at the top, then sort the rest by source priority
    const sortedArticles = prioritizeWhitelistedNewsFirst(articles);

    console.log(`Found ${sortedArticles.length} news articles from SearchAPI.io`);

    // Cache the results
    cacheNews(searchTerms, sortedArticles);

    return sortedArticles.slice(0, maxResults);
  } catch (error: any) {
    console.error('Error fetching news from SearchAPI.io:', error);
    if (error.response) {
      console.error('SearchAPI Error Response:', error.response.data);
      console.error('SearchAPI Status:', error.response.status);
    }
    // Cache empty results on error too
    cacheNews(searchTerms, []);
    return [];
  }
};

/**
 * Utility to extract domain from URL
 */
function getDomainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Utility to get favicon URL from domain
 */
function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}`;
}

/**
 * Get news data for an address
 */
export const getNewsData = async (address: string): Promise<{
  addressData: NewsData;
  beneficialOwnerData?: NewsData;
  entityData?: NewsData;
}> => {
  try {
    console.log(`Getting news data for address: ${address}`);

    // Get entity information
    const entityInfo = await getEntityInfo(address);
    console.log('Entity info:', entityInfo);

    // Build search terms for address
    const addressSearchTerms = [address];

    // Build search terms for beneficial owner (ONLY Twitter handle)
    const beneficialOwnerSearchTerms: string[] = [];
    if (entityInfo.beneficialOwnerTwitterHandle) {
      beneficialOwnerSearchTerms.push(entityInfo.beneficialOwnerTwitterHandle.replace('@', ''));
      beneficialOwnerSearchTerms.push(entityInfo.beneficialOwnerTwitterHandle); // Keep with @ for broader search
    }

    // Build search terms for entity (ONLY Twitter handle)
    const entitySearchTerms: string[] = [];
    if (entityInfo.entityTwitterHandle) {
      entitySearchTerms.push(entityInfo.entityTwitterHandle.replace('@', ''));
      entitySearchTerms.push(entityInfo.entityTwitterHandle); // Keep with @ for broader search
    }

    // Fetch news and tweets for address
    let addressNews: NewsArticle[] = [];
    let addressTweets: Tweet[] = [];
    try {
      console.log(`Fetching news for address with terms: ${addressSearchTerms.join(', ')}`);
      addressNews = await fetchNews(addressSearchTerms, 10);
      // Fetch tweets mentioning the address itself
      addressTweets = await fetchTweets(addressSearchTerms, 5);
    } catch (error) {
      console.error('Error fetching news for address:', error);
    }

    console.log(`Address data - News: ${addressNews.length}, Tweets: ${addressTweets.length}`);

    const addressData: NewsData = {
      news: addressNews,
      tweets: addressTweets,
      searchContext: 'address',
      searchTerm: address
    };

    let beneficialOwnerData: NewsData | undefined;
    let entityData: NewsData | undefined;

    // Fetch news and tweets for beneficial owner
    if (beneficialOwnerSearchTerms.length > 0) {
      let boNews: NewsArticle[] = [];
      let boTweets: Tweet[] = [];
      try {
        console.log(`Fetching news for beneficial owner with terms: ${beneficialOwnerSearchTerms.join(', ')}`);
        boNews = await fetchNews(beneficialOwnerSearchTerms, 10);

        // Fetch tweets for Twitter handles only
        const twitterHandles = beneficialOwnerSearchTerms.filter(term =>
          term.includes('@') || term.toLowerCase().includes('twitter')
        );
        if (twitterHandles.length > 0) {
          console.log(`Fetching tweets for beneficial owner with handles: ${twitterHandles.join(', ')}`);
          boTweets = await fetchTweets(twitterHandles, 5);
        }
      } catch (error) {
        console.error('Error fetching data for beneficial owner:', error);
      }

      beneficialOwnerData = {
        news: boNews,
        tweets: boTweets,
        searchContext: 'beneficial_owner',
        searchTerm: beneficialOwnerSearchTerms[0]
      };
      console.log(`Beneficial owner data - News: ${boNews.length}, Tweets: ${boTweets.length}`);
    }

    // Fetch news and tweets for entity
    if (entitySearchTerms.length > 0) {
      let entityNews: NewsArticle[] = [];
      let entityTweets: Tweet[] = [];
      try {
        console.log(`Fetching news for entity with terms: ${entitySearchTerms.join(', ')}`);
        entityNews = await fetchNews(entitySearchTerms, 10);

        // Fetch tweets for Twitter handles only
        const twitterHandles = entitySearchTerms.filter(term =>
          term.includes('@') || term.toLowerCase().includes('twitter')
        );
        if (twitterHandles.length > 0) {
          console.log(`Fetching tweets for entity with handles: ${twitterHandles.join(', ')}`);
          entityTweets = await fetchTweets(twitterHandles, 5);
        }
      } catch (error) {
        console.error('Error fetching data for entity:', error);
      }

      entityData = {
        news: entityNews,
        tweets: entityTweets,
        searchContext: 'entity',
        searchTerm: entitySearchTerms[0]
      };
      console.log(`Entity data - News: ${entityNews.length}, Tweets: ${entityTweets.length}`);
    }

    const result = {
      addressData,
      beneficialOwnerData,
      entityData
    };

    console.log('Final result structure:', {
      addressData: { news: addressData.news.length, tweets: addressData.tweets.length },
      beneficialOwnerData: beneficialOwnerData ? { news: beneficialOwnerData.news.length, tweets: beneficialOwnerData.tweets.length } : undefined,
      entityData: entityData ? { news: entityData.news.length, tweets: entityData.tweets.length } : undefined
    });

    return result;
  } catch (error) {
    console.error('Error fetching news data:', error);
    throw error;
  }
};

/**
 * Get news data for a specific search context
 */
export const getMentionsData = async (
  searchTerm: string,
  context: 'address' | 'beneficial_owner' | 'entity'
): Promise<NewsData> => {
  try {
    const news = await fetchNews([searchTerm], 15);

    // Fetch tweets if the search term is a Twitter handle
    let tweets: Tweet[] = [];
    if (searchTerm.includes('@') || searchTerm.toLowerCase().includes('twitter')) {
      tweets = await fetchTweets([searchTerm], 5);
    }

    return {
      news,
      tweets,
      searchContext: context,
      searchTerm
    };
  } catch (error) {
    console.error('Error fetching mentions data:', error);
    return {
      news: [],
      tweets: [],
      searchContext: context,
      searchTerm
    };
  }
};