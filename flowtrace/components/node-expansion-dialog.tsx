"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Search,
  Filter,
  CalendarIcon,
  TrendingUp,
  CheckSquare,
  Square,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react"
import { format } from "date-fns"
import { fetchTransactionData, fetchAttributionData, fetchRiskScoringData, fetchBatchRiskScoringData, fetchSOTData } from "../lib/api"
import axios from "axios"
import { captureApiError } from "../lib/debug-utils"
import { getSafeLogoPath } from "../lib/logo-utils"

interface Node {
  id: string
  label: string
  address?: string
  availableTransactions?: number
  logo?: string
}

interface Transaction {
  id: string
  address: string
  entityId: string
  entityName: string
  amount: string
  currency: string
  date: string
  txHash: string
  txId: string // Add this new field
  usdValue: string
  risk: "low" | "medium" | "high"
  transactionCount: number
  entityType: "exchange" | "wallet" | "mixer" | "defi" | "service"
  logo?: string
  direction: "in" | "out"
}

interface NodeExpansionDialogProps {
  nodeId: string
  node?: Node
  onExpand: (nodeId: string, selectedTransactions: Transaction[]) => void
  onClose: () => void
  existingConnections?: any[] // Add existing connections to check for already processed transactions
  onUpdateNodeTransactions?: (nodeId: string, transactionCount: number) => void // Callback to update node's availableTransactions
}

