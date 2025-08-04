export interface CryptoCurrency {
  symbol: string;
  price: number;
  lastUpdated: string;
}

export interface CryptoPriceResponse {
  data: Record<string, CryptoCurrency>;
  timestamp: string;
} 