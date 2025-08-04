"use client"

import { useState } from "react"
import { getCurrencyIcon } from "@/lib/currency-icons"

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

type FilterType = "all" | "in" | "out"

export function TransactionTable({ selectedNode, connections }: TransactionTableProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")

  // Get all transactions for the selected node
  const getNodeTransactions = () => {
    if (!selectedNode?.id || !connections) return []
    
    return connections.filter(conn => 
      conn.from === selectedNode.id || conn.to === selectedNode.id
    ).map(conn => ({
      id: conn.txHash,
      date: conn.date,
      direction: conn.from === selectedNode.id ? 'out' : 'in',
      usdAmount: conn.usdValue,
      btcAmount: `${conn.amount} ${conn.currency}`,
      counterparty: conn.from === selectedNode.id ? conn.to : conn.from,
      txHash: conn.txHash
    }))
  }

  const nodeTransactions = getNodeTransactions()
  const filteredTransactions = nodeTransactions.filter(tx => {
    if (activeFilter === "all") return true
    if (activeFilter === "out" && tx.direction === "out") return true
    if (activeFilter === "in" && tx.direction === "in") return true
    return false
  })

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
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Time</th>
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
                            <span className="text-sm text-gray-600 dark:text-gray-400">{tx.counterparty}</span>
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
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Show</span>
            <select className="text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
              <option value="5">5</option>
              <option value="8">8</option>
              <option value="12">12</option>
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">of {nodeTransactions.length} transactions</span>
          </div>
          <div className="flex items-center space-x-2">
            <button disabled className="p-1 rounded text-gray-400 cursor-not-allowed">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left w-4 h-4" aria-hidden="true">
                <path d="m15 18-6-6 6-6"></path>
              </svg>
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Page 1 of 20</span>
            <button className="p-1 rounded text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
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