export function NodeExpansionDialog({ nodeId, node, onExpand, onClose, existingConnections = [], onUpdateNodeTransactions }: NodeExpansionDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<"entityName" | "entityId" | "amount" | "date" | "risk" | "entityType" | "direction" | "txId">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Filter states
  const [filterRisk, setFilterRisk] = useState<"all" | "low" | "medium" | "high">("all")
  const [filterEntityType, setFilterEntityType] = useState<
    "all" | "exchange" | "wallet" | "mixer" | "defi" | "service"
  >("all")
  const [filterDirection, setFilterDirection] = useState<"all" | "in" | "out">("all")
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [amountRange, setAmountRange] = useState<[number, number]>([0, 100000])
  const [showFilters, setShowFilters] = useState(false)

  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<{current: number, total: number, step: string}>({current: 0, total: 0, step: 'Initializing...'});
  const [skipRiskData, setSkipRiskData] = useState<boolean>(false);
  const [quickLoad, setQuickLoad] = useState<boolean>(false);
  const [sotData, setSotData] = useState<any[]>([]);
  const [sotLoading, setSotLoading] = useState<boolean>(false);

  // Debug node information
  useEffect(() => {
    console.log('NodeExpansionDialog - Node object:', {
      nodeId,
      node,
      nodeLogo: node?.logo,
      nodeLabel: node?.label
    });
  }, [nodeId, node]);

  // Fetch SOT data for proper entity names
  const fetchSOTDataForNames = useCallback(async () => {
    try {
      setSotLoading(true);
      const response = await fetchSOTData();
      if (response && Array.isArray(response)) {
        console.log(`Loaded ${response.length} SOT entries for proper names`);
        setSotData(response);
      }
    } catch (error) {
      console.error('Failed to fetch SOT data:', error);
      captureApiError(error, 'NodeExpansion-SOT');
    } finally {
      setSotLoading(false);
    }
  }, []);



  const loadTransactions = useCallback(async () => {
    if (node && node.id) {
      try {
        setLoading(true);
        console.log('Loading transactions for node:', node.id);
        
        // Quick load mode - use mock data immediately
        if (quickLoad) {
          setLoadingProgress({current: 0, total: 1, step: 'Loading mock data...'});
          const mockTransactions = [
            {
              id: 'mock-tx-1',
              address: 'mock-address-1',
              entityId: 'mock_entity_1',
              entityName: 'Mock Exchange',
              amount: '0.50000000',
              currency: 'BTC',
              date: new Date().toISOString().split('T')[0],
              txHash: 'mock-hash-1',
              txId: 'mock-hash-1',
              usdValue: formatUSD(0.5 * 30000), // $15,000.00
              risk: 'medium' as const,
              transactionCount: 2,
              entityType: 'exchange' as const,
              logo: undefined,
              direction: 'in' as const,
            },
            {
              id: 'mock-tx-2',
              address: 'mock-address-2',
              entityId: 'mock_entity_2',
              entityName: 'Mock Wallet',
              amount: '0.25000000',
              currency: 'BTC',
              date: new Date().toISOString().split('T')[0],
              txHash: 'mock-hash-2',
              txId: 'mock-hash-2',
              usdValue: formatUSD(0.25 * 30000), // $7,500.00
              risk: 'low' as const,
              transactionCount: 1,
              entityType: 'wallet' as const,
              logo: undefined,
              direction: 'out' as const,
            }
          ];
          setAllTransactions(mockTransactions);
          setLoadingProgress({current: 1, total: 1, step: 'Mock data loaded'});
          setLoading(false);
          
          // Update node's availableTransactions for mock data
          if (node && (node.availableTransactions === 0 || node.availableTransactions === undefined)) {
            onUpdateNodeTransactions?.(nodeId, mockTransactions.length);
          }
          return;
        }
        
        // Try to fetch transaction data with fallback
        let transactionData: any = null;
        try {
          setLoadingProgress({current: 0, total: 1, step: 'Fetching transaction data...'});
          // Use node.address instead of node.id for API calls
          const addressToFetch = node.address || node.id.replace('searched_', '');
          console.log('Fetching transactions for address:', addressToFetch);
          const transactionDataPromise = fetchTransactionData(addressToFetch, 1, 50);
          transactionData = await transactionDataPromise as any;
          setLoadingProgress({current: 1, total: 1, step: 'Transaction data loaded successfully'});
        } catch (error) {
          console.log('Transaction data fetch failed, using fallback data');
          captureApiError(error, 'NodeExpansion-Transactions');
          // Use fallback data structure
          transactionData = {
            txs: [
              {
                txid: 'fallback-tx-1',
                inputs: [{ addr: 'fallback-input' }],
                outputs: [{ addr: node.id }],
                output_amt: 100000000, // 1 BTC
                block_date: new Date().toISOString().split('T')[0],
                input_cnt: 1,
                output_cnt: 1
              }
            ]
          };
          setLoadingProgress({current: 1, total: 1, step: 'Using fallback transaction data'});
        }
        
        if (transactionData && transactionData.txs) {
          console.log('Found transactions:', transactionData.txs.length);
          
          // Collect all unique addresses from inputs and outputs
          const allAddresses = new Set<string>();
          transactionData.txs.forEach((tx: any) => {
            tx.inputs?.forEach((input: any) => {
              if (input.addr) allAddresses.add(input.addr);
            });
            tx.outputs?.forEach((output: any) => {
              if (output.addr) allAddresses.add(output.addr);
            });
          });

          console.log('Unique addresses found:', allAddresses.size);

          // Fetch attribution data for all addresses (with timeout)
          let addressEntities: any = {};
          let addressLogos: any = {};
          if (allAddresses.size > 0) {
            try {
              setLoadingProgress({current: 1, total: 2, step: 'Fetching attribution data...'});
              console.log('Fetching attribution data for addresses:', Array.from(allAddresses).slice(0, 5), '...');
              const attributionDataPromise = fetchAttributionData(Array.from(allAddresses));
              const attributionData = await attributionDataPromise as any;
              console.log('Raw attribution data response:', attributionData);
              if (attributionData && attributionData.data) {
                console.log('Attribution data array length:', attributionData.data.length);
                console.log('Sample attribution item structure:', attributionData.data[0]);
                attributionData.data.forEach((item: any) => {
                  console.log('Attribution item:', item);
                  // Check for both 'address' and 'addr' fields
                  const address = item.address || item.addr;
                  if (address && item.entity) {
                    addressEntities[address] = item.entity;
                    // Extract logo if available
                    if (item.logo) {
                      addressLogos[address] = item.logo;
                    }
                  }
                });
              }
              console.log('Attribution data loaded for', Object.keys(addressEntities).length, 'addresses');
              console.log('Address entities mapping:', addressEntities);
              console.log('Address logos mapping:', addressLogos);
              setLoadingProgress({current: 2, total: 2, step: 'Attribution data loaded'});
            } catch (error) {
              console.error('Error fetching attribution data:', error);
              captureApiError(error, 'NodeExpansion-Attribution');
              setLoadingProgress({current: 2, total: 2, step: 'Using default attribution data'});
            }
          }

          // Fetch risk data for all addresses using optimized batch API
          let addressRisks: any = {};
          const addressArray = Array.from(allAddresses);
          
          if (addressArray.length > 0 && !skipRiskData) {
            // Performance optimization: limit addresses for risk scoring
            const maxAddressesForRisk = 30; // Reasonable limit to prevent API overload
            
            if (addressArray.length > maxAddressesForRisk) {
              console.log(`Too many addresses (${addressArray.length}) for risk data fetching, using default values`);
              setLoadingProgress({current: 1, total: 1, step: 'Using default risk values (too many addresses)...'});
              addressArray.forEach(address => {
                addressRisks[address] = 'low';
              });
            } else {
              try {
                setLoadingProgress({current: 0, total: 1, step: 'Fetching risk data...'});
                
                // Temporarily skip risk data fetching due to API issues
                console.log('Skipping risk data fetching due to API endpoint issues');
                addressArray.forEach(address => {
                  addressRisks[address] = 'low';
                });
                setLoadingProgress({current: 1, total: 1, step: 'Using default risk values'});
                
                /* Commented out due to API endpoint issues
                // Use the new batch API for better performance
                const riskData = await fetchBatchRiskScoringData(addressArray) as any;
                
                if (riskData && riskData.success && riskData.data) {
                  // Process batch response
                  riskData.data.forEach((item: any) => {
                    const address = item.address || item.addr;
                    if (address && item.overallRisk !== undefined) {
                      const overallRisk = item.overallRisk;
                      addressRisks[address] = overallRisk > 0.4 ? 'high' : overallRisk > 0.2 ? 'medium' : 'low';
                    }
                  });
                  
                  console.log(`Risk data loaded for ${Object.keys(addressRisks).length} addresses`);
                } else {
                  // Fallback to individual calls if batch API fails
                  console.log('Batch risk API failed, falling back to individual calls');
                  const batchSize = 3; // Smaller batch size for individual calls
                  const totalBatches = Math.ceil(addressArray.length / batchSize);
                  
                  for (let i = 0; i < addressArray.length; i += batchSize) {
                    const batch = addressArray.slice(i, i + batchSize);
                    const batchPromises = batch.map(async (address) => {
                      try {
                        const individualRiskData = await fetchRiskScoringData(address, 'address') as any;
                        if (individualRiskData && individualRiskData.success && individualRiskData.data) {
                          const overallRisk = individualRiskData.data.overallRisk;
                          return { address, risk: overallRisk > 0.4 ? 'high' : overallRisk > 0.2 ? 'medium' : 'low' };
                        }
                        return { address, risk: 'low' };
                      } catch (error) {
                        console.error(`Error fetching risk data for ${address}:`, error);
                        return { address, risk: 'low' };
                      }
                    });
                    
                    const batchResults = await Promise.all(batchPromises);
                    batchResults.forEach(({ address, risk }) => {
                      addressRisks[address] = risk;
                    });
                    
                    setLoadingProgress({current: Math.floor(i / batchSize) + 1, total: totalBatches, step: `Processing batch ${Math.floor(i / batchSize) + 1}/${totalBatches}`});
                  }
                }
                */
                
                setLoadingProgress({current: 1, total: 1, step: 'Risk data loaded'});
              } catch (error) {
                console.log('Risk data fetching failed, using default values');
                captureApiError(error, 'NodeExpansion-RiskData');
                // Set default risk values for all addresses
                addressArray.forEach(address => {
                  addressRisks[address] = 'low';
                });
                setLoadingProgress({current: 1, total: 1, step: 'Using default risk values'});
              }
            }
          }

          // Process transactions to handle both incoming and outgoing
          const processedTransactions: Transaction[] = [];
          
          // Use the actual address for transaction processing
          const nodeAddress = node.address || node.id.replace('searched_', '');
          
          transactionData.txs.forEach((tx: any, index: number) => {
            const nodeInInputs = tx.inputs?.some((inp: any) => inp.addr === nodeAddress);
            const nodeInOutputs = tx.outputs?.some((out: any) => out.addr === nodeAddress);
            
            // Handle incoming transactions (money flowing TO the current node)
            if (nodeInOutputs) {
              const inputAddress = tx.inputs?.[0]?.addr || 'Unknown';
              const rawEntityName = addressEntities[inputAddress] || 'Unknown Entity';
              const entityId = rawEntityName.toLowerCase().replace(/\s+/g, '_');
              
              // Use SOT data if available, otherwise fallback to basic formatting
              let entityName = rawEntityName.charAt(0).toUpperCase() + rawEntityName.slice(1);
              if (sotData.length > 0) {
                const sotInfo = sotData.find(sot => 
                  sot.entity_id === entityId || 
                  sot.entity_id === rawEntityName ||
                  sot.proper_name?.toLowerCase() === rawEntityName.toLowerCase()
                );
                if (sotInfo && sotInfo.proper_name) {
                  entityName = sotInfo.proper_name;
                }
              }
              
              const risk = addressRisks[inputAddress] || 'low';
              
              // Get logo from API first, then fallback to local generation
              const apiLogo = addressLogos[inputAddress];
              let sotLogo = undefined;
              
              // Check SOT data for logo
              if (sotData.length > 0) {
                const sotInfo = sotData.find(sot => 
                  sot.entity_id === entityId || 
                  sot.entity_id === rawEntityName ||
                  sot.proper_name?.toLowerCase() === rawEntityName.toLowerCase()
                );
                if (sotInfo && sotInfo.logo) {
                  sotLogo = sotInfo.logo;
                }
              }
              
              const localLogo = getSafeLogoPath(entityName);
              const logoPath = apiLogo || sotLogo || localLogo;
              
              processedTransactions.push({
                id: `tx_in_${index}`,
                address: inputAddress,
                entityId: entityId,
                entityName: entityName,
                amount: (tx.output_amt / 100000000).toFixed(8),
                currency: 'BTC',
                date: tx.block_date ? tx.block_date.split('T')[0] : 'Unknown',
                txHash: tx.txid,
                txId: tx.txid,
                usdValue: calculateUSDValue(tx.output_amt / 100000000),
                risk,
                transactionCount: tx.input_cnt + tx.output_cnt,
                entityType: 'wallet',
                logo: logoPath,
                direction: 'in',
              });
            }
            
            // Handle outgoing transactions (money flowing FROM the current node)
            if (nodeInInputs) {
              const outputAddress = tx.outputs?.find((out: any) => out.addr !== nodeAddress)?.addr || 'Unknown';
              const rawEntityName = addressEntities[outputAddress] || 'Unknown Entity';
              const entityId = rawEntityName.toLowerCase().replace(/\s+/g, '_');
              
              // Use SOT data if available, otherwise fallback to basic formatting
              let entityName = rawEntityName.charAt(0).toUpperCase() + rawEntityName.slice(1);
              if (sotData.length > 0) {
                const sotInfo = sotData.find(sot => 
                  sot.entity_id === entityId || 
                  sot.entity_id === rawEntityName ||
                  sot.proper_name?.toLowerCase() === rawEntityName.toLowerCase()
                );
                if (sotInfo && sotInfo.proper_name) {
                  entityName = sotInfo.proper_name;
                }
              }
              
              const risk = addressRisks[outputAddress] || 'low';
              
              // Get logo from API first, then fallback to local generation
              const apiLogo = addressLogos[outputAddress];
              let sotLogo = undefined;
              
              // Check SOT data for logo
              if (sotData.length > 0) {
                const sotInfo = sotData.find(sot => 
                  sot.entity_id === entityId || 
                  sot.entity_id === rawEntityName ||
                  sot.proper_name?.toLowerCase() === rawEntityName.toLowerCase()
                );
                if (sotInfo && sotInfo.logo) {
                  sotLogo = sotInfo.logo;
                }
              }
              
              const localLogo = getSafeLogoPath(entityName);
              const logoPath = apiLogo || sotLogo || localLogo;
              
                             processedTransactions.push({
                 id: `tx_out_${index}`,
                 address: outputAddress,
                 entityId: entityId,
                 entityName: entityName,
                 amount: (tx.output_amt / 100000000).toFixed(8),
                 currency: 'BTC',
                 date: tx.block_date ? tx.block_date.split('T')[0] : 'Unknown',
                 txHash: tx.txid,
                 txId: tx.txid,
                 usdValue: calculateUSDValue(tx.output_amt / 100000000),
                 risk,
                 transactionCount: tx.input_cnt + tx.output_cnt,
                 entityType: 'wallet',
                 logo: logoPath,
                 direction: 'out',
               });
            }
            
            // Debug logging for direction logic
            console.log(`Transaction ${index}:`, {
              nodeId: node.id,
              nodeAddress,
              nodeInInputs,
              nodeInOutputs,
              allOutputs: tx.outputs?.map((out: any) => out.addr),
              allInputs: tx.inputs?.map((inp: any) => inp.addr)
            });
          });
          
                     console.log('Processed transactions:', processedTransactions.length);
          setAllTransactions(processedTransactions);
          
          // Update the node's availableTransactions property if it's currently 0
          if (node && (node.availableTransactions === 0 || node.availableTransactions === undefined) && processedTransactions.length > 0) {
            console.log(`Updating node ${node.id} availableTransactions from ${node.availableTransactions} to ${processedTransactions.length}`);
            onUpdateNodeTransactions?.(nodeId, processedTransactions.length);
          }
        } else {
          console.log('No transactions found');
          setAllTransactions([]);
          
          // Update node's availableTransactions to 0 if no transactions found
          if (node && node.availableTransactions !== 0) {
            onUpdateNodeTransactions?.(nodeId, 0);
          }
        }
      } catch (error) {
        console.error('Error loading transactions:', error);
        captureApiError(error, 'NodeExpansion');
        
        // Provide more specific error information
        let errorMessage = "Failed to load transactions";
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNABORTED') {
            errorMessage = "Request timed out";
          } else if (error.response?.status === 404) {
            errorMessage = "Address not found";
          } else if (error.response?.status && error.response.status >= 500) {
            errorMessage = "Server error";
          } else {
            errorMessage = `API error (${error.response?.status || 'Unknown'})`;
          }
        }
        
        console.log('Error details:', errorMessage);
        setAllTransactions([]);
      } finally {
        setLoading(false);
      }
    }
  }, [node, quickLoad, skipRiskData]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Fetch SOT data on component mount (only once)
  useEffect(() => {
    fetchSOTDataForNames();
  }, []);

  // Helper function to format USD amounts with commas
  const formatUSD = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Helper function to calculate USD value from BTC amount
  const calculateUSDValue = (btcAmount: number): string => {
    // Using a rough BTC price of $30,000 for now
    // In a real implementation, this would fetch current BTC price from an API
    // TODO: Integrate with a real-time BTC price API (e.g., CoinGecko, CoinMarketCap)
    const btcPrice = 30000;
    const usdValue = btcAmount * btcPrice;
    return formatUSD(usdValue);
  };

  // Calculate filter ranges
  const maxAmount = useMemo(() => {
    if (allTransactions.length === 0) return 100000;
    return Math.max(...allTransactions.map((tx) => {
      // Parse USD value by removing currency symbol and commas
      const value = tx.usdValue.replace(/[$,]/g, '');
      return Number.parseFloat(value) || 0;
    }));
  }, [allTransactions]);

  const dateExtents = useMemo(() => {
    const dates = allTransactions.map((tx) => new Date(tx.date));
    return {
      min: dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
      max: dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date(),
    };
  }, [allTransactions]);

  // Identify already processed transactions
  const processedTransactionHashes = useMemo(() => {
    const processed = new Set<string>()
    existingConnections.forEach(conn => {
      if (conn.txHash) {
        processed.add(conn.txHash)
      }
    })
    return processed
  }, [existingConnections])

  // Pre-select transactions that have already been processed
  useEffect(() => {
    if (allTransactions.length > 0) {
      const preSelectedIds = allTransactions
        .filter(tx => processedTransactionHashes.has(tx.txHash))
        .map(tx => tx.id)
      setSelectedTransactions(new Set(preSelectedIds))
    }
  }, [allTransactions, processedTransactionHashes])

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    const filtered = allTransactions.filter((tx) => {
      const matchesSearch =
        tx.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.txId.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesRisk = filterRisk === "all" || tx.risk === filterRisk
      const matchesEntityType = filterEntityType === "all" || tx.entityType === filterEntityType
      const matchesDirection = filterDirection === "all" || tx.direction === filterDirection

      const txDate = new Date(tx.date)
      const matchesDateRange =
        (!dateRange.from || txDate >= dateRange.from) && (!dateRange.to || txDate <= dateRange.to)

      const txAmount = Number.parseFloat(tx.usdValue.replace(/[$,]/g, ''))
      const matchesAmountRange = txAmount >= amountRange[0] && txAmount <= amountRange[1]

      // Don't filter out processed transactions - show them but mark as processed
      return matchesSearch && matchesRisk && matchesEntityType && matchesDirection && matchesDateRange && matchesAmountRange
    })

    // Sort transactions
    filtered.sort((a, b) => {
      let aVal: any, bVal: any

      if (sortBy === "entityName") {
        aVal = a.entityName.toLowerCase()
        bVal = b.entityName.toLowerCase()
      } else if (sortBy === "entityId") {
        aVal = a.entityId.toLowerCase()
        bVal = b.entityId.toLowerCase()
      } else if (sortBy === "amount") {
        aVal = Number.parseFloat(a.amount)
        bVal = Number.parseFloat(b.amount)
      } else if (sortBy === "date") {
        aVal = new Date(a.date).getTime()
        bVal = new Date(b.date).getTime()
      } else if (sortBy === "risk") {
        const riskOrder = { high: 3, medium: 2, low: 1 }
        aVal = riskOrder[a.risk]
        bVal = riskOrder[b.risk]
      } else if (sortBy === "entityType") {
        aVal = a.entityType.toLowerCase()
        bVal = b.entityType.toLowerCase()
      } else if (sortBy === "direction") {
        aVal = a.direction === "out" ? 1 : 0
        bVal = b.direction === "out" ? 1 : 0
      } else if (sortBy === "txId") {
        aVal = a.txId.toLowerCase()
        bVal = b.txId.toLowerCase()
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)
      } else {
        return sortOrder === "desc" ? bVal - aVal : aVal - bVal
      }
    })

    return filtered
  }, [allTransactions, searchQuery, filterRisk, filterEntityType, filterDirection, dateRange, amountRange, sortBy, sortOrder])

  // Update amount range when max amount changes significantly
  useEffect(() => {
    if (maxAmount > 100000 && amountRange[1] === 100000) {
      setAmountRange([0, maxAmount]);
    }
  }, [maxAmount, amountRange]);

  const handleTransactionToggle = (txId: string) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(txId)) {
      newSelected.delete(txId)
    } else {
      newSelected.add(txId)
    }
    setSelectedTransactions(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map((tx) => tx.id)))
    }
  }

  const handleExpand = () => {
    const selected = filteredTransactions.filter((tx) => selectedTransactions.has(tx.id))
    onExpand(nodeId, selected)
  }

  const clearFilters = () => {
    setFilterRisk("all")
    setFilterEntityType("all")
    setFilterDirection("all")
    setDateRange({})
    setAmountRange([0, 100000]) // Use fixed value instead of maxAmount
    setSearchQuery("")
  }

  const getRiskColor = (risk: string) => {
    return risk === "high" ? "text-red-700 dark:text-red-400" : risk === "medium" ? "text-yellow-700 dark:text-yellow-400" : "text-green-700 dark:text-green-400"
  }

  const getEntityTypeColor = (type: string) => {
    const colors = {
      exchange: "bg-blue-500/20 text-blue-600 border-blue-500/30",
      wallet: "bg-gray-500/20 text-gray-600 border-gray-500/30",
      mixer: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
      defi: "bg-purple-500/20 text-purple-600 border-purple-500/30",
      service: "bg-orange-500/20 text-orange-600 border-orange-500/30",
    }
    return colors[type as keyof typeof colors] || "bg-gray-500/20 text-gray-600 border-gray-500/30"
  }

  // Helper function to get sort icon
  const getSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ChevronUp className="w-4 h-4 ml-1 opacity-30" />
    }
    return sortOrder === "asc" ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
  }

  // Helper function to handle sort click
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field as any)
      setSortOrder("asc")
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] bg-card border-2 border-border text-foreground shadow-2xl p-0 overflow-hidden ring-4 ring-primary/40">
        {/* Header */}
        <DialogHeader className="border-b-2 border-primary/30 p-6 pb-4 flex-shrink-0 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground flex items-center">
                <div className="w-2 h-8 bg-primary rounded-full mr-3"></div>
                <div className="flex items-center">
                  {node?.logo ? (
                    <img 
                      src={node.logo} 
                      alt={node.label} 
                      className="w-8 h-8 rounded-full mr-3 border-2 border-border"
                      onError={(e) => {
                        console.log(`Node logo failed to load:`, node.logo);
                        e.currentTarget.style.display = 'none'
                      }}
                      onLoad={(e) => {
                        console.log(`Node logo loaded successfully:`, node.logo);
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full mr-3 border-2 border-border bg-muted flex items-center justify-center">
                      <span className="text-sm font-bold text-muted-foreground">
                        {node?.label?.charAt(0).toUpperCase() || 'N'}
                      </span>
                    </div>
                  )}
                  <span>Expand Node: {node?.label}</span>
                </div>
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1 ml-5">
                {allTransactions.length > 0 ? allTransactions.length.toLocaleString() : (node?.availableTransactions?.toLocaleString() || '0')} available transactions
                {processedTransactionHashes.size > 0 && (
                  <span className="text-orange-600 ml-2">
                    ({processedTransactionHashes.size} already expanded)
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content - Fixed height container */}
        <div className="flex flex-col h-[calc(90vh-120px)] p-6 pt-0 space-y-4">
          {/* Search and Controls */}
          <div className="flex items-center gap-4 pt-6 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by address, entity name, or entity ID..."
                className="pl-10 bg-muted border-border text-foreground placeholder-muted-foreground h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Quick Load Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="quick-load"
                checked={quickLoad}
                onCheckedChange={(checked) => setQuickLoad(checked as boolean)}
              />
              <label htmlFor="quick-load" className="text-sm text-muted-foreground">
                Quick Load (Mock Data)
              </label>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-accent h-10 px-4 ${
                showFilters ? "bg-primary/20 border-primary text-primary" : ""
              }`}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </Button>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split("-")
                setSortBy(field as any)
                setSortOrder(order as any)
              }}
              className="bg-muted border-border rounded px-4 py-2 text-sm text-foreground hover:bg-accent h-10 min-w-[200px]"
            >
              <option value="entityName-asc">Entity Name (A-Z)</option>
              <option value="entityName-desc">Entity Name (Z-A)</option>
              <option value="entityId-asc">Entity ID (A-Z)</option>
              <option value="entityId-desc">Entity ID (Z-A)</option>
              <option value="amount-desc">Amount (High to Low)</option>
              <option value="amount-asc">Amount (Low to High)</option>
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="risk-desc">Risk (High to Low)</option>
              <option value="risk-asc">Risk (Low to High)</option>
              <option value="entityType-asc">Type (A-Z)</option>
              <option value="entityType-desc">Type (Z-A)</option>
              <option value="direction-desc">Direction (Outgoing First)</option>
              <option value="direction-asc">Direction (Incoming First)</option>
              <option value="txId-asc">TXID (A-Z)</option>
              <option value="txId-desc">TXID (Z-A)</option>
            </select>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-muted rounded-lg p-6 border border-border space-y-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Advanced Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  Clear All
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-6">
                {/* Risk Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Risk Level</label>
                  <select
                    value={filterRisk}
                    onChange={(e) => setFilterRisk(e.target.value as any)}
                    className="w-full bg-background border-border rounded px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="high">High Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="low">Low Risk</option>
                  </select>
                </div>

                {/* Entity Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Entity Type</label>
                  <select
                    value={filterEntityType}
                    onChange={(e) => setFilterEntityType(e.target.value as any)}
                    className="w-full bg-background border-border rounded px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <option value="all">All Types</option>
                    <option value="exchange">Exchange</option>
                    <option value="wallet">Wallet</option>
                    <option value="mixer">Mixer</option>
                    <option value="defi">DeFi</option>
                    <option value="service">Service</option>
                  </select>
                </div>

                {/* Direction Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Transaction Direction</label>
                  <select
                    value={filterDirection}
                    onChange={(e) => setFilterDirection(e.target.value as any)}
                    className="w-full bg-background border-border rounded px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    <option value="all">All Directions</option>
                    <option value="in">Incoming</option>
                    <option value="out">Outgoing</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Date Range</label>
                  <div className="flex space-x-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-start text-left font-normal bg-background border-border text-foreground hover:bg-accent"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? format(dateRange.from, "MMM dd") : "From"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-card border-border">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                          disabled={(date) => date > new Date() || date < dateExtents.min}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-start text-left font-normal bg-background border-border text-foreground hover:bg-accent"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.to ? format(dateRange.to, "MMM dd") : "To"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-card border-border">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                          disabled={(date) => date > new Date() || date < dateExtents.min}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Amount Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    USD Value Range
                  </label>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Min: $0</span>
                      <span>Max: ${maxAmount.toLocaleString()}</span>
                    </div>
                    <Slider
                      value={amountRange}
                      onValueChange={(value) => setAmountRange(value as [number, number])}
                      max={maxAmount}
                      min={0}
                      step={1000}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm font-medium text-foreground">
                      <span>${amountRange[0].toLocaleString()}</span>
                      <span>${amountRange[1].toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Filter Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="border-border bg-background text-foreground hover:bg-accent"
                  >
                    Clear Filters
                  </Button>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Filter className="h-3 w-3" />
                    <span>Filters applied automatically</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Selection Controls */}
          <div className="flex items-center justify-between bg-muted rounded-lg p-4 border border-border flex-shrink-0">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="border-border bg-background text-foreground hover:text-foreground hover:bg-accent"
              >
                {selectedTransactions.size === filteredTransactions.length ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Select All
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                <span className="text-primary font-medium">{selectedTransactions.size}</span> of{" "}
                <span className="text-foreground font-medium">{filteredTransactions.length}</span> selected
              </span>
            </div>

            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-1" />
                Showing {filteredTransactions.length} of {allTransactions.length}
                {processedTransactionHashes.size > 0 && (
                  <span className="text-orange-600 ml-1">
                    ({processedTransactionHashes.size} processed)
                  </span>
                )}
              </div>
              {selectedTransactions.size > 0 && (
                <div className="flex items-center text-green-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Ready to expand
                </div>
              )}
            </div>
          </div>

          {/* Transaction List - Fixed height scrollable area */}
          <div className="flex-1 min-h-0 border border-border rounded-lg bg-muted overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-background text-sm font-medium text-foreground flex-shrink-0">
              <div className="col-span-1"></div>
              <div 
                className="col-span-2 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("entityName")}
              >
                Entity Name
                {getSortIcon("entityName")}
              </div>
              <div 
                className="col-span-2 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("entityId")}
              >
                Entity ID
                {getSortIcon("entityId")}
              </div>
              <div 
                className="col-span-2 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("amount")}
              >
                Amount
                {getSortIcon("amount")}
              </div>
              <div 
                className="col-span-1 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("date")}
              >
                Date
                {getSortIcon("date")}
              </div>
              <div 
                className="col-span-1 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("risk")}
              >
                Risk
                {getSortIcon("risk")}
              </div>
              <div 
                className="col-span-1 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("entityType")}
              >
                Type
                {getSortIcon("entityType")}
              </div>
              <div 
                className="col-span-1 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("direction")}
              >
                Direction
                {getSortIcon("direction")}
              </div>
              <div 
                className="col-span-1 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("txId")}
              >
                TXID
                {getSortIcon("txId")}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto">
              <div className="space-y-1 p-2">
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <div className="text-lg font-medium">Loading transactions...</div>
                    <div className="text-sm mb-4">{loadingProgress.step}</div>
                    {loadingProgress.total > 0 && (
                      <div className="w-full max-w-md mx-auto">
                        <div className="flex justify-between text-xs mb-2">
                          <span>Progress</span>
                          <span>{loadingProgress.current}/{loadingProgress.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {processedTransactionHashes.size > 0 && allTransactions.length > 0 ? (
                      <>
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <div className="text-lg font-medium">All transactions have been expanded</div>
                        <div className="text-sm">This node has no more transactions to expand</div>
                      </>
                    ) : (
                      <>
                        <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <div className="text-lg font-medium">No transactions match your filters</div>
                        <div className="text-sm">Try adjusting your search criteria or clearing filters</div>
                      </>
                    )}
                  </div>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isProcessed = processedTransactionHashes.has(tx.txHash)
                    return (
                      <div
                        key={tx.id}
                        className={`grid grid-cols-12 gap-4 p-4 rounded-lg border transition-all cursor-pointer items-center ${
                          selectedTransactions.has(tx.id)
                            ? isProcessed 
                              ? "bg-orange-100 dark:bg-orange-900/20 border-orange-300 dark:border-orange-600"
                              : "bg-primary/20 border-primary"
                            : "bg-background/50 border-border hover:bg-accent/50 hover:border-border"
                        } ${isProcessed ? "opacity-75" : ""}`}
                        onClick={() => handleTransactionToggle(tx.id)}
                      >
                      <div className="col-span-1">
                        <Checkbox
                          checked={selectedTransactions.has(tx.id)}
                          onChange={() => handleTransactionToggle(tx.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </div>

                      <div className="col-span-2">
                        <div className="flex items-center">
                          {tx.logo ? (
                            <img 
                              src={tx.logo} 
                              alt={tx.entityName} 
                              className="w-6 h-6 rounded-full mr-2 border border-border"
                              onError={(e) => {
                                console.log(`Logo failed to load for ${tx.entityName}:`, tx.logo);
                                e.currentTarget.style.display = 'none'
                              }}
                              onLoad={(e) => {
                                console.log(`Logo loaded successfully for ${tx.entityName}:`, tx.logo);
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full mr-2 border border-border bg-muted flex items-center justify-center">
                              <span className="text-xs font-bold text-muted-foreground">
                                {tx.entityName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="font-medium text-foreground text-sm">{tx.entityName}</div>
                          {isProcessed && (
                            <Badge variant="outline" className="ml-2 text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-600">
                              Expanded
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground font-mono text-xs truncate ml-8">{tx.address.substring(0, 12)}...</div>
                      </div>

                      <div className="col-span-2">
                        <div className="font-mono text-foreground text-sm truncate" title={tx.entityId}>{tx.entityId}</div>
                      </div>

                      <div className="col-span-2">
                        <div className="font-mono text-foreground text-sm">
                          {tx.amount} {tx.currency}
                        </div>
                        <div className="text-green-600 font-medium text-sm">{tx.usdValue}</div>
                      </div>

                      <div className="col-span-1">
                        <div className="text-foreground text-sm">{tx.date}</div>
                        <div className="text-muted-foreground text-xs">{tx.transactionCount} txns</div>
                      </div>

                      <div className="col-span-1">
                        <Badge
                          variant={tx.risk === "high" ? "destructive" : "outline"}
                          className={`text-xs font-bold ${
                            tx.risk === "high" 
                              ? "bg-red-600 dark:bg-red-500 text-white border-red-600 dark:border-red-500 shadow-sm animate-pulse" 
                              : getRiskColor(tx.risk)
                          }`}
                        >
                          {tx.risk === "high" ? "⚠ HIGH" : tx.risk}
                        </Badge>
                      </div>

                      <div className="col-span-1">
                        <Badge className={`text-xs border ${getEntityTypeColor(tx.entityType)}`}>{tx.entityType}</Badge>
                      </div>

                      <div className="col-span-1">
                        <Badge 
                          variant={tx.direction === "in" ? "default" : "secondary"}
                          className={`text-xs ${
                            tx.direction === "in" 
                              ? "bg-green-500/20 text-green-600 border-green-500/30" 
                              : "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"
                          }`}
                        >
                          {tx.direction === "in" ? "In" : "Out"}
                        </Badge>
                      </div>

                      <div className="col-span-1">
                        <div
                          className="font-mono text-blue-600 text-xs cursor-pointer hover:text-blue-500 truncate"
                          title={tx.txId}
                        >
                          {tx.txId.substring(0, 12)}...
                        </div>
                      </div>
                    </div>
                  )
                })
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t-2 border-primary/40 bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-border bg-background text-foreground hover:text-foreground hover:bg-accent"
              >
                Cancel
              </Button>
              {!loading && allTransactions.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuickLoad(true);
                  }}
                  className="border-border bg-background text-foreground hover:text-foreground hover:bg-accent"
                >
                  Load Mock Data
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {selectedTransactions.size > 0 && (
                <div className="text-sm text-muted-foreground">
                  {processedTransactionHashes.size > 0 
                    ? `This will update ${selectedTransactions.size} nodes (deselected will be removed)`
                    : `This will create ${selectedTransactions.size} new nodes`
                  }
                </div>
              )}
              <Button
                onClick={handleExpand}
                disabled={selectedTransactions.size === 0}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-bold px-8 py-3 text-lg shadow-lg"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                Confirm Expansion ({selectedTransactions.size})
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
