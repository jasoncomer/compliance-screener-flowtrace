export enum EEntityType {
  ADULT_CONTENT = 'adult content',
  ADULT_SITE_DONATION = 'adult site donation',
  ADVERTISING = 'advertising',
  AFFILIATE_PROGRAM = 'affiliate program',
  AIRDROP = 'airdrop',
  AMM = 'amm',
  ARTIFICIAL_INTELLIGENCE = 'artificial intelligence',
  ATM = 'atm',
  BIO_WEAPONS = 'bio weapons',
  BITCOINTALK_PROFILE = 'bitcointalk profile',
  BLOCKCHAIN_INFRASTRUCTURE = 'blockchain infrastructure',
  BLOG_DONATION = 'blog donation',
  BRC_MARKETPLACE = 'brc marketplace',
  BRIDGE = 'bridge',
  CANDIDATE_DONATIONS = 'candidate donations',
  CARDING = 'carding',
  CENTRALIZED_EXCHANGE = 'centralized exchange',
  CHANGER = 'changer',
  CLOUD_SERVICES = 'cloud services',
  COCAINE = 'cocaine',
  COINJOIN_ADDRESS = 'coinjoin address',
  COPY_TRADING = 'copy trading',
  COUNTERFEIT_DOCUMENTS = 'counterfeit documents',
  COUNTERFEIT_MONEY = 'counterfeit money',
  CROSS_CHAIN = 'cross chain',
  CSAM = 'csam',
  CUSTODIAL_WALLET = 'custodial wallet',
  CUSTODIAN = 'custodian',
  CYBERCRIME_VICTIM = 'cybercrime victim',
  CYBERCRIME = 'cybercrime',
  DAO = 'dao',
  DARKNET_CANNABIS = 'darknet cannabis',
  DARKNET_DONATIONS = 'darknet donations',
  DARKNET_FORUM_PROFILE = 'darknet forum profile',
  DARKNET = 'darknet',
  DEBIT_CARD = 'debit card',
  DEFI = 'defi',
  DERIVATIVES = 'derivatives',
  DEX = 'dex',
  DRUGS = 'drugs',
  ESCROW = 'escrow',
  ETF = 'etf',
  EXTREMIST_DONATION = 'extremist donation',
  FAKE_IDENTIFICATION = 'fake identification',
  FAUCET = 'faucet',
  FILE_SHARING = 'file sharing',
  FOREX = 'forex',
  FORUM_DONATION = 'forum donation',
  FUND = 'fund',
  GAMBLING = 'gambling',
  GAMING = 'gaming',
  GATEWAY = 'gateway',
  GENERAL_FIAT_RAMP = 'general fiat ramp',
  GHOST_GUNS = 'ghost guns',
  GOVERNANCE = 'governance',
  GOVERNMENT_DONATION = 'government donation',
  GOVERNMENT = 'government',
  HOSTING = 'hosting',
  ICO = 'ico',
  INDIVIDUAL_PERSON = 'individual person',
  INSURANCE = 'insurance',
  LAUNCHPAD = 'launchpad',
  LAYER_1 = 'layer 1',
  LAYER_2 = 'layer 2',
  LENDING = 'lending',
  MARKETPLACE = 'marketplace',
  MEV_BOT = 'mev bot',
  MILITARY_GRADE_WEAPONS = 'military grade weapons',
  MINER = 'miner',
  MINING_POOL = 'mining pool',
  MINING = 'mining',
  MIXER = 'mixer',
  MURDER_FOR_HIRE = 'murder for hire',
  NEWS_DONATION = 'news donation',
  NFT = 'nft',
  NON_CUSTODIAL_WALLETS = 'non custodial wallets',
  NON_GOVERNMENT_DONATION = 'non - government donation',
  OFAC_SANCTIONED = 'ofac sanctioned',
  OPENSEA_PROFILE = 'opensea profile',
  OPIOIDS = 'opioids',
  OPTIONS = 'options',
  ORDINALS = 'ordinals',
  OTHER_APP = 'other app',
  OTHER_DONATIONS = 'other donations',
  OTHER_PROFILE = 'other profile',
  OTHER = 'other',
  P2P_SERVICE = 'p2p service',
  PAYMENTS = 'payments',
  PERPETUAL_FUTURES = 'perpetual futures',
  PHARMACEUTICALS = 'pharmacuticals',
  PRECURSOR_RESEARCH_CHEMICALS = 'precursor research chemicals',
  PRISONER_DONATIONS = 'prisoner donations',
  REAL_ESTATE_SERVICES = 'real estate services',
  REAL_WORLD_ASSETS = 'real world assets',
  RECORDS_MANAGEMENT = 'records management',
  REDDIT_PROFILE = 'reddit profile',
  RELIGIOUS_DONATION = 'religous donation',
  REMITTANCE = 'remittance',
  RETAILER = 'retailer',
  RETIREMENT_ACCOUNTS = 'retirement accounts',
  RUNES = 'runes',
  SCAM = 'scam',
  SEIZED_FUNDS = 'seized funds',
  SERVICES = 'services',
  SMART_CONTRACT_PLATFORM = 'smart contract platform',
  SMART_MONEY = 'smart money',
  SOFTWARE = 'software',
  SPAM = 'spam',
  STAKING = 'staking',
  TELEGRAM_PROFILE = 'telegram profile',
  TERRORISM = 'terrorism',
  TOKEN_ISSUER = 'token issuer',
  TRADING_BOT = 'trading bot',
  TRUSTEE = 'trustee',
  TWITTER_PROFILE = 'twitter profile',
  VAULT = 'vault',
  VENTURE_CAPITAL = 'venture capital',
  WEAPONS = 'weapons',
  WHITEHAT_HACKING = 'whitehat hacking',
  WHITELABEL_SERVICE = 'whitelabel service',
  WRAPPED_COIN_RESERVES = 'wrapped coin reserves',
  YIELD = 'yield',
  YEILD = 'yeild',
  GIFT_CARDS = 'gift cards',
  LIGHTNING_NETWORK = 'lightning network',
  PIRATED_MEDIA = 'pirated media',
  SPORTSBOOK = 'sportsbook',
  OTC_DESK = 'otc desk',
  STREAMING = 'streaming',
  NEWS = 'news',
  VPN = 'vpn',
  SMS_SERVICE = 'sms service'
}

/**
 * Converts an entity type to a properly formatted display label
 * Handles capitalization, acronyms, and special formatting cases
 */
export function getEntityTypeLabel(type: EEntityType): string {
  // Special cases for acronyms and specific terms
  const acronyms = new Set(['AMM', 'ATM', 'BRC', 'DAO', 'DEX', 'ETF', 'ICO', 'MEV', 'NFT', 'P2P', 'VPN', 'SMS', 'OTC']);
  const specialCases: Record<string, string> = {
    'CSAM': 'CSAM',
    'DEFI': 'DeFi',
    'OPENSEA': 'OpenSea',
    'BITCOIN': 'Bitcoin',
    'TELEGRAM': 'Telegram',
    'TWITTER': 'Twitter',
    'REDDIT': 'Reddit'
  };

  return type
    .toString()
    .split(' ')
    .map(word => {
      // Check if word is an acronym
      const upperWord = word.toUpperCase();
      if (acronyms.has(upperWord)) {
        return upperWord;
      }

      // Check for special cases
      for (const [key, value] of Object.entries(specialCases)) {
        if (word.toUpperCase() === key) {
          return value;
        }
      }

      // Handle hyphenated words
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('-');
      }

      // Default case: capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

