"use client"

import { useState, useEffect } from "react"
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
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Debug logging removed - infinite loop fixed
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false)
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [editedLabel, setEditedLabel] = useState(selectedNode?.label || "")

  // Update notes when selectedNode changes
  useEffect(() => {
    setNewNote("")
    setIsAddingNote(false)
    setEditedLabel(selectedNode?.label || "")
    setIsEditingLabel(false)
  }, [selectedNode?.id])

  // Helper function to get risk color
  const getRiskColor = (risk?: string) => {
    switch (risk?.toLowerCase()) {
      case 'high': return 'border-red-600 text-red-700 dark:text-red-400'
      case 'medium': return 'border-yellow-600 text-yellow-700 dark:text-yellow-400'
      case 'low': return 'border-green-600 text-green-700 dark:text-green-400'
      default: return 'border-gray-500 text-gray-400'
    }
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

  // Helper function to get type badge
  const getTypeBadge = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'target': return 'Target'
      case 'exchange': return 'Exchange'
      case 'hacker': return 'Hacker'
      case 'mixer': return 'Mixer'
      case 'service': return 'Service'
      case 'defi': return 'DeFi'
      case 'wallet': return 'Wallet'
      case 'passthrough': return 'Pass-through'
      case 'bridge': return 'Bridge'
      case 'custom': return 'Custom'
      default: return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown'
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
                  className={
                    selectedNode?.type === "custom" 
                      ? "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20" 
                      : "border-blue-500 text-blue-400"
                  }
                >
                  {getTypeBadge(selectedNode?.type)}
                </Badge>
                <Badge 
                  variant="outline"
                  className={`font-bold ${
                    selectedNode?.risk?.toLowerCase() === 'high'
                      ? "bg-red-600 dark:bg-red-500 text-white border-red-600 dark:border-red-500 shadow-sm animate-pulse"
                      : selectedNode?.risk?.toLowerCase() === 'medium'
                      ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700"
                      : selectedNode?.risk?.toLowerCase() === 'low'
                      ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {selectedNode?.risk?.toLowerCase() === 'high' 
                    ? "⚠ HIGH RISK" 
                    : `${selectedNode?.risk?.toUpperCase() || 'UNKNOWN'} Risk`
                  }
                </Badge>
              </div>
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
                    {selectedNode?.transactions !== undefined 
                      ? selectedNode.transactions.toLocaleString() 
                      : "Loading..."}
                    {selectedNode?.transactions === undefined && (
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
                          <span className="font-mono font-medium">{selectedNode?.availableTransactions?.toLocaleString() || "0"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700 dark:text-blue-300">Entity Type:</span>
                          <span className="font-medium">{getTypeBadge(selectedNode?.type) || "Unknown"}</span>
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
                        This {getTypeBadge(selectedNode?.type)?.toLowerCase() || "entity"} has been involved in {selectedNode?.transactions?.toLocaleString() || "0"} blockchain transactions.
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
                      selectedNode?.risk === 'high' ? 'bg-red-500 w-4/5' :
                      selectedNode?.risk === 'medium' ? 'bg-yellow-500 w-2/3' :
                      selectedNode?.risk === 'low' ? 'bg-green-500 w-1/3' :
                      'bg-gray-500 w-1/2'
                    }`}
                  ></div>
                </div>
                <span className={`font-bold ${
                  selectedNode?.risk === 'high' ? 'text-red-700 dark:text-red-400' :
                  selectedNode?.risk === 'medium' ? 'text-yellow-400' :
                  selectedNode?.risk === 'low' ? 'text-green-400' :
                  'text-gray-400'
                }`}>
                  {selectedNode?.risk === 'high' ? '85/100' :
                   selectedNode?.risk === 'medium' ? '65/100' :
                   selectedNode?.risk === 'low' ? '25/100' :
                   '50/100'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRiskModalOpen(true)}
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
          </DialogHeader>
          <div className="rounded-2xl border p-6 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
            <div className="w-full h-full flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Address: </span>
                <code className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                  {selectedNode?.address || address || 'bc1q47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2f1e0b9a8d7c6b5a4f3e2d1c0b9a8'}
                </code>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="mb-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Overall Risk</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">85</div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-red-500" style={{ width: '85%' }}></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">85%</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="mb-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Transaction Risk</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">90</div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-red-500" style={{ width: '90%' }}></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">90%</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="mb-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Entity Risk</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">95</div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-red-500" style={{ width: '95%' }}></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">95%</div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="mb-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Jurisdiction Risk</div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">75</div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-orange-500" style={{ width: '75%' }}></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">75%</div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                  <div className="flex">
                    <button className="flex items-center px-4 py-2 text-sm font-medium transition-colors text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user w-4 h-4 mr-2">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      Entity Risk Factors
                    </button>
                    <button className="flex items-center px-4 py-2 text-sm font-medium transition-colors text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up w-4 h-4 mr-2">
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                        <polyline points="16 7 22 7 22 13"></polyline>
                      </svg>
                      Transaction Risk Factors
                    </button>
                    <button className="flex items-center px-4 py-2 text-sm font-medium transition-colors text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400">
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
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Risk Factor</th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Risk Score</th>
                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-3 px-2">
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" />
                            <span className="text-sm text-gray-900 dark:text-gray-100">entity-type</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-red-500" style={{ width: '95%' }}></div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">95%</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">High risk entity type: confirmed hacker wallet</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-3 px-2">
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" />
                            <span className="text-sm text-gray-900 dark:text-gray-100">kyc</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-green-500" style={{ width: '0%' }}></div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">0%</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">No KYC requirements for this entity</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-3 px-2">
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-2 text-orange-600 dark:text-orange-400" />
                            <span className="text-sm text-gray-900 dark:text-gray-100">age</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-red-500" style={{ width: '85%' }}></div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">85%</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Newly created wallet (2 days old)</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-3 px-2">
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" />
                            <span className="text-sm text-gray-900 dark:text-gray-100">reputation</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-red-500" style={{ width: '90%' }}></div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">90%</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Associated with multiple exchange hacks</span>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <td className="py-3 px-2">
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" />
                            <span className="text-sm text-gray-900 dark:text-gray-100">activity</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-red-500" style={{ width: '88%' }}></div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">88%</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">High volume of suspicious transactions</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
