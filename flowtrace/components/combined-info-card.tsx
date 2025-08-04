"use client"

import { Shield, AlertTriangle, Bitcoin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

export function CombinedInfoCard() {
  const riskScore = 85
  const riskColor = riskScore > 70 ? "bg-red-500" : riskScore > 40 ? "bg-yellow-500" : "bg-green-500"

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm">
      {/* Blockchain Section */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Shield className="w-5 h-5 text-orange-500 mr-2" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Blockchain</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Network</span>
            <div className="flex items-center">
              <Bitcoin className="w-4 h-4 text-orange-500 mr-1" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Bitcoin</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">BTC Balance</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">0.19863498 BTC</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">USD Value</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">$8,541.304</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Transactions</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">464</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Risk Score</span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">50/100</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 mb-6"></div>

      {/* Risk Assessment Section */}
      <div>
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Risk Assessment</h3>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Risk Score</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{riskScore}/100</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${riskColor}`}
                style={{ width: `${riskScore}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Target Status</span>
            <Badge className="bg-red-500 text-white px-3 py-1 rounded-full text-xs">
              Compromised
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
} 