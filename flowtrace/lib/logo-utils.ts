// Logo utility functions to handle missing logos gracefully

// List of known entity logos that exist
const KNOWN_LOGOS = [
  'binance', 'coinbase', 'kraken', 'bitfinex', 'huobi', 'okx', 'bybit', 'kucoin',
  'gemini', 'bitstamp', 'bitflyer', 'liquid', 'poloniex', 'bittrex', 'gateio',
  'microstrategy', 'tesla', 'square', 'paypal', 'robinhood', 'webull', 'etoro',
  'metamask', 'trustwallet', 'exodus', 'atomic', 'ledger', 'trezor', 'coldcard',
  'wasabi', 'samourai', 'sparrow', 'electrum', 'bitcoin-core', 'bitcoind',
  'lightning', 'strike', 'cashapp', 'venmo', 'zelle', 'paypal', 'stripe',
  'coinbase-commerce', 'bitpay', 'btcpay', 'opennode', 'strike-api',
  'anchorage', 'anchoragecom', 'anchorage_com', 'spam', 'spamwallet'
];

// Function to clean entity name for logo matching
const cleanEntityName = (entityName: string): string => {
  return entityName.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/_/g, '') // Remove underscores
    .replace(/-/g, ''); // Remove hyphens
};

// Function to get a safe logo path with fallback
export const getSafeLogoPath = (entityName: string): string | undefined => {
  if (!entityName || entityName === 'Unknown Entity') {
    return undefined;
  }
  
  // Clean the entity name for filename
  const cleanName = cleanEntityName(entityName);
  
  // Use the dynamic API endpoint instead of hardcoded URLs
  // The backend will automatically try .png, .jpg, .jpeg, .svg
  return `/api/logos/${cleanName}`;
};

// Function to get logo with correct priority order
export const getLogoWithPriority = (entityId: string): string => {
  if (!entityId) return '';
  
  // Clean the entity ID for the URL
  const cleanId = entityId.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/_/g, '') // Remove underscores
    .replace(/-/g, ''); // Remove hyphens
    
  // Use the API endpoint that handles multiple extensions
  return `/api/logos/${cleanId}`;
};

// Function to get logo URL with entity ID (for dynamic API)
export const getLogoUrl = (entityId: string): string => {
  if (!entityId) return '';
  
  // Clean the entity ID for the API
  const cleanId = entityId.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/_/g, '') // Remove underscores
    .replace(/-/g, ''); // Remove hyphens
    
  return `/api/logos/${cleanId}`;
};

// Function to get Google Cloud Storage URL with multiple extension fallbacks
export const getGoogleCloudLogoUrl = (entityId: string): string => {
  if (!entityId) return '';
  
  // Clean the entity ID for the URL
  const cleanId = entityId.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/_/g, '') // Remove underscores
    .replace(/-/g, ''); // Remove hyphens
    
  // Use the API endpoint that handles multiple extensions (.png, .jpg, .jpeg, .svg)
  // This is more reliable than trying to guess the extension
  return `/api/logos/${cleanId}`;
};

// Function to get direct Google Cloud Storage URLs with multiple extensions
export const getDirectGoogleCloudLogoUrl = (entityId: string): string => {
  if (!entityId) return '';
  
  // Clean the entity ID for the URL
  const cleanId = entityId.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/_/g, '') // Remove underscores
    .replace(/-/g, ''); // Remove hyphens
    
  // Try multiple extensions in order of preference
  // Since we know deribit.jpg exists, prioritize .jpg
  return `https://storage.googleapis.com/entity-logos/${cleanId}.jpg`;
};

// Function to get logo with multiple fallbacks including direct Google Cloud Storage
export const getLogoWithFallbacks = (entityId: string): string => {
  if (!entityId) return '';
  
  // Clean the entity ID
  const cleanId = entityId.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Remove special characters
    .replace(/_/g, '') // Remove underscores
    .replace(/-/g, ''); // Remove hyphens
    
  // Return API endpoint first, with Google Cloud Storage as fallback
  return `/api/logos/${cleanId}`;
};

// Function to preload logos to check if they exist
export const preloadLogo = (logoPath: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = logoPath;
  });
};

// Function to get a default logo for entity type
export const getDefaultLogo = (entityType: string): string => {
  switch (entityType) {
    case 'exchange':
      return '/logos/exchange-default.png';
    case 'wallet':
      return '/logos/wallet-default.png';
    case 'mixer':
      return '/logos/mixer-default.png';
    case 'defi':
      return '/logos/defi-default.png';
    case 'service':
      return '/logos/service-default.png';
    default:
      return '/logos/default.png';
  }
}; 