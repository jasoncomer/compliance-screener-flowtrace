"use client"

import { useState, useEffect } from "react"
import { getCurrencyIcon } from "@/lib/currency-icons"
import { getCounterpartyName, getSOTData } from "@/lib/counterparty-utils"
import { fetchTransactionData } from "@/lib/api"

interface TransactionTableProps {
  selectedNode?: {
    id: string
    label: string
    logo?: string
    chainLogo?: string
    type: string
    risk: string
    balance?: string
    transactions?: number
    address?: string
  }
  connections?: Array<{
    from: string
    to: string
    amount: string
    currency: string
    date: string
    txHash: string
    usdValue: string
    type: string
    fee?: string
  }>
}

interface TransactionData {
  hash?: string
  txid?: string
  time: number
  inputs?: Array<{
    addr: string
    amt: string
  }>
  outputs?: Array<{
    addr: string
    amt: string
  }>
}

type FilterType = "all" | "in" | "out"

interface TransactionWithName {
  id: string
  date: string
  direction: 'in' | 'out'
  usdAmount: string
  btcAmount: string
  counterparty: string
  counterpartyName: string
  txHash: string
  loadingName: boolean
}

export function TransactionTable({ selectedNode, connections }: TransactionTableProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [transactions, setTransactions] = useState<TransactionWithName[]>([])
  const [sotData, setSotData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Load SOT data on component mount
  useEffect(() => {
    const loadSOTData = async () => {
      try {
        const data = await getSOTData()
        setSotData(data)
      } catch (error) {
        console.error('Failed to load SOT data:', error)
      }
    }
    loadSOTData()
  }, [])

  // Fetch all transactions for the selected node's address
  useEffect(() => {
    const fetchAllTransactions = async () => {
      console.log('🔍 TransactionTable: fetchAllTransactions called')
      console.log('🔍 Selected node:', selectedNode)
      
      if (!selectedNode?.address) {
        console.log('❌ No address found in selectedNode:', selectedNode)
        setTransactions([])
        return
      }

      setLoading(true)
      try {
        console.log('📡 Fetching all transactions for address:', selectedNode.address)
        
        // Fetch transaction data from the API
        const transactionData = await fetchTransactionData(selectedNode.address, currentPage, pageSize)
        console.log('📊 Transaction data received:', transactionData)

        if (!transactionData?.txs || !Array.isArray(transactionData.txs)) {
          console.log('❌ No transaction data available or invalid format')
          console.log('Transaction data structure:', transactionData)
          setTransactions([])
          setTotalPages(1)
          return
        }

        console.log(`✅ Found ${transactionData.txs.length} transactions to process`)

        // Process transactions and determine direction relative to the selected node
        const processedTransactions = transactionData.txs.map((tx: TransactionData) => {
          console.log('Processing transaction:', tx.txid, 'for address:', selectedNode.address)
          
          // Determine if this transaction is incoming or outgoing for the selected node
          let direction: 'in' | 'out' = 'in'
          let counterpartyAddress = ''
          let amount = '0'

          // Check if the selected node's address is in inputs (outgoing) or outputs (incoming)
          const isInInputs = tx.inputs?.some((input: any) => input.addr === selectedNode.address)
          const isInOutputs = tx.outputs?.some((output: any) => output.addr === selectedNode.address)

          console.log('Transaction analysis:', {
            txid: tx.txid,
            isInInputs,
            isInOutputs,
            inputs: tx.inputs?.map(i => ({ addr: i.addr, amt: i.amt })),
            outputs: tx.outputs?.map(o => ({ addr: o.addr, amt: o.amt }))
          })

          if (isInInputs && isInOutputs) {
            // This is a self-transfer or complex transaction
            direction = 'out' // Default to outgoing for display purposes
            console.log('Self-transfer detected')
          } else if (isInInputs) {
            // Selected node is in inputs - this is an outgoing transaction
            direction = 'out'
            // Find the counterparty (address in outputs that's not the selected node)
            const counterpartyOutput = tx.outputs?.find((output: any) => output.addr !== selectedNode.address)
            counterpartyAddress = counterpartyOutput?.addr || 'Unknown'
            amount = counterpartyOutput?.amt || '0'
            console.log('Outgoing transaction - counterparty:', counterpartyAddress, 'amount:', amount)
          } else if (isInOutputs) {
            // Selected node is in outputs - this is an incoming transaction
            direction = 'in'
            // Find the counterparty (address in inputs that's not the selected node)
            const counterpartyInput = tx.inputs?.find((input: any) => input.addr !== selectedNode.address)
            counterpartyAddress = counterpartyInput?.addr || 'Unknown'
            amount = counterpartyInput?.amt || '0'
            console.log('Incoming transaction - counterparty:', counterpartyAddress, 'amount:', amount)
          } else {
            console.log('Transaction does not involve the selected address')
            return null // Skip this transaction
          }

          // Convert satoshis to BTC
          const btcAmount = (parseInt(amount) / 100000000).toFixed(8)
          
          // Calculate USD value (you might want to get this from the API or use a fixed rate)
          const usdValue = (parseFloat(btcAmount) * 30000).toFixed(2) // Placeholder rate

          // Safely convert timestamp to date
          let dateString = 'Unknown'
          if (tx.time && typeof tx.time === 'number' && tx.time > 0) {
            try {
              const date = new Date(tx.time * 1000)
              if (!isNaN(date.getTime())) {
                dateString = date.toISOString().split('T')[0]
              }
            } catch (error) {
              console.warn('Invalid timestamp for transaction:', tx.txid, 'timestamp:', tx.time)
            }
          }

          return {
            id: tx.hash || tx.txid,
            date: dateString,
            direction,
            usdAmount: `$${parseFloat(usdValue).toLocaleString()}`,
            btcAmount: `${btcAmount} BTC`,
            counterparty: counterpartyAddress,
            counterpartyName: '', // Will be resolved
            txHash: tx.hash || tx.txid,
            loadingName: true
          }
        }).filter(Boolean) // Remove null transactions

        console.log(`✅ Processed ${processedTransactions.length} valid transactions`)

        // Resolve counterparty names
        const transactionsWithNames = await Promise.all(
          processedTransactions.map(async (tx: TransactionWithName) => {
            try {
              const name = await getCounterpartyName(tx.counterparty)
              return {
                ...tx,
                counterpartyName: name,
                loadingName: false
              }
            } catch (error) {
              console.error('Error resolving counterparty name:', error)
              return {
                ...tx,
                counterpartyName: `Unknown_${tx.counterparty.substring(0, 6)}`,
                loadingName: false
              }
            }
          })
        )

        console.log('✅ Final transactions with names:', transactionsWithNames)
        setTransactions(transactionsWithNames)
        
        // Calculate total pages based on API response
        const total = transactionData.total || transactionData.txs?.length || 0
        const calculatedTotalPages = Math.max(1, Math.ceil(total / pageSize))
        console.log('📊 Pagination info:', { total, pageSize, calculatedTotalPages, transactionData })
        setTotalPages(calculatedTotalPages)

      } catch (error) {
        console.error('❌ Error fetching transactions:', error)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    fetchAllTransactions()
  }, [selectedNode?.address, currentPage, pageSize])

  const filteredTransactions = transactions.filter(tx => {
    if (activeFilter === "all") return true
    if (activeFilter === "out" && tx.direction === "out") return true
    if (activeFilter === "in" && tx.direction === "in") return true
    return false
  })

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  return (
    <div className="rounded-2xl border p-6 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Transaction History</h4>
          <button className="px-3 py-1 text-sm font-medium rounded-lg transition-colors bg-orange-600 text-white hover:bg-orange-700">
            View in BlockScout Explorer
          </button>
        </div>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex px-4">
            <button 
              onClick={() => setActiveFilter("all")}
              className={`py-3 px-4 text-sm font-medium transition-colors ${
                activeFilter === "all"
                  ? "text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
              }`}
            >
              All Transactions
            </button>
            <button 
              onClick={() => setActiveFilter("in")}
              className={`py-3 px-4 text-sm font-medium transition-colors ${
                activeFilter === "in"
                  ? "text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
              }`}
            >
              Inflows (Received)
            </button>
            <button 
              onClick={() => setActiveFilter("out")}
              className={`py-3 px-4 text-sm font-medium transition-colors ${
                activeFilter === "out"
                  ? "text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
              }`}
            >
              Outflows (Sent)
            </button>
          </div>
        </div>
        <div className="flex-1 px-4 pt-4 pb-4 min-h-0">
          <div className="flex-1 overflow-y-auto">
            <div className="overflow-x-auto">
              <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading transactions...</span>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Date</th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Direction</th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Amount (USD)</th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Amount (BTC)</th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Counterparty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((tx) => (
                          <tr key={tx.id} className="border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-gray-200 dark:border-gray-700">
                            <td className="py-3 px-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">{tx.date}</span>
                            </td>
                            <td className="py-3 px-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                tx.direction === 'out' 
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              }`}>
                                {tx.direction === 'out' ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-down-right w-3 h-3" aria-hidden="true">
                                    <path d="m7 7 10 10"></path>
                                    <path d="M17 7v10H7"></path>
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up-right w-3 h-3" aria-hidden="true">
                                    <path d="M7 7h10v10"></path>
                                    <path d="M7 17 17 7"></path>
                                  </svg>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{tx.usdAmount}</span>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center space-x-2">
                                {(() => {
                                  const currencyCode = tx.btcAmount.split(' ')[1] || 'USD'
                                  const currencyIcon = getCurrencyIcon(currencyCode)
                                  return (
                                    <>
                                      {currencyIcon && (
                                        <img 
                                          src={currencyIcon.logo} 
                                          alt={currencyIcon.name}
                                          className="w-4 h-4 rounded-full"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        />
                                      )}
                                      <span className="text-sm text-gray-600 dark:text-gray-400">{tx.btcAmount}</span>
                                    </>
                                  )
                                })()}
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex flex-col">
                                {tx.loadingName ? (
                                  <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm text-gray-400">Loading...</span>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {tx.counterpartyName}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                      {tx.counterparty}
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td colSpan={5} className="py-8 text-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {selectedNode ? 'No transactions found for this node' : 'Select a node to view transactions'}
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Show</span>
            <select 
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">of {transactions.length} transactions</span>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className={`p-1 rounded ${
                currentPage === 1 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left w-4 h-4" aria-hidden="true">
                <path d="m15 18-6-6 6-6"></path>
              </svg>
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages > 0 ? totalPages : 1}
            </span>
            <button 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => handlePageChange(currentPage + 1)}
              className={`p-1 rounded ${
                currentPage === totalPages || totalPages === 0
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4" aria-hidden="true">
                <path d="m9 18 6-6-6-6"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
