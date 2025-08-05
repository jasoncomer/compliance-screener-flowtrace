"use client"

import { useState, useEffect } from "react"
import { Search, ChevronLeft, ChevronRight, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, HelpCircle, Trash2, X, Edit3, FolderOpen, Plus, Save, BarChart3, Network, Folder, AlertTriangle, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { NetworkGraph } from "@/components/network-graph"
import { EntityPanel } from "@/components/entity-panel"

import { RecentActivity } from "@/components/recent-activity"
import { SecurityActivity } from "@/components/security-activity"
import { CombinedInfoCard } from "@/components/combined-info-card"

import { DrawingTools } from "@/components/drawing-tools"
import { ThemeToggle } from "@/components/theme-toggle"
import { CustomNodeDialog } from "@/components/custom-node-dialog"
import { ConnectionDialog } from "@/components/connection-dialog"
import { GitHubWorkspaceManager } from "@/components/github-workspace-manager"
import { SaveStatus } from "@/components/save-status"
import Image from "next/image"
import { formatDateConsistent, isValidAddress, generateUniqueTxHash } from "@/lib/utils"
import { autoSaveManager } from "@/lib/auto-save"
import { migrateOldData, loadVersion, updateMasterVersion, createWorkspace, type Workspace, getWorkspace } from "@/lib/workspace-utils"
import { fetchAddressData, fetchAttributionData, fetchRiskScoringData, fetchTransactionData, fetchSOTData } from '@/lib/api';
import { getSafeLogoPath } from '@/lib/logo-utils';
import axios from 'axios';
import { debugLogger, captureApiError } from '@/lib/debug-utils';
import { DebugPanel } from '@/components/debug-panel';

// Custom node persistence utilities - DISABLED in favor of new IndexedDB-based project system
// const CUSTOM_NODES_KEY = 'flowtrace_custom_nodes'
// const CONNECTIONS_KEY = 'flowtrace_connections'

// const saveCustomNodes = (nodes: any[]) => {
//   try {
//     const customNodes = nodes.filter(node => node.type === 'custom')
//     localStorage.setItem(CUSTOM_NODES_KEY, JSON.stringify(customNodes))
//   } catch (error) {
//     console.error('Failed to save custom nodes:', error)
//   }
// }

// const loadCustomNodes = (): any[] => {
//   try {
//     const saved = localStorage.getItem(CUSTOM_NODES_KEY)
//     return saved ? JSON.parse(saved) : []
//   } catch (error) {
//     console.error('Failed to load custom nodes:', error)
//     return []
//   }
// }

// const saveConnections = (connections: any[]) => {
//   try {
//     localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections))
//   } catch (error) {
//     console.error('Failed to save connections:', error)
//   }
// }

// const loadConnections = (): any[] => {
//   try {
//     const saved = localStorage.getItem(CONNECTIONS_KEY)
//     return saved ? JSON.parse(saved) : []
//   } catch (error) {
//     console.error('Failed to load connections:', error)
//     return []
//   }
// }

// const clearCustomNodes = () => {
//   try {
//     localStorage.removeItem(CUSTOM_NODES_KEY)
//     console.log('Custom nodes cleared from localStorage')
//   } catch (error) {
//     console.error('Failed to clear custom nodes:', error)
//   }
// }

export default function FlowTraceApp() {
  const [selectedAddress, setSelectedAddress] = useState("1Pec9b6Bg6WDKj1iYUqxZg8mEBqXuHoya4")
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [activeDrawingTool, setActiveDrawingTool] = useState("select")
  const [activeColor, setActiveColor] = useState("#f59e0b")
  const [hidePassThrough, setHidePassThrough] = useState(false)
  const [hideSpam, setHideSpam] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [customNodeDialog, setCustomNodeDialog] = useState<{ open: boolean; position: { x: number; y: number } }>({ open: false, position: { x: 0, y: 0 } })
  const [connectionDialog, setConnectionDialog] = useState<{ open: boolean; sourceNodeId: string }>({ open: false, sourceNodeId: '' })

  // Filter out spam transactions (under $1 after 2015-01-01)
  const isSpamTransaction = (connection: any) => {
    if (!hideSpam) return false;
    
    // Check if transaction is after 2015-01-01
    const transactionDate = new Date(connection.date);
    const spamCutoffDate = new Date('2015-01-01');
    
    if (transactionDate < spamCutoffDate) return false;
    
    // Check if USD value is under $1
    const usdValue = parseFloat(connection.usdValue?.replace(/[$,]/g, '') || '0');
    return usdValue < 1;
  };

  // Get existing connections for a node
  const getExistingConnections = (nodeId: string) => {
    return connections.filter(conn => conn.from === nodeId || conn.to === nodeId).map(conn => ({
      from: conn.from,
      to: conn.to,
      amount: conn.amount,
      note: conn.note,
      currency: conn.currency,
      date: conn.date,
      direction: conn.from === nodeId ? "out" : "in" as "in" | "out",
      hideTxId: conn.txHash === undefined,
      txHash: conn.txHash
    }))
  }
  const [placementMode, setPlacementMode] = useState<{ 
    active: boolean; 
    nodeData: {
      label: string
      logo: string
      currencyCode: string
      risk: "low" | "medium" | "high"
      notes?: string
    } | null 
  } | null>(null)

  const [workspaceManagerOpen, setWorkspaceManagerOpen] = useState(false)
  const [refreshWorkspaceManager, setRefreshWorkspaceManager] = useState(0)
  const [newInvestigationModalOpen, setNewInvestigationModalOpen] = useState(false)
  const [addressSearchModalOpen, setAddressSearchModalOpen] = useState(false)
  const [pendingAddressSearch, setPendingAddressSearch] = useState<string>("")

  // const [saveDialogOpen, setSaveDialogOpen] = useState(false) // Removed - no longer needed
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | undefined>(undefined)
  const [currentVersionId, setCurrentVersionId] = useState<string | undefined>(undefined)
  const [currentWorkspaceName, setCurrentWorkspaceName] = useState<string | undefined>(undefined)


  const [nodes, setNodes] = useState<any[]>([
    {
      id: "center",
      x: 1100,
      y: 700,
      label: "Test Entity Alpha",
      originalLabel: "Test Entity Alpha",
      address: "39PRJa1EbEsLAJdu2f526PAD6T9RhMVGw9",
      type: "target",
      risk: "high",
      logo: "/logos/test-entity-alpha.png",
      balance: "0.19863498 BTC",
      transactions: 464,
      availableTransactions: 464,
      chainLogo: "/logos/btc.png",
      notes: [
        {
          id: "note_1",
          userId: "user_1",
          userName: "John Smith",
          content: "This is the main target wallet. High risk due to recent suspicious activity.",
          timestamp: "2024-01-15T10:30:00Z"
        },
        {
          id: "note_2", 
          userId: "user_2",
          userName: "Sarah Johnson",
          content: "Confirmed connection to known mixer service. Need to investigate further.",
          timestamp: "2024-01-15T14:45:00Z"
        }
      ],
    },
    {
      id: "exchange1",
      x: 200,
      y: 200,
      label: "Exchange",
      originalLabel: "Exchange",
      address: "bc1qaltcointrader9x8v7u6t5r4e3w2q1p0o9n8m7l6k5j4h3g2f1",
      type: "exchange",
      risk: "low",
      logo: "/logos/abcc.png",
      chainLogo: "/logos/eth.png", // Ethereum chain logo
      balance: "1,250.5 BTC",
      transactions: 15420,
      availableTransactions: 15420,
    },
    {
      id: "hacker1",
      x: 280,
      y: 200,
      label: "Hacker Wallet",
      originalLabel: "Hacker Wallet",
      address: "bc1q47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2f1e0b9a8d7c6b5a4f3e2d1c0b9a8",
      type: "hacker",
      risk: "high",
      balance: "Unknown",
      transactions: 999999,
      availableTransactions: 999999,
      chainLogo: "/logos/eth.png", // Ethereum chain logo
    },
    {
      id: "bridge1",
      x: 500,
      y: 150,
      label: "Bridge",
      originalLabel: "Bridge",
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      type: "bridge",
      risk: "medium",
      sourceChain: "/logos/eth.png", // Source chain (Ethereum)
      destinationChain: "/logos/matic.png", // Destination chain (Polygon)
      chainLogo: "/logos/eth.png", // Primary chain logo
      balance: "0.0 ETH",
      transactions: 15420,
      availableTransactions: 15420,
    },
    {
      id: "bridge2",
      x: 650,
      y: 250,
      label: "Bridge",
      originalLabel: "Bridge",
      address: "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106",
      type: "bridge",
      risk: "medium",
      sourceChain: "/logos/eth.png", // Source chain (Ethereum)
      destinationChain: "/logos/avax.png", // Destination chain (Avalanche)
      chainLogo: "/logos/eth.png", // Primary chain logo
      balance: "0.0 AVAX",
      transactions: 8900,
      availableTransactions: 8900,
    },
    {
      id: "passthrough1",
      x: 350,
      y: 250,
      label: "Pass-through Wallet",
      originalLabel: "Pass-through Wallet",
      address: "bc1qpassthrough123456789012345678901234567890",
      type: "passthrough",
      risk: "medium",
      balance: "0.001 BTC",
      transactions: 2,
      availableTransactions: 2,
      isPassThrough: true,
      logo: "/logos/btc.png", // Bitcoin chain logo as main logo
      chainLogo: "/logos/btc.png", // Bitcoin chain logo
    },
    {
      id: "passthrough2",
      x: 450,
      y: 150,
      label: "Pass-through Wallet 2",
      address: "bc1qpassthrough234567890123456789012345678901",
      type: "passthrough",
      risk: "medium",
      balance: "0.001 ETH",
      transactions: 2,
      availableTransactions: 2,
      isPassThrough: true,
      logo: "/logos/eth.png", // Ethereum chain logo as main logo
      chainLogo: "/logos/eth.png", // Ethereum chain logo
    },
    {
      id: "mixer1",
      x: 600,
      y: 200,
      label: "Tornado.cash",
      address: "bc1q1234567890abcdef1234567890abcdef12345678",
      type: "mixer",
      risk: "high",
      logo: "/logos/apeswap.png",
      chainLogo: "/logos/eth.png", // Ethereum chain logo
      balance: "890.3 BTC",
      transactions: 3420,
      availableTransactions: 3420,
    },
    {
      id: "mixer2",
      x: 700,
      y: 300,
      label: "Tornado.cash",
      address: "bc1qcracked123456789012345678901234567890",
      type: "mixer",
      risk: "high",
      balance: "12.5 BTC",
      transactions: 156,
      availableTransactions: 156,
      chainLogo: "/logos/eth.png", // Ethereum chain logo
    },
    {
      id: "mixer3",
      x: 600,
      y: 400,
      label: "Tornado.cash",
      address: "bc1qcanada123456789012345678901234567890",
      type: "mixer",
      risk: "high",
      logo: "/logos/abcc.png",
      chainLogo: "/logos/eth.png", // Ethereum chain logo
      balance: "5,680.2 BTC",
      transactions: 12890,
      availableTransactions: 12890,
    },
  ])

  const [connections, setConnections] = useState<any[]>([
    // Test pass-through scenario: A -> B -> C (where B is pass-through)
    {
      from: "exchange1",
      to: "passthrough1",
      amount: "10",
      currency: "BTC",
      date: "2023-04-28T10:30:00Z", // Use ISO format with Z for UTC
      txHash: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      usdValue: "$272,000",
      type: "out",
      fee: "0.001",
    },
    {
      from: "passthrough1",
      to: "mixer1",
      amount: "10",
      currency: "BTC",
      date: "2023-04-28T11:45:00Z", // Use ISO format with Z for UTC
      txHash: "b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1",
      usdValue: "$272,000",
      type: "out",
      fee: "0.001",
    },
    // Bridge transactions
    {
      from: "hacker1",
      to: "bridge1",
      amount: "9,993,868",
      currency: "USDC",
      date: "2023-11-05T12:54:41Z", // Use ISO format with Z for UTC
      txHash: "c3d4e5f6789012345678901234567890123456789012345678901234567890a1b2",
      usdValue: "$9,993,868",
      type: "out",
      fee: "0.001",
    },
    {
      from: "bridge1",
      to: "mixer2",
      amount: "9,993,868",
      currency: "USDC",
      date: "2023-11-06T05:13:52Z", // Use ISO format with Z for UTC
      txHash: "d4e5f6789012345678901234567890123456789012345678901234567890a1b2c3",
      usdValue: "$9,993,868",
      type: "out",
      fee: "0.001",
    },
    {
      from: "hacker1",
      to: "bridge2",
      amount: "137,653",
      currency: "USDC",
      date: "2023-11-05T12:30:00Z", // Use ISO format with Z for UTC
      txHash: "e5f6789012345678901234567890123456789012345678901234567890a1b2c3d4",
      usdValue: "$137,653",
      type: "out",
      fee: "0.001",
    },
    {
      from: "bridge2",
      to: "mixer3",
      amount: "137,653",
      currency: "USDC",
      date: "2023-11-05T13:33:51Z", // Use ISO format with Z for UTC
      txHash: "f6e5f6789012345678901234567890123456789012345678901234567890a1b2c3d4",
      usdValue: "$137,653",
      type: "out",
      fee: "0.001",
    },
    // Second test pass-through scenario: A -> B -> C (where B is pass-through)
    {
      from: "hacker1",
      to: "passthrough2",
      amount: "5",
      currency: "BTC",
      date: "2023-04-28T00:00:00Z", // Use ISO format with Z for UTC
      txHash: "c3d4e5f6789012345678901234567890123456789012345678901234567890a1b2",
      usdValue: "$136,000",
      type: "out",
      fee: "0.001",
    },
    {
      from: "passthrough2",
      to: "mixer2",
      amount: "5",
      currency: "BTC",
      date: "2023-04-28T00:00:00Z", // Use ISO format with Z for UTC
      txHash: "d4e5f6789012345678901234567890123456789012345678901234567890a1b2c3",
      usdValue: "$136,000",
      type: "out",
      fee: "0.001",
    },
    // Multiple transactions from exchange to hacker wallet
    {
      from: "exchange1",
      to: "hacker1",
      amount: "4.765176",
      currency: "BTC",
      date: "2023-04-28T00:00:00Z", // Use ISO format with Z for UTC
      txHash: "e5f6789012345678901234567890123456789012345678901234567890a1b2c3d4",
      usdValue: "$129,847",
      type: "out",
      fee: "0.001",
    },
    {
      from: "exchange1",
      to: "hacker1",
      amount: "3.437783",
      currency: "BTC",
      date: "2023-04-28T00:00:00Z", // Use ISO format with Z for UTC
      txHash: "d4e5f6789012345678901234567890123456789012345678901234567890a1b2c3",
      usdValue: "$93,521",
      type: "out",
      fee: "0.0008",
    },
    {
      from: "exchange1",
      to: "hacker1",
      amount: "0.48",
      currency: "BTC",
      date: "2023-04-28T00:00:00Z", // Use ISO format with Z for UTC
      txHash: "e5f6789012345678901234567890123456789012345678901234567890a1b2c3d4",
      usdValue: "$13,056",
      type: "out",
      fee: "0.0005",
    },
    // Pass-through from hacker to mixer (input ~8.68, output ~8.67 after fees)
    {
      from: "hacker1",
      to: "mixer1",
      amount: "10",
      currency: "BTC",
      date: "2023-04-29T00:00:00Z", // Use ISO format with Z for UTC
      txHash: "f6789012345678901234567890123456789012345678901234567890a1b2c3d4e5",
      usdValue: "$272,000",
      type: "out",
      fee: "0.002",
    },
    {
      from: "hacker1",
      to: "mixer1",
      amount: "1",
      currency: "BTC",
      date: "2023-04-29T00:00:00Z", // Use ISO format with Z for UTC
      txHash: "6789012345678901234567890123456789012345678901234567890a1b2c3d4e5f",
      usdValue: "$27,200",
      type: "out",
      fee: "0.001",
    },
    // Multiple outputs from mixer1 to other mixers
    {
      from: "mixer1",
      to: "mixer2",
      amount: "10",
      currency: "BTC",
      date: "2023-04-30T00:00:00Z", // Use ISO format with Z for UTC
      txHash: "789012345678901234567890123456789012345678901234567890a1b2c3d4e5f6",
      usdValue: "$272,000",
      type: "out",
    },
    {
      from: "mixer2",
      to: "mixer3",
      amount: "10",
      currency: "BTC",
      date: "2023-05-01T00:00:00Z", // Use ISO format with Z for UTC
      txHash: "89012345678901234567890123456789012345678901234567890a1b2c3d4e5f67",
      usdValue: "$272,000",
      type: "out",
    },
    // Multiple transactions from center to mixer1
    {
      from: "center",
      to: "mixer1",
      amount: "2.5",
      currency: "BTC",
      date: "2023-04-30T00:00:00Z", // Use ISO format with Z for UTC
      txHash: "9012345678901234567890123456789012345678901234567890a1b2c3d4e5f678",
      usdValue: "$68,000",
      type: "out",
    },
    {
      from: "center",
      to: "mixer1",
      amount: "1.8",
      currency: "BTC",
      date: "2023-04-30T00:00:00Z", // Use ISO format with Z for UTC
      txHash: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      usdValue: "$48,960",
      type: "out",
    },
    {
      from: "center",
      to: "mixer1",
      amount: "0.7",
      currency: "BTC",
      date: "2023-04-30T00:00:00Z", // Use ISO format with Z for UTC
      txHash: "b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1",
      usdValue: "$19,040",
      type: "out",
    },
  ])

  // Removed the problematic updateNodeData useEffect that was causing infinite re-renders

  useEffect(() => {
    const timer = setTimeout(() => {}, 300) // Wait for transition to complete
    return () => clearTimeout(timer)
  }, [leftPanelCollapsed])

  const handleNodeSelect = async (address: string, nodeData?: any) => {
    console.log('🔍 handleNodeSelect called with:', { address, nodeData });
    setSelectedAddress(address)
    setSelectedNode(nodeData)
    
    // Fetch real data for the selected node if it's not a custom node
    console.log('Checking if should fetch real data:', { 
      hasNodeData: !!nodeData, 
      nodeType: nodeData?.type, 
      isNotCustom: nodeData?.type !== 'custom', 
      hasAddress: !!address 
    });
    if (nodeData && nodeData.type !== 'custom' && address) {
      try {
        const realNodeData = await fetchNodeData(address)
        
        // Preserve original transaction count if API returns 0 but we have existing data
        const preserveTransactions = (originalCount: number, apiCount: number) => {
          if (originalCount > 0 && apiCount === 0) {
            console.log(`Preserving original transaction count: ${originalCount} (API returned 0)`);
            return originalCount;
          }
          return apiCount;
        };
        
        const finalTransactions = preserveTransactions(nodeData.transactions || 0, realNodeData.transactions);
        const finalAvailableTransactions = preserveTransactions(nodeData.availableTransactions || 0, realNodeData.transactions);
        
        // Update the selected node with real data
        setSelectedNode((prev: any) => ({
          ...prev,
          label: realNodeData.entityName,
          type: realNodeData.entityType,
          risk: realNodeData.riskLevel,
          balance: realNodeData.balance,
          transactions: finalTransactions,
          logo: realNodeData.logo,
          availableTransactions: finalAvailableTransactions,
          entity_type: realNodeData.entityTypeFromSOT,
          entity_tags: realNodeData.entityTags
        }))
        
        // Also update the node in the nodes array
        setNodes(prev => prev.map(node => 
          node.id === `searched_${address}` || node.address === address
            ? {
                ...node,
                label: realNodeData.entityName,
                type: realNodeData.isPassThrough ? "passthrough" : realNodeData.entityType,
                risk: realNodeData.riskLevel,
                balance: realNodeData.balance,
                transactions: finalTransactions,
                logo: realNodeData.logo,
                availableTransactions: finalAvailableTransactions,
                entity_type: realNodeData.entityTypeFromSOT,
                entity_tags: realNodeData.entityTags,
                isPassThrough: realNodeData.isPassThrough
              }
            : node
        ))
      } catch (error) {
        console.error('Error fetching real data for selected node:', error)
        // Keep the existing node data if fetch fails
      }
    }
  }

  const handleCustomNodeCreate = (nodeData: {
    label: string
    logo: string
    currencyCode: string
    risk: "low" | "medium" | "high"
    notes?: string
    x: number
    y: number
  }) => {
    const newNode = {
      id: `custom_${Date.now()}`,
      x: nodeData.x,
      y: nodeData.y,
      label: nodeData.label,
      originalLabel: nodeData.label,
      address: `custom_${Date.now()}`,
      type: "custom" as const,
      risk: nodeData.risk,
      logo: nodeData.logo,
      chainLogo: nodeData.logo, // Use the same logo as chain logo for custom nodes
      balance: `0 ${nodeData.currencyCode}`,
      transactions: 0,
      availableTransactions: 0,
      notes: nodeData.notes ? [{
        id: `note_${Date.now()}`,
        userId: "current_user", // This would come from your user system
        userName: "Current User", // This would come from your user system
        content: nodeData.notes,
        timestamp: new Date().toISOString()
      }] : [],
    }
    setNodes(prev => {
      const newNodes = [...prev, newNode]
      // saveCustomNodes(newNodes) // Disabled - now handled by project system
      return ensureUniqueNodes(newNodes)
    })
  }

  const handlePlaceMode = (nodeData: {
    label: string
    logo: string
    currencyCode: string
    risk: "low" | "medium" | "high"
    notes?: string
  }) => {
    // Store the current dialog data for placement
    setPlacementMode({ active: true, nodeData })
  }

  const handlePlacement = (x: number, y: number) => {
    if (placementMode?.active && placementMode.nodeData) {
      // Create node at clicked position with stored dialog data
      const newNode = {
        id: `custom_${Date.now()}`,
        x,
        y,
        label: placementMode.nodeData.label,
        originalLabel: placementMode.nodeData.label,
        address: `custom_${Date.now()}`,
        type: "custom" as const,
        risk: placementMode.nodeData.risk,
        logo: placementMode.nodeData.logo,
        chainLogo: placementMode.nodeData.logo, // Use the same logo as chain logo for custom nodes
        balance: `0 ${placementMode.nodeData.currencyCode}`,
        transactions: 0,
        availableTransactions: 0,
        notes: placementMode.nodeData.notes ? [{
          id: `note_${Date.now()}`,
          userId: "current_user", // This would come from your user system
          userName: "Current User", // This would come from your user system
          content: placementMode.nodeData.notes,
          timestamp: new Date().toISOString()
        }] : [],
      }
      setNodes(prev => {
        const newNodes = [...prev, newNode]
        // saveCustomNodes(newNodes) // Disabled - now handled by project system
        return ensureUniqueNodes(newNodes)
      })
      setPlacementMode(null)
    }
  }

  const handleConnectionCreate = (connectionData: {
    from: string
    to: string
    amount: string
    note?: string
    currency: string
    date?: string
    direction: "in" | "out"
    hideTxId?: boolean
  }) => {
    // Determine the actual connection direction based on the direction field
    // If direction is "out", flow goes from source to target
    // If direction is "in", flow goes from target to source
    const actualFrom = connectionData.direction === "out" ? connectionData.from : connectionData.to
    const actualTo = connectionData.direction === "out" ? connectionData.to : connectionData.from
    
    const newConnection = {
      from: actualFrom,
      to: actualTo,
      amount: connectionData.amount,
      currency: connectionData.currency,
      date: connectionData.date || new Date().toISOString(),
      txHash: connectionData.hideTxId ? undefined : generateUniqueTxHash(),
      usdValue: connectionData.amount ? `$${parseFloat(connectionData.amount).toLocaleString()}` : "",
      type: connectionData.direction,
      note: connectionData.note,
    }
    
    setConnections(prev => {
      const updatedConnections = [...prev, newConnection]
      // saveConnections(updatedConnections) // Disabled - now handled by project system
      return updatedConnections
    })
  }

  const handleConnectionUpdate = (connectionData: {
    from: string
    to: string
    amount: string
    note?: string
    currency: string
    date?: string
    direction: "in" | "out"
    hideTxId?: boolean
    originalTxHash?: string
  }) => {
    // Determine the actual connection direction based on the direction field
    // If direction is "out", flow goes from source to target
    // If direction is "in", flow goes from target to source
    const actualFrom = connectionData.direction === "out" ? connectionData.from : connectionData.to
    const actualTo = connectionData.direction === "out" ? connectionData.to : connectionData.from
    
    setConnections(prev => {
      const updatedConnections = prev.map(conn => {
        if (conn.txHash === connectionData.originalTxHash) {
          return {
            ...conn,
            from: actualFrom,
            to: actualTo,
            amount: connectionData.amount,
            currency: connectionData.currency,
            date: connectionData.date || conn.date,
            txHash: connectionData.hideTxId ? undefined : conn.txHash || generateUniqueTxHash(),
            usdValue: connectionData.amount ? `$${parseFloat(connectionData.amount).toLocaleString()}` : "",
            type: connectionData.direction,
            note: connectionData.note,
          }
        }
        return conn
      })
      
      // saveConnections(updatedConnections) // Disabled - now handled by project system
      return updatedConnections
    })
  }

  const handleConnectionDelete = (txHash: string) => {
    setConnections(prev => {
      const updatedConnections = prev.filter(conn => conn.txHash !== txHash)
      // saveConnections(updatedConnections) // Disabled - now handled by project system
      return updatedConnections
    })
  }

  const handleAddNote = (nodeId: string, content: string) => {
    console.log('handleAddNote called with:', { nodeId, content })
    
    const newNote = {
      id: `note_${Date.now()}`,
      userId: "current_user", // This would come from your user system
      userName: "Current User", // This would come from your user system
      content: content,
      timestamp: new Date().toISOString()
    }

    console.log('New note object:', newNote)

    setNodes(prev => {
      console.log('Previous nodes:', prev)
      const updatedNodes = prev.map(node => {
        if (node.id === nodeId) {
          console.log('Updating node:', node.id)
          const updatedNode = {
            ...node,
            notes: [...(node.notes || []), newNote]
          }
          
          // Update selectedNode if it's the same node
          if (selectedNode && selectedNode.id === nodeId) {
            setSelectedNode(updatedNode)
          }
          
          return updatedNode
        }
        return node
      })
      console.log('Updated nodes:', updatedNodes)
      return updatedNodes
    })
  }

  const handleUpdateNodeLabel = (nodeId: string, newLabel: string) => {
    console.log('handleUpdateNodeLabel called with:', { nodeId, newLabel })
    
    setNodes(prev => {
      const updatedNodes = prev.map(node => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            label: newLabel,
            originalLabel: node.originalLabel || node.label, // Preserve original label if not already set
            isUserDefinedLabel: true
          }
          
          // Update selectedNode if it's the same node
          if (selectedNode && selectedNode.id === nodeId) {
            setSelectedNode(updatedNode)
          }
          
          return updatedNode
        }
        return node
      })
      return updatedNodes
    })
  }

  const handleRevertNodeLabel = (nodeId: string) => {
    console.log('handleRevertNodeLabel called with:', { nodeId })
    
    setNodes(prev => {
      const updatedNodes = prev.map(node => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            label: node.originalLabel || node.label,
            isUserDefinedLabel: false
          }
          
          // Update selectedNode if it's the same node
          if (selectedNode && selectedNode.id === nodeId) {
            setSelectedNode(updatedNode)
          }
          
          return updatedNode
        }
        return node
      })
      return updatedNodes
    })
  }

  const handleAddNoteToAllVisible = (content: string) => {
    console.log('handleAddNoteToAllVisible called with:', content)
    
    const newNote = {
      id: `note_${Date.now()}`,
      userId: "current_user",
      userName: "Current User",
      content: content,
      timestamp: new Date().toISOString()
    }

    // Get visible nodes (excluding pass-through nodes if they're hidden)
    const visibleNodes = hidePassThrough 
      ? nodes.filter(node => !node.isPassThrough)
      : nodes

    console.log('Adding note to visible nodes:', visibleNodes.map(n => n.id))

    setNodes(prev => {
      const updatedNodes = prev.map(node => {
        // Only add note to visible nodes
        const isVisible = hidePassThrough ? !node.isPassThrough : true
        
        if (isVisible) {
          const updatedNode = {
            ...node,
            notes: [...(node.notes || []), newNote]
          }
          
          // Update selectedNode if it's currently selected
          if (selectedNode && selectedNode.id === node.id) {
            setSelectedNode(updatedNode)
          }
          
          return updatedNode
        }
        return node
      })
      return updatedNodes
    })
  }

  const handleLoadWorkspace = async (workspace: Workspace, versionId?: string) => {
    // Guard: If the current state is a fresh single-node investigation, do not auto-load
    if (
      nodes.length === 1 &&
      connections.length === 0 &&
      nodes[0]?.id === selectedAddress &&
      !versionId // Only block auto-loads, not explicit user loads
    ) {
      console.log('Guard: Prevented auto-load of workspace after new investigation')
      return
    }
    try {
      // Create a wrapper function that ensures unique nodes
      const setNodesWithUniqueness = (loadedNodes: any[]) => {
        const uniqueNodes = ensureUniqueNodes(loadedNodes)
        if (uniqueNodes.length !== loadedNodes.length) {
          console.log('Filtered out', loadedNodes.length - uniqueNodes.length, 'duplicate nodes when loading workspace')
        }
        setNodes(uniqueNodes)
      }
      
      const success = await loadVersion(
        workspace.id,
        versionId || 'master',
        setNodesWithUniqueness,
        setConnections,
        setSelectedAddress,
        setSelectedNode,
        setZoom,
        setPan,
        setHidePassThrough
      )
      if (success) {
        setCurrentWorkspaceId(workspace.id)
        setCurrentVersionId(versionId || 'master')
        setCurrentWorkspaceName(workspace.name)
        setSearchQuery("") // Clear search query when loading workspace
        console.log('Successfully loaded workspace:', workspace.name)
        console.log('Set currentWorkspaceName to:', workspace.name)
      } else {
        console.error('Failed to load workspace:', workspace.name)
      }
    } catch (error) {
      console.error('Error loading workspace:', error)
    }
  }

  const handleQuickSave = async (workspaceId: string, state: any) => {
    console.log('handleQuickSave called with workspaceId:', workspaceId)
    console.log('State received:', state)
    
    try {
      // Format state to match the expected graphState structure
      const graphState = {
        viewport: { x: state.pan?.x || 0, y: state.pan?.y || 0, zoom: state.zoom || 1 },
        nodes: state.nodes || [],
        edges: state.connections || [],
        selectedAddress: state.selectedAddress,
        selectedNode: state.selectedNode,
        hidePassThrough: state.hidePassThrough || false,
        customNodes: [],
        nodeStyles: {},
        connectionStyles: {},
        drawingElements: [],
        selectedElements: [],
        filters: {},
        settings: {}
      }
      
      console.log('Formatted graphState:', graphState)
      console.log('Calling updateMasterVersion...')
      
      await updateMasterVersion(workspaceId, graphState, 'quick')
      console.log('Quick save completed successfully')
      setCurrentVersionId('master') // Set current version to master after quick save
      setRefreshWorkspaceManager(prev => prev + 1) // Trigger refresh of workspace manager
    } catch (error) {
      console.error('Error during quick save:', error)
      throw error
    }
  }

  const handleNewInvestigation = () => {
    // Check for unsaved changes
    const hasUnsavedChanges = autoSaveManager.hasUnsavedWork()
    const hasNodes = nodes.length > 0
    
    if (hasUnsavedChanges || hasNodes) {
      // Open modal to handle saving and new investigation
      setNewInvestigationModalOpen(true)
    } else {
      // No unsaved changes, start new investigation immediately
      // If we have a current workspace, preserve it but clear the version
      if (currentWorkspaceId) {
        // Clear state but keep workspace context for new version creation
        setNodes([])
        setConnections([])
        setSelectedAddress("")
        setSelectedNode(null)
        setZoom(1)
        setPan({ x: 0, y: 0 })
        setHidePassThrough(false)
        setSearchQuery("")
        setCurrentVersionId(undefined) // Clear version but keep workspace
        autoSaveManager.clearAutoSavedState()
        console.log('Started new investigation - cleared state but kept workspace:', currentWorkspaceId)
      } else {
        // No workspace, start completely fresh
        startNewInvestigation()
      }
    }
  }

  const startNewInvestigation = () => {
    // Clear current state - start completely empty
    setNodes([])
    setConnections([])
    setSelectedAddress("")
    setSelectedNode(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setHidePassThrough(false)
    setSearchQuery("")
    
    // Clear project state completely
    setCurrentWorkspaceId(undefined)
    setCurrentVersionId(undefined)
    setCurrentWorkspaceName(undefined)
    
    // Clear auto-saved state
    autoSaveManager.clearAutoSavedState()
    
    console.log('Started new investigation - cleared all state')
  }

  // Helper function to ensure nodes are unique
  const ensureUniqueNodes = (nodes: any[]) => {
    const seenIds = new Set()
    const seenAddresses = new Set()
    const uniqueNodes = []
    
    for (const node of nodes) {
      if (!seenIds.has(node.id) && !seenAddresses.has(node.address)) {
        seenIds.add(node.id)
        seenAddresses.add(node.address)
        uniqueNodes.push(node)
      } else {
        console.log('Filtered out duplicate node:', node.id, node.address)
      }
    }
    
    return uniqueNodes
  }

  // Helper function to fetch and populate node data with real attribution
  const fetchNodeData = async (address: string) => {
    try {
      console.log('Fetching real data for address:', address);
      
      // Fetch all data in parallel
      console.log('Starting API calls for address:', address);
      const [addressData, attributionData, riskData, transactionData] = await Promise.all([
        fetchAddressData(address).catch((error) => {
          console.error('Address data API failed for', address, ':', error);
          return null;
        }),
        fetchAttributionData([address]).catch((error) => {
          console.error('Attribution data API failed for', address, ':', error);
          return null;
        }),
        fetchRiskScoringData(address).catch((error) => {
          console.error('Risk scoring API failed for', address, ':', error);
          return null;
        }),
        fetchTransactionData(address, 1, 100).catch((error) => {
          console.error('Transaction data API failed for', address, ':', error);
          return null;
        }) // Fetch up to 100 transactions to get accurate count
      ]);
      console.log('All API calls completed for address:', address);

      // Process attribution data
      let entityName = "Unknown Entity";
      let entityType = "wallet";
      let logo = undefined;
      let entityTypeFromSOT = undefined;
      let entityTags = [];
      
      if (attributionData?.data && attributionData.data.length > 0) {
        const entity = attributionData.data[0].entity;
        if (entity) {
          // Try to fetch SOT data for this entity to get proper name and entity_type
          try {
            const sotData = await fetchSOTData();
            if (sotData && Array.isArray(sotData)) {
              const sotEntry = sotData.find(entry => entry.entity_id === entity);
              if (sotEntry) {
                // Use proper_name from SOT data if available, otherwise fall back to entity name
                entityName = sotEntry.proper_name || entity.charAt(0).toUpperCase() + entity.slice(1);
                entityTypeFromSOT = sotEntry.entity_type;
                entityTags = sotEntry.entity_tags || [];
                console.log('Found SOT data for entity:', entity, {
                  proper_name: sotEntry.proper_name,
                  entity_type: entityTypeFromSOT,
                  entity_tags: entityTags
                });
              } else {
                // Fall back to entity name if no SOT data found
                entityName = entity.charAt(0).toUpperCase() + entity.slice(1);
                console.log('No SOT data found for entity:', entity, 'using fallback name');
              }
            }
          } catch (error) {
            console.log('Could not fetch SOT data for entity:', entity, error);
            // Fall back to entity name if SOT fetch fails
            entityName = entity.charAt(0).toUpperCase() + entity.slice(1);
          }
          
          // Determine entity type based on entity name or other logic (fallback)
          if (entity.toLowerCase().includes('exchange') || 
              ['binance', 'coinbase', 'kraken', 'bitfinex', 'huobi', 'okx'].includes(entity.toLowerCase())) {
            entityType = "exchange";
          } else if (entity.toLowerCase().includes('mixer') || 
                     ['wasabi', 'samourai', 'joinmarket'].includes(entity.toLowerCase())) {
            entityType = "mixer";
          } else if (entity.toLowerCase().includes('defi') || 
                     ['uniswap', 'sushiswap', 'aave', 'compound'].includes(entity.toLowerCase())) {
            entityType = "defi";
          } else if (entity.toLowerCase().includes('service') || 
                     ['stripe', 'paypal', 'cashapp'].includes(entity.toLowerCase())) {
            entityType = "service";
          }
          logo = getSafeLogoPath(entity);
        }
      }

      // Process risk data
      let riskLevel = "medium";
      if (riskData?.success && riskData.data) {
        const overallRisk = riskData.data.overallRisk;
        riskLevel = overallRisk > 0.4 ? 'high' : overallRisk > 0.2 ? 'medium' : 'low';
      }

      // Process address data
      let balance = "0.00000000 BTC";
      let transactions = 0;
      console.log('Address data response for', address, ':', addressData);
      console.log('Transaction data response for', address, ':', transactionData);
      
      if (addressData?.data) {
        balance = addressData.data.balance ? `${(addressData.data.balance / 100000000).toFixed(8)} BTC` : "0.00000000 BTC";
        transactions = addressData.data.tx_count || 0;
        console.log('Processed address data for', address, ':', { 
          balance, 
          transactions, 
          tx_count: addressData.data.tx_count,
          raw_data: addressData.data 
        });
      } else {
        console.log('No address data received for', address, ', using defaults');
      }
      
      // Use transaction data to get accurate transaction count and detect pass-through nodes
      let isPassThrough = false;
      if (transactionData?.txs && Array.isArray(transactionData.txs)) {
        const actualTransactionCount = transactionData.txs.length;
        console.log('✅ FIXED: Actual transaction count from transaction data for', address, ':', actualTransactionCount);
        console.log('Transaction data structure:', {
          dataType: typeof transactionData.txs,
          isArray: Array.isArray(transactionData.txs),
          length: transactionData.txs.length,
          sampleTransaction: transactionData.txs[0]
        });
        if (actualTransactionCount > 0) {
          transactions = actualTransactionCount;
          
          // Detect pass-through nodes based on transaction patterns
          // A true pass-through node should have exactly 2 transactions: 1 incoming and 1 outgoing
          if (actualTransactionCount === 2) {
            let totalIncoming = 0;
            let totalOutgoing = 0;
            let incomingTx: any = null;
            let outgoingTx: any = null;
            
            transactionData.txs.forEach((tx: any) => {
              // Check if this address is in inputs (outgoing)
              const isInInputs = tx.inputs?.some((input: any) => input.addr === address);
              // Check if this address is in outputs (incoming)
              const isInOutputs = tx.outputs?.some((output: any) => output.addr === address);
              
              if (isInInputs && !isInOutputs) {
                // This is an outgoing transaction
                const outgoingAmount = tx.inputs
                  .filter((input: any) => input.addr === address)
                  .reduce((sum: number, input: any) => sum + (input.amt || 0), 0);
                totalOutgoing += outgoingAmount;
                outgoingTx = tx;
              } else if (isInOutputs && !isInInputs) {
                // This is an incoming transaction
                const incomingAmount = tx.outputs
                  .filter((output: any) => output.addr === address)
                  .reduce((sum: number, output: any) => sum + (output.amt || 0), 0);
                totalIncoming += incomingAmount;
                incomingTx = tx;
              }
            });
            
            // Consider it a pass-through if:
            // 1. Amount difference is less than 5% (accounting for fees)
            // 2. Exactly 2 transactions (1 incoming, 1 outgoing)
            // 3. Both transactions exist
            if (totalIncoming > 0 && totalOutgoing > 0 && incomingTx && outgoingTx) {
              const difference = Math.abs(totalIncoming - totalOutgoing);
              const threshold = totalIncoming * 0.05;
              const amountCondition = difference <= threshold;
              
              // Count distinct counterparties to ensure it's a simple pass-through
              const counterparties = new Set();
              
              // Add counterparties from incoming transaction
              incomingTx.inputs?.forEach((input: any) => {
                if (input.addr !== address) {
                  counterparties.add(input.addr);
                }
              });
              
              // Add counterparties from outgoing transaction
              outgoingTx.outputs?.forEach((output: any) => {
                if (output.addr !== address) {
                  counterparties.add(output.addr);
                }
              });
              
              // Only consider pass-through if there are exactly 2 counterparties
              // (one for incoming, one for outgoing - same entity)
              const hasExactlyTwoCounterparties = counterparties.size === 2;
              
              isPassThrough = amountCondition && hasExactlyTwoCounterparties;
              
              console.log('Pass-through detection for', address, ':', {
                totalIncoming: totalIncoming / 100000000, // Convert to BTC
                totalOutgoing: totalOutgoing / 100000000, // Convert to BTC
                difference: difference / 100000000,
                threshold: threshold / 100000000,
                amountCondition,
                counterpartyCount: counterparties.size,
                counterparties: Array.from(counterparties),
                hasExactlyTwoCounterparties,
                isPassThrough
              });
            }
          }
        }
      } else if (transactionData?.data && Array.isArray(transactionData.data)) {
        // Fallback to data structure if txs doesn't exist
        const actualTransactionCount = transactionData.data.length;
        console.log('Actual transaction count from transaction data (fallback) for', address, ':', actualTransactionCount);
        if (actualTransactionCount > 0) {
          transactions = actualTransactionCount;
        }
      } else {
        console.log('No valid transaction data for', address, ':', {
          hasTransactionData: !!transactionData,
          hasTxs: !!transactionData?.txs,
          hasData: !!transactionData?.data,
          txsType: typeof transactionData?.txs,
          dataType: typeof transactionData?.data,
          txsIsArray: Array.isArray(transactionData?.txs),
          dataIsArray: Array.isArray(transactionData?.data)
        });
      }

      // Update entity name for pass-through nodes if no entity data is available
      if (isPassThrough && entityName === "Unknown Entity") {
        entityName = "Pass-Through Node";
        entityType = "passthrough";
        console.log('Updated entity name for pass-through node:', address, 'to:', entityName);
      }

      return {
        entityName,
        entityType,
        logo,
        riskLevel,
        balance,
        transactions,
        entityTypeFromSOT,
        entityTags,
        isPassThrough
      };
    } catch (error) {
      console.error('Error fetching node data:', error);
      captureApiError(error, 'NodeData-Fetch');
      return {
        entityName: "Unknown Entity",
        entityType: "wallet",
        logo: undefined,
        riskLevel: "medium",
        balance: "0.00000000 BTC",
        transactions: 0,
        availableTransactions: 0
      };
    }
  };

  const handleAddressSearch = async (address: string) => {
    console.log('Searching for address:', address)
    console.log('Current workspace ID:', currentWorkspaceId)
    console.log('Current version ID:', currentVersionId)
    
    // Check if there are unsaved changes in the current workspace
    const hasUnsavedChanges = autoSaveManager.hasUnsavedWork()
    const hasNodes = nodes.length > 0
    
    // If there are unsaved changes and nodes, prompt user to save current workspace
    if (hasUnsavedChanges && hasNodes) {
      // Store the address to search for after user makes their choice
      setPendingAddressSearch(address)
      setAddressSearchModalOpen(true)
      return
    }
    
    // Proceed with address search
    await performAddressSearch(address)
  }

  const performAddressSearch = async (address: string) => {
    console.log('Performing address search for:', address)
    
    // Fetch real data for the address
    const nodeData = await fetchNodeData(address);
    
    // Create a new node for the searched address with real data
    const newNode = {
      id: `searched_${address}`,
      x: 1500, // Move much further right to avoid side panel
      y: 1000, // Center vertically
      label: nodeData.entityName,
      originalLabel: nodeData.entityName,
      address: address,
      type: nodeData.entityType,
      risk: nodeData.riskLevel,
      balance: nodeData.balance,
      transactions: nodeData.transactions,
      availableTransactions: nodeData.transactions, // Use actual transaction count from API
      logo: nodeData.logo,
      chainLogo: address.startsWith('0x') ? "/logos/eth.png" : "/logos/btc.png",
      entity_type: nodeData.entityTypeFromSOT,
      entity_tags: nodeData.entityTags,
      notes: []
    }
    
    // Check if we should create a new version (when we have a workspace but no current version)
    if (currentWorkspaceId && !currentVersionId) {
      // 1. Demote current Master to historical version
      try {
        const { getWorkspace, renameVersion, saveVersion, promoteVersion } = await import('@/lib/workspace-utils')
        const ws = await getWorkspace(currentWorkspaceId)
        if (ws && ws.masterVersionId) {
          // Rename current Master to timestamped version
          const timestamp = new Date().toLocaleString()
          await renameVersion(currentWorkspaceId, ws.masterVersionId, `Previous Work - ${timestamp}`)
        }
        // 2. Save new single-node state as new Master
        const newState = {
          nodes: [newNode],
          edges: [], // Add the missing edges property
          connections: [],
          selectedAddress: address,
          selectedNode: newNode,
          zoom: 1,
          pan: { x: -600, y: -200 },
          hidePassThrough: false
        }
        const newVersion = await saveVersion(
          currentWorkspaceId,
          newState,
          'manual',
          'Master',
          `Fresh start with address ${address}`
        )
        // Promote this new version to Master
        await promoteVersion(currentWorkspaceId, newVersion.id)
        setNodes(ensureUniqueNodes([newNode]))
        setConnections([])
        setSelectedAddress(address)
        setSelectedNode(newNode)
        setZoom(1)
        setPan({ x: -1200, y: -700 })
        setHidePassThrough(false)
        setSearchQuery("")
        setCurrentVersionId(newVersion.id)
        setRefreshWorkspaceManager(prev => prev + 1)
        console.log('Created and promoted new Master version:', newVersion.id)
      } catch (error) {
        console.error('Error creating new Master version:', error)
      }
    } else if (currentWorkspaceId && currentVersionId) {
      // Add to existing investigation
      console.log('Adding to existing investigation in workspace:', currentWorkspaceId)
      setNodes(prevNodes => {
        // Check if node already exists to prevent duplicates
        const existingNode = prevNodes.find(node => 
          node.id === `searched_${address}` || node.address === address
        )
        if (existingNode) {
          console.log('Node already exists, updating instead of adding:', address)
          return prevNodes.map(node => 
            node.id === `searched_${address}` || node.address === address
              ? { ...node, ...newNode }
              : node
          )
        }
        return ensureUniqueNodes([...prevNodes, newNode])
      })
      setSelectedAddress(address)
      setSelectedNode(newNode)
      setZoom(1)
      setPan({ x: -1200, y: -700 })
      setSearchQuery("")
    } else {
      // Start completely new investigation
      console.log('Starting completely new investigation')
      setNodes(ensureUniqueNodes([newNode]))
      setConnections([])
      setSelectedAddress(address)
      setSelectedNode(newNode)
      setZoom(1)
      setPan({ x: -1200, y: -700 })
      setHidePassThrough(false)
      setSearchQuery("")
      setCurrentWorkspaceId(undefined)
      setCurrentVersionId(undefined)
      // Prompt user to save their new investigation
      setNewInvestigationModalOpen(true)
      console.log('Started new investigation with address:', address)
    }
  }

  // New function to create a new version with just the searched address
  const createNewVersionWithAddress = async (address: string, workspaceId: string) => {
    console.log('Creating new version with address:', address, 'in workspace:', workspaceId)
    
    // Create a new node for the searched address
    const newNode = {
      id: `searched_${address}`,
      x: 1000,
      y: 400,
      label: "Target Wallet",
      originalLabel: "Target Wallet",
      address: address,
      type: "target",
      risk: "high",
      balance: "0.19863498 BTC",
      transactions: 464,
      availableTransactions: 464,
      chainLogo: address.startsWith('0x') ? "/logos/eth.png" : "/logos/btc.png",
      notes: []
    }
    
    // Create the new state with just this node
    const newState = {
      nodes: [newNode],
      connections: [],
      selectedAddress: address,
      selectedNode: newNode,
      zoom: 1,
      pan: { x: -1200, y: -700 },
      hidePassThrough: false
    }
    
    try {
      // Import the saveVersion function
      const { saveVersion } = await import('@/lib/workspace-utils')
      
      console.log('About to create new version with state:', newState)
      
      // Create a new version with this state
      const newVersion = await saveVersion(
        workspaceId,
        newState,
        'manual',
        `New Investigation - ${address.substring(0, 8)}...`,
        `Fresh start with address ${address}`
      )
      
      console.log('Successfully created new version:', newVersion.id)
      
      // Set the state directly instead of loading the version
      setNodes(ensureUniqueNodes([newNode]))
      setConnections([])
      setSelectedAddress(address)
      setSelectedNode(newNode)
      setZoom(1)
      setPan({ x: -1200, y: -700 })
      setHidePassThrough(false)
      setSearchQuery("")
      
      // Update the current version ID to the new version
      setCurrentVersionId(newVersion.id)
      
      // Refresh the workspace manager to show the new version
      setRefreshWorkspaceManager(prev => prev + 1)
      
      console.log('Created and loaded new version:', newVersion.id)
    } catch (error) {
      console.error('Error creating new version:', error)
    }
  }

  const handleOpenWorkspaceManager = () => {
    // Check if there are unsaved changes
    const hasUnsavedChanges = autoSaveManager.hasUnsavedWork()
    const hasNodes = nodes.length > 0
    
    // If there are unsaved changes, show a warning but still open workspace manager
    if (hasUnsavedChanges && hasNodes) {
      const confirmed = confirm(
        "You have unsaved changes. Opening the workspace manager may cause you to lose your current work.\n\n" +
        "Do you want to continue?"
      )
      if (!confirmed) {
        return
      }
    }
    
    // Open workspace manager directly
    setWorkspaceManagerOpen(true)
  }

  const handleStartNewInvestigationFromWorkspace = async (workspaceId: string) => {
    // Check if there are unsaved changes or nodes to save
    const hasNodes = nodes.length > 0
    const hasUnsavedChanges = autoSaveManager.hasUnsavedWork()
    
    if (hasNodes || hasUnsavedChanges) {
      // Save current state as a version before starting new investigation
      try {
        const currentState = {
          nodes,
          connections,
          selectedAddress,
          selectedNode,
          zoom,
          pan,
          hidePassThrough
        }
        
        // Import the saveVersion function
        const { saveVersion } = await import('@/lib/workspace-utils')
        
        // Create a version with the current state
        const savedVersion = await saveVersion(
          workspaceId,
          currentState,
          'manual',
          `Previous Work - ${new Date().toLocaleString()}`,
          'Auto-saved before starting new investigation'
        )
        
        console.log('Saved current work as version:', savedVersion.id)
      } catch (error) {
        console.error('Error saving current work as version:', error)
        // Continue anyway, but log the error
      }
    }
    
    // Set the workspace ID but don't load any version yet
    setCurrentWorkspaceId(workspaceId)
    setCurrentVersionId(undefined)
    
    // Clear the current state to show the welcome screen
    setNodes([])
    setConnections([])
    setSelectedAddress("")
    setSelectedNode(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setHidePassThrough(false)
    setSearchQuery("")
    
    // Clear auto-saved state
    autoSaveManager.clearAutoSavedState()
    
    // Get workspace name for display
    const getWorkspaceName = async () => {
      try {
        const { getWorkspace } = await import('@/lib/workspace-utils')
        const workspace = await getWorkspace(workspaceId)
        if (workspace) {
          setCurrentWorkspaceName(workspace.name)
        }
      } catch (error) {
        console.error('Error getting workspace name:', error)
      }
    }
    getWorkspaceName()
    
    console.log('Started new investigation in workspace:', workspaceId)
  }

  // Mark state as saved when workspace is loaded
  useEffect(() => {
    if (currentWorkspaceId) {
      const currentState = {
        nodes,
        connections,
        selectedAddress,
        selectedNode,
        zoom,
        pan,
        hidePassThrough
      }
      autoSaveManager.markAsSaved(currentState)
    }
  }, [currentWorkspaceId, nodes, connections, selectedAddress, selectedNode, zoom, pan, hidePassThrough])

  // Set default selected node on component mount
  useEffect(() => {
    if (!selectedNode) {
      const defaultNode = nodes.find(node => node.id === "center")
      if (defaultNode) {
        setSelectedNode(defaultNode)
        setSelectedAddress(defaultNode.address)
      }
    }
  }, [nodes, selectedNode])

  // Migrate old data and load auto-saved work on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Migrate old workspace data to new format
        await migrateOldData()
        console.log('Data migration completed')
        
        // Disable auto-save manager to prevent conflicts with our new caching system
        // const autoSavedState = autoSaveManager.loadAutoSavedState()
        // if (autoSavedState) {
        //   // Show recovery dialog
        //   if (confirm("Found auto-saved work. Would you like to restore it?")) {
        //     setNodes(autoSavedState.nodes || [])
        //     setConnections(autoSavedState.connections || [])
        //     setSelectedAddress(autoSavedState.selectedAddress || "")
        //     setSelectedNode(autoSavedState.selectedNode || null)
        //     setZoom(autoSavedState.zoom || 1)
        //     setPan(autoSavedState.pan || { x: 0, y: 0 })
        //     setHidePassThrough(autoSavedState.hidePassThrough || false)
        //   } else {
        //     // Clear auto-saved state if user doesn't want to restore
        //     autoSaveManager.clearAutoSavedState()
        //   }
        // }
      } catch (error) {
        console.error('Error during app initialization:', error)
      }
    }
    
    initializeApp()
  }, [])



  // Note: Old localStorage functions are disabled in favor of the new IndexedDB-based project system
  // Custom nodes and connections are now managed through the project versions


  return (
    <div className="h-screen bg-background text-foreground relative overflow-hidden">
      {/* Network Graph - Full Screen Background */}
      <div className="absolute inset-0 z-0">
                    <NetworkGraph
              activeTool={activeDrawingTool}
              activeColor={activeColor}
              onNodeSelect={handleNodeSelect}
              onCustomNodeConnect={(nodeId) => setConnectionDialog({ open: true, sourceNodeId: nodeId })}
              nodes={nodes}
              setNodes={(newNodes) => {
                setNodes(newNodes);
                // Update selectedNode if it's the one being updated
                if (selectedNode) {
                  const updatedNode = typeof newNodes === 'function' 
                    ? newNodes(nodes).find(n => n.id === selectedNode.id)
                    : newNodes.find(n => n.id === selectedNode.id);
                  if (updatedNode && updatedNode.availableTransactions !== selectedNode.availableTransactions) {
                    setSelectedNode((prev: any) => ({ ...prev, availableTransactions: updatedNode.availableTransactions }));
                  }
                }
              }}
              connections={connections.filter(conn => !isSpamTransaction(conn))}
              setConnections={setConnections}
              hidePassThrough={hidePassThrough}
              hideSpam={hideSpam}
              zoom={zoom}
              setZoom={setZoom}
              pan={pan}
              setPan={setPan}
              onPlacement={placementMode?.active ? handlePlacement : undefined}
            />
      </div>

      {/* Top Header - Floating on top */}
      <header className="absolute top-0 left-0 right-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img 
                  src="/company-logo.png" 
                  alt="Company Logo" 
                  className="h-10 w-auto"
                  style={{ filter: 'var(--logo-filter, none)' }}
                />
                <div>
                  <h1 className="text-xl font-bold text-foreground">BlockScout Research</h1>
                  <div className="text-sm text-muted-foreground">Blockchain Transaction Flow Analysis</div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* New Investigation Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewInvestigation}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Investigation
              </Button>

              {/* Save Status */}
              <SaveStatus
                currentState={{
                  nodes,
                  connections,
                  selectedAddress,
                  selectedNode,
                  zoom,
                  pan,
                  hidePassThrough,
                  hideSpam
                }}
                onSaveWorkspace={() => {}} // No longer needed - both buttons use handleQuickSave
                currentWorkspaceId={currentWorkspaceId}
                onQuickSave={handleQuickSave}
                onOpenWorkspaceManager={() => setWorkspaceManagerOpen(true)}
              />

              {/* Workspace Manager Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenWorkspaceManager}
                className="flex items-center gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Workspaces
              </Button>


              
              <DrawingTools
                activeTool={activeDrawingTool}
                setActiveTool={setActiveDrawingTool}
                activeColor={activeColor}
                setActiveColor={setActiveColor}
                onAddCustomNode={() => setCustomNodeDialog({ open: true, position: { x: 400, y: 300 } })}
              />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Screen - Show when no nodes exist */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
          <div className="w-full min-h-full bg-background text-foreground font-['Inter'] px-4 py-6 lg:px-6 lg:py-8 max-w-none">
            <header className="mb-6 lg:mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-8 h-8">
                  <Network className="w-8 h-8 text-orange-500" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground font-['Inter']">FlowTrace</h1>
              </div>
            </header>
            
            <main className="font-['Inter']">
              <div className="mb-6 max-w-2xl">
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    className="w-full rounded-lg border transition-colors outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500/20 h-11 px-4 pr-12 border-gray-300 dark:border-gray-700 focus:border-orange-500" 
                    placeholder="Enter blockchain address (e.g., 0x1234... or bc1qxy2...)" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        if (isValidAddress(searchQuery) || searchQuery.length > 20) {
                          handleAddressSearch(searchQuery.trim())
                        }
                      }
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                    <Search className="w-5 h-5" />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                  <Network className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Welcome to FlowTrace</h3>
                <p className="text-muted-foreground mb-6 max-w-md">Trace cryptocurrency flows, analyze transaction patterns, and investigate blockchain addresses. Get comprehensive insights into fund movements, counterparty analysis, and risk assessment.</p>
              </div>
            </main>
          </div>
        </div>
      )}

      {/* Left Panel - Floating on top */}
      {nodes.length > 0 && (
        <div
          className={`absolute top-0 left-0 h-full z-20 transition-all duration-300 ${leftPanelCollapsed ? "w-0" : "w-[550px]"} border-r border-border bg-card/95 backdrop-blur-sm`}
          style={{ top: '88px', height: 'calc(100vh - 88px)' }}
        >
          <div className={`${leftPanelCollapsed ? "hidden" : "flex"} flex-col h-full`}>
            {/* Search Header */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search addresses, entities, or workspaces..."
                  className="pl-10 bg-background border-input text-foreground placeholder-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      // If it looks like an address, open workspace manager with search
                      if (isValidAddress(searchQuery) || searchQuery.length > 20) {
                        handleAddressSearch(searchQuery.trim())
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Tabbed Navigation */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 m-0">
                    <EntityPanel 
                      address={selectedAddress} 
                      selectedNode={selectedNode} 
                      connections={connections.filter(conn => !isSpamTransaction(conn))}
                      onConnectNode={(nodeId) => setConnectionDialog({ open: true, sourceNodeId: nodeId })}
                      availableNodes={nodes}
                      onAddNote={handleAddNote}
                      onUpdateNodeLabel={handleUpdateNodeLabel}
                      onRevertNodeLabel={handleRevertNodeLabel}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls Panel - Moves with left panel */}
      {nodes.length > 0 && (
        <div className={`absolute z-30 transition-all duration-300 ${leftPanelCollapsed ? "left-4" : "left-[570px]"}`} style={{ top: '112px' }}>
          <div className="flex items-center space-x-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-lg">
            {placementMode?.active && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded border border-blue-300 dark:border-blue-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Click to place node</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPlacementMode(null)}
                  className="h-6 w-6 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.min(zoom * 1.2, 3))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setZoom(Math.max(zoom / 1.2, 0.5))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
              className={showHelp ? "text-primary" : ""}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHidePassThrough(!hidePassThrough)}
              className={hidePassThrough ? "text-primary" : ""}
              title="Hide/Show Pass-through Wallets"
            >
              {hidePassThrough ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHideSpam(!hideSpam)}
              className={hideSpam ? "text-primary" : ""}
              title="Hide/Show Spam Transactions (under $1 after 2015-01-01)"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Current Project Name Pill */}
          <div className="mt-2">
            <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-full shadow-lg border border-blue-400/30 backdrop-blur-sm hover:shadow-xl transition-all duration-200">
              <Folder className="w-3 h-3 mr-2 text-white/90" />
              <span className="truncate max-w-32">
                {currentWorkspaceName || (currentWorkspaceId ? "Loading..." : "No Project")}
              </span>
              {currentVersionId && currentVersionId !== 'master' && (
                <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  {currentVersionId.substring(0, 8)}...
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Instructions */}
      {showHelp && (
        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-gray-100 shadow-lg max-w-sm z-40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Quick Help</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowHelp(false)} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1 text-gray-600 dark:text-gray-400">
            <div>• Double-click nodes to expand transactions</div>
            <div>• Double-click drawings to attach/detach from nodes</div>
            <div>• Click and drag to move drawings</div>
            <div>• Press Delete to remove selected items</div>
            <div>• Click red × on selected nodes to delete</div>
            <div>• Green triangles indicate pass-through nodes</div>
            <div>• Multiple curved lines show multiple transactions</div>
            <div>• Eye icon toggles pass-through wallet visibility</div>
            <div>• Filter icon toggles spam transactions (under $1 after 2015)</div>
            <div>• Arrows show direction of fund flow</div>
          </div>
        </div>
      )}

      {/* Collapse Toggle - Floating on top */}
      {nodes.length > 0 && (
        <div className={`absolute top-1/2 left-0 transform -translate-y-1/2 z-30 transition-all duration-300 ${leftPanelCollapsed ? "translate-x-0" : "translate-x-[550px]"}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="h-12 w-6 rounded-none bg-muted/95 backdrop-blur-sm hover:bg-accent border border-border"
          >
            {leftPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Custom Node Dialog */}
      <CustomNodeDialog
        open={customNodeDialog.open}
        onOpenChange={(open) => setCustomNodeDialog(prev => ({ ...prev, open }))}
        onNodeCreate={handleCustomNodeCreate}
        position={customNodeDialog.position}
        onPlaceMode={handlePlaceMode}
      />

      {/* Connection Dialog */}
      <ConnectionDialog
        open={connectionDialog.open}
        onOpenChange={(open) => setConnectionDialog(prev => ({ ...prev, open }))}
        onConnectionCreate={handleConnectionCreate}
        onConnectionUpdate={handleConnectionUpdate}
        onConnectionDelete={handleConnectionDelete}
        sourceNodeId={connectionDialog.sourceNodeId}
        availableNodes={nodes}
        existingConnections={getExistingConnections(connectionDialog.sourceNodeId)}
      />

      {/* Project Manager */}
      <GitHubWorkspaceManager
        open={workspaceManagerOpen}
        onOpenChange={setWorkspaceManagerOpen}
        onLoadWorkspace={handleLoadWorkspace}
        currentState={{
          nodes,
          edges: connections,
          selectedAddress,
          selectedNode,
          zoom,
          pan,
          viewport: { x: pan.x, y: pan.y, zoom },
          hidePassThrough,
          customNodes: [],
          nodeStyles: {},
          connectionStyles: {},
          drawingElements: [],
          selectedElements: [],
          filters: {},
          settings: {}
        }}
        currentWorkspaceId={currentWorkspaceId}
        currentVersionId={currentVersionId}
        onWorkspaceCreated={(workspaceId) => {
          setCurrentWorkspaceId(workspaceId)
          setCurrentVersionId('master') // New workspaces start with master version
        }}
        onStartNewInvestigation={handleStartNewInvestigationFromWorkspace}
        refreshTrigger={refreshWorkspaceManager}
        autoSaveManager={autoSaveManager}
      />

      {/* New Investigation Modal */}
      <Dialog open={newInvestigationModalOpen} onOpenChange={setNewInvestigationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {currentWorkspaceId ? 'New Investigation' : 'Save Investigation'}
            </DialogTitle>
            <DialogDescription>
              {currentWorkspaceId 
                ? "You have unsaved changes in your current investigation. What would you like to do?"
                : "You've started a new investigation. Would you like to save it as a project?"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              {currentWorkspaceId ? (
                // Options for when we have a current workspace
                <>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={async () => {
                      // Save current work and start new investigation
                      try {
                        await handleQuickSave(currentWorkspaceId, {
                          nodes,
                          connections,
                          selectedAddress,
                          selectedNode,
                          zoom,
                          pan,
                          hidePassThrough
                        })
                        // Clear state but preserve workspace context for new investigation
                        setNodes([])
                        setConnections([])
                        setSelectedAddress("")
                        setSelectedNode(null)
                        setZoom(1)
                        setPan({ x: 0, y: 0 })
                        setHidePassThrough(false)
                        setSearchQuery("")
                        setCurrentVersionId(undefined) // Clear version but keep workspace
                        autoSaveManager.clearAutoSavedState()
                        setNewInvestigationModalOpen(false)
                        console.log('Saved current work and kept workspace:', currentWorkspaceId)
                      } catch (error) {
                        console.error('Error saving before new investigation:', error)
                        alert('Error saving current work. Please try again.')
                      }
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Current Work & Start New
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => {
                      // Open workspace manager to save as new project
                      setNewInvestigationModalOpen(false)
                      setWorkspaceManagerOpen(true)
                    }}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Save as New Project & Start New
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="destructive"
                    onClick={() => {
                      // Discard changes but preserve workspace context for new investigation
                      setNodes([])
                      setConnections([])
                      setSelectedAddress("")
                      setSelectedNode(null)
                      setZoom(1)
                      setPan({ x: 0, y: 0 })
                      setHidePassThrough(false)
                      setSearchQuery("")
                      setCurrentVersionId(undefined) // Clear version but keep workspace
                      autoSaveManager.clearAutoSavedState()
                      setNewInvestigationModalOpen(false)
                      console.log('Discarded changes but kept workspace:', currentWorkspaceId)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Discard Changes & Start New
                  </Button>
                </>
              ) : (
                // Options for when we don't have a current workspace
                <>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => {
                      // Open workspace manager to save current work
                      setNewInvestigationModalOpen(false)
                      setWorkspaceManagerOpen(true)
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save as New Project
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => {
                      // Continue without saving
                      setNewInvestigationModalOpen(false)
                    }}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Continue Without Saving
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="destructive"
                    onClick={() => {
                      // Discard changes and start fresh
                      startNewInvestigation()
                      setNewInvestigationModalOpen(false)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Discard & Start Fresh
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setNewInvestigationModalOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Address Search Modal */}
      <Dialog open={addressSearchModalOpen} onOpenChange={setAddressSearchModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Save Current Workspace
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes in your current workspace. Would you like to save your current work before searching for the address "{pendingAddressSearch}"?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={async () => {
                  // Save current work and add to current workspace
                  try {
                    if (currentWorkspaceId) {
                      await handleQuickSave(currentWorkspaceId, {
                        nodes,
                        connections,
                        selectedAddress,
                        selectedNode,
                        zoom,
                        pan,
                        hidePassThrough
                      })
                      autoSaveManager.clearAutoSavedState()
                    }
                    setAddressSearchModalOpen(false)
                    // Proceed with address search
                    await performAddressSearch(pendingAddressSearch)
                  } catch (error) {
                    console.error('Error saving before address search:', error)
                    alert('Error saving current work. Please try again.')
                  }
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                Save & Add to Current Workspace
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={async () => {
                  // Save current work and start new workspace
                  try {
                    if (currentWorkspaceId) {
                      await handleQuickSave(currentWorkspaceId, {
                        nodes,
                        connections,
                        selectedAddress,
                        selectedNode,
                        zoom,
                        pan,
                        hidePassThrough
                      })
                      autoSaveManager.clearAutoSavedState()
                    }
                    setAddressSearchModalOpen(false)
                    // Clear current workspace and start new investigation
                    setCurrentWorkspaceId(undefined)
                    setCurrentVersionId(undefined)
                    // Proceed with address search
                    await performAddressSearch(pendingAddressSearch)
                  } catch (error) {
                    console.error('Error saving before address search:', error)
                    alert('Error saving current work. Please try again.')
                  }
                }}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Save & Start New Workspace
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => {
                  // Continue without saving - add to current workspace
                  setAddressSearchModalOpen(false)
                  // Proceed with address search
                  performAddressSearch(pendingAddressSearch)
                }}
              >
                <Search className="h-4 w-4 mr-2" />
                Continue Without Saving
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="destructive"
                onClick={() => {
                  // Discard changes and start fresh
                  setNodes([])
                  setConnections([])
                  setSelectedAddress("")
                  setSelectedNode(null)
                  setZoom(1)
                  setPan({ x: 0, y: 0 })
                  setHidePassThrough(false)
                  setSearchQuery("")
                  setCurrentWorkspaceId(undefined)
                  setCurrentVersionId(undefined)
                  autoSaveManager.clearAutoSavedState()
                  setAddressSearchModalOpen(false)
                  // Proceed with address search
                  performAddressSearch(pendingAddressSearch)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Discard Changes & Start Fresh
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setAddressSearchModalOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Old Quick Save Dialog removed - now handled by handleQuickSave function */}

      {/* Debug Panel */}
      <DebugPanel 
        isOpen={showDebugPanel} 
        onClose={() => setShowDebugPanel(false)} 
      />

      {/* Debug Button - Fixed position in bottom right */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDebugPanel(true)}
        className="fixed bottom-4 right-4 z-40 bg-background/80 backdrop-blur-sm border-border shadow-lg"
        title="Open Debug Panel"
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Debug
      </Button>
    </div>
  )
}