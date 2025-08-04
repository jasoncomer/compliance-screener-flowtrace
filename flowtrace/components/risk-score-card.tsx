"use client"

import { useState } from "react"
import { Shield, User, TrendingUp, Globe, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface RiskScoreCardProps {
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
}

type RiskTabType = "entity" | "transaction" | "jurisdiction"

export function RiskScoreCard({ selectedNode }: RiskScoreCardProps) {
  const [activeTab, setActiveTab] = useState<RiskTabType>("entity")
  const [isOpen, setIsOpen] = useState(false)

  // Get risk scores based on selected node
  const getRiskScores = () => {
    if (!selectedNode) {
      return {
        overall: 25,
        transaction: 30,
        entity: 11,
        jurisdiction: 36
      }
    }

    // Node-specific risk scores
    switch (selectedNode.type?.toLowerCase()) {
      case 'hacker':
        return {
          overall: 85,
          transaction: 90,
          entity: 95,
          jurisdiction: 75
        }
      case 'mixer':
        return {
          overall: 75,
          transaction: 80,
          entity: 70,
          jurisdiction: 85
        }
      case 'exchange':
        return {
          overall: 25,
          transaction: 30,
          entity: 11,
          jurisdiction: 36
        }
      case 'target':
        return {
          overall: 65,
          transaction: 70,
          entity: 60,
          jurisdiction: 55
        }
      default:
        return {
          overall: 45,
          transaction: 50,
          entity: 40,
          jurisdiction: 55
        }
    }
  }

  // Get risk factors data based on selected node and tab
  const getRiskFactors = (tabType: RiskTabType) => {
    if (!selectedNode) {
      return []
    }

    switch (tabType) {
      case "entity":
        switch (selectedNode.type?.toLowerCase()) {
          case 'hacker':
            return [
              { factor: "entity-type", score: 95, description: "High risk entity type: confirmed hacker wallet", icon: "danger" },
              { factor: "kyc", score: 0, description: "No KYC requirements for this entity", icon: "danger" },
              { factor: "age", score: 85, description: "Newly created wallet (2 days old)", icon: "warning" },
              { factor: "reputation", score: 90, description: "Associated with multiple exchange hacks", icon: "danger" },
              { factor: "activity", score: 88, description: "High volume of suspicious transactions", icon: "danger" }
            ]
          case 'mixer':
            return [
              { factor: "entity-type", score: 70, description: "Privacy-focused mixer service", icon: "warning" },
              { factor: "kyc", score: 0, description: "No KYC requirements for privacy services", icon: "warning" },
              { factor: "regulation", score: 85, description: "Operating in unregulated jurisdiction", icon: "danger" },
              { factor: "transparency", score: 75, description: "Limited transaction transparency", icon: "warning" },
              { factor: "volume", score: 80, description: "High transaction volume for privacy", icon: "warning" }
            ]
          case 'exchange':
            return [
              { factor: "entity-type", score: 15, description: "Regulated centralized exchange", icon: "safe" },
              { factor: "kyc", score: 0, description: "Full KYC compliance requirements", icon: "safe" },
              { factor: "licensing", score: 10, description: "Licensed in multiple jurisdictions", icon: "safe" },
              { factor: "audit", score: 5, description: "Regular third-party audits", icon: "safe" },
              { factor: "insurance", score: 8, description: "Customer funds insured", icon: "safe" }
            ]
          case 'target':
            return [
              { factor: "entity-type", score: 60, description: "Compromised target wallet", icon: "warning" },
              { factor: "kyc", score: 0, description: "No KYC for personal wallet", icon: "neutral" },
              { factor: "compromise", score: 85, description: "Confirmed security breach", icon: "danger" },
              { factor: "funds", score: 70, description: "Significant funds at risk", icon: "warning" },
              { factor: "recovery", score: 45, description: "Limited recovery options", icon: "warning" }
            ]
          default:
            return [
              { factor: "entity-type", score: 40, description: "Unknown entity type", icon: "neutral" },
              { factor: "kyc", score: 0, description: "No KYC information available", icon: "neutral" }
            ]
        }
      case "transaction":
        switch (selectedNode.type?.toLowerCase()) {
          case 'hacker':
            return [
              { factor: "mixer-usage", score: 95, description: "Extensive use of privacy mixers", icon: "danger" },
              { factor: "velocity", score: 90, description: "High transaction velocity", icon: "danger" },
              { factor: "amounts", score: 88, description: "Large transaction amounts", icon: "danger" },
              { factor: "patterns", score: 92, description: "Suspicious transaction patterns", icon: "danger" },
              { factor: "destinations", score: 85, description: "Multiple suspicious destinations", icon: "danger" }
            ]
          case 'mixer':
            return [
              { factor: "privacy-level", score: 80, description: "Maximum privacy protocols active", icon: "warning" },
              { factor: "volume", score: 75, description: "High transaction volume", icon: "warning" },
              { factor: "sources", score: 70, description: "Multiple input sources", icon: "warning" },
              { factor: "outputs", score: 85, description: "Fragmented output distribution", icon: "warning" },
              { factor: "timing", score: 65, description: "Irregular transaction timing", icon: "warning" }
            ]
          case 'exchange':
            return [
              { factor: "compliance", score: 15, description: "Full regulatory compliance", icon: "safe" },
              { factor: "reporting", score: 10, description: "Regular transaction reporting", icon: "safe" },
              { factor: "limits", score: 20, description: "Reasonable transaction limits", icon: "safe" },
              { factor: "monitoring", score: 5, description: "Active transaction monitoring", icon: "safe" },
              { factor: "documentation", score: 12, description: "Complete transaction documentation", icon: "safe" }
            ]
          case 'target':
            return [
              { factor: "drain-amount", score: 85, description: "Large fund drainage detected", icon: "danger" },
              { factor: "frequency", score: 70, description: "Unusual transaction frequency", icon: "warning" },
              { factor: "destinations", score: 75, description: "Suspicious destination addresses", icon: "warning" },
              { factor: "patterns", score: 80, description: "Abnormal transaction patterns", icon: "danger" },
              { factor: "recovery", score: 45, description: "Limited recovery transactions", icon: "warning" }
            ]
          default:
            return [
              { factor: "volume", score: 50, description: "Moderate transaction volume", icon: "neutral" },
              { factor: "patterns", score: 45, description: "Standard transaction patterns", icon: "neutral" }
            ]
        }
      case "jurisdiction":
        switch (selectedNode.type?.toLowerCase()) {
          case 'hacker':
            return [
              { factor: "sanctions", score: 90, description: "Operating from sanctioned region", icon: "danger" },
              { factor: "regulation", score: 85, description: "Minimal regulatory oversight", icon: "danger" },
              { factor: "enforcement", score: 80, description: "Weak law enforcement cooperation", icon: "danger" },
              { factor: "extradition", score: 75, description: "No extradition agreements", icon: "warning" },
              { factor: "monitoring", score: 70, description: "Limited financial monitoring", icon: "warning" }
            ]
          case 'mixer':
            return [
              { factor: "privacy-laws", score: 85, description: "Strong privacy protection laws", icon: "warning" },
              { factor: "regulation", score: 80, description: "Limited cryptocurrency regulation", icon: "warning" },
              { factor: "enforcement", score: 75, description: "Minimal regulatory enforcement", icon: "warning" },
              { factor: "transparency", score: 70, description: "Low transparency requirements", icon: "warning" },
              { factor: "cooperation", score: 65, description: "Limited international cooperation", icon: "warning" }
            ]
          case 'exchange':
            return [
              { factor: "regulation", score: 15, description: "Strong regulatory framework", icon: "safe" },
              { factor: "compliance", score: 10, description: "Active compliance monitoring", icon: "safe" },
              { factor: "licensing", score: 8, description: "Multiple jurisdiction licenses", icon: "safe" },
              { factor: "cooperation", score: 12, description: "Strong law enforcement cooperation", icon: "safe" },
              { factor: "transparency", score: 5, description: "High transparency requirements", icon: "safe" }
            ]
          case 'target':
            return [
              { factor: "regulation", score: 55, description: "Moderate regulatory environment", icon: "neutral" },
              { factor: "protection", score: 60, description: "Limited consumer protection", icon: "warning" },
              { factor: "enforcement", score: 50, description: "Standard law enforcement", icon: "neutral" },
              { factor: "recovery", score: 45, description: "Limited recovery mechanisms", icon: "warning" },
              { factor: "monitoring", score: 40, description: "Basic financial monitoring", icon: "neutral" }
            ]
          default:
            return [
              { factor: "regulation", score: 50, description: "Standard regulatory environment", icon: "neutral" },
              { factor: "compliance", score: 45, description: "Basic compliance requirements", icon: "neutral" }
            ]
        }
    }
  }

  const riskScores = getRiskScores()

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-600 dark:text-red-400"
    if (score >= 60) return "text-orange-600 dark:text-orange-400"
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400"
    return "text-green-600 dark:text-green-400"
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-red-500"
    if (score >= 60) return "bg-orange-500"
    if (score >= 40) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getIconColor = (iconType: string) => {
    switch (iconType) {
      case "danger":
        return "text-red-600 dark:text-red-400"
      case "warning":
        return "text-orange-600 dark:text-orange-400"
      case "safe":
        return "text-green-600 dark:text-green-400"
      case "neutral":
        return "text-gray-600 dark:text-gray-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Shield className="h-4 w-4 mr-2" />
          View Risk Analysis
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            Risk Score Analysis
          </DialogTitle>
          <DialogDescription>
            Comprehensive risk analysis based on transaction patterns, entity associations, and jurisdictional factors.
          </DialogDescription>
        </DialogHeader>
        
        <div className="rounded-2xl border p-6 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
          <div className="w-full h-full flex flex-col">
            {/* Address */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Address: </span>
              <code className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                {selectedNode?.address || "1AFzatqpcum3x3h4oCPLz9YX7hRHpivhQa"}
              </code>
            </div>

            {/* Risk Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="mb-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Overall Risk</div>
                  <div className={`text-2xl font-bold ${getRiskColor(riskScores.overall)}`}>
                    {riskScores.overall}
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getProgressColor(riskScores.overall)}`}
                    style={{ width: `${riskScores.overall}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{riskScores.overall}%</div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="mb-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Transaction Risk</div>
                  <div className={`text-2xl font-bold ${getRiskColor(riskScores.transaction)}`}>
                    {riskScores.transaction}
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getProgressColor(riskScores.transaction)}`}
                    style={{ width: `${riskScores.transaction}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{riskScores.transaction}%</div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="mb-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Entity Risk</div>
                  <div className={`text-2xl font-bold ${getRiskColor(riskScores.entity)}`}>
                    {riskScores.entity}
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getProgressColor(riskScores.entity)}`}
                    style={{ width: `${riskScores.entity}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{riskScores.entity}%</div>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="mb-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Jurisdiction Risk</div>
                  <div className={`text-2xl font-bold ${getRiskColor(riskScores.jurisdiction)}`}>
                    {riskScores.jurisdiction}
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getProgressColor(riskScores.jurisdiction)}`}
                    style={{ width: `${riskScores.jurisdiction}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{riskScores.jurisdiction}%</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab("entity")}
                    className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === "entity"
                        ? "text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400"
                        : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                    }`}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Entity Risk Factors
                  </button>
                  <button
                    onClick={() => setActiveTab("transaction")}
                    className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === "transaction"
                        ? "text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400"
                        : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Transaction Risk Factors
                  </button>
                  <button
                    onClick={() => setActiveTab("jurisdiction")}
                    className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === "jurisdiction"
                        ? "text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400"
                        : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                    }`}
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Jurisdiction Risk Factors
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Risk Factor</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Risk Score</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getRiskFactors(activeTab).map((factor, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-3 px-2">
                          <div className="flex items-center">
                            <Shield className={`w-4 h-4 mr-2 ${getIconColor(factor.icon)}`} />
                            <span className="text-sm text-gray-900 dark:text-gray-100">{factor.factor}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${getProgressColor(factor.score)}`}
                              style={{ width: `${factor.score}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{factor.score}%</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {factor.description}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {getRiskFactors(activeTab).length === 0 && (
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <td colSpan={3} className="py-8 text-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedNode ? 'No risk factors found for this node' : 'Select a node to view risk factors'}
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
      </DialogContent>
    </Dialog>
  )
}
