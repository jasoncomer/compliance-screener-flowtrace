import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCcw, X, Trash2, HelpCircle, Edit3, Palette } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { NodeExpansionDialog } from "@/components/node-expansion-dialog"
import { ConnectionEditDialog } from "@/components/connection-edit-dialog"
import { formatDateConsistent } from "@/lib/utils"

interface Node {
  id: string
  x: number
  y: number
  label: string
  originalLabel?: string // For user-defined label functionality
  address: string
  type: "target" | "exchange" | "hacker" | "mixer" | "service" | "defi" | "wallet" | "passthrough" | "bridge" | "custom"
  risk: "low" | "medium" | "high"
  logo?: string
  chainLogo?: string // Secondary logo for blockchain chain
  sourceChain?: string // For bridge nodes: source chain logo path
  destinationChain?: string // For bridge nodes: destination chain logo path
  expanded?: boolean
  children?: Node[]
  balance?: string
  transactions?: number
  isDragging?: boolean
  availableTransactions?: number
  isPassThrough?: boolean
  isUserDefinedLabel?: boolean // For user-defined label functionality
  entity_type?: string // From SOT endpoint
  entity_tags?: string[] // From SOT endpoint
  notes?: Array<{
    id: string
    userId: string
    userName: string
    content: string
    timestamp: string
  }> // Multi-user notes for the node
}

interface Connection {
  from: string
  to: string
  amount: string
  currency: string
  date: string
  txHash: string
  type?: "in" | "out"
  usdValue?: string
  fee?: string
  note?: string
  groupId?: string // For grouping multiple transactions between same nodes
  passThroughNodes?: string[] // Track pass-through nodes that were aggregated
  originalConnections?: Connection[] // Track original connections that were aggregated
  customColor?: string // Custom color for individual edges
}

interface ConnectionGroup {
  from: string
  to: string
  connections: Connection[]
  totalAmount: number
  totalUsdValue: number
}

interface EdgeDetails {
  connection: Connection | ConnectionGroup
  x: number
  y: number
  visible: boolean
  isGroup?: boolean
}

interface DrawingElement {
  id: string
  type: "line" | "rectangle" | "circle" | "text" | "pen"
  x: number
  y: number
  x2?: number
  y2?: number
  width?: number
  height?: number
  radius?: number
  text?: string
  color: string
  strokeWidth: number
  connectedNodeId?: string
  offsetX?: number
  offsetY?: number
  selected?: boolean
  isDragging?: boolean
}

interface NetworkGraphProps {
  activeTool: string
  activeColor: string
  onNodeSelect?: (address: string, nodeData?: any) => void
  onCustomNodeConnect?: (nodeId: string) => void
  nodes: Node[]
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void
  connections: Connection[]
  setConnections: (connections: Connection[] | ((prev: Connection[]) => Connection[])) => void
  hidePassThrough?: boolean
  zoom?: number
  setZoom?: (zoom: number) => void
  pan?: { x: number; y: number }
  setPan?: (pan: { x: number; y: number }) => void
  onPlacement?: (x: number, y: number) => void
}

