import axios from 'axios';

// Base URL for the API
const BASE_URL = 'http://localhost:8004/api/v1';

// Create axios instance with timeout configuration
const apiClient = axios.create({
  timeout: 15000, // 15 second timeout (increased for batch operations)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry configuration
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 1000; // 1 second

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry API calls
const retryApiCall = async <T>(apiCall: () => Promise<T>, attempts: number = RETRY_ATTEMPTS): Promise<T> => {
  try {
    return await apiCall();
  } catch (error) {
    if (attempts > 0 && axios.isAxiosError(error) && error.code !== 'ECONNABORTED') {
      console.log(`API call failed, retrying... (${attempts} attempts left)`);
      await delay(RETRY_DELAY);
      return retryApiCall(apiCall, attempts - 1);
    }
    throw error;
  }
};

// Function to fetch address data
export const fetchAddressData = async (address: string, token?: string) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await retryApiCall(() => 
      apiClient.get(`${BASE_URL}/blockchain/address/${address}`, { headers })
    ).then(response => response.data);
  } catch (error) {
    console.error('Error fetching address data:', error);
    throw error;
  }
};

// Function to fetch address transactions
export const fetchAddressTransactions = async (address: string, page: number = 1, limit: number = 10, token?: string) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await retryApiCall(() => 
      apiClient.get(`${BASE_URL}/blockchain/address/${address}/transactions?page=${page}&limit=${limit}`, { headers })
    ).then(response => response.data);
  } catch (error) {
    console.error('Error fetching address transactions:', error);
    throw error;
  }
};

// Function to fetch attribution data for addresses
export const fetchAttributionData = async (addresses: string[], token?: string) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await retryApiCall(() => 
      apiClient.post(`${BASE_URL}/attribution/addresses`, { addresses }, { headers })
    ).then(response => response.data);
  } catch (error) {
    console.error('Error fetching attribution data:', error);
    throw error;
  }
};

// Function to fetch risk scoring data for an address or transaction
export const fetchRiskScoringData = async (identifier: string, type: 'address' | 'transaction' = 'address', token?: string) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await retryApiCall(() => 
      apiClient.post(`${BASE_URL}/risk-scoring/calculate`, { identifier, type }, { headers })
    ).then(response => response.data);
  } catch (error) {
    console.error('Error fetching risk scoring data:', error);
    throw error;
  }
};

// NEW: Function to fetch batch risk scoring data for multiple addresses
export const fetchBatchRiskScoringData = async (addresses: string[], token?: string) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    // Limit the number of addresses to prevent API overload
    const limitedAddresses = addresses.slice(0, 50); // Max 50 addresses per batch
    
    return await retryApiCall(() => 
      apiClient.post(`${BASE_URL}/risk-scoring/batch`, { 
        addresses: limitedAddresses,
        type: 'address'
      }, { headers })
    ).then(response => response.data);
  } catch (error) {
    console.error('Error fetching batch risk scoring data:', error);
    throw error;
  }
};

// Function to fetch transaction data for an address
export const fetchTransactionData = async (address: string, page: number = 1, limit: number = 10, token?: string) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await retryApiCall(() => 
      apiClient.get(`${BASE_URL}/blockchain/address/${address}/transactions?page=${page}&limit=${limit}`, { headers })
    ).then(response => response.data);
  } catch (error) {
    console.error('Error fetching transaction data:', error);
    throw error;
  }
};

// Function to fetch SOT (Source of Truth) data for proper entity names
export const fetchSOTData = async (token?: string) => {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await retryApiCall(() => 
      apiClient.get(`${BASE_URL}/sot`, { headers })
    ).then(response => response.data);
  } catch (error) {
    console.error('Error fetching SOT data:', error);
    throw error;
  }
};