"use client"

import { useState, useEffect } from "react"
import { fetchRiskScoringData } from '@/lib/api'
import { Shield, AlertTriangle, Copy, ExternalLink, AlertCircle, Zap, Edit3, Save, X, Info, ArrowRight, RotateCcw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"

interface EntityPanelProps {
  address: string
  selectedNode?: {
    id: string
    label: string
    logo?: string
    chainLogo?: string
    sourceChain?: string
    destinationChain?: string
    type: string
    risk: string
    balance?: string
    transactions?: number
    availableTransactions?: number
    address?: string
    isUserDefinedLabel?: boolean
    originalLabel?: string
    entity_type?: string
    entity_tags?: string[]
    notes?: Array<{
      id: string
      userId: string
      userName: string
      content: string
      timestamp: string
    }>
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
  onConnectNode?: (nodeId: string) => void
  availableNodes?: Array<{ id: string; label: string; type: string }>
  onAddNote?: (nodeId: string, content: string) => void
  onUpdateNodeLabel?: (nodeId: string, newLabel: string) => void
  onRevertNodeLabel?: (nodeId: string) => void
}

interface SecurityEvent {
  id: string
  type: "compromise" | "drain" | "suspicious" | "alert" | "transaction"
  message: string
  timeAgo: string
  severity: "high" | "medium" | "low"
  details?: string
}

const mockSecurityEvents: SecurityEvent[] = [
  {
    id: "1",
    type: "compromise",
    message: "Compromise detected",
    timeAgo: "2 hours ago",
    severity: "high",
    details: "Suspicious login attempt from unknown IP"
  },
  {
    id: "2",
    type: "drain",
    message: "Funds drained",
    timeAgo: "6 hours ago",
    severity: "high",
    details: "0.19863498 BTC transferred to suspicious address"
  },
  {
    id: "3",
    type: "suspicious",
    message: "Suspicious activity detected",
    timeAgo: "1 day ago",
    severity: "medium",
    details: "Multiple failed login attempts"
  },
  {
    id: "4",
    type: "transaction",
    message: "Large transaction detected",
    timeAgo: "2 days ago",
    severity: "medium",
    details: "0.5 BTC transferred to mixer service"
  },
  {
    id: "5",
    type: "alert",
    message: "Risk score increased",
    timeAgo: "3 days ago",
    severity: "low",
    details: "Risk score changed from 45 to 85"
  }
]

// Node-specific transaction data
const getNodeSpecificEvents = (nodeType?: string): SecurityEvent[] => {
  switch (nodeType?.toLowerCase()) {
    case 'hacker':
      return [
        {
          id: "h1",
          type: "drain",
          message: "Large outflow detected",
          timeAgo: "2 hours ago",
          severity: "high",
          details: "8.68 BTC transferred to mixer service"
        },
        {
          id: "h2",
          type: "compromise",
          message: "Exchange hack confirmed",
          timeAgo: "6 hours ago",
          severity: "high",
          details: "Multiple exchange accounts compromised"
        },
        {
          id: "h3",
          type: "suspicious",
          message: "Phishing campaign detected",
          timeAgo: "1 day ago",
          severity: "high",
          details: "Targeting multiple exchange users"
        }
      ]
    case 'mixer':
      return [
        {
          id: "m1",
          type: "transaction",
          message: "Mixer interaction",
          timeAgo: "2 hours ago",
          severity: "medium",
          details: "Privacy protocol active"
        },
        {
          id: "m2",
          type: "suspicious",
          message: "Privacy protocol active",
          timeAgo: "6 hours ago",
          severity: "medium",
          details: "Multiple inputs detected"
        },
        {
          id: "m3",
          type: "alert",
          message: "High volume activity",
          timeAgo: "1 day ago",
          severity: "medium",
          details: "Unusual transaction patterns"
        }
      ]
    case 'exchange':
      return [
        {
          id: "e1",
          type: "transaction",
          message: "Exchange deposit",
          timeAgo: "1 day ago",
          severity: "low",
          details: "Normal trading activity"
        },
        {
          id: "e2",
          type: "alert",
          message: "KYC verification",
          timeAgo: "2 days ago",
          severity: "low",
          details: "User verification completed"
        },
        {
          id: "e3",
          type: "transaction",
          message: "Withdrawal processed",
          timeAgo: "3 days ago",
          severity: "low",
          details: "Standard withdrawal flow"
        }
      ]
    case 'target':
      return [
        {
          id: "t1",
          type: "compromise",
          message: "Compromise detected",
          timeAgo: "2 hours ago",
          severity: "high",
          details: "Unauthorized access confirmed"
        },
        {
          id: "t2",
          type: "drain",
          message: "Funds drained",
          timeAgo: "6 hours ago",
          severity: "high",
          details: "0.19863498 BTC transferred to suspicious address"
        },
        {
          id: "t3",
          type: "suspicious",
          message: "Suspicious login attempts",
          timeAgo: "1 day ago",
          severity: "medium",
          details: "Multiple failed authentication attempts"
        }
      ]
    default:
      return [
        {
          id: "d1",
          type: "alert",
          message: "No activity data",
          timeAgo: "Unknown",
          severity: "low",
          details: "Select a node to view activity"
        }
      ]
  }
}

type FilterType = "all" | "high" | "medium" | "low"

export function EntityPanel({ address, selectedNode, connections, onConnectNode, availableNodes, onAddNote, onUpdateNodeLabel, onRevertNodeLabel }: EntityPanelProps) {
  // Debug logging for transaction count issue
  useEffect(() => {
    if (selectedNode) {
      console.log('EntityPanel received selectedNode:', {
        id: selectedNode.id,
        address: selectedNode.address,
        transactions: selectedNode.transactions,
        availableTransactions: selectedNode.availableTransactions,
        balance: selectedNode.balance,
        type: selectedNode.type
      });
    }
  }, [selectedNode]);

  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Debug logging removed - infinite loop fixed
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false)
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editedLabel, setEditedLabel] = useState(selectedNode?.label || "")
  const [riskData, setRiskData] = useState<any>(null)
  const [isLoadingRiskData, setIsLoadingRiskData] = useState(false)
  const [activeRiskTab, setActiveRiskTab] = useState<'entity' | 'transaction' | 'jurisdiction'>('entity')

  // Update notes when selectedNode changes
  useEffect(() => {
    setNewNote("")
    setIsAddingNote(false)
    setEditedLabel(selectedNode?.label || "")
    setIsEditingLabel(false)
    
    // Fetch risk data when node is selected
    if (selectedNode?.address) {
      fetchRiskData()
    }
  }, [selectedNode?.id])

  // Fetch risk data when modal opens
  const fetchRiskData = async () => {
    if (!selectedNode?.address) return
    
    setIsLoadingRiskData(true)
    try {
      const response = await fetchRiskScoringData(selectedNode.address, 'address')
      if (response?.success && response?.data) {
        setRiskData(response.data)
        console.log('Risk data loaded:', response.data)
      } else {
        // Fallback to mock data for demo
        setRiskData({
          overallRisk: 0.85,
          entityRisk: {
            aggregateScore: 0.95,
            factors: [
              {
                id: 'entity-type',
                score: 0.95,
                severity: 'high',
                description: 'High risk entity type: confirmed hacker wallet',
                entityType: 'hacker'
              },
              {
                id: 'kyc',
                score: 0.0,
                severity: 'low',
                description: 'No KYC requirements for this entity',
                entityType: 'unknown'
              },
              {
                id: 'age',
                score: 0.85,
                severity: 'high',
                description: 'Newly created wallet (2 days old)',
                entityType: 'unknown'
              },
              {
                id: 'reputation',
                score: 0.90,
                severity: 'high',
                description: 'Associated with multiple exchange hacks',
                entityType: 'unknown'
              },
              {
                id: 'activity',
                score: 0.88,
                severity: 'high',
                description: 'High volume of suspicious transactions',
                entityType: 'unknown'
              }
            ]
          },
          transactionRisk: {
            aggregateScore: 0.90,
            factors: [
              {
                id: 'volume',
                score: 0.85,
                severity: 'high',
                description: 'Unusually high transaction volume',
                type: 'amount'
              },
              {
                id: 'pattern',
                score: 0.92,
                severity: 'high',
                description: 'Suspicious transaction patterns detected',
                type: 'pattern'
              },
              {
                id: 'timing',
                score: 0.78,
                severity: 'high',
                description: 'Irregular transaction timing',
                type: 'timing'
              }
            ]
          },
          jurisdictionRisk: {
            aggregateScore: 0.75,
            factors: [
              {
                id: 'country-risk',
                score: 0.75,
                severity: 'medium',
                description: 'High-risk jurisdiction identified',
                countries: ['Unknown']
              }
            ]
          }
        })
      }
    } catch (error) {
      console.error('Error fetching risk data:', error)
      // Use fallback data
      setRiskData({
        overallRisk: 0.85,
        entityRisk: { aggregateScore: 0.95, factors: [] },
        transactionRisk: { aggregateScore: 0.90, factors: [] },
        jurisdictionRisk: { aggregateScore: 0.75, factors: [] }
      })
    } finally {
      setIsLoadingRiskData(false)
    }
  }

  // Helper function to get risk color
  const getRiskColor = (score: number) => {
    if (score >= 0.7) return 'text-red-600 dark:text-red-400'
    if (score >= 0.4) return 'text-orange-600 dark:text-orange-400'
    return 'text-green-600 dark:text-green-400'
  }

  // Helper function to get risk bar color
  const getRiskBarColor = (score: number) => {
    if (score >= 0.7) return 'bg-red-500'
    if (score >= 0.4) return 'bg-orange-500'
    return 'bg-green-500'
  }

  // Helper function to get risk severity
  const getRiskSeverity = (score: number) => {
    if (score >= 0.7) return 'high'
    if (score >= 0.4) return 'medium'
    return 'low'
  }

  // Helper function to get risk badge variant
  const getRiskBadgeVariant = (risk?: string) => {
    switch (risk?.toLowerCase()) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'default'
      default: return 'outline'
    }
  }

  // Helper function to get tag colors
  const getTagColor = (tag: string) => {
    const tagLower = tag.toLowerCase()
    
    // Define color schemes for different tag categories
    const tagColors: Record<string, string> = {
      // Technology/Platform tags
      'bitcoin': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-700',
      'ethereum': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-300 dark:border-purple-700',
      'defi': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700',
      'nft': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400 border-pink-300 dark:border-pink-700',
      'dao': 'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-400 border-violet-300 dark:border-violet-700',
      'layer2': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700',
      'smart contract': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700',
      
      // Risk/Security tags
      'high risk': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700',
      'medium risk': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
      'low risk': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700',
      'sanctioned': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700',
      'ofac': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700',
      'suspicious': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-700',
      
      // Business/Service tags
      'exchange': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700',
      'wallet': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700',
      'custodial': 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400 border-teal-300 dark:border-teal-700',
      'non-custodial': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700',
      'lending': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-300 dark:border-cyan-700',
      'staking': 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-400 border-lime-300 dark:border-lime-700',
      'yield': 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-400 border-lime-300 dark:border-lime-700',
      
      // Geographic tags
      'us': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700',
      'europe': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700',
      'asia': 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border-amber-300 dark:border-amber-700',
      'china': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700',
      'singapore': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700',
      'switzerland': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700',
      
      // Regulatory/Compliance tags
      'regulated': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700',
      'unregulated': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-700',
      'kyc': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700',
      'aml': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700',
      'licensed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700',
      
      // Activity tags
      'trading': 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border-amber-300 dark:border-amber-700',
      'mining': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600',
      'gaming': 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400 border-pink-300 dark:border-pink-700',
      'gambling': 'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400 border-rose-300 dark:border-rose-700',
      'payments': 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400 border-teal-300 dark:border-teal-700',
      'remittance': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-300 dark:border-cyan-700',
      
      // Status tags
      'active': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700',
      'inactive': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
      'suspended': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700',
      'defunct': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
      'dead': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600',
      
      // Size/Scale tags
      'large': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-300 dark:border-purple-700',
      'medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700',
      'small': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700',
      'startup': 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-400 border-lime-300 dark:border-lime-700',
      'enterprise': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700',
    }
    
    // Check for exact matches first
    if (tagColors[tagLower]) {
      return tagColors[tagLower]
    }
    
    // Check for partial matches
    for (const [key, color] of Object.entries(tagColors)) {
      if (tagLower.includes(key) || key.includes(tagLower)) {
        return color
      }
    }
    
    // Default color for unmatched tags
    return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600'
  }

  // Helper function to get type badge with colors
  const getTypeBadge = (type?: string) => {
    if (!type) return { text: 'Unknown', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600' }
    
    const lowerType = type.toLowerCase()
    
    // Handle basic node types
    switch (lowerType) {
      case 'target': return { text: 'Target', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'exchange': return { text: 'Exchange', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700' }
      case 'hacker': return { text: 'Hacker', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'mixer': return { text: 'Mixer', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-700' }
      case 'service': return { text: 'Service', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-300 dark:border-purple-700' }
      case 'defi': return { text: 'DeFi', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' }
      case 'wallet': return { text: 'Wallet', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700' }
      case 'passthrough': return { text: 'Pass-through', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600' }
      case 'bridge': return { text: 'Bridge', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700' }
      case 'custom': return { text: 'Custom', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400 border-teal-300 dark:border-teal-700' }
    }
    
    // Handle SOT entity_type values with semantic colors
    switch (lowerType) {
      // Exchanges - Blue theme
      case 'centralized exchange': return { text: 'Centralized Exchange', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700' }
      case 'dex': return { text: 'DEX', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-300 dark:border-cyan-700' }
      
      // Wallets - Green theme
      case 'custodial wallet': return { text: 'Custodial Wallet', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700' }
      case 'non custodial wallets': return { text: 'Non-Custodial Wallet', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' }
      
      // DeFi - Emerald theme
      case 'amm': return { text: 'AMM', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' }
      case 'lending': return { text: 'Lending', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400 border-teal-300 dark:border-teal-700' }
      case 'staking': return { text: 'Staking', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-300 dark:border-cyan-700' }
      case 'yield': return { text: 'Yield', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-400 border-lime-300 dark:border-lime-700' }
      case 'yeild': return { text: 'Yield', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-400 border-lime-300 dark:border-lime-700' }
      case 'governance': return { text: 'Governance', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-400 border-violet-300 dark:border-violet-700' }
      case 'dao': return { text: 'DAO', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-300 dark:border-purple-700' }
      
      // Infrastructure - Indigo theme
      case 'blockchain infrastructure': return { text: 'Blockchain Infrastructure', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700' }
      case 'layer 1': return { text: 'Layer 1', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700' }
      case 'layer 2': return { text: 'Layer 2', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700' }
      case 'smart contract platform': return { text: 'Smart Contract Platform', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-400 border-violet-300 dark:border-violet-700' }
      case 'bridge': return { text: 'Bridge', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700' }
      case 'cross chain': return { text: 'Cross Chain', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700' }
      
      // Services - Purple theme
      case 'services': return { text: 'Services', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-300 dark:border-purple-700' }
      case 'hosting': return { text: 'Hosting', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-300 dark:border-purple-700' }
      case 'cloud services': return { text: 'Cloud Services', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-400 border-violet-300 dark:border-violet-700' }
      case 'escrow': return { text: 'Escrow', color: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/20 dark:text-fuchsia-400 border-fuchsia-300 dark:border-fuchsia-700' }
      case 'custodian': return { text: 'Custodian', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-300 dark:border-purple-700' }
      case 'trustee': return { text: 'Trustee', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-400 border-violet-300 dark:border-violet-700' }
      case 'vault': return { text: 'Vault', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-300 dark:border-purple-700' }
      case 'whitelabel service': return { text: 'White Label Service', color: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/20 dark:text-fuchsia-400 border-fuchsia-300 dark:border-fuchsia-700' }
      
      // Trading & Finance - Orange/Yellow theme
      case 'derivatives': return { text: 'Derivatives', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-700' }
      case 'perpetual futures': return { text: 'Perpetual Futures', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border-amber-300 dark:border-amber-700' }
      case 'options': return { text: 'Options', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700' }
      case 'copy trading': return { text: 'Copy Trading', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-700' }
      case 'trading bot': return { text: 'Trading Bot', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border-amber-300 dark:border-amber-700' }
      case 'mev bot': return { text: 'MEV Bot', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700' }
      case 'forex': return { text: 'Forex', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-700' }
      case 'fund': return { text: 'Fund', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border-amber-300 dark:border-amber-700' }
      case 'venture capital': return { text: 'Venture Capital', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700' }
      case 'retirement accounts': return { text: 'Retirement Accounts', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-700' }
      
      // Payments & Ramp - Teal theme
      case 'payments': return { text: 'Payments', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400 border-teal-300 dark:border-teal-700' }
      case 'remittance': return { text: 'Remittance', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-300 dark:border-cyan-700' }
      case 'general fiat ramp': return { text: 'Fiat Ramp', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400 border-teal-300 dark:border-teal-700' }
      case 'atm': return { text: 'ATM', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-300 dark:border-cyan-700' }
      case 'changer': return { text: 'Changer', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400 border-teal-300 dark:border-teal-700' }
      case 'gateway': return { text: 'Gateway', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400 border-cyan-300 dark:border-cyan-700' }
      
      // Gaming & Gambling - Pink theme
      case 'gaming': return { text: 'Gaming', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400 border-pink-300 dark:border-pink-700' }
      case 'gambling': return { text: 'Gambling', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400 border-rose-300 dark:border-rose-700' }
      case 'nft': return { text: 'NFT', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400 border-pink-300 dark:border-pink-700' }
      case 'marketplace': return { text: 'Marketplace', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400 border-rose-300 dark:border-rose-700' }
      case 'brc marketplace': return { text: 'BRC Marketplace', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400 border-pink-300 dark:border-pink-700' }
      case 'opensea profile': return { text: 'OpenSea Profile', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400 border-rose-300 dark:border-rose-700' }
      
      // Mining - Slate theme
      case 'mining': return { text: 'Mining', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600' }
      case 'miner': return { text: 'Miner', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600' }
      case 'mining pool': return { text: 'Mining Pool', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600' }
      
      // Tokens & Assets - Lime theme
      case 'token issuer': return { text: 'Token Issuer', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-400 border-lime-300 dark:border-lime-700' }
      case 'ico': return { text: 'ICO', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-400 border-lime-300 dark:border-lime-700' }
      case 'launchpad': return { text: 'Launchpad', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700' }
      case 'airdrop': return { text: 'Airdrop', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-400 border-lime-300 dark:border-lime-700' }
      case 'faucet': return { text: 'Faucet', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700' }
      case 'ordinals': return { text: 'Ordinals', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-400 border-lime-300 dark:border-lime-700' }
      case 'runes': return { text: 'Runes', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700' }
      case 'real world assets': return { text: 'Real World Assets', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-400 border-lime-300 dark:border-lime-700' }
      case 'wrapped coin reserves': return { text: 'Wrapped Coin Reserves', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700' }
      
      // Profiles & Social - Sky theme
      case 'individual person': return { text: 'Individual', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400 border-sky-300 dark:border-sky-700' }
      case 'bitcointalk profile': return { text: 'BitcoinTalk Profile', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400 border-sky-300 dark:border-sky-700' }
      case 'reddit profile': return { text: 'Reddit Profile', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400 border-sky-300 dark:border-sky-700' }
      case 'telegram profile': return { text: 'Telegram Profile', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400 border-sky-300 dark:border-sky-700' }
      case 'twitter profile': return { text: 'Twitter Profile', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400 border-sky-300 dark:border-sky-700' }
      case 'darknet forum profile': return { text: 'Darknet Forum Profile', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600' }
      case 'other profile': return { text: 'Other Profile', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400 border-sky-300 dark:border-sky-700' }
      
      // Government & Legal - Red theme (high risk)
      case 'government': return { text: 'Government', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'ofac sanctioned': return { text: 'OFAC Sanctioned', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'seized funds': return { text: 'Seized Funds', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      
      // Donations - Neutral theme
      case 'adult site donation': return { text: 'Adult Site Donation', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'blog donation': return { text: 'Blog Donation', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'candidate donations': return { text: 'Candidate Donations', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'darknet donations': return { text: 'Darknet Donations', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600' }
      case 'darknet cannabis': return { text: 'Darknet Cannabis', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600' }
      case 'extremist donation': return { text: 'Extremist Donation', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'forum donation': return { text: 'Forum Donation', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'government donation': return { text: 'Government Donation', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'news donation': return { text: 'News Donation', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'non - government donation': return { text: 'Non-Government Donation', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'other donations': return { text: 'Other Donations', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'prisoner donations': return { text: 'Prisoner Donations', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'religous donation': return { text: 'Religious Donation', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      
      // Illicit Activities - Red/Orange theme (high risk)
      case 'adult content': return { text: 'Adult Content', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'bio weapons': return { text: 'Bio Weapons', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'carding': return { text: 'Carding', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'cocaine': return { text: 'Cocaine', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'counterfeit documents': return { text: 'Counterfeit Documents', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'counterfeit money': return { text: 'Counterfeit Money', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'csam': return { text: 'CSAM', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'cybercrime': return { text: 'Cybercrime', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'cybercrime victim': return { text: 'Cybercrime Victim', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-700' }
      case 'darknet': return { text: 'Darknet', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'drugs': return { text: 'Drugs', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'fake identification': return { text: 'Fake Identification', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'file sharing': return { text: 'File Sharing', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-700' }
      case 'ghost guns': return { text: 'Ghost Guns', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'military grade weapons': return { text: 'Military Grade Weapons', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'murder for hire': return { text: 'Murder for Hire', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'opioids': return { text: 'Opioids', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'pharmacuticals': return { text: 'Pharmaceuticals', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-700' }
      case 'precursor research chemicals': return { text: 'Precursor Research Chemicals', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'scam': return { text: 'Scam', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'spam': return { text: 'Spam', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-700' }
      case 'terrorism': return { text: 'Terrorism', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'weapons': return { text: 'Weapons', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' }
      case 'whitehat hacking': return { text: 'Whitehat Hacking', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700' }
      
      // Other Categories - Neutral theme
      case 'advertising': return { text: 'Advertising', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'affiliate program': return { text: 'Affiliate Program', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'artificial intelligence': return { text: 'AI', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'coinjoin address': return { text: 'CoinJoin Address', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600' }
      case 'debit card': return { text: 'Debit Card', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'etf': return { text: 'ETF', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'gift cards': return { text: 'Gift Cards', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'insurance': return { text: 'Insurance', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'key personnel': return { text: 'Key Personnel', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'real estate services': return { text: 'Real Estate Services', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'records management': return { text: 'Records Management', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'retailer': return { text: 'Retailer', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'smart money': return { text: 'Smart Money', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'software': return { text: 'Software', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'other app': return { text: 'Other App', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'other': return { text: 'Other', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
      case 'p2p service': return { text: 'P2P Service', color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' }
    }
    
    // For any unmatched values, capitalize the first letter and return with neutral color
    return { 
      text: type.charAt(0).toUpperCase() + type.slice(1), 
      color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600' 
    }
  }

  // Get transactions for the selected node
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
    if (activeFilter === "high" && tx.direction === "out") return true
    if (activeFilter === "medium" && tx.direction === "in") return true
    return false
  })

  const nodeEvents = getNodeSpecificEvents(selectedNode?.type)
  const filteredEvents = nodeEvents.filter(event => {
    if (activeFilter === "all") return true
    return event.severity === activeFilter
  })

  const getSeverityIcon = (severity: "high" | "medium" | "low") => {
    switch (severity) {
      case "high":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case "medium":
        return <Shield className="w-4 h-4 text-yellow-500" />
      case "low":
        return <Zap className="w-4 h-4 text-blue-500" />
    }
  }

  const getSeverityBadge = (severity: "high" | "medium" | "low") => {
    const colors = {
      high: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      low: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    }
    
    return (
      <Badge className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[severity]}`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Entity Header */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-start space-x-3">
            <Avatar className={`h-12 w-12 ${
              selectedNode?.type === 'exchange' ? 'bg-blue-500' :
              selectedNode?.type === 'mixer' ? 'bg-red-500' :
              selectedNode?.type === 'defi' ? 'bg-purple-500' :
              selectedNode?.type === 'service' ? 'bg-orange-500' :
              selectedNode?.type === 'wallet' ? 'bg-green-500' :
              'bg-gray-500'
            }`}>
              {selectedNode?.logo ? (
                <AvatarImage src={selectedNode.logo || "/placeholder.svg"} alt={selectedNode.label} />
              ) : (
                <AvatarFallback className="text-white">
                  <Shield className="h-6 w-6" />
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
                             <div className="flex items-center">
                 {isEditingLabel ? (
                   <div className="flex items-center w-full">
                     <Input
                       value={editedLabel}
                       onChange={(e) => setEditedLabel(e.target.value)}
                       onBlur={() => {
                         if (editedLabel.trim() && selectedNode?.id && onUpdateNodeLabel) {
                           onUpdateNodeLabel(selectedNode.id, editedLabel.trim());
                           setIsEditingLabel(false);
                         } else {
                           setEditedLabel(selectedNode?.label || "");
                           setIsEditingLabel(false);
                         }
                       }}
                       onKeyDown={(e) => {
                         if (e.key === "Enter") {
                           if (editedLabel.trim() && selectedNode?.id && onUpdateNodeLabel) {
                             onUpdateNodeLabel(selectedNode.id, editedLabel.trim());
                             setIsEditingLabel(false);
                           } else {
                             setEditedLabel(selectedNode?.label || "");
                             setIsEditingLabel(false);
                           }
                         } else if (e.key === "Escape") {
                           setEditedLabel(selectedNode?.label || "");
                           setIsEditingLabel(false);
                         }
                       }}
                       className="w-full"
                       autoFocus
                     />
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => {
                         if (editedLabel.trim() && selectedNode?.id && onUpdateNodeLabel) {
                           onUpdateNodeLabel(selectedNode.id, editedLabel.trim());
                         }
                         setIsEditingLabel(false);
                       }}
                       className="ml-2 h-8 w-8 p-0"
                     >
                       <Save className="h-4 w-4" />
                     </Button>
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => {
                         setEditedLabel(selectedNode?.label || "");
                         setIsEditingLabel(false);
                       }}
                       className="ml-1 h-8 w-8 p-0"
                     >
                       <X className="h-4 w-4" />
                     </Button>
                   </div>
                ) : (
                                     <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <div className="flex items-center">
                           <span 
                             className="text-foreground text-lg font-semibold truncate max-w-[150px] sm:max-w-none cursor-pointer"
                             onClick={() => setIsEditingLabel(true)}
                           >
                             {selectedNode?.label || "Unknown Entity"}
                           </span>
                           {selectedNode?.isUserDefinedLabel && (
                             <Badge variant="outline" className="ml-2 text-xs px-1.5 py-0.5 border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20">
                               Custom
                             </Badge>
                           )}
                         </div>
                       </TooltipTrigger>
                                                <TooltipContent>
                           <p>
                             {selectedNode?.isUserDefinedLabel 
                               ? "User-defined label • Click to edit" 
                               : "Click to edit label"
                             }
                           </p>
                         </TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
                )}
                                 <div className="flex items-center ml-2">
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setIsEditingLabel(true)}
                     className="h-8 w-8 p-0"
                   >
                     <Edit3 className="h-4 w-4" />
                   </Button>
                   {selectedNode?.isUserDefinedLabel && (
                     <TooltipProvider>
                       <Tooltip>
                         <TooltipTrigger asChild>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => {
                               if (onRevertNodeLabel) {
                                 onRevertNodeLabel(selectedNode.id);
                               }
                             }}
                             className="h-8 w-8 p-0"
                           >
                             <RotateCcw className="h-4 w-4" />
                           </Button>
                         </TooltipTrigger>
                         <TooltipContent>
                           <p>Revert to default label</p>
                         </TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                   )}
                 </div>
              </div>
              <CardDescription className="text-muted-foreground font-mono text-sm break-all">
                {selectedNode?.address || address}
              </CardDescription>
              <div className="flex space-x-2 mt-2">
                <Badge 
                  variant="outline" 
                  className={getTypeBadge(selectedNode?.entity_type || selectedNode?.type)?.color}
                >
                  {getTypeBadge(selectedNode?.entity_type || selectedNode?.type)?.text}
                </Badge>
                <Badge 
                  variant="outline"
                  className={`font-bold ${
                    isLoadingRiskData ? (
                      "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                    ) : riskData ? (
                      riskData.overallRisk >= 0.7
                        ? "bg-red-600 dark:bg-red-500 text-white border-red-600 dark:border-red-500 shadow-sm animate-pulse"
                        : riskData.overallRisk >= 0.4
                        ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
                        : "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700"
                    ) : (
                    selectedNode?.risk?.toLowerCase() === 'high'
                      ? "bg-red-600 dark:bg-red-500 text-white border-red-600 dark:border-red-500 shadow-sm animate-pulse"
                      : selectedNode?.risk?.toLowerCase() === 'medium'
                      ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
                      : selectedNode?.risk?.toLowerCase() === 'low'
                      ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                    )
                  }`}
                >
                  {isLoadingRiskData ? (
                    "Loading..."
                  ) : riskData ? (
                    riskData.overallRisk >= 0.7
                      ? "⚠ HIGH RISK"
                      : riskData.overallRisk >= 0.4
                      ? "MEDIUM RISK"
                      : "LOW RISK"
                  ) : (
                    selectedNode?.risk?.toLowerCase() === 'high' 
                    ? "⚠ HIGH RISK" 
                    : `${selectedNode?.risk?.toUpperCase() || 'UNKNOWN'} Risk`
                  )}
                </Badge>
              </div>
              {selectedNode?.entity_tags && selectedNode.entity_tags.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground mb-1">Tags:</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.entity_tags.map((tag, tagIndex) => (
                      <Badge 
                        key={tagIndex} 
                        variant="outline" 
                        className={`text-xs px-2 py-1 ${getTagColor(tag)}`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                const addressToCopy = selectedNode?.address || address
                navigator.clipboard.writeText(addressToCopy)
              }}
              title="Copy address"
            >
              <Copy className="h-4 w-4" />
            </Button>
            {selectedNode?.type === "custom" && onConnectNode && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => onConnectNode(selectedNode.id)}
                className="ml-2 bg-primary hover:bg-primary/90 text-white"
              >
                <ArrowRight className="h-4 w-4 mr-1" />
                Connect
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Custom Node Info or Blockchain Info */}
      {selectedNode?.type === "custom" ? (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <Shield className="h-5 w-5 mr-2 text-primary" />
              Custom Node
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Node Name</span>
              <span className="text-foreground font-medium">{selectedNode.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Currency</span>
              <div className="flex items-center space-x-2">
                {selectedNode.logo && (
                  <img 
                    src={selectedNode.logo} 
                    alt="Currency" 
                    className="w-4 h-4 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                <span className="text-foreground">
                  {selectedNode.logo?.includes('usd.svg') ? 'USD' :
                   selectedNode.logo?.includes('eur.svg') ? 'EUR' :
                   selectedNode.logo?.includes('gbp.svg') ? 'GBP' :
                   selectedNode.logo?.includes('jpy.svg') ? 'JPY' :
                   selectedNode.logo?.includes('cad.svg') ? 'CAD' :
                   selectedNode.logo?.includes('chf.svg') ? 'CHF' :
                   selectedNode.logo?.includes('aud.svg') ? 'AUD' :
                   selectedNode.logo?.includes('btc.png') ? 'BTC' :
                   selectedNode.logo?.includes('eth.png') ? 'ETH' :
                   selectedNode.logo?.includes('usdc.png') ? 'USDC' :
                   selectedNode.logo?.includes('usdt.png') ? 'USDT' :
                   selectedNode.logo?.includes('dai.png') ? 'DAI' :
                   selectedNode.logo?.includes('matic.png') ? 'MATIC' :
                   selectedNode.logo?.includes('avax.png') ? 'AVAX' :
                   'Custom'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Value</span>
              <span className="text-foreground">
                {selectedNode.balance || 'Not specified'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="text-foreground">
                {selectedNode.notes && selectedNode.notes.length > 0 
                  ? new Date(selectedNode.notes[0].timestamp).toLocaleDateString()
                  : 'Not specified'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Risk Score</span>
              <Badge 
                variant="outline"
                className={`font-bold ${
                  selectedNode.risk?.toLowerCase() === 'high'
                    ? "bg-red-600 dark:bg-red-500 text-white border-red-600 dark:border-red-500 shadow-sm"
                    : selectedNode.risk?.toLowerCase() === 'medium'
                    ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
                    : selectedNode.risk?.toLowerCase() === 'low'
                    ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                }`}
              >
                {selectedNode.risk?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center">
              <Shield className="h-5 w-5 mr-2 text-primary" />
              {selectedNode?.type === "bridge" ? "Bridge" : "Blockchain"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Network</span>
              <div className="flex items-center space-x-2">
                {selectedNode?.type === "bridge" && selectedNode?.sourceChain && selectedNode?.destinationChain ? (
                  // Bridge nodes show both source and destination chains
                  <>
                    <img 
                      src={selectedNode.sourceChain} 
                      alt="Source Chain" 
                      className="w-4 h-4 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <span className="text-foreground">
                      {selectedNode.sourceChain?.includes('btc') ? 'BTC' :
                       selectedNode.sourceChain?.includes('eth') ? 'ETH' :
                       selectedNode.sourceChain?.includes('matic') ? 'MATIC' :
                       selectedNode.sourceChain?.includes('avax') ? 'AVAX' : 'ETH'}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <img 
                      src={selectedNode.destinationChain} 
                      alt="Destination Chain" 
                      className="w-4 h-4 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <span className="text-foreground">
                      {selectedNode.destinationChain?.includes('btc') ? 'Bitcoin' :
                       selectedNode.destinationChain?.includes('eth') ? 'Ethereum' :
                       selectedNode.destinationChain?.includes('matic') ? 'Polygon' :
                       selectedNode.destinationChain?.includes('avax') ? 'Avalanche' : 'Ethereum'}
                    </span>
                  </>
                ) : (
                  // Regular nodes show single chain
                  <>
                    {selectedNode?.chainLogo ? (
                      <img 
                        src={selectedNode.chainLogo} 
                        alt="Chain Logo" 
                        className="w-4 h-4 rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-4 h-4 bg-primary rounded-full"></div>
                    )}
                    <span className="text-foreground">
                      {selectedNode?.chainLogo?.includes('btc') ? 'Bitcoin' :
                       selectedNode?.chainLogo?.includes('eth') ? 'Ethereum' :
                       selectedNode?.chainLogo?.includes('matic') ? 'Polygon' :
                       selectedNode?.chainLogo?.includes('avax') ? 'Avalanche' :
                       selectedNode?.chainLogo?.includes('us.svg') ? 'USD' :
                       selectedNode?.chainLogo?.includes('eu.svg') ? 'EUR' :
                       selectedNode?.chainLogo?.includes('gb.svg') ? 'GBP' :
                       selectedNode?.chainLogo?.includes('jp.svg') ? 'JPY' :
                       selectedNode?.chainLogo?.includes('ca.svg') ? 'CAD' :
                       selectedNode?.chainLogo?.includes('ch.svg') ? 'CHF' :
                       selectedNode?.chainLogo?.includes('au.svg') ? 'AUD' :
                       selectedNode?.chainLogo?.includes('cn.svg') ? 'CNY' :
                       selectedNode?.chainLogo?.includes('in.svg') ? 'INR' :
                       selectedNode?.chainLogo?.includes('br.svg') ? 'BRL' :
                       selectedNode?.chainLogo?.includes('mx.svg') ? 'MXN' :
                       selectedNode?.chainLogo?.includes('kr.svg') ? 'KRW' :
                       selectedNode?.chainLogo?.includes('sg.svg') ? 'SGD' :
                       'Bitcoin'}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {selectedNode?.balance?.includes('BTC') ? 'BTC Transferred' :
                 selectedNode?.balance?.includes('ETH') ? 'ETH Transferred' :
                 selectedNode?.balance?.includes('MATIC') ? 'MATIC Transferred' :
                 selectedNode?.balance?.includes('AVAX') ? 'AVAX Transferred' :
                 selectedNode?.balance?.includes('USD') ? 'USD Transferred' :
                 selectedNode?.balance?.includes('EUR') ? 'EUR Transferred' :
                 selectedNode?.balance?.includes('GBP') ? 'GBP Transferred' :
                 selectedNode?.balance?.includes('JPY') ? 'JPY Transferred' :
                 selectedNode?.balance?.includes('CAD') ? 'CAD Transferred' :
                 selectedNode?.balance?.includes('CHF') ? 'CHF Transferred' :
                 selectedNode?.balance?.includes('AUD') ? 'AUD Transferred' :
                 selectedNode?.balance?.includes('CNY') ? 'CNY Transferred' :
                 selectedNode?.balance?.includes('INR') ? 'INR Transferred' :
                 selectedNode?.balance?.includes('BRL') ? 'BRL Transferred' :
                 selectedNode?.balance?.includes('MXN') ? 'MXN Transferred' :
                 selectedNode?.balance?.includes('KRW') ? 'KRW Transferred' :
                 selectedNode?.balance?.includes('SGD') ? 'SGD Transferred' :
                 'Token Transferred'}
              </span>
              <span className="text-foreground font-mono">{selectedNode?.balance || "Unknown"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">USD Value</span>
              <span className="text-foreground">
                {selectedNode?.balance && selectedNode.balance !== "Unknown" 
                  ? "$" + (parseFloat(selectedNode.balance.split(' ')[0]) * 43000).toLocaleString()
                  : "Unknown"
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Transactions</span>
              <Dialog>
                <DialogTrigger asChild>
                  <span className="text-foreground cursor-pointer hover:text-primary transition-colors flex items-center gap-1 group">
                    {(() => {
                      // If availableTransactions is defined and > 0, show it
                      if (selectedNode?.availableTransactions !== undefined && selectedNode.availableTransactions > 0) {
                        return selectedNode.availableTransactions.toLocaleString();
                      }
                      // If transactions is defined and > 0, show it
                      if (selectedNode?.transactions !== undefined && selectedNode.transactions > 0) {
                        return selectedNode.transactions.toLocaleString();
                      }
                      // If both are 0 or undefined, show loading
                      if (selectedNode?.availableTransactions === undefined && selectedNode?.transactions === undefined) {
                        return "Loading...";
                      }
                      // If we have explicit 0 values, show 0
                      return "0";
                    })()}
                    {(selectedNode?.availableTransactions === undefined && selectedNode?.transactions === undefined) && (
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    )}
                    <Info className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      Transaction Details
                    </DialogTitle>
                    <DialogDescription>
                      View detailed information about the transaction history for this node.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Transaction Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700 dark:text-blue-300">Total Transactions:</span>
                          <span className="font-mono font-medium">{selectedNode?.transactions?.toLocaleString() || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700 dark:text-blue-300">Available for Expansion:</span>
                          <span className="font-mono font-medium">{selectedNode?.availableTransactions?.toLocaleString() || selectedNode?.transactions?.toLocaleString() || "0"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700 dark:text-blue-300">Entity Type:</span>
                          <span className="font-medium">{getTypeBadge(selectedNode?.entity_type || selectedNode?.type)?.text || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700 dark:text-blue-300">Risk Level:</span>
                          <span className={`font-medium ${
                            selectedNode?.risk === 'high' ? 'text-red-600 dark:text-red-400' :
                            selectedNode?.risk === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-green-600 dark:text-green-400'
                          }`}>
                            {selectedNode?.risk?.toUpperCase() || "UNKNOWN"}
                          </span>
                        </div>
                        {selectedNode?.balance && (
                          <div className="flex justify-between">
                            <span className="text-blue-700 dark:text-blue-300">Current Balance:</span>
                            <span className="font-mono font-medium">{selectedNode.balance}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p className="mb-2">
                        This {getTypeBadge(selectedNode?.type)?.text?.toLowerCase() || "entity"} has been involved in {selectedNode?.transactions?.toLocaleString() || "0"} blockchain transactions.
                        {selectedNode?.availableTransactions && selectedNode.availableTransactions > 0 && (
                          <span className="text-blue-600 dark:text-blue-400 font-medium"> 📊 {selectedNode.availableTransactions.toLocaleString()} transactions available for expansion.</span>
                        )}
                        {selectedNode?.risk === 'high' && (
                          <span className="text-red-600 dark:text-red-400 font-medium"> ⚠️ High risk activity detected.</span>
                        )}
                      </p>
                      <p>Click on the node in the graph to expand and view detailed transaction history, or use the transaction table below for a comprehensive analysis.</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Risk Score</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      riskData ? `${getRiskBarColor(riskData.overallRisk)}` :
                      selectedNode?.risk === 'high' ? 'bg-red-500' :
                      selectedNode?.risk === 'medium' ? 'bg-yellow-500' :
                      selectedNode?.risk === 'low' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`}
                    style={{
                      width: riskData ? `${riskData.overallRisk * 100}%` :
                              selectedNode?.risk === 'high' ? '80%' :
                              selectedNode?.risk === 'medium' ? '65%' :
                              selectedNode?.risk === 'low' ? '30%' :
                              '50%'
                    }}
                  ></div>
                </div>
                <span className={`font-bold ${
                  selectedNode?.risk === 'high' ? 'text-red-700 dark:text-red-400' :
                  selectedNode?.risk === 'medium' ? 'text-yellow-400' :
                  selectedNode?.risk === 'low' ? 'text-green-400' :
                  'text-gray-400'
                }`}>
                  {riskData ? `${Math.round(riskData.overallRisk * 100)}/100` :
                   selectedNode?.risk === 'high' ? '85/100' :
                   selectedNode?.risk === 'medium' ? '65/100' :
                   selectedNode?.risk === 'low' ? '25/100' :
                   '50/100'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsRiskModalOpen(true)
                  }}
                  className="h-6 px-2 text-xs"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  Analysis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground flex items-center">
              <Edit3 className="h-5 w-5 mr-2 text-primary" />
              Notes ({selectedNode?.notes?.length || 0})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingNote(true)}
              className="h-8 px-3 flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Add Note to Address
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Note */}
          {isAddingNote && (
            <div className="space-y-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this node..."
                className="w-full min-h-[80px] p-3 border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (newNote.trim() && selectedNode?.id && onAddNote) {
                      onAddNote(selectedNode.id, newNote.trim())
                      setNewNote("")
                      setIsAddingNote(false)
                    }
                  }}
                  disabled={!newNote.trim()}
                >
                  Add Note
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewNote("")
                    setIsAddingNote(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Display Notes */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {selectedNode?.notes && selectedNode.notes.length > 0 ? (
              selectedNode.notes.map((note) => {
                const isCurrentUser = note.userId === "current_user"
                return (
                  <div key={note.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 border rounded-md max-w-[80%] ${
                      isCurrentUser 
                        ? 'bg-orange-100/80 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700' 
                        : 'bg-muted/30'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{note.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-muted-foreground italic text-center py-4">
                No notes yet. Click the edit button to add the first note.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
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
                onClick={() => setActiveFilter("medium")}
                className={`py-3 px-4 text-sm font-medium transition-colors ${
                  activeFilter === "medium"
                    ? "text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                }`}
              >
                Inflows (Received)
              </button>
              <button 
                onClick={() => setActiveFilter("high")}
                className={`py-3 px-4 text-sm font-medium transition-colors ${
                  activeFilter === "high"
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
                              <span className="text-sm text-gray-600 dark:text-gray-400">{tx.btcAmount}</span>
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

      {/* Risk Analysis Modal */}
      <Dialog open={isRiskModalOpen} onOpenChange={setIsRiskModalOpen}>
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
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Address: </span>
                <code className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                  {selectedNode?.address || address || 'bc1q47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2f1e0b9a8d7c6b5a4f3e2d1c0b9a8'}
                </code>
              </div>
              {isLoadingRiskData ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading risk analysis...</p>
                </div>
              ) : riskData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="mb-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Overall Risk</div>
                      <div className={`text-2xl font-bold ${getRiskColor(riskData.overallRisk)}`}>
                        {Math.round(riskData.overallRisk * 100)}
                      </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getRiskBarColor(riskData.overallRisk)}`} 
                        style={{ width: `${riskData.overallRisk * 100}%` }}
                      ></div>
                  </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {Math.round(riskData.overallRisk * 100)}%
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="mb-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Transaction Risk</div>
                      <div className={`text-2xl font-bold ${getRiskColor(riskData.transactionRisk.aggregateScore)}`}>
                        {Math.round(riskData.transactionRisk.aggregateScore * 100)}
                      </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getRiskBarColor(riskData.transactionRisk.aggregateScore)}`} 
                        style={{ width: `${riskData.transactionRisk.aggregateScore * 100}%` }}
                      ></div>
                  </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {Math.round(riskData.transactionRisk.aggregateScore * 100)}%
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="mb-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Entity Risk</div>
                      <div className={`text-2xl font-bold ${getRiskColor(riskData.entityRisk.aggregateScore)}`}>
                        {Math.round(riskData.entityRisk.aggregateScore * 100)}
                      </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getRiskBarColor(riskData.entityRisk.aggregateScore)}`} 
                        style={{ width: `${riskData.entityRisk.aggregateScore * 100}%` }}
                      ></div>
                  </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {Math.round(riskData.entityRisk.aggregateScore * 100)}%
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="mb-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Jurisdiction Risk</div>
                      <div className={`text-2xl font-bold ${getRiskColor(riskData.jurisdictionRisk.aggregateScore)}`}>
                        {Math.round(riskData.jurisdictionRisk.aggregateScore * 100)}
                      </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getRiskBarColor(riskData.jurisdictionRisk.aggregateScore)}`} 
                        style={{ width: `${riskData.jurisdictionRisk.aggregateScore * 100}%` }}
                      ></div>
                  </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {Math.round(riskData.jurisdictionRisk.aggregateScore * 100)}%
                </div>
              </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400">No risk data available</p>
                </div>
              )}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                  <div className="flex">
                      <button 
                        onClick={() => setActiveRiskTab('entity')}
                        className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                          activeRiskTab === 'entity' 
                            ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'
                        }`}
                      >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user w-4 h-4 mr-2">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      Entity Risk Factors
                    </button>
                      <button 
                        onClick={() => setActiveRiskTab('transaction')}
                        className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                          activeRiskTab === 'transaction' 
                            ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'
                        }`}
                      >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up w-4 h-4 mr-2">
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                        <polyline points="16 7 22 7 22 13"></polyline>
                      </svg>
                      Transaction Risk Factors
                    </button>
                      <button 
                        onClick={() => setActiveRiskTab('jurisdiction')}
                        className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                          activeRiskTab === 'jurisdiction' 
                            ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400'
                        }`}
                      >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe w-4 h-4 mr-2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                        <path d="M2 12h20"></path>
                      </svg>
                      Jurisdiction Risk Factors
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                    {riskData ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Risk Factor</th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Risk Score</th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                          {(() => {
                            const factors = activeRiskTab === 'entity' ? riskData.entityRisk.factors :
                                           activeRiskTab === 'transaction' ? riskData.transactionRisk.factors :
                                           riskData.jurisdictionRisk.factors;
                            
                            return factors.map((factor: any, index: number) => (
                              <tr key={factor.id || index} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-3 px-2">
                          <div className="flex items-center">
                                    <Shield className={`w-4 h-4 mr-2 ${
                                      factor.severity === 'high' ? 'text-red-600 dark:text-red-400' :
                                      factor.severity === 'medium' ? 'text-orange-600 dark:text-orange-400' :
                                      'text-green-600 dark:text-green-400'
                                    }`} />
                                    <span className="text-sm text-gray-900 dark:text-gray-100">{factor.id}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                    <div 
                                      className={`h-1.5 rounded-full ${getRiskBarColor(factor.score)}`} 
                                      style={{ width: `${factor.score * 100}%` }}
                                    ></div>
                          </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {Math.round(factor.score * 100)}%
                                  </span>
                        </td>
                        <td className="py-3 px-2">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">{factor.description}</span>
                        </td>
                      </tr>
                            ));
                          })()}
                    </tbody>
                  </table>
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-gray-600 dark:text-gray-400">No risk factors available</p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