export function NetworkGraph({
  activeTool,
  activeColor,
  onNodeSelect,
  onCustomNodeConnect,
  nodes,
  setNodes,
  connections,
  setConnections,
  hidePassThrough = false,
  zoom = 1,
  setZoom,
  pan = { x: 0, y: 0 },
  setPan,
  onPlacement,
}: NetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [draggedNode, setDraggedNode] = useState<Node | null>(null)
  const [nodeDragStart, setNodeDragStart] = useState({ x: 0, y: 0 })
  const [showNodeExpansion, setShowNodeExpansion] = useState(false)
  const [expandingNode, setExpandingNode] = useState<Node | null>(null)
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([])
  const [currentDrawing, setCurrentDrawing] = useState<DrawingElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [draggedDrawing, setDraggedDrawing] = useState<DrawingElement | null>(null)
  const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [attachmentMode, setAttachmentMode] = useState<{
    active: boolean
    drawingId: string
    message: string
  } | null>(null)
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map())
  const [loadedChainImages, setLoadedChainImages] = useState<Map<string, HTMLImageElement>>(new Map())
  const [isClient, setIsClient] = useState(false)
  const [edgeDetails, setEdgeDetails] = useState<EdgeDetails | null>(null)
  const [expansionDialog, setExpansionDialog] = useState<{ nodeId: string; visible: boolean } | null>(null)
  const [expansionTargetId, setExpansionTargetId] = useState<string | null>(null)
  const [connectionEditDialog, setConnectionEditDialog] = useState<{
    open: boolean
    connection: {
      from: string
      to: string
      txHash: string
      amount: string
      currency: string
      date: string
      note?: string
    } | null
  }>({ open: false, connection: null })
  
  // Node deletion confirmation state
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean
    nodeId: string | null
    nodeLabel: string | null
  }>({
    open: false,
    nodeId: null,
    nodeLabel: null
  })

  // Color picker state
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [customEdgeColors, setCustomEdgeColors] = useState<Record<string, string[]>>({})
  const [singleConnectionColorPickerOpen, setSingleConnectionColorPickerOpen] = useState(false)

  // Utility function to set custom color for a specific connection
  const setConnectionCustomColor = useCallback((txHash: string, color: string) => {
    setConnections((prevConnections) =>
      prevConnections.map((conn) =>
        conn.txHash === txHash ? { ...conn, customColor: color } : conn
      )
    )
  }, [setConnections])

  // Utility function to clear custom color for a specific connection
  const clearConnectionCustomColor = useCallback((txHash: string) => {
    setConnections((prevConnections) =>
      prevConnections.map((conn) =>
        conn.txHash === txHash ? { ...conn, customColor: undefined } : conn
      )
    )
  }, [setConnections])

  // Utility function to get custom color for a specific connection
  const getConnectionCustomColor = useCallback((txHash: string) => {
    const connection = connections.find((conn) => conn.txHash === txHash)
    return connection?.customColor
  }, [connections])

  // Helper function to check if any modal is open
  const isAnyModalOpen = useCallback(() => {
    return (
      colorPickerOpen ||
      singleConnectionColorPickerOpen ||
      connectionEditDialog.open ||
      deleteConfirmDialog.open ||
      expansionDialog !== null ||
      edgeDetails !== null
    )
  }, [colorPickerOpen, singleConnectionColorPickerOpen, connectionEditDialog.open, deleteConfirmDialog.open, expansionDialog, edgeDetails])

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Debug effect to monitor nodes state changes
  useEffect(() => {
    console.log('🔄 Nodes state changed:', nodes.length, 'nodes')
    console.log('🔄 Node IDs:', nodes.map(n => n.id))
  }, [nodes])

  // Load images for logos and chain logos
  useEffect(() => {
    const loadImages = async () => {
      const newLoadedImages = new Map<string, HTMLImageElement>()
      const newLoadedChainImages = new Map<string, HTMLImageElement>()

      // Load main logos
      for (const node of nodes) {
        if (node.logo && !loadedImages.has(node.id)) {
          const img = new Image()
          img.onload = () => {
            setLoadedImages(prev => new Map(prev).set(node.id, img))
          }
          img.src = node.logo
        }

        // Load chain logos
        if (node.chainLogo && !loadedChainImages.has(node.id)) {
          const chainImg = new Image()
          chainImg.onload = () => {
            setLoadedChainImages(prev => new Map(prev).set(node.id, chainImg))
          }

          chainImg.src = node.chainLogo
        }

        // Load bridge source and destination chain logos
        if (node.type === "bridge") {
          if (node.sourceChain && !loadedChainImages.has(node.id + '_source')) {
            const sourceImg = new Image()
            sourceImg.onload = () => {
              console.log('Loaded source chain image for bridge:', node.id, node.sourceChain)
              setLoadedChainImages(prev => new Map(prev).set(node.id + '_source', sourceImg))
            }
            sourceImg.onerror = () => {
              console.log('Failed to load source chain image for bridge:', node.id, node.sourceChain)
            }
            sourceImg.src = node.sourceChain
          }
          
          if (node.destinationChain && !loadedChainImages.has(node.id + '_dest')) {
            const destImg = new Image()
            destImg.onload = () => {
              console.log('Loaded destination chain image for bridge:', node.id, node.destinationChain)
              setLoadedChainImages(prev => new Map(prev).set(node.id + '_dest', destImg))
            }
            destImg.onerror = () => {
              console.log('Failed to load destination chain image for bridge:', node.id, node.destinationChain)
            }
            destImg.src = node.destinationChain
          }
        }
      }
    }

    loadImages()
  }, [nodes, loadedImages, loadedChainImages])

  // Use refs for stable references
  const nodesRef = useRef(nodes)
  const connectionsRef = useRef(connections)
  const setNodesRef = useRef(setNodes)
  const setConnectionsRef = useRef(setConnections)

  // Update refs when props change
  useEffect(() => {
    nodesRef.current = nodes
    connectionsRef.current = connections
    setNodesRef.current = setNodes
    setConnectionsRef.current = setConnections
  }, [nodes, connections, setNodes, setConnections])

  // Detect pass-through nodes - Fixed to prevent infinite loops
  useEffect(() => {
    if (connections.length === 0) return

    // Use a flag to track if any changes were made
    let hasChanges = false
    const updatedNodes = nodes.map((node) => {
      const incomingConnections = connections.filter((conn) => conn.to === node.id)
      const outgoingConnections = connections.filter((conn) => conn.from === node.id)

      if (incomingConnections.length > 0 && outgoingConnections.length > 0) {
        const totalIncoming = incomingConnections.reduce((sum, conn) => {
          const amount = conn.amount ? Number.parseFloat(conn.amount) : 0
          return sum + (isNaN(amount) ? 0 : amount)
        }, 0)

        const totalOutgoing = outgoingConnections.reduce((sum, conn) => {
          const amount = conn.amount ? Number.parseFloat(conn.amount) : 0
          return sum + (isNaN(amount) ? 0 : amount)
        }, 0)

        // Consider it a pass-through if the difference is less than 5% (accounting for fees)
        const difference = Math.abs(totalIncoming - totalOutgoing)
        const threshold = totalIncoming * 0.05
        const isPassThrough = difference <= threshold && totalIncoming > 0

        // Only update if the pass-through status has changed
        if (node.isPassThrough !== isPassThrough) {
          hasChanges = true
          return {
            ...node,
            isPassThrough,
            type: isPassThrough && node.type !== "target" && node.type !== "bridge" ? "passthrough" : node.type,
          }
        }
      } else if (node.isPassThrough) {
        // Reset pass-through status if no longer applicable
        hasChanges = true
        return { ...node, isPassThrough: false }
      }

      return node
    })

    // Only update if there are actual changes
    if (hasChanges) {
      setNodes(updatedNodes)
    }
  }, [connections, nodes]) // Add nodes to dependencies to ensure proper updates

  // Filter nodes and connections based on pass-through toggle - FOR DISPLAY ONLY
  const filteredNodesAndConnections = useMemo(() => {
    if (!hidePassThrough) {
      return { nodes, connections }
    }

    // Find pass-through nodes (nodes with exactly 1 input and 1 output of same amount)
    const passThroughNodes = new Set<string>()
    
    nodes.forEach((node) => {
      if (node.isPassThrough) {
        const incomingConnections = connections.filter((conn) => conn.to === node.id)
        const outgoingConnections = connections.filter((conn) => conn.from === node.id)
        
        if (incomingConnections.length === 1 && outgoingConnections.length === 1) {
          const incomingAmount = incomingConnections[0].amount ? Number.parseFloat(incomingConnections[0].amount) : 0
          const outgoingAmount = outgoingConnections[0].amount ? Number.parseFloat(outgoingConnections[0].amount) : 0
          
          // Check if amounts are the same (within 5% tolerance for fees)
          const difference = Math.abs(incomingAmount - outgoingAmount)
          const threshold = incomingAmount * 0.05
          
          if (difference <= threshold && incomingAmount > 0) {
            passThroughNodes.add(node.id)
          }
        }
      }
    })

    // Filter out pass-through nodes FOR DISPLAY ONLY - never modify the actual nodes array
    const filteredNodes = nodes.filter((node) => !passThroughNodes.has(node.id))
    
    // Create direct connections bypassing pass-through nodes
    const filteredConnections: Connection[] = []
    const processedConnections = new Set<string>()
    
    // First, add all connections that don't involve pass-through nodes
    // But exclude connections that will be replaced by aggregated pass-through connections
    const connectionsToExclude = new Set<string>()
    
    // Identify connections that will be replaced by aggregated pass-through connections
    passThroughNodes.forEach((passThroughNodeId) => {
      const incomingConnections = connections.filter((conn) => conn.to === passThroughNodeId)
      const outgoingConnections = connections.filter((conn) => conn.from === passThroughNodeId)
      
      if (incomingConnections.length === 1 && outgoingConnections.length === 1) {
        const incomingConn = incomingConnections[0]
        const outgoingConn = outgoingConnections[0]
        
        if (!passThroughNodes.has(incomingConn.from) && !passThroughNodes.has(outgoingConn.to)) {
          // Mark these connections to be excluded since they'll be replaced by aggregated connection
          connectionsToExclude.add(`${incomingConn.from}-${incomingConn.to}`)
          connectionsToExclude.add(`${outgoingConn.from}-${outgoingConn.to}`)
        }
      }
    })
    
    connections.forEach((connection) => {
      const connectionKey = `${connection.from}-${connection.to}`
      if (!passThroughNodes.has(connection.from) && !passThroughNodes.has(connection.to) && 
          !connectionsToExclude.has(connectionKey)) {
        filteredConnections.push(connection)
      }
    })
    
    // Then, find all possible paths between non-pass-through nodes through pass-through nodes
    const nonPassThroughNodes = nodes.filter((node) => !passThroughNodes.has(node.id))
    
    // Create a map to track aggregated connections
    const aggregatedConnections = new Map<string, Connection>()
    
    // For each pass-through node, find the source and destination
    passThroughNodes.forEach((passThroughNodeId) => {
      const incomingConnections = connections.filter((conn) => conn.to === passThroughNodeId)
      const outgoingConnections = connections.filter((conn) => conn.from === passThroughNodeId)
      
      if (incomingConnections.length === 1 && outgoingConnections.length === 1) {
        const incomingConn = incomingConnections[0]
        const outgoingConn = outgoingConnections[0]
        
        // Only create aggregated connection if both source and destination are non-pass-through nodes
        if (!passThroughNodes.has(incomingConn.from) && !passThroughNodes.has(outgoingConn.to)) {
          const connectionKey = `${incomingConn.from}-${outgoingConn.to}`
          const reverseKey = `${outgoingConn.to}-${incomingConn.from}`
          
          // Check if we already have a connection in either direction
          const existingKey = aggregatedConnections.has(connectionKey) ? connectionKey : 
                             aggregatedConnections.has(reverseKey) ? reverseKey : null
          
          if (!existingKey) {
            // Create a new aggregated connection
            const directConnection: Connection = {
              from: incomingConn.from,
              to: outgoingConn.to,
              amount: incomingConn.amount, // Use the incoming amount (should be same as outgoing)
              currency: incomingConn.currency,
              date: incomingConn.date,
              txHash: `aggregated-${incomingConn.from}-${outgoingConn.to}`,
              usdValue: incomingConn.usdValue,
              passThroughNodes: [passThroughNodeId],
              originalConnections: [incomingConn, outgoingConn],
            }
            aggregatedConnections.set(connectionKey, directConnection)
          } else {
            // Update existing connection with additional amount
            const existing = aggregatedConnections.get(existingKey)!
            const existingAmount = existing.amount ? Number.parseFloat(existing.amount) : 0
            const newAmount = incomingConn.amount ? Number.parseFloat(incomingConn.amount) : 0
            const totalAmount = existingAmount + newAmount
            
            existing.amount = totalAmount > 0 ? totalAmount.toFixed(8) : ""
            if (existing.usdValue && incomingConn.usdValue) {
              const existingUsd = Number.parseFloat(existing.usdValue.replace(/[$,]/g, "") || "0")
              const newUsd = Number.parseFloat(incomingConn.usdValue.replace(/[$,]/g, "") || "0")
              existing.usdValue = `$${(existingUsd + newUsd).toLocaleString()}`
            }
            
            // Add pass-through node and original connections to existing aggregated connection
            if (existing.passThroughNodes) {
              existing.passThroughNodes.push(passThroughNodeId)
            } else {
              existing.passThroughNodes = [passThroughNodeId]
            }
            
            if (existing.originalConnections) {
              existing.originalConnections.push(incomingConn, outgoingConn)
            } else {
              existing.originalConnections = [incomingConn, outgoingConn]
            }
          }
        }
      }
    })
    
    // Add all aggregated connections to filtered connections
    aggregatedConnections.forEach((connection) => {
      filteredConnections.push(connection)
    })

    return { nodes: filteredNodes, connections: filteredConnections }
  }, [nodes, connections, hidePassThrough])

  // Group connections between same nodes - Memoized to prevent recalculation
  const groupedConnections = useMemo((): ConnectionGroup[] => {
    const groups = new Map<string, Connection[]>()

    filteredNodesAndConnections.connections.forEach((conn) => {
      const key = `${conn.from}-${conn.to}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(conn)
    })

    return Array.from(groups.entries())
      .map(([key, conns]) => {
        const [from, to] = key.split("-")
        const totalAmount = conns.reduce((sum, conn) => {
          const amount = conn.amount ? Number.parseFloat(conn.amount) : 0
          return sum + (isNaN(amount) ? 0 : amount)
        }, 0)

        const totalUsdValue = conns.reduce((sum, conn) => {
          const usdValue = Number.parseFloat(conn.usdValue?.replace(/[$,]/g, "") || "0")
          return sum + (isNaN(usdValue) ? 0 : usdValue)
        }, 0)

        return {
          from,
          to,
          connections: conns,
          totalAmount,
          totalUsdValue,
        }
      })
      .filter((group) => group.connections.length > 0)
  }, [filteredNodesAndConnections.connections])

  // Get entity type colors
  const getEntityTypeColor = (type: Node["type"], risk: Node["risk"]) => {
    if (risk === "high") return "#ef4444" // Red for high risk

    const colors = {
      target: "#3b82f6", // Blue
      exchange: "#06b6d4", // Cyan
      hacker: "#ef4444", // Red
      mixer: "#ef4444", // Red
      service: "#ef4444", // Red
      defi: "#06b6d4", // Cyan
      wallet: "#6b7280", // Gray
      passthrough: "#8b5cf6", // Purple for pass-through nodes
      bridge: "#f59e0b", // Orange for bridges
      custom: "#10b981", // Green for custom nodes
    }
    return colors[type]
  }

  // Handle node dragging
  const handleNodeDrag = useCallback((nodeId: string, deltaX: number, deltaY: number) => {
    setNodesRef.current((prevNodes) =>
      prevNodes.map((node) => (node.id === nodeId ? { ...node, x: node.x + deltaX, y: node.y + deltaY } : node)),
    )
  }, [])

  // Handle node deletion
  const deleteNode = useCallback((nodeId: string) => {
    console.log('🗑️ Deleting node:', nodeId)
    console.log('🔍 Current nodes before deletion:', nodes.length)
    console.log('🔍 Current connections before deletion:', connections.length)
    
    // Find all child nodes that were created from this node (recursively)
    const getAllChildNodes = (parentId: string): string[] => {
      const directChildren = nodes.filter(node => node.id.startsWith(`${parentId}_child_`))
      const allChildren: string[] = []
      
      directChildren.forEach(child => {
        allChildren.push(child.id)
        // Recursively get children of this child
        const grandChildren = getAllChildNodes(child.id)
        allChildren.push(...grandChildren)
      })
      
      return allChildren
    }
    
    const childNodes = getAllChildNodes(nodeId)
    console.log('🔍 Found child nodes to delete:', childNodes)
    
    // Collect all node IDs to delete (parent + all descendants)
    const nodesToDelete = new Set([nodeId, ...childNodes])
    
    // Remove the node and all its descendant nodes
    setNodes((prev) => {
      const newNodes = prev.filter((node) => !nodesToDelete.has(node.id))
      console.log('✅ Nodes deleted, remaining nodes:', newNodes.length)
      console.log('🔍 Remaining node IDs:', newNodes.map(n => n.id))
      return newNodes
    })
    
    // Remove all connections involving the deleted node or any of its descendants
    setConnections((prev) => {
      const newConnections = prev.filter((conn) => 
        !nodesToDelete.has(conn.from) && !nodesToDelete.has(conn.to)
      )
      console.log('🔍 Connections after deletion:', newConnections.length)
      return newConnections
    })
    
    // Remove connected drawing elements
    setDrawingElements((prev) => {
      const newElements = prev.filter((element) => !nodesToDelete.has(element.connectedNodeId || ''))
      console.log('🔍 Drawing elements after deletion:', newElements.length)
      return newElements
    })
    
    // Clear selection if the deleted node or any of its descendants was selected
    setSelectedNode((current) => {
      if (current && nodesToDelete.has(current)) {
        console.log('🔍 Clearing selection for deleted node or descendant')
        return null
      }
      return current
    })
    
    // Clear hover state if the deleted node or any of its descendants was hovered
    setHoveredNode((current) => {
      if (current && nodesToDelete.has(current)) {
        console.log('🔍 Clearing hover state for deleted node or descendant')
        return null
      }
      return current
    })
    
    console.log('✅ Node deletion completed successfully')
  }, [setNodes, setConnections, nodes, connections])

  // Handle node expansion
  const expandNode = useCallback((nodeId: string, selectedTransactions: any[]) => {
    // Use the dedicated expansion target ID to ensure we always branch from the original parent
    const targetNodeId = expansionTargetId || nodeId
    console.log('Expanding node:', targetNodeId, 'with', selectedTransactions.length, 'transactions')
    console.log('Original nodeId:', nodeId, 'expansionTargetId:', expansionTargetId)
    console.log('Selected transactions:', selectedTransactions.map(tx => ({ txHash: tx.txHash, entityName: tx.entityName })))
    
    const node = nodesRef.current.find((n) => n.id === targetNodeId)
    if (!node) {
      console.error('Target node not found:', targetNodeId)
      return
    }

    // Check for existing nodes and create new ones or merge as needed
    const newNodes: Node[] = []
    const newConnections: Connection[] = []
    
    // Count existing children of the target node to determine starting childIndex
    const existingChildren = nodesRef.current.filter(n => n.id.startsWith(`${targetNodeId}_child_`))
    
    // Get existing connections for this node
    const existingConnections = connectionsRef.current.filter((conn) => 
      conn.from === targetNodeId || conn.to === targetNodeId
    )
    
    // Create a set of selected transaction hashes for easy lookup
    const selectedTxHashes = new Set(selectedTransactions.map(tx => tx.txHash))
    
    // Remove nodes and connections for deselected transactions
    const nodesToRemove = new Set<string>()
    const connectionsToRemove = new Set<string>()
    
    existingConnections.forEach(conn => {
      if (conn.txHash && !selectedTxHashes.has(conn.txHash)) {
        // This connection was deselected, mark it for removal
        connectionsToRemove.add(`${conn.from}-${conn.to}-${conn.txHash}`)
        
        // If the connection goes to a child node, mark that node for removal too
        if (conn.to.startsWith(`${targetNodeId}_child_`)) {
          nodesToRemove.add(conn.to)
        } else if (conn.from.startsWith(`${targetNodeId}_child_`)) {
          nodesToRemove.add(conn.from)
        }
      }
    })
    
    console.log('🗑️ Removing nodes:', Array.from(nodesToRemove))
    console.log('🗑️ Removing connections:', Array.from(connectionsToRemove))
    
    let childIndex = existingChildren.length

    selectedTransactions.forEach((tx, index) => {
      // Check if a connection with this transaction hash already exists
      const existingConnection = connectionsRef.current.find((conn) => conn.txHash === tx.txHash)
      if (existingConnection) {
        console.log(`Skipping duplicate transaction: ${tx.txHash} (already exists)`)
        console.log('Existing connection:', existingConnection)
        return
      }
      
      // Check if a node with this address already exists
      const existingNode = nodesRef.current.find((n) => n.address === tx.address)
      
      if (existingNode) {
        // Node exists - create connection to existing node
        let fromNode, toNode;
        if (tx.direction === 'in') {
          // Incoming transaction: money flows TO the target node FROM the other node
          fromNode = existingNode.id;
          toNode = targetNodeId;
        } else {
          // Outgoing transaction: money flows FROM the target node TO the other node
          fromNode = targetNodeId;
          toNode = existingNode.id;
        }
        
        console.log(`Creating connection for ${tx.direction} transaction (existing node):`, {
          from: fromNode,
          to: toNode,
          direction: tx.direction,
          amount: tx.amount,
          entityName: tx.entityName
        });
        
        newConnections.push({
          from: fromNode,
          to: toNode,
          amount: tx.amount,
          currency: tx.currency,
          date: tx.date,
          txHash: tx.txHash,
          usdValue: tx.usdValue,
          type: tx.direction as "in" | "out",
        })
      } else {
        // Create new node with directional positioning
        const radius = 120
        const newNodeId = `${targetNodeId}_child_${childIndex}`
        
        // Position nodes based on transaction direction
        let newNodeX: number, newNodeY: number
        
        if (tx.direction === 'in') {
          // Input nodes (incoming transactions) go on the left
          // Use a vertical spread on the left side
          const inputNodes = selectedTransactions.filter(t => t.direction === 'in')
          const inputIndex = inputNodes.findIndex(t => t.txHash === tx.txHash)
          const totalInputs = inputNodes.length
          
          // Position vertically on the left side with some spread
          const verticalOffset = totalInputs > 1 ? (inputIndex - (totalInputs - 1) / 2) * 40 : 0
          newNodeX = node.x - radius
          newNodeY = node.y + verticalOffset
        } else {
          // Output nodes (outgoing transactions) go on the right
          // Use a vertical spread on the right side
          const outputNodes = selectedTransactions.filter(t => t.direction === 'out')
          const outputIndex = outputNodes.findIndex(t => t.txHash === tx.txHash)
          const totalOutputs = outputNodes.length
          
          // Position vertically on the right side with some spread
          const verticalOffset = totalOutputs > 1 ? (outputIndex - (totalOutputs - 1) / 2) * 40 : 0
          newNodeX = node.x + radius
          newNodeY = node.y + verticalOffset
        }
        
        const nodeLabel = tx.entityName || `Wallet ${childIndex + 1}`
        newNodes.push({
          id: newNodeId,
          x: newNodeX,
          y: newNodeY,
          label: nodeLabel,
          originalLabel: nodeLabel, // Preserve original label for user-defined label functionality
          address: tx.address,
          type: (tx.entity_type || tx.entityType) as any, // Use SOT entity_type if available
          risk: tx.risk || "medium",
          logo: tx.logo,
          chainLogo: tx.currency === "BTC" ? "/logos/btc.png" : 
                     tx.currency === "ETH" ? "/logos/eth.png" :
                     tx.currency === "MATIC" ? "/logos/matic.png" :
                     tx.currency === "AVAX" ? "/logos/avax.png" :
                     "/logos/btc.png", // Default to Bitcoin chain logo
          balance: tx.balance,
          transactions: tx.transactionCount || 1,
          availableTransactions: 0, // Expanded nodes don't have further transactions by default
          entity_type: tx.entity_type,
          entity_tags: tx.entity_tags,
        })

        // Add connection to new node
        let fromNode, toNode;
        if (tx.direction === 'in') {
          // Incoming transaction: money flows TO the target node FROM the new node
          fromNode = newNodeId;
          toNode = targetNodeId;
        } else {
          // Outgoing transaction: money flows FROM the target node TO the new node
          fromNode = targetNodeId;
          toNode = newNodeId;
        }
        
        console.log(`Creating connection for ${tx.direction} transaction (new node):`, {
          from: fromNode,
          to: toNode,
          direction: tx.direction,
          amount: tx.amount,
          entityName: tx.entityName,
          newNodeId
        });
        
        newConnections.push({
          from: fromNode,
          to: toNode,
          amount: tx.amount,
          currency: tx.currency,
          date: tx.date,
          txHash: tx.txHash,
          usdValue: tx.usdValue,
          type: tx.direction as "in" | "out",
        })
        
        childIndex++
      }
    })

    console.log('✅ Expansion complete:', newNodes.length, 'new nodes,', newConnections.length, 'new connections')
    console.log('New connections details:', newConnections.map(conn => ({ from: conn.from, to: conn.to, txHash: conn.txHash })))
    
    setNodesRef.current((prev) => {
      // Remove nodes that were deselected
      const filteredNodes = prev.filter(node => !nodesToRemove.has(node.id))
      
      // Filter out any duplicate nodes that might already exist
      const existingNodeIds = new Set(filteredNodes.map(n => n.id))
      const existingAddresses = new Set(filteredNodes.map(n => n.address))
      
      const uniqueNewNodes = newNodes.filter(node => 
        !existingNodeIds.has(node.id) && !existingAddresses.has(node.address)
      )
      
      if (uniqueNewNodes.length !== newNodes.length) {
        console.log('Filtered out', newNodes.length - uniqueNewNodes.length, 'duplicate nodes during expansion')
      }
      
      if (nodesToRemove.size > 0) {
        console.log('Removed', nodesToRemove.size, 'deselected nodes')
      }
      
      return [...filteredNodes, ...uniqueNewNodes]
    })
    
    setConnectionsRef.current((prev) => {
      // Remove connections that were deselected
      const filteredConnections = prev.filter(conn => 
        !connectionsToRemove.has(`${conn.from}-${conn.to}-${conn.txHash}`)
      )
      
      if (connectionsToRemove.size > 0) {
        console.log('Removed', connectionsToRemove.size, 'deselected connections')
      }
      
      // Filter out duplicate connections based on transaction hash
      const existingTxHashes = new Set(filteredConnections.map(conn => conn.txHash))
      const uniqueNewConnections = newConnections.filter(conn => !existingTxHashes.has(conn.txHash))
      
      if (uniqueNewConnections.length !== newConnections.length) {
        console.log('Filtered out', newConnections.length - uniqueNewConnections.length, 'duplicate connections during expansion')
        console.log('Duplicate txHashes:', newConnections.filter(conn => existingTxHashes.has(conn.txHash)).map(conn => conn.txHash))
      }
      
      console.log('Final connection update:', {
        existingConnections: filteredConnections.length,
        newConnections: uniqueNewConnections.length,
        totalConnections: filteredConnections.length + uniqueNewConnections.length
      })
      
      return [...filteredConnections, ...uniqueNewConnections]
    })
    
    setExpansionDialog(null)
    setExpansionTargetId(null) // Reset the expansion target after use
    
    // Reset all drag states when expansion is confirmed
    setIsDragging(false)
    setDraggedNode(null)
    setDraggedDrawing(null)
    setDragStart({ x: 0, y: 0 })
    setNodeDragStart({ x: 0, y: 0 })
    // Don't reset selectedNode - keep it selected so user can still interact with it
    setHoveredNode(null)
    setSelectedDrawing(null)
    setIsDrawing(false)
    setCurrentDrawing(null)
    setAttachmentMode(null)
    // Reset any node dragging state
    setNodesRef.current(prev => prev.map(node => ({ ...node, isDragging: false })))
    // Reset any drawing dragging state
    setDrawingElements(prev => prev.map(el => ({ ...el, isDragging: false })))
    
    // Force mouse up event to ensure any ongoing drag is terminated
    const mouseUpEvent = new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
      view: window
    })
    document.dispatchEvent(mouseUpEvent)
  }, [
    expansionTargetId, 
    selectedNode, 
    setIsDragging, 
    setDraggedNode, 
    setDraggedDrawing, 
    setDragStart, 
    setNodeDragStart, 
    setSelectedNode, 
    setHoveredNode, 
    setSelectedDrawing, 
    setIsDrawing, 
    setCurrentDrawing, 
    setAttachmentMode, 
    setNodesRef, 
    setDrawingElements
  ])

  // Handle connection edit dialog
  const handleConnectionEdit = useCallback((connection: Connection) => {
    console.log('Opening edit dialog for connection:', connection)
    setConnectionEditDialog({
      open: true,
      connection: {
        from: connection.from,
        to: connection.to,
        txHash: connection.txHash,
        amount: connection.amount,
        currency: connection.currency,
        date: connection.date,
        note: connection.note
      }
    })
  }, [])

  // Handle connection save (update existing connection)
  const handleConnectionSave = useCallback((rows: any[], isReversed?: boolean) => {
    if (!connectionEditDialog.connection) return

    const { txHash, from, to } = connectionEditDialog.connection
    
    console.log('NetworkGraph: Saving connection', txHash, 'with direction reversed:', isReversed)
    console.log('Original direction:', from, '→', to)
    console.log('New direction:', isReversed ? to : from, '→', isReversed ? from : to)
    
    if (rows.length === 0) {
      // Delete the connection
      setConnectionsRef.current((prev) => prev.filter(conn => conn.txHash !== txHash))
    } else {
      // Update the connection with the first row (or aggregate multiple rows)
      const firstRow = rows[0]
      const totalAmount = rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0)
      
      setConnectionsRef.current((prev) => {
        const updated = prev.map(conn => {
          if (conn.txHash === txHash) {
            const updatedConnection = {
              ...conn,
              from: isReversed ? to : from,
              to: isReversed ? from : to,
              amount: totalAmount.toString(),
              currency: firstRow.currency,
              date: firstRow.date,
              note: firstRow.notes
            }
            
            console.log('Updating connection currency from', conn.currency, 'to', firstRow.currency)
            console.log('Updated connection:', updatedConnection)
            
            return updatedConnection
          }
          return conn
        })
        
        // Force a redraw by triggering a state update
        console.log('Connection updated, forcing redraw...')
        
        return updated
      })
    }
  }, [connectionEditDialog.connection])

  // Handle connection delete
  const handleConnectionDelete = useCallback((txHash: string) => {
    setConnectionsRef.current((prev) => prev.filter(conn => conn.txHash !== txHash))
  }, [])

  // Handle edge color update
  const handleEdgeColorUpdate = useCallback((connectionKey: string, colors: string[]) => {
    setCustomEdgeColors(prev => ({
      ...prev,
      [connectionKey]: colors
    }))
  }, [])

  // Drawing functions
  const startDrawing = useCallback(
    (x: number, y: number) => {
      if (activeTool === "select") return

      const newElement: DrawingElement = {
        id: Date.now().toString(),
        type: activeTool as any,
        x,
        y,
        color: activeColor,
        strokeWidth: 2,
      }

      if (activeTool === "pen") {
        newElement.x2 = x
        newElement.y2 = y
      } else if (activeTool === "text") {
        const text = prompt("Enter text:")
        if (text) {
          newElement.text = text
          setDrawingElements((prev) => [...prev, newElement])
        }
        return
      } else if (activeTool === "connect") {
        // Find nearest node to connect to
        const nearestNode = nodesRef.current.find((node) => {
          const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
          return distance <= 50
        })

        if (nearestNode) {
          newElement.connectedNodeId = nearestNode.id
          newElement.offsetX = x - nearestNode.x
          newElement.offsetY = y - nearestNode.y
          newElement.text = "Connected Note"
          newElement.type = "text"
          setDrawingElements((prev) => [...prev, newElement])
        }
        return
      }

      setCurrentDrawing(newElement)
      setIsDrawing(true)
    },
    [activeTool, activeColor],
  )

  const updateDrawing = useCallback(
    (x: number, y: number) => {
      if (!isDrawing || !currentDrawing) return

      setCurrentDrawing((prev) => {
        if (!prev) return null

        if (prev.type === "pen") {
          return { ...prev, x2: x, y2: y }
        } else if (prev.type === "rectangle") {
          return { ...prev, width: x - prev.x, height: y - prev.y }
        } else if (prev.type === "circle") {
          const radius = Math.sqrt((x - prev.x) ** 2 + (y - prev.y) ** 2)
          return { ...prev, radius }
        }

        return prev
      })
    },
    [isDrawing, currentDrawing],
  )

  const finishDrawing = useCallback(() => {
    if (currentDrawing) {
      setDrawingElements((prev) => [...prev, currentDrawing])
    }
    setCurrentDrawing(null)
    setIsDrawing(false)
  }, [currentDrawing])

  // Select drawing element
  const selectDrawingElement = useCallback(
    (x: number, y: number, isDoubleClick = false) => {
      const selected = drawingElements.find((element) => {
        if (element.type === "text") {
          return Math.abs(x - element.x) < 50 && Math.abs(y - element.y) < 20
        } else if (element.type === "circle") {
          const distance = Math.sqrt((x - element.x) ** 2 + (y - element.y) ** 2)
          return Math.abs(distance - (element.radius || 0)) < 10
        } else if (element.type === "rectangle") {
          return (
            x >= element.x &&
            x <= element.x + (element.width || 0) &&
            y >= element.y &&
            y <= element.y + (element.height || 0)
          )
        }
        return false
      })

      if (selected) {
        setSelectedDrawing(selected.id)
        setDrawingElements((prev) => prev.map((el) => ({ ...el, selected: el.id === selected.id })))

        // If double-click, enter attachment mode or detach if already connected
        if (isDoubleClick) {
          if (selected.connectedNodeId) {
            // Detach from node
            setDrawingElements((prev) =>
              prev.map((el) =>
                el.id === selected.id
                  ? { ...el, connectedNodeId: undefined, offsetX: undefined, offsetY: undefined }
                  : el,
              ),
            )
          } else {
            // Enter attachment mode
            setAttachmentMode({
              active: true,
              drawingId: selected.id,
              message: "Click on a node to attach this drawing, or press ESC to cancel",
            })
          }
        }
      } else {
        setSelectedDrawing(null)
        setDrawingElements((prev) => prev.map((el) => ({ ...el, selected: false })))
      }
    },
    [drawingElements],
  )

  // Add a function to start dragging a drawing
  const startDraggingDrawing = useCallback((drawingId: string, x: number, y: number) => {
    const drawingElement = drawingElements.find(el => el.id === drawingId)
    setDraggedDrawing(drawingElement || null)
    setDragStart({ x, y })
    setDrawingElements((prev) => prev.map((el) => (el.id === drawingId ? { ...el, isDragging: true } : el)))
  }, [drawingElements])

  // Add a function to handle drawing dragging
  const handleDrawingDrag = useCallback((drawingId: string, deltaX: number, deltaY: number) => {
    setDrawingElements((prev) =>
      prev.map((el) => {
        if (el.id === drawingId) {
          // If connected to a node, update the offset
          if (el.connectedNodeId) {
            return {
              ...el,
              offsetX: (el.offsetX || 0) + deltaX,
              offsetY: (el.offsetY || 0) + deltaY,
            }
          }
          // Otherwise move the drawing directly
          return {
            ...el,
            x: el.x + deltaX,
            y: el.y + deltaY,
            x2: el.x2 !== undefined ? el.x2 + deltaX : undefined,
            y2: el.y2 !== undefined ? el.y2 + deltaY : undefined,
          }
        }
        return el
      }),
    )
  }, [])

  // Delete selected drawing
  const deleteSelectedDrawing = useCallback(() => {
    if (selectedDrawing) {
      setDrawingElements((prev) => prev.filter((el) => el.id !== selectedDrawing))
      setSelectedDrawing(null)
    }
  }, [selectedDrawing])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && attachmentMode) {
        setAttachmentMode(null)
      } else if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedDrawing) {
          deleteSelectedDrawing()
        } else if (selectedNode) {
          deleteNode(selectedNode)
        }
      } else if (event.key === "e" && selectedNode) {
        // Press 'e' to expand the selected node
        const node = nodes.find(n => n.id === selectedNode)
        console.log('Keyboard shortcut: expanding selected node:', selectedNode, node)
        if (node && node.availableTransactions && node.availableTransactions > 0) {
          setExpansionTargetId(selectedNode)
          setExpansionDialog({ nodeId: selectedNode, visible: true })
        } else {
          console.log('Cannot expand selected node - no available transactions:', node?.availableTransactions)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [attachmentMode, selectedDrawing, selectedNode, deleteSelectedDrawing, deleteNode, nodes])

  // Function to draw directional arrow
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    arrowSize: number = 8,
  ) => {
    const dx = toX - fromX
    const dy = toY - fromY
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length === 0) return
    
    // Calculate unit vector
    const unitX = dx / length
    const unitY = dy / length
    
    // Calculate arrow position (80% along the line)
    const arrowDistance = Math.min(length * 0.8, length - 20) // Don't get too close to nodes
    const arrowX = fromX + unitX * arrowDistance
    const arrowY = fromY + unitY * arrowDistance
    
    // Calculate perpendicular vector for arrow wings
    const perpX = -unitY
    const perpY = unitX
    
    // Draw arrow
    ctx.beginPath()
    ctx.moveTo(arrowX, arrowY)
    ctx.lineTo(arrowX - unitX * arrowSize + perpX * arrowSize * 0.5, arrowY - unitY * arrowSize + perpY * arrowSize * 0.5)
    ctx.lineTo(arrowX - unitX * arrowSize - perpX * arrowSize * 0.5, arrowY - unitY * arrowSize - perpY * arrowSize * 0.5)
    ctx.closePath()
    ctx.fill()
  }

  // Function to draw curved line for multiple connections
  const drawCurvedConnection = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    curveOffset: number,
  ) => {
    const midX = (fromX + toX) / 2
    const midY = (fromY + toY) / 2

    // Calculate perpendicular offset for curve
    const dx = toX - fromX
    const dy = toY - fromY
    const length = Math.sqrt(dx * dx + dy * dy)
    const unitX = -dy / length
    const unitY = dx / length

    const controlX = midX + unitX * curveOffset
    const controlY = midY + unitY * curveOffset

    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.quadraticCurveTo(controlX, controlY, toX, toY)
    ctx.stroke()

    return { midX: controlX, midY: controlY }
  }

  // Function to draw curved arrow
  const drawCurvedArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    curveOffset: number,
    arrowSize: number = 6,
  ) => {
    const midX = (fromX + toX) / 2
    const midY = (fromY + toY) / 2

    // Calculate perpendicular offset for curve
    const dx = toX - fromX
    const dy = toY - fromY
    const length = Math.sqrt(dx * dx + dy * dy)
    const unitX = -dy / length
    const unitY = dx / length

    const controlX = midX + unitX * curveOffset
    const controlY = midY + unitY * curveOffset

    // Draw the curved line
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.quadraticCurveTo(controlX, controlY, toX, toY)
    ctx.stroke()

    // Calculate arrow position on the curve (80% along the curve)
    const t = 0.8
    const arrowX = fromX * (1 - t) * (1 - t) + 2 * controlX * t * (1 - t) + toX * t * t
    const arrowY = fromY * (1 - t) * (1 - t) + 2 * controlY * t * (1 - t) + toY * t * t

    // Calculate tangent vector at arrow position
    const tangentX = 2 * (controlX - fromX) * (1 - t) + 2 * (toX - controlX) * t
    const tangentY = 2 * (controlY - fromY) * (1 - t) + 2 * (toY - controlY) * t
    const tangentLength = Math.sqrt(tangentX * tangentX + tangentY * tangentY)
    
    if (tangentLength === 0) return { midX: controlX, midY: controlY }
    
    const unitTangentX = tangentX / tangentLength
    const unitTangentY = tangentY / tangentLength
    
    // Calculate perpendicular vector for arrow wings
    const perpX = -unitTangentY
    const perpY = unitTangentX
    
    // Draw arrow
    ctx.beginPath()
    ctx.moveTo(arrowX, arrowY)
    ctx.lineTo(arrowX - unitTangentX * arrowSize + perpX * arrowSize * 0.5, arrowY - unitTangentY * arrowSize + perpY * arrowSize * 0.5)
    ctx.lineTo(arrowX - unitTangentX * arrowSize - perpX * arrowSize * 0.5, arrowY - unitTangentY * arrowSize - perpY * arrowSize * 0.5)
    ctx.closePath()
    ctx.fill()

    return { midX: controlX, midY: controlY }
  }

  // Stable event handlers
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Check if any modal is open by looking for dialog elements
      const openDialogs = document.querySelectorAll('[data-state="open"]')
      const dialogContent = document.querySelector('[role="dialog"]')
      const modalOverlay = document.querySelector('[data-radix-dialog-overlay]')
      
      if (openDialogs.length > 0 || dialogContent || modalOverlay) {
        return // Don't handle mouse events if modals are open
      }

      const rect = canvas.getBoundingClientRect()
      const x = (event.clientX - rect.left) / zoom - pan.x
      const y = (event.clientY - rect.top) / zoom - pan.y

      if (isDrawing) {
        updateDrawing(x, y)
        return
      }

      // Dragging is now started immediately on mouse down, so we don't need this check

      if (draggedNode) {
        // Calculate delta in screen coordinates, then convert to graph coordinates
        const deltaX = (event.clientX - dragStart.x) / zoom
        const deltaY = (event.clientY - dragStart.y) / zoom
        
        // Move node to original position + delta
        const newX = nodeDragStart.x + deltaX
        const newY = nodeDragStart.y + deltaY
        
        // Debug logging for node dragging
        console.log('Node dragging:', {
          nodeId: draggedNode.id,
          zoom,
          deltaX,
          deltaY,
          newX,
          newY,
          isDragging
        })
        
        setNodesRef.current((prevNodes) =>
          prevNodes.map((node) => (node.id === draggedNode.id ? { ...node, x: newX, y: newY } : node)),
        )
        // Don't update dragStart during node dragging to prevent coordinate drift
        return
      }

      if (draggedDrawing) {
        const deltaX = (event.clientX - dragStart.x)
        const deltaY = (event.clientY - dragStart.y)
        handleDrawingDrag(draggedDrawing.id, deltaX / zoom, deltaY / zoom)
        // Don't update dragStart during drawing drag to prevent coordinate drift
        return
      }

      // Check if hovering over a node - use original nodes array for consistency
      const hoveredNode = nodes.find((node) => {
        const nodeRadius = node.isPassThrough ? 15 : 30
        const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
        return distance <= nodeRadius
      })

      // Delete button hover detection is now handled by HTML elements

      setHoveredNode(hoveredNode?.id || null)

      // Set cursor based on active tool, hover state, and attachment mode
      if (attachmentMode?.active) {
        canvas.style.cursor = hoveredNode ? "copy" : "not-allowed"
      } else if (activeTool === "pen") {
        canvas.style.cursor = "crosshair"
      } else if (activeTool === "text") {
        canvas.style.cursor = "text"
      } else if (activeTool === "rectangle" || activeTool === "circle") {
        canvas.style.cursor = "crosshair"
      } else if (activeTool === "connect") {
        canvas.style.cursor = hoveredNode ? "copy" : "crosshair"
      } else if (draggedNode) {
        canvas.style.cursor = "grabbing"
      } else if (hoveredNode) {
        canvas.style.cursor = "pointer"
      } else if (isDragging) {
        canvas.style.cursor = "grabbing"
      } else {
        canvas.style.cursor = "default"
      }

      // Only update pan if we're dragging the canvas (not a node or drawing)
      // This should only happen when isDragging is true but no specific element is being dragged
      if (isDragging && !draggedNode && !draggedDrawing && !isDrawing) {
        // Debug logging for pan updates
        console.log('Canvas panning:', {
          zoom,
          isDragging,
          draggedNode: !!draggedNode,
          draggedDrawing: !!draggedDrawing,
          isDrawing,
          panDelta: {
            x: (event.clientX - dragStart.x) / zoom,
            y: (event.clientY - dragStart.y) / zoom
          }
        })
        
        setPan?.({
          x: pan.x + (event.clientX - dragStart.x) / zoom,
          y: pan.y + (event.clientY - dragStart.y) / zoom,
        })
        setDragStart({ x: event.clientX, y: event.clientY })
      }
    },
    [
      zoom,
      pan,
      isDrawing,
      draggedNode,
      draggedDrawing,
      dragStart,
      nodeDragStart,
      nodes,
      attachmentMode,
      activeTool,
      isDragging,
      updateDrawing,
      handleDrawingDrag,
    ],
  )

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Check if any modal is open by looking for dialog elements
      const openDialogs = document.querySelectorAll('[data-state="open"]')
      const dialogContent = document.querySelector('[role="dialog"]')
      const modalOverlay = document.querySelector('[data-radix-dialog-overlay]')
      
      if (openDialogs.length > 0 || dialogContent || modalOverlay) {
        return // Don't handle mouse events if modals are open
      }

      const rect = canvas.getBoundingClientRect()
      const x = (event.clientX - rect.left) / zoom - pan.x
      const y = (event.clientY - rect.top) / zoom - pan.y

      // Handle attachment mode
      if (attachmentMode?.active) {
        // Check if clicking on a node - use original nodes array for consistency
        const clickedNode = nodes.find((node) => {
          const nodeRadius = node.isPassThrough ? 15 : 30
          const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
          return distance <= nodeRadius
        })

        if (clickedNode) {
          // Attach the drawing to this node
          setDrawingElements((prev) =>
            prev.map((el) => {
              if (el.id === attachmentMode.drawingId) {
                return {
                  ...el,
                  connectedNodeId: clickedNode.id,
                  offsetX: el.x - clickedNode.x,
                  offsetY: el.y - clickedNode.y,
                }
              }
              return el
            }),
          )
          setAttachmentMode(null)
        }
        return
      }

      // Handle drawing tools
      if (activeTool !== "select") {
        startDrawing(x, y)
        return
      }

      // Check if clicking on node buttons first
      const clickedNode = nodes.find((node) => {
        const nodeRadius = node.isPassThrough ? 15 : 30
        const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
        return distance <= nodeRadius
      })

      if (clickedNode) {
        const nodeRadius = clickedNode.isPassThrough ? 15 : 30
        const buttonOffset = nodeRadius + 5
        
        // Check if clicking on delete button (top-left)
        const deleteButtonX = clickedNode.x - buttonOffset
        const deleteButtonY = clickedNode.y - buttonOffset
        const distanceToDeleteButton = Math.sqrt((x - deleteButtonX) ** 2 + (y - deleteButtonY) ** 2)
        
        if (distanceToDeleteButton <= 8 && clickedNode.type !== "passthrough" && clickedNode.type !== "bridge") {
          console.log('🎯 Delete button clicked for node:', clickedNode.id)
          setDeleteConfirmDialog({
            open: true,
            nodeId: clickedNode.id,
            nodeLabel: clickedNode.label
          })
          return
        }
        
        // Check if clicking on expand button (top-right)
        const expandButtonX = clickedNode.x + buttonOffset
        const expandButtonY = clickedNode.y - buttonOffset
        const distanceToExpandButton = Math.sqrt((x - expandButtonX) ** 2 + (y - expandButtonY) ** 2)
        
        if (distanceToExpandButton <= 8 && clickedNode.availableTransactions && clickedNode.availableTransactions > 0) {
          console.log('🎯 Expand button clicked for node:', clickedNode.id)
          setExpansionTargetId(clickedNode.id) // Set expansion target to the node being expanded
          setExpansionDialog({ nodeId: clickedNode.id, visible: true })
          return
        }
        
        // If not clicking on buttons, handle normal node selection
        setSelectedNode(clickedNode.id)
        setDragStart({ x: event.clientX, y: event.clientY })
        onNodeSelect?.(clickedNode.address, clickedNode)

        // Start node dragging - don't set isDragging for node dragging
        setDraggedNode(clickedNode)
        setNodeDragStart({ x: clickedNode.x, y: clickedNode.y })
        // Don't set isDragging for node dragging - that's only for canvas panning

        // Debug logging for node click
        console.log('Node clicked:', {
          nodeId: clickedNode.id,
          nodeLabel: clickedNode.label,
          nodeType: clickedNode.type,
          availableTransactions: clickedNode.availableTransactions,
          address: clickedNode.address,
          zoom,
          settingDraggedNode: true,
          settingIsDragging: false
        })

        // Double click to expand or connect (fallback for expand functionality)
        if (event.detail === 2) {
          if (clickedNode.availableTransactions && clickedNode.availableTransactions > 0) {
            console.log('Setting expansion target to:', clickedNode.id, 'for node:', clickedNode.label)
            console.log('Current selected node before setting expansion target:', selectedNode)
            setExpansionTargetId(clickedNode.id) // Set the expansion target to the clicked node
            setExpansionDialog({ nodeId: clickedNode.id, visible: true })
          } else if (clickedNode.type === "custom" && onCustomNodeConnect) {
            onCustomNodeConnect(clickedNode.id)
          } else {
            console.log('Cannot expand node:', clickedNode.id, 'availableTransactions:', clickedNode.availableTransactions)
          }
        }
      } else if (onPlacement) {
        // Placement mode
        onPlacement(x, y)
      } else {
        // Check for drawing selection
        const isDoubleClick = event.detail === 2
        selectDrawingElement(x, y, isDoubleClick)

        // If a drawing is selected and not double-clicked, start dragging it
        if (selectedDrawing && !isDoubleClick) {
          const selectedElement = drawingElements.find((el) => el.id === selectedDrawing)
          if (
            selectedElement &&
            ((selectedElement.type === "text" &&
              Math.abs(x - selectedElement.x) < 50 &&
              Math.abs(y - selectedElement.y) < 20) ||
              (selectedElement.type === "circle" &&
                Math.abs(
                  Math.sqrt((x - selectedElement.x) ** 2 + (y - selectedElement.y) ** 2) -
                    (selectedElement.radius || 0),
                ) < 10) ||
              (selectedElement.type === "rectangle" &&
                x >= selectedElement.x &&
                x <= selectedElement.x + (selectedElement.width || 0) &&
                y >= selectedElement.y &&
                y <= selectedElement.y + (selectedElement.height || 0)))
          ) {
            startDraggingDrawing(selectedDrawing, event.clientX, event.clientY)
            return
          }
        }

        // Check if clicking on an edge (now supporting grouped connections)
        let clickedEdge = null
        const groups = groupedConnections

        for (const group of groups) {
          const fromNode = nodes.find((n) => n.id === group.from)
          const toNode = nodes.find((n) => n.id === group.to)
          if (!fromNode || !toNode) continue

          if (group.connections.length === 1) {
            // Single connection - straight line
            const midX = (fromNode.x + toNode.x) / 2
            const midY = (fromNode.y + toNode.y) / 2

            if (Math.abs(x - midX) < 50 && Math.abs(y - midY) < 20) {
              clickedEdge = { connection: group.connections[0], x: midX, y: midY, isGroup: false }
              break
            }
          } else {
            // Multiple connections - check curved lines
            for (let i = 0; i < group.connections.length; i++) {
              const curveOffset = (i - (group.connections.length - 1) / 2) * 50
              const midX = (fromNode.x + toNode.x) / 2
              const midY = (fromNode.y + toNode.y) / 2

              // Calculate curve control point
              const dx = toNode.x - fromNode.x
              const dy = toNode.y - fromNode.y
              const length = Math.sqrt(dx * dx + dy * dy)
              const unitX = -dy / length
              const unitY = dx / length

              const controlX = midX + unitX * curveOffset
              const controlY = midY + unitY * curveOffset

              if (Math.abs(x - controlX) < 40 && Math.abs(y - controlY) < 40) {
                clickedEdge = { connection: group, x: controlX, y: controlY, isGroup: true }
                break
              }
            }
            if (clickedEdge) break
          }
        }

        if (clickedEdge) {
          setEdgeDetails({ ...clickedEdge, visible: true })
        } else {
          setSelectedNode(null)
          setEdgeDetails(null)
          setIsDragging(true)
          setDragStart({ x: event.clientX, y: event.clientY })
          
          // Debug logging for canvas pan initiation
          console.log('Canvas pan initiated:', {
            zoom,
            settingIsDragging: true,
            settingDraggedNode: false
          })
        }
      }
    },
    [
      zoom,
      pan,
      attachmentMode,
      activeTool,
      nodes,
      selectedDrawing,
      drawingElements,
      groupedConnections,
      startDrawing,
      selectDrawingElement,
      onNodeSelect,
      startDraggingDrawing,
    ],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDraggedNode(null)
    setNodeDragStart({ x: 0, y: 0 })
    if (draggedDrawing) {
      setDrawingElements((prev) => prev.map((el) => (el.id === draggedDrawing.id ? { ...el, isDragging: false } : el)))
      setDraggedDrawing(null)
    }
    if (isDrawing) {
      finishDrawing()
    }
  }, [draggedDrawing, isDrawing, finishDrawing])

  const handleClick = useCallback((event: MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Check if any modal is open by looking for dialog elements
    const openDialogs = document.querySelectorAll('[data-state="open"]')
    const dialogContent = document.querySelector('[role="dialog"]')
    const modalOverlay = document.querySelector('[data-radix-dialog-overlay]')
    
    if (openDialogs.length > 0 || dialogContent || modalOverlay) {
      return // Don't handle mouse events if modals are open
    }

    const rect = canvas.getBoundingClientRect()
    const devicePixelRatio = window.devicePixelRatio || 1
    const x = (event.clientX - rect.left) / zoom - pan.x
    const y = (event.clientY - rect.top) / zoom - pan.y
    


    // Check if clicking on a node
    const clickedNode = nodes.find((node) => {
      const nodeRadius = node.isPassThrough ? 15 : 30
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
      return distance <= nodeRadius
    })

    // Delete button detection is now handled in handleMouseDown to prevent drag conflicts

    // If not clicking on a node, clear selection
    if (!clickedNode) {
      setSelectedNode(null)
    }
  }, [nodes, zoom, pan, selectedNode])

  // Add this function before the useEffect that handles drawing
  const drawNodeWithChainLogo = (ctx: CanvasRenderingContext2D, node: Node) => {
    const isDark = document.documentElement.classList.contains('dark')
    const isSelected = selectedNode === node.id
    const isHovered = hoveredNode === node.id
    const nodeRadius = (node.isPassThrough && node.type !== "bridge") ? 15 : 30
    
    // Removed excessive logging to reduce console noise

    // Node shadow for depth
    if (isSelected || isHovered) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
      ctx.beginPath()
      ctx.arc(node.x + 2, node.y + 2, nodeRadius, 0, 2 * Math.PI)
      ctx.fill()
    }

    // Main node circle
    ctx.fillStyle = "#374151"
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI)
    ctx.fill()

    // Node border based on entity type and risk
    ctx.strokeStyle = getEntityTypeColor(node.type, node.risk)
    ctx.lineWidth = isSelected ? 4 : 3
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI)
    ctx.stroke()

    // Pass-through indicator (green triangle)
    if (node.isPassThrough) {
      ctx.fillStyle = "#10b981"
      ctx.beginPath()
      const triangleOffset = nodeRadius + 8
      ctx.moveTo(node.x, node.y - triangleOffset)
      ctx.lineTo(node.x - 6, node.y - triangleOffset - 8)
      ctx.lineTo(node.x + 6, node.y - triangleOffset - 8)
      ctx.closePath()
      ctx.fill()
    }

    // Main logo or icon (but not for bridge nodes)
    const img = loadedImages.get(node.id)
    if (img && node.logo && node.type !== "bridge") {
      ctx.save()
      ctx.beginPath()
      ctx.arc(node.x, node.y, nodeRadius - 3, 0, 2 * Math.PI)
      ctx.clip()
      ctx.drawImage(img, node.x - nodeRadius + 3, node.y - nodeRadius + 3, (nodeRadius - 3) * 2, (nodeRadius - 3) * 2)
      ctx.restore()
    } else {
      // Default institution icon
      ctx.fillStyle = "#ffffff"
      ctx.font = "20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      if (node.type === "target") {
        // Draw shield icon
        ctx.beginPath()
        ctx.moveTo(node.x, node.y - 12)
        ctx.lineTo(node.x - 8, node.y - 8)
        ctx.lineTo(node.x - 8, node.y + 4)
        ctx.lineTo(node.x, node.y + 12)
        ctx.lineTo(node.x + 8, node.y + 4)
        ctx.lineTo(node.x + 8, node.y - 8)
        ctx.closePath()
        ctx.fill()
      } else if (node.type === "bridge") {
        // Draw split chain logos for bridge nodes
        const splitLogoSize = nodeRadius - 3
        const sourceImg = node.sourceChain ? loadedChainImages.get(node.id + '_source') : null
        const destImg = node.destinationChain ? loadedChainImages.get(node.id + '_dest') : null
        
        // Removed excessive bridge node logging to reduce console noise
        
        if (sourceImg && destImg) {
          ctx.save()
          
          // Draw left half (source chain)
          ctx.beginPath()
          ctx.arc(node.x, node.y, splitLogoSize, -Math.PI/2, Math.PI/2, false) // Left half circle
          ctx.clip()
          ctx.drawImage(sourceImg, node.x - splitLogoSize, node.y - splitLogoSize, splitLogoSize * 2, splitLogoSize * 2)
          ctx.restore()
          
          // Draw right half (destination chain)
          ctx.save()
          ctx.beginPath()
          ctx.arc(node.x, node.y, splitLogoSize, Math.PI/2, -Math.PI/2, false) // Right half circle
          ctx.clip()
          ctx.drawImage(destImg, node.x - splitLogoSize, node.y - splitLogoSize, splitLogoSize * 2, splitLogoSize * 2)
          ctx.restore()
          
          // Draw vertical line separator
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(node.x, node.y - splitLogoSize)
          ctx.lineTo(node.x, node.y + splitLogoSize)
          ctx.stroke()
          
          // Draw outer border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(node.x, node.y, splitLogoSize, 0, 2 * Math.PI)
          ctx.stroke()
        } else {
          // Fallback to diamond shape if images not loaded
          ctx.beginPath()
          ctx.moveTo(node.x, node.y - 12)
          ctx.lineTo(node.x + 12, node.y)
          ctx.lineTo(node.x, node.y + 12)
          ctx.lineTo(node.x - 12, node.y)
          ctx.closePath()
          ctx.fill()
        }
      } else {
        // Institution icon
        ctx.fillRect(node.x - 8, node.y - 8, 16, 12)
        ctx.fillRect(node.x - 6, node.y - 12, 2, 4)
        ctx.fillRect(node.x - 2, node.y - 12, 2, 4)
        ctx.fillRect(node.x + 2, node.y - 12, 2, 4)
        ctx.fillRect(node.x + 6, node.y - 12, 2, 4)
      }
    }

    // Chain logo (secondary logo) - positioned in top-right corner
    // Only show for non-bridge and non-passthrough nodes to avoid duplicate logos
    const chainImg = loadedChainImages.get(node.id)
    if (chainImg && node.chainLogo && node.type !== "bridge" && node.type !== "passthrough") {
      const chainLogoSize = 24 // Increased size for better visibility
      const chainLogoOffset = nodeRadius - 8 // Move more up and left to overlap more
      ctx.save()
      
      // Draw transparent border around chain logo
      ctx.beginPath()
      ctx.arc(node.x + chainLogoOffset, node.y + chainLogoOffset, chainLogoSize / 2 + 2, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)' // Semi-transparent white border
      ctx.fill()
      
      // Draw the chain logo
      ctx.beginPath()
      ctx.arc(node.x + chainLogoOffset, node.y + chainLogoOffset, chainLogoSize / 2, 0, 2 * Math.PI)
      ctx.clip()
      ctx.drawImage(
        chainImg,
        node.x + chainLogoOffset - chainLogoSize / 2,
        node.y + chainLogoOffset - chainLogoSize / 2,
        chainLogoSize,
        chainLogoSize
      )
      ctx.restore()
    }

    // Expansion indicator is now rendered as HTML overlay for better click reliability

    // Delete button is now rendered as HTML overlay for better click reliability

    // Entity label below node
    ctx.fillStyle = isDark ? "#e5e7eb" : "#374151"
    ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText(node.label, node.x, node.y + nodeRadius + 8)
  }

  // Canvas drawing effect - simplified dependencies
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Apply zoom and pan
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Clear canvas with theme-aware background
    const isDark = document.documentElement.classList.contains('dark')
    ctx.fillStyle = isDark ? "#0f172a" : "#ffffff"
    ctx.fillRect(-pan.x, -pan.y, canvas.offsetWidth, canvas.offsetHeight)

    // Draw grouped connections
    groupedConnections.forEach((group) => {
      const fromNode = nodes.find((n) => n.id === group.from)
      const toNode = nodes.find((n) => n.id === group.to)
      if (!fromNode || !toNode) return

      ctx.strokeStyle = isDark ? "#6b7280" : "#9ca3af"
      ctx.lineWidth = 1.5
      ctx.setLineDash([])

      if (group.connections.length === 1) {
        // Single connection - straight line
        const connection = group.connections[0]
        const edgeColor = connection.customColor || (isDark ? "#6b7280" : "#9ca3af")
        
        ctx.strokeStyle = edgeColor
        ctx.lineWidth = 1.5
        ctx.setLineDash([])
        
        ctx.beginPath()
        ctx.moveTo(fromNode.x, fromNode.y)
        ctx.lineTo(toNode.x, toNode.y)
        ctx.stroke()

        // Draw directional arrow
        ctx.fillStyle = edgeColor
        drawArrow(ctx, fromNode.x, fromNode.y, toNode.x, toNode.y, 8)

        // Transaction amount on edge
        const midX = (fromNode.x + toNode.x) / 2
        const midY = (fromNode.y + toNode.y) / 2

        ctx.fillStyle = isDark ? "#e5e7eb" : "#374151"
        ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        ctx.textAlign = "center"
        
        // Show pass-through indicator if this is an aggregated connection
        let amountText = connection.amount ? `${connection.amount} ${connection.currency}` : connection.currency
        if (connection.passThroughNodes && connection.passThroughNodes.length > 0) {
          amountText += ` (${connection.passThroughNodes.length} pass-through)`
        }
        ctx.fillText(amountText, midX, midY - 5)
      } else {
        // Multiple connections - curved lines with custom or default colors
        const connectionKey = `${group.from}-${group.to}`
        const customColors = customEdgeColors[connectionKey]
        
        const defaultColors = [
          isDark ? "#6b7280" : "#9ca3af", // Gray
          isDark ? "#6b7280" : "#9ca3af", // Gray
          isDark ? "#6b7280" : "#9ca3af", // Gray
          isDark ? "#6b7280" : "#9ca3af", // Gray
          isDark ? "#6b7280" : "#9ca3af", // Gray
          isDark ? "#6b7280" : "#9ca3af", // Gray
        ]
        
        const edgeColors = customColors || defaultColors
        
        group.connections.forEach((conn, index) => {
          const curveOffset = (index - (group.connections.length - 1) / 2) * 50
          
          // Use individual connection custom color if available, otherwise use group custom colors or default
          const edgeColor = conn.customColor || edgeColors[index % edgeColors.length] || defaultColors[0]
          ctx.strokeStyle = edgeColor
          ctx.fillStyle = edgeColor
          
          const curvePoint = drawCurvedArrow(ctx, fromNode.x, fromNode.y, toNode.x, toNode.y, curveOffset, 6)

          // Draw amount on each curve
          ctx.fillStyle = isDark ? "#e5e7eb" : "#374151"
          ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          ctx.textAlign = "center"
          
          // Show pass-through indicator if this is an aggregated connection
          let amountText = conn.amount ? `${conn.amount} ${conn.currency}` : conn.currency
          if (conn.passThroughNodes && conn.passThroughNodes.length > 0) {
            amountText += ` (${conn.passThroughNodes.length} pass-through)`
          }
          ctx.fillText(amountText, curvePoint.midX, curvePoint.midY - 5)
        })
        
        // Reset stroke style to default for other elements
        ctx.strokeStyle = isDark ? "#6b7280" : "#9ca3af"
      }
    })

    // Draw existing drawing elements
    drawingElements.forEach((element) => {
      ctx.strokeStyle = element.selected ? "#f59e0b" : element.color
      ctx.fillStyle = element.selected ? "#f59e0b" : element.color
      ctx.lineWidth = element.selected ? element.strokeWidth + 1 : element.strokeWidth

      if (element.type === "line" || element.type === "pen") {
        ctx.beginPath()
        ctx.moveTo(element.x, element.y)
        ctx.lineTo(element.x2 || element.x, element.y2 || element.y)
        ctx.stroke()
      } else if (element.type === "rectangle") {
        ctx.strokeRect(element.x, element.y, element.width || 0, element.height || 0)
      } else if (element.type === "circle") {
        ctx.beginPath()
        ctx.arc(element.x, element.y, element.radius || 0, 0, 2 * Math.PI)
        ctx.stroke()
      } else if (element.type === "text") {
        ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        ctx.fillText(element.text || "", element.x, element.y)

        // Show connection indicator
        if (element.connectedNodeId) {
          ctx.strokeStyle = "#10b981"
          ctx.setLineDash([2, 2])
          ctx.beginPath()
          const node = nodes.find((n) => n.id === element.connectedNodeId)
          if (node) {
            ctx.moveTo(element.x, element.y)
            ctx.lineTo(node.x, node.y)
            ctx.stroke()
          }
          ctx.setLineDash([])
        }
      }
    })

    // Draw current drawing element
    if (currentDrawing) {
      ctx.strokeStyle = currentDrawing.color
      ctx.fillStyle = currentDrawing.color
      ctx.lineWidth = currentDrawing.strokeWidth

      if (currentDrawing.type === "pen") {
        ctx.beginPath()
        ctx.moveTo(currentDrawing.x, currentDrawing.y)
        ctx.lineTo(currentDrawing.x2 || currentDrawing.x, currentDrawing.y2 || currentDrawing.y)
        ctx.stroke()
      } else if (currentDrawing.type === "rectangle") {
        ctx.strokeRect(currentDrawing.x, currentDrawing.y, currentDrawing.width || 0, currentDrawing.height || 0)
      } else if (currentDrawing.type === "circle") {
        ctx.beginPath()
        ctx.arc(currentDrawing.x, currentDrawing.y, currentDrawing.radius || 0, 0, 2 * Math.PI)
        ctx.stroke()
      }
    }

    // Draw nodes
    filteredNodesAndConnections.nodes.forEach((node) => {
      drawNodeWithChainLogo(ctx, node)
    })

    ctx.restore()

    // After drawing everything else, draw the attachment mode UI if active
    if (attachmentMode?.active) {
      // Draw a semi-transparent overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      ctx.fillRect(-pan.x / zoom, -pan.y / zoom, canvas.offsetWidth / zoom, canvas.offsetHeight / zoom)

      // Draw instruction text
      ctx.fillStyle = "#ffffff"
      ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(attachmentMode.message, canvas.offsetWidth / (2 * zoom) - pan.x, 50 / zoom - pan.y)

      // Highlight available nodes - use original nodes array for consistency
      nodes.forEach((node) => {
        ctx.strokeStyle = "#10b981"
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(node.x, node.y, 35, 0, 2 * Math.PI)
        ctx.stroke()
      })

      // Highlight the selected drawing
      const selectedElement = drawingElements.find((el) => el.id === attachmentMode.drawingId)
      if (selectedElement) {
        ctx.strokeStyle = "#f59e0b"
        ctx.lineWidth = 3

        if (selectedElement.type === "text") {
          ctx.beginPath()
          ctx.rect(selectedElement.x - 10, selectedElement.y - 20, 100, 30)
          ctx.stroke()
        } else if (selectedElement.type === "circle" && selectedElement.radius) {
          ctx.beginPath()
          ctx.arc(selectedElement.x, selectedElement.y, selectedElement.radius + 5, 0, 2 * Math.PI)
          ctx.stroke()
        } else if (selectedElement.type === "rectangle" && selectedElement.width && selectedElement.height) {
          ctx.beginPath()
          ctx.rect(
            selectedElement.x - 5,
            selectedElement.y - 5,
            selectedElement.width + 10,
            selectedElement.height + 10,
          )
          ctx.stroke()
        }
      }
    }

    // Add event listeners
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("click", handleClick)

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("click", handleClick)
    }
  }, [
    filteredNodesAndConnections.nodes,
    filteredNodesAndConnections.connections,
    loadedImages,
    loadedChainImages,
    selectedNode,
    hoveredNode,
    zoom,
    pan,
    drawingElements,
    currentDrawing,
    attachmentMode,
    groupedConnections,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleClick,
  ])

  // Add a UI element to show attachment status and detach option
  if (!isClient) {
    return <div className="relative h-full bg-background" />
  }

  return (
    <div className="relative h-full bg-background">
      <canvas ref={canvasRef} className="w-full h-full" />



      {/* Help Instructions */}
      {showHelp && (
        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-gray-100 shadow-lg max-w-sm">
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
            <div>• Arrows show direction of fund flow</div>
          </div>
        </div>
      )}

      {/* Edge details popup */}
      {edgeDetails && edgeDetails.visible && (
        <Card
          className="absolute bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl z-10"
          style={{
            left: `${edgeDetails.x * zoom + pan.x}px`,
            top: `${edgeDetails.y * zoom + pan.y - 100}px`,
            transform: "translateX(-50%)",
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-gray-900 dark:text-gray-100">
                {edgeDetails.isGroup ? "Multiple Transactions" : "Transaction Details"}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEdgeDetails(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {edgeDetails.isGroup ? (
              // Show grouped transaction details
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Transactions:</span>
                  <span className="text-foreground font-mono">
                    {(edgeDetails.connection as ConnectionGroup).connections.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="text-foreground font-mono">
                    {(edgeDetails.connection as ConnectionGroup).totalAmount.toFixed(8)} BTC
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total USD Value:</span>
                  <span className="text-green-400">
                    ${(edgeDetails.connection as ConnectionGroup).totalUsdValue.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="text-muted-foreground text-xs mb-1">Individual Transactions:</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {(edgeDetails.connection as ConnectionGroup).connections.map((conn, index) => (
                      <div key={index} className="text-xs">
                        <div className="flex justify-between">
                          <span className="text-blue-400 font-mono">{conn.txHash.substring(0, 8)}...</span>
                          <span className="text-foreground">
                            {conn.amount ? `${conn.amount} ${conn.currency}` : conn.currency}
                          </span>
                        </div>
                        {/* Show pass-through information for individual connections */}
                        {conn.passThroughNodes && conn.passThroughNodes.length > 0 && (
                          <div className="ml-2 mt-1 text-xs text-purple-400">
                            Pass-through: {conn.passThroughNodes.length} node(s)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              // Show single transaction details
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-foreground font-mono">
                    {(edgeDetails.connection as Connection).amount ? 
                      `${(edgeDetails.connection as Connection).amount} ${(edgeDetails.connection as Connection).currency}` : 
                      (edgeDetails.connection as Connection).currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">USD Value:</span>
                  <span className="text-green-400">{(edgeDetails.connection as Connection).usdValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="text-foreground">{(edgeDetails.connection as Connection).date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tx Hash:</span>
                  <span className="text-blue-400 font-mono cursor-pointer hover:text-blue-300">
                    {(edgeDetails.connection as Connection).txHash.substring(0, 8)}...
                  </span>
                </div>
                
                {/* Show pass-through information if this is an aggregated connection */}
                {(edgeDetails.connection as Connection).passThroughNodes && (edgeDetails.connection as Connection).passThroughNodes!.length > 0 && (
                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Pass-through Nodes:</span>
                      <span className="text-foreground font-mono">
                        {(edgeDetails.connection as Connection).passThroughNodes!.length}
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {(edgeDetails.connection as Connection).passThroughNodes!.map((nodeId, index) => {
                        const node = nodes.find(n => n.id === nodeId)
                        return (
                          <div key={index} className="text-xs flex justify-between items-center">
                            <span className="text-purple-400 font-mono">{node?.label || nodeId}</span>
                            <span className="text-muted-foreground text-xs">Pass-through</span>
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Show original transaction hashes */}
                    {(edgeDetails.connection as Connection).originalConnections && (edgeDetails.connection as Connection).originalConnections!.length > 0 && (
                      <div className="mt-2">
                        <div className="text-muted-foreground text-xs mb-1">Original Transactions:</div>
                        <div className="max-h-24 overflow-y-auto space-y-1">
                          {(edgeDetails.connection as Connection).originalConnections!.map((conn, index) => (
                            <div key={index} className="text-xs">
                              <div className="flex justify-between">
                                <span className="text-blue-400 font-mono">{conn.txHash.substring(0, 8)}...</span>
                                <span className="text-foreground">
                                  {conn.amount ? `${conn.amount} ${conn.currency}` : conn.currency}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            
            {/* Edit Button for single connections - only show for connections to custom nodes */}
            {!edgeDetails.isGroup && (() => {
              const connection = edgeDetails.connection as Connection
              const destinationNode = nodes.find(n => n.id === connection.to)
              return destinationNode?.type === "custom"
            })() && (
              <div className="border-t border-border pt-2 mt-2 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleConnectionEdit(edgeDetails.connection as Connection)
                    setEdgeDetails(null)
                  }}
                  className="w-full text-xs"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit Connection Data
                </Button>
                
                {/* Color Picker Button for single connections */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSingleConnectionColorPickerOpen(true)
                  }}
                  className="w-full text-xs"
                >
                  <Palette className="h-3 w-3 mr-1" />
                  Customize Edge Color
                </Button>
              </div>
            )}

            {/* Color Picker Button for single connections to non-custom nodes */}
            {!edgeDetails.isGroup && (() => {
              const connection = edgeDetails.connection as Connection
              const destinationNode = nodes.find(n => n.id === connection.to)
              return destinationNode?.type !== "custom"
            })() && (
              <div className="border-t border-border pt-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSingleConnectionColorPickerOpen(true)
                  }}
                  className="w-full text-xs"
                >
                  <Palette className="h-3 w-3 mr-1" />
                  Customize Edge Color
                </Button>
              </div>
            )}

            {/* Color Picker Button for multiple connections */}
            {edgeDetails.isGroup && (
              <div className="border-t border-border pt-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setColorPickerOpen(true)
                  }}
                  className="w-full text-xs"
                >
                  <Palette className="h-3 w-3 mr-1" />
                  Customize Edge Colors
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Color Picker Modal */}
      <Dialog open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customize Edge Colors</DialogTitle>
            <DialogDescription>
              Choose colors for each transaction edge between these nodes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {edgeDetails?.isGroup && (edgeDetails.connection as ConnectionGroup).connections.map((conn, index) => {
              const connectionKey = `${(edgeDetails.connection as ConnectionGroup).from}-${(edgeDetails.connection as ConnectionGroup).to}`
              const customColors = customEdgeColors[connectionKey] || []
              const isDark = document.documentElement.classList.contains('dark')
              const currentColor = customColors[index] || (isDark ? "#6b7280" : "#9ca3af")
              
              return (
                <div key={index} className="p-3 border rounded-lg space-y-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-6 h-6 rounded border-2 border-gray-300"
                      style={{ backgroundColor: currentColor }}
                    />
                    <div>
                      <div className="text-sm font-medium">
                        Transaction {index + 1}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {conn.amount ? `${conn.amount} ${conn.currency}` : conn.currency}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      "#6b7280", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
                      "#84cc16", "#ec4899", "#f97316", "#6366f1", "#a855f7", "#0891b2"
                    ].map((color) => (
                      <button
                        key={color}
                        className={`w-6 h-6 rounded border-2 transition-all ${
                          currentColor === color 
                            ? 'border-gray-900 scale-110' 
                            : 'border-gray-300 hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          const newColors = [...(customColors || [])]
                          newColors[index] = color
                          handleEdgeColorUpdate(connectionKey, newColors)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (edgeDetails?.isGroup) {
                  const connectionKey = `${(edgeDetails.connection as ConnectionGroup).from}-${(edgeDetails.connection as ConnectionGroup).to}`
                  setCustomEdgeColors(prev => {
                    const newColors = { ...prev }
                    delete newColors[connectionKey]
                    return newColors
                  })
                }
              }}
            >
              Reset to Default
            </Button>
            <Button onClick={() => setColorPickerOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Node Expansion Dialog */}
      {expansionDialog && (
        <NodeExpansionDialog
          nodeId={expansionDialog.nodeId}
          node={nodes.find((n) => n.id === expansionDialog.nodeId)}
          existingConnections={connections}
          onExpand={(nodeId, selectedTransactions) => {
            console.log('NodeExpansionDialog onExpand called with:', { nodeId, expansionTargetId, selectedTransactionsCount: selectedTransactions.length })
            expandNode(nodeId, selectedTransactions)
          }}
          onUpdateNodeTransactions={(nodeId, transactionCount) => {
            console.log(`Updating node ${nodeId} availableTransactions to ${transactionCount}`);
            setNodes(prev => prev.map(node => 
              node.id === nodeId 
                ? { ...node, availableTransactions: transactionCount }
                : node
            ));
          }}
          onClose={() => {
            setExpansionDialog(null)
            setExpansionTargetId(null) // Reset expansion target when dialog closes
            // Reset all drag states when dialog closes
            setIsDragging(false)
            setDraggedNode(null)
            setDraggedDrawing(null)
            setDragStart({ x: 0, y: 0 })
            setNodeDragStart({ x: 0, y: 0 })
            setSelectedNode(null)
            setHoveredNode(null)
            setSelectedDrawing(null)
            setIsDrawing(false)
            setCurrentDrawing(null)
            setAttachmentMode(null)
            // Reset any node dragging state
            setNodes(prev => prev.map(node => ({ ...node, isDragging: false })))
            // Reset any drawing dragging state
            setDrawingElements(prev => prev.map(el => ({ ...el, isDragging: false })))
            
            // Force mouse up event to ensure any ongoing drag is terminated
            const mouseUpEvent = new MouseEvent('mouseup', {
              bubbles: true,
              cancelable: true,
              view: window
            })
            document.dispatchEvent(mouseUpEvent)
          }}
        />
      )}

      {/* Connection Edit Dialog */}
      <ConnectionEditDialog
        open={connectionEditDialog.open}
        onOpenChange={(open) => setConnectionEditDialog(prev => ({ ...prev, open }))}
        connection={connectionEditDialog.connection}
        onSave={handleConnectionSave}
        onDelete={handleConnectionDelete}
      />

      {/* Node Deletion Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmDialog.open} 
        onOpenChange={(open) => setDeleteConfirmDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Node?</DialogTitle>
            <DialogDescription>
              This action will permanently delete the node and all its connections. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{deleteConfirmDialog.nodeLabel}</strong>? 
              This will also remove all connections to and from this node.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmDialog(prev => ({ ...prev, open: false }))}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteConfirmDialog.nodeId) {
                  console.log('🗑️ Confirming deletion of node:', deleteConfirmDialog.nodeId)
                  deleteNode(deleteConfirmDialog.nodeId)
                }
                setDeleteConfirmDialog(prev => ({ ...prev, open: false }))
              }}
            >
              Delete Node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Native clickable buttons for all nodes */}
      {nodes.map((node, index) => {
        const nodeRadius = node.isPassThrough ? 15 : 30
        const buttonOffset = nodeRadius + 5
        const buttonX = (node.x * zoom + pan.x)
        const buttonY = (node.y * zoom + pan.y)
        
        // Debug logging for expand button visibility
        if (node.availableTransactions && node.availableTransactions > 0) {
          console.log(`🔍 Node ${node.id} (${node.label}) has ${node.availableTransactions} available transactions`)
        }
        
        return (
          <div key={`buttons-${node.id}-${index}`}>
            {/* Delete button - show for all nodes except pass-through and bridge */}
            {node.type !== "passthrough" && node.type !== "bridge" && !isAnyModalOpen() && (
              <div
                className="absolute w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full cursor-pointer border-2 border-white shadow-lg z-10 flex items-center justify-center"
                style={{
                  left: `${buttonX - buttonOffset}px`,
                  top: `${buttonY - buttonOffset}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  console.log('🎯 Delete button clicked for node:', node.id)
                  setDeleteConfirmDialog({
                    open: true,
                    nodeId: node.id,
                    nodeLabel: node.label
                  })
                }}
                title={`Delete ${node.label}`}
              >
                <span className="text-white text-xs font-bold">×</span>
              </div>
            )}
            
            {/* Expand button - show for nodes with available transactions */}
            {(() => {
              // Always show expand button for testing, or when there are available transactions
              const shouldShow = !isAnyModalOpen() && (node.availableTransactions && node.availableTransactions > 0 || true);
              if (!shouldShow) {
                console.log('Expand button not showing for node:', node.id, {
                  availableTransactions: node.availableTransactions,
                  isAnyModalOpen: isAnyModalOpen(),
                  expansionDialog: expansionDialog
                });
              }
              return shouldShow;
            })() && (
              <div
                className="absolute w-4 h-4 bg-green-500 hover:bg-green-600 rounded-full cursor-pointer border-2 border-white shadow-lg z-10 flex items-center justify-center"
                style={{
                  left: `${buttonX + buttonOffset}px`,
                  top: `${buttonY - buttonOffset}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  console.log('🎯 Expand button clicked for node:', node.id)
                  setExpansionTargetId(node.id)
                  setExpansionDialog({ nodeId: node.id, visible: true })
                }}
                title={`Expand ${node.label} (${node.availableTransactions} transactions)`}
              >
                <span className="text-white text-xs font-bold">+</span>
              </div>
            )}
          </div>
        )
      })}

      {/* Single Connection Color Picker Modal */}
      <Dialog open={singleConnectionColorPickerOpen} onOpenChange={setSingleConnectionColorPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Edge Color</DialogTitle>
            <DialogDescription>
              Choose a custom color for this transaction edge.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!edgeDetails?.isGroup && edgeDetails && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-8 h-8 rounded border-2 border-gray-300"
                    style={{ backgroundColor: (edgeDetails.connection as Connection).customColor || (document.documentElement.classList.contains('dark') ? "#6b7280" : "#9ca3af") }}
                  />
                  <div>
                    <div className="text-sm font-medium">
                      {(edgeDetails.connection as Connection).txHash.substring(0, 8)}...
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(edgeDetails.connection as Connection).amount ? 
                        `${(edgeDetails.connection as Connection).amount} ${(edgeDetails.connection as Connection).currency}` : 
                        (edgeDetails.connection as Connection).currency}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    "#6b7280", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
                    "#84cc16", "#ec4899", "#f97316", "#6366f1", "#a855f7", "#0891b2"
                  ].map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded border-2 transition-all ${
                        (edgeDetails.connection as Connection).customColor === color 
                          ? 'border-gray-900 scale-110' 
                          : 'border-gray-300 hover:border-gray-500'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        setConnectionCustomColor((edgeDetails.connection as Connection).txHash, color)
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!edgeDetails?.isGroup && edgeDetails) {
                  clearConnectionCustomColor((edgeDetails.connection as Connection).txHash)
                }
              }}
            >
              Reset to Default
            </Button>
            <Button onClick={() => setSingleConnectionColorPickerOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
