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

// Remote logo URLs for entities that have them
const REMOTE_LOGOS: Record<string, string> = {
  'microstrategy': 'https://storage.googleapis.com/entity-logos/microstrategy.jpg',
  'anchorage': 'https://storage.googleapis.com/entity-logos/anchorage.jpg',
  'anchorage_com': 'https://storage.googleapis.com/entity-logos/anchorage.jpg',
  'anchoragecom': 'https://storage.googleapis.com/entity-logos/anchorage.jpg',
  'coinbase': 'https://storage.googleapis.com/entity-logos/coinbase.jpg',
  'binance': 'https://storage.googleapis.com/entity-logos/binance.jpg',
  'kraken': 'https://storage.googleapis.com/entity-logos/kraken.jpg',
  'bitfinex': 'https://storage.googleapis.com/entity-logos/bitfinex.jpg',
  'huobi': 'https://storage.googleapis.com/entity-logos/huobi.jpg',
  'okx': 'https://storage.googleapis.com/entity-logos/okx.jpg',
  'bybit': 'https://storage.googleapis.com/entity-logos/bybit.jpg',
  'kucoin': 'https://storage.googleapis.com/entity-logos/kucoin.jpg',
  'gemini': 'https://storage.googleapis.com/entity-logos/gemini.jpg',
  'bitstamp': 'https://storage.googleapis.com/entity-logos/bitstamp.jpg',
  'bitflyer': 'https://storage.googleapis.com/entity-logos/bitflyer.jpg',
  'liquid': 'https://storage.googleapis.com/entity-logos/liquid.jpg',
  'poloniex': 'https://storage.googleapis.com/entity-logos/poloniex.jpg',
  'bittrex': 'https://storage.googleapis.com/entity-logos/bittrex.jpg',
  'gateio': 'https://storage.googleapis.com/entity-logos/gateio.jpg',
  'tesla': 'https://storage.googleapis.com/entity-logos/tesla.jpg',
  'square': 'https://storage.googleapis.com/entity-logos/square.jpg',
  'paypal': 'https://storage.googleapis.com/entity-logos/paypal.jpg',
  'robinhood': 'https://storage.googleapis.com/entity-logos/robinhood.jpg',
  'webull': 'https://storage.googleapis.com/entity-logos/webull.jpg',
  'etoro': 'https://storage.googleapis.com/entity-logos/etoro.jpg',
  'metamask': 'https://storage.googleapis.com/entity-logos/metamask.jpg',
  'trustwallet': 'https://storage.googleapis.com/entity-logos/trustwallet.jpg',
  'exodus': 'https://storage.googleapis.com/entity-logos/exodus.jpg',
  'atomic': 'https://storage.googleapis.com/entity-logos/atomic.jpg',
  'ledger': 'https://storage.googleapis.com/entity-logos/ledger.jpg',
  'trezor': 'https://storage.googleapis.com/entity-logos/trezor.jpg',
  'coldcard': 'https://storage.googleapis.com/entity-logos/coldcard.jpg',
  'wasabi': 'https://storage.googleapis.com/entity-logos/wasabi.jpg',
  'samourai': 'https://storage.googleapis.com/entity-logos/samourai.jpg',
  'sparrow': 'https://storage.googleapis.com/entity-logos/sparrow.jpg',
  'electrum': 'https://storage.googleapis.com/entity-logos/electrum.jpg',
  'bitcoin-core': 'https://storage.googleapis.com/entity-logos/bitcoin-core.jpg',
  'bitcoind': 'https://storage.googleapis.com/entity-logos/bitcoind.jpg',
  'lightning': 'https://storage.googleapis.com/entity-logos/lightning.jpg',
  'strike': 'https://storage.googleapis.com/entity-logos/strike.jpg',
  'cashapp': 'https://storage.googleapis.com/entity-logos/cashapp.jpg',
  'venmo': 'https://storage.googleapis.com/entity-logos/venmo.jpg',
  'zelle': 'https://storage.googleapis.com/entity-logos/zelle.jpg',
  'stripe': 'https://storage.googleapis.com/entity-logos/stripe.jpg',
  'coinbase-commerce': 'https://storage.googleapis.com/entity-logos/coinbase-commerce.jpg',
  'bitpay': 'https://storage.googleapis.com/entity-logos/bitpay.jpg',
  'btcpay': 'https://storage.googleapis.com/entity-logos/btcpay.jpg',
  'opennode': 'https://storage.googleapis.com/entity-logos/opennode.jpg',
  'strike-api': 'https://storage.googleapis.com/entity-logos/strike-api.jpg',
  'spam': 'https://storage.googleapis.com/entity-logos/spam.jpg',
  'spamwallet': 'https://storage.googleapis.com/entity-logos/spam.jpg'
};

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
  
  // First, check if we have a remote logo URL
  if (REMOTE_LOGOS[cleanName]) {
    return REMOTE_LOGOS[cleanName];
  }
  
  // Check for variations in remote logos
  const variations = [
    cleanName,
    entityName.toLowerCase().replace(/\s+/g, ''),
    entityName.toLowerCase().replace(/\s+/g, '_'),
    entityName.toLowerCase().replace(/\s+/g, '-'),
    entityName.toLowerCase().replace(/[^a-z0-9]/g, '')
  ];
  
  for (const variation of variations) {
    if (REMOTE_LOGOS[variation]) {
      return REMOTE_LOGOS[variation];
    }
  }
  
  // Check if we know this logo exists locally
  if (KNOWN_LOGOS.includes(cleanName)) {
    return `/logos/${cleanName}.png`;
  }
  
  // Try to find a logo even if not in known list
  // Common variations to try
  const localVariations = [
    cleanName,
    cleanName.replace('_', ''),
    cleanName.replace('_', '-'),
    entityName.toLowerCase().replace(/\s+/g, ''),
    entityName.toLowerCase().replace(/\s+/g, '-'),
    entityName.toLowerCase().replace(/\s+/g, '_')
  ];
  
  // For now, return a path and let the browser handle 404s gracefully
  // The image will be hidden if it doesn't exist due to the onError handler
  return `/logos/${cleanName}.png`;
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