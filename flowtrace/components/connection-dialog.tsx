"use client"

import { useState, useEffect, useMemo } from "react"
import { nanoid } from "nanoid"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Checkbox } from "./ui/checkbox"
import { Badge } from "./ui/badge"
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import {
  Search,
  Filter,
  CalendarIcon,
  CheckSquare,
  Square,
  X,
  ChevronDown,
  SlidersHorizontal,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { format } from "date-fns"
import { getCurrencyIcon, getPopularCurrencies } from "@/lib/currency-icons"
import { createConnectionHash } from "@/lib/utils"

interface Node {
  id: string
  label: string
  type: string
  logo?: string
  address?: string
}

interface ConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnectionCreate: (connectionData: {
    from: string
    to: string
    amount: string
    note?: string
    currency: string
    date?: string
    direction: "in" | "out"
    hideTxId?: boolean
  }) => void
  onConnectionUpdate?: (connectionData: {
    from: string
    to: string
    amount: string
    note?: string
    currency: string
    date?: string
    direction: "in" | "out"
    hideTxId?: boolean
    originalTxHash?: string
  }) => void
  onConnectionDelete?: (txHash: string) => void
  sourceNodeId: string
  availableNodes: Array<Node>
  existingConnections?: Array<{
    from: string
    to: string
    amount: string
    note?: string
    currency: string
    date?: string
    direction: "in" | "out"
    hideTxId?: boolean
    txHash?: string
  }>
}

export function ConnectionDialog({ 
  open, 
  onOpenChange, 
  onConnectionCreate, 
  onConnectionUpdate, 
  onConnectionDelete, 
  sourceNodeId, 
  availableNodes,
  existingConnections = []
}: ConnectionDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [nodeDirections, setNodeDirections] = useState<Record<string, "in" | "out">>({})
  const [nodeNotes, setNodeNotes] = useState<Record<string, string>>({})
  const [nodeDates, setNodeDates] = useState<Record<string, Date | undefined>>({})
  const [nodeTimes, setNodeTimes] = useState<Record<string, string>>({})
  const [nodeAmounts, setNodeAmounts] = useState<Record<string, string>>({})
  const [currency, setCurrency] = useState("USD")
  const [hideTxId, setHideTxId] = useState(false)
  const [originalConnections, setOriginalConnections] = useState<Record<string, any>>({})
  const [rowIds, setRowIds] = useState<Record<string, string>>({})
  const [cachedFormState, setCachedFormState] = useState<{
    selectedNodes: Set<string>
    nodeDirections: Record<string, "in" | "out">
    nodeNotes: Record<string, string>
    nodeDates: Record<string, Date | undefined>
    nodeTimes: Record<string, string>
    nodeAmounts: Record<string, string>
    currency: string
    hideTxId: boolean
    rowIds: Record<string, string>
  } | null>(null)
  const [lastSourceNodeId, setLastSourceNodeId] = useState<string>("")
  const [lastExistingConnectionsHash, setLastExistingConnectionsHash] = useState<string>("")
  
  // Sorting state
  const [sortField, setSortField] = useState<string>("label")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Pre-populate form with existing connections when dialog opens
  useEffect(() => {
    if (open) {
      // Check if we're opening the dialog for the same source node
      const isSameSourceNode = lastSourceNodeId === sourceNodeId
      
      // Create a hash of the existing connections to detect changes
      const connectionsHash = createConnectionHash(existingConnections)
      
      // Check if the connections have changed
      const connectionsChanged = lastExistingConnectionsHash !== connectionsHash
      
      console.log('Connection dialog opening:', {
        isSameSourceNode,
        connectionsChanged,
        existingConnectionsCount: existingConnections.length,
        hasCachedState: !!cachedFormState
      })
      
      // If it's the same source node, connections haven't changed, and we have cached form state, use it
      if (isSameSourceNode && !connectionsChanged && cachedFormState) {
        console.log('Restoring cached form state')
        setSelectedNodes(cachedFormState.selectedNodes)
        setNodeDirections(cachedFormState.nodeDirections)
        setNodeNotes(cachedFormState.nodeNotes)
        setNodeDates(cachedFormState.nodeDates)
        setNodeTimes(cachedFormState.nodeTimes)
        setNodeAmounts(cachedFormState.nodeAmounts)
        setCurrency(cachedFormState.currency)
        setHideTxId(cachedFormState.hideTxId)
        setRowIds(cachedFormState.rowIds)
      } else if (existingConnections.length > 0) {
        console.log('Populating form with existing connections')
        const existingData: {
          selectedNodes: Set<string>
          nodeDirections: Record<string, "in" | "out">
          nodeNotes: Record<string, string>
          nodeDates: Record<string, Date | undefined>
          nodeTimes: Record<string, string>
          nodeAmounts: Record<string, string>
          currency: string
          hideTxId: boolean
          rowIds: Record<string, string>
        } = {
          selectedNodes: new Set(),
          nodeDirections: {},
          nodeNotes: {},
          nodeDates: {},
          nodeTimes: {},
          nodeAmounts: {},
          currency: "USD",
          hideTxId: false,
          rowIds: {}
        }

        const originalConnMap: Record<string, any> = {}
        
        existingConnections.forEach((conn, index) => {
          const targetNodeId = conn.from === sourceNodeId ? conn.to : conn.from
          // Create a unique key that includes the connection index to handle multiple connections to the same node
          const uniqueKey = `${targetNodeId}_${conn.txHash || index}`
          
          // For multiple connections to the same node, create a unique display key
          const displayKey = `${targetNodeId}_${index}`
          
          // Generate unique row ID
          const rowId = nanoid()
          
          existingData.selectedNodes.add(displayKey)
          existingData.nodeDirections[displayKey] = conn.direction
          existingData.rowIds[displayKey] = rowId
          if (conn.note) existingData.nodeNotes[displayKey] = conn.note
          if (conn.amount) existingData.nodeAmounts[displayKey] = conn.amount
          if (conn.currency) existingData.currency = conn.currency
          if (conn.hideTxId !== undefined) existingData.hideTxId = conn.hideTxId
          
          // Store original connection for this node with unique key
          originalConnMap[uniqueKey] = conn
          
          // Parse date and time
          if (conn.date) {
            const date = new Date(conn.date)
            existingData.nodeDates[displayKey] = date
            existingData.nodeTimes[displayKey] = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
          }
        })

        setOriginalConnections(originalConnMap)

        // Use the original connection data
        setSelectedNodes(existingData.selectedNodes)
        setNodeDirections(existingData.nodeDirections)
        setNodeNotes(existingData.nodeNotes)
        setNodeDates(existingData.nodeDates)
        setNodeTimes(existingData.nodeTimes)
        setNodeAmounts(existingData.nodeAmounts)
        setCurrency(existingData.currency)
        setHideTxId(existingData.hideTxId)
        setRowIds(existingData.rowIds)
        
        // Clear cache if connections have changed
        if (connectionsChanged) {
          console.log('Clearing cache due to connection changes')
          setCachedFormState(null)
        }
      } else {
        // No existing connections - check if we have cached state to restore
        if (isSameSourceNode && cachedFormState) {
          console.log('Restoring cached form state for node with no existing connections')
          setSelectedNodes(cachedFormState.selectedNodes)
          setNodeDirections(cachedFormState.nodeDirections)
          setNodeNotes(cachedFormState.nodeNotes)
          setNodeDates(cachedFormState.nodeDates)
          setNodeTimes(cachedFormState.nodeTimes)
          setNodeAmounts(cachedFormState.nodeAmounts)
          setCurrency(cachedFormState.currency)
          setHideTxId(cachedFormState.hideTxId)
          setRowIds(cachedFormState.rowIds)
        } else {
          // No cached state - clear form state
          console.log('Clearing form state - no cached state available')
          setSelectedNodes(new Set())
          setNodeDirections({})
          setNodeNotes({})
          setNodeDates({})
          setNodeTimes({})
          setNodeAmounts({})
          setCurrency("USD")
          setHideTxId(false)
          setRowIds({})
        }
        setOriginalConnections({})
      }
      
      setLastSourceNodeId(sourceNodeId)
      setLastExistingConnectionsHash(connectionsHash)
    }
  }, [open, sourceNodeId, existingConnections, lastSourceNodeId, cachedFormState, lastExistingConnectionsHash])



  // Clear cache when source node changes
  useEffect(() => {
    if (lastSourceNodeId && lastSourceNodeId !== sourceNodeId) {
      setCachedFormState(null)
      setLastExistingConnectionsHash("")
    }
  }, [sourceNodeId, lastSourceNodeId])

  // Ensure all selected nodes have direction set
  useEffect(() => {
    const newDirections = { ...nodeDirections }
    let hasChanges = false
    
    selectedNodes.forEach(nodeKey => {
      const nodeId = nodeKey.includes('_') ? nodeKey.split('_')[0] : nodeKey
      if (!newDirections[nodeKey] && !newDirections[nodeId]) {
        newDirections[nodeKey] = "out"
        hasChanges = true
      }
    })
    
    if (hasChanges) {
      console.log('Initializing directions for selected nodes:', newDirections)
      setNodeDirections(newDirections)
    }
  }, [selectedNodes, nodeDirections])



  // Sorting function
  const sortNodes = (nodes: any[], field: string, direction: "asc" | "desc") => {
    return [...nodes].sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (field) {
        case "label":
          aValue = a.label.toLowerCase()
          bValue = b.label.toLowerCase()
          break
        case "type":
          aValue = a.type.toLowerCase()
          bValue = b.type.toLowerCase()
          break
        case "address":
          aValue = (a.address || "").toLowerCase()
          bValue = (b.address || "").toLowerCase()
          break
        case "amount":
          // Get amount from form state for this node
          const aDisplayKey = getNodeDisplayKey(a.id)
          const bDisplayKey = getNodeDisplayKey(b.id)
          aValue = parseFloat(nodeAmounts[aDisplayKey] || "0")
          bValue = parseFloat(nodeAmounts[bDisplayKey] || "0")
          break
        case "note":
          // Get note from form state for this node
          const aNoteKey = getNodeDisplayKey(a.id)
          const bNoteKey = getNodeDisplayKey(b.id)
          aValue = (nodeNotes[aNoteKey] || "").toLowerCase()
          bValue = (nodeNotes[bNoteKey] || "").toLowerCase()
          break
        case "date":
          // Get date from form state for this node
          const aDateKey = getNodeDisplayKey(a.id)
          const bDateKey = getNodeDisplayKey(b.id)
          aValue = nodeDates[aDateKey] || new Date(0)
          bValue = nodeDates[bDateKey] || new Date(0)
          break
        default:
          aValue = a.label.toLowerCase()
          bValue = b.label.toLowerCase()
      }
      
      if (aValue < bValue) return direction === "asc" ? -1 : 1
      if (aValue > bValue) return direction === "asc" ? 1 : -1
      return 0
    })
  }

  // Filter nodes based on search query and exclude pass-through wallets and bridges
  const filteredNodes = useMemo(() => {
    const filtered = availableNodes.filter(node => 
      node.id !== sourceNodeId && 
      node.type !== "passthrough" &&
      node.type !== "bridge" &&
      (node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
       node.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (node.address && node.address.toLowerCase().includes(searchQuery.toLowerCase())))
    )
    
    // Apply sorting
    return sortNodes(filtered, sortField, sortDirection)
  }, [availableNodes, sourceNodeId, searchQuery, sortField, sortDirection, nodeAmounts, nodeNotes, nodeDates])

  // Helper function to get the count of selected nodes
  const getSelectedCount = () => {
    return filteredNodes.filter(node => 
      Array.from(selectedNodes).some(key => key === node.id || key.startsWith(node.id + '_'))
    ).length
  }

  // Helper function to get the display key for a node
  const getNodeDisplayKey = (nodeId: string) => {
    // Check if this node has a display key in the selected nodes
    const displayKey = Array.from(selectedNodes).find(key => 
      key === nodeId || key.startsWith(nodeId + '_')
    )
    return displayKey || nodeId
  }

  // Helper function to check if we're removing all existing connections
  const isRemovingAllConnections = () => {
    // Check if there are existing connections
    if (existingConnections.length === 0) return false
    
    // Check if all nodes that had existing connections are now unselected
    const nodesWithExistingConnections = existingConnections.map(conn => {
      const targetNodeId = conn.from === sourceNodeId ? conn.to : conn.from
      return targetNodeId
    })
    
    const allPreviouslySelectedNodesUnselected = nodesWithExistingConnections.every(nodeId => 
      !Array.from(selectedNodes).some(key => key === nodeId || key.startsWith(nodeId + '_'))
    )
    
    return allPreviouslySelectedNodesUnselected && getSelectedCount() === 0
  }

  // Helper function to get the button text
  const getButtonText = () => {
    if (isRemovingAllConnections()) {
      return "Remove All Connections"
    }
    
    const count = getSelectedCount()
    if (count === 0) {
      return "Create Connections"
    }
    
    return `Create ${count} Connection${count !== 1 ? 's' : ''}`
  }

  const handleNodeToggle = (nodeId: string) => {
    const newSelected = new Set(selectedNodes)
    
    // Check if this node is already selected (either as nodeId or as part of a display key)
    const isSelected = Array.from(newSelected).some(key => key === nodeId || key.startsWith(nodeId + '_'))
    

    
    if (isSelected) {
      // Remove all keys that start with this nodeId
      Array.from(newSelected).forEach(key => {
        if (key === nodeId || key.startsWith(nodeId + '_')) {
          newSelected.delete(key)
        }
      })
    } else {
      // Add the nodeId (this will be converted to display key format when needed)
      newSelected.add(nodeId)
      
      // Initialize direction for new nodes if not already set
      if (!nodeDirections[nodeId]) {
        setNodeDirections(prev => ({
          ...prev,
          [nodeId]: "out" // Default to outgoing
        }))
      }
    }
    
    setSelectedNodes(newSelected)
  }

  const handleSelectAll = () => {
    // Check if all nodes are currently selected
    const allSelected = filteredNodes.every(node => 
      Array.from(selectedNodes).some(key => key === node.id || key.startsWith(node.id + '_'))
    )
    
    if (allSelected) {
      setSelectedNodes(new Set())
    } else {
      // Select all nodes using their nodeId
      const nodeIds = filteredNodes.map(node => node.id)
      setSelectedNodes(new Set(nodeIds))
    }
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      // Set new field and default to ascending
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1" />
    }
    return sortDirection === "asc" ? 
      <ArrowUp className="h-3 w-3 ml-1" /> : 
      <ArrowDown className="h-3 w-3 ml-1" />
  }

  const handleCreateConnections = () => {
    console.log('=== Connection Creation Debug ===')
    console.log('Selected nodes:', Array.from(selectedNodes))
    console.log('Node directions:', nodeDirections)
    console.log('Node amounts:', nodeAmounts)
    console.log('Node notes:', nodeNotes)
    console.log('Existing connections:', existingConnections)
    console.log('Source node ID:', sourceNodeId)
    
    try {
      // Create deep copies to avoid mutations
      const updatedSelectedNodes = new Set(selectedNodes)
      const updatedNodeDirections = { ...nodeDirections }
      const updatedNodeNotes = { ...nodeNotes }
      const updatedNodeDates = { ...nodeDates }
      const updatedNodeTimes = { ...nodeTimes }
      const updatedNodeAmounts = { ...nodeAmounts }
      
      // Get the actual selected node IDs (handle both simple nodeId and displayKey formats)
      const selectedNodeIds = Array.from(updatedSelectedNodes).map(key => {
        // If it's a display key (contains '_'), extract the nodeId part
        if (key.includes('_')) {
          return key.split('_')[0]
        }
        return key
      })
      
      // Remove duplicates (in case we have both formats for the same node)
      const uniqueSelectedNodeIds = [...new Set(selectedNodeIds)]
      
      console.log('Unique selected node IDs:', uniqueSelectedNodeIds)
      
      // Get all nodes that had existing connections
      const nodesWithExistingConnections = new Set(
        existingConnections.map(conn => {
          const targetNodeId = conn.from === sourceNodeId ? conn.to : conn.from
          return targetNodeId
        })
      )
      
      console.log('Nodes with existing connections:', Array.from(nodesWithExistingConnections))
      
      // Handle deletions: Only remove connections for nodes that were explicitly unselected
      // (i.e., they had existing connections but are not in the current selection)
      if (onConnectionDelete) {
        nodesWithExistingConnections.forEach(nodeId => {
          if (!uniqueSelectedNodeIds.includes(nodeId)) {
            console.log(`Deleting connection for node: ${nodeId}`)
            // Find the existing connection for this node
            const existingConnection = existingConnections.find(conn => {
              const connTargetNodeId = conn.from === sourceNodeId ? conn.to : conn.from
              return connTargetNodeId === nodeId
            })
            
            if (existingConnection?.txHash) {
              console.log(`Deleting connection with txHash: ${existingConnection.txHash}`)
              onConnectionDelete(existingConnection.txHash)
            }
          }
        })
      }
      
      // Handle creations and updates for selected nodes
      uniqueSelectedNodeIds.forEach(nodeId => {
        // Find the display key for this nodeId (if it exists)
        const displayKey = Array.from(updatedSelectedNodes).find(key => 
          key === nodeId || key.startsWith(nodeId + '_')
        ) || nodeId
        
        console.log(`Processing node ${nodeId} with display key: ${displayKey}`)
        
        const nodeDirection = updatedNodeDirections[displayKey] || "out"
        const nodeAmount = updatedNodeAmounts[displayKey] || ""
        const nodeNote = updatedNodeNotes[displayKey] || ""
        const nodeDate = updatedNodeDates[displayKey] ? updatedNodeDates[displayKey]!.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        const nodeTime = updatedNodeTimes[displayKey] || "12:00"
        
        // Check if this node already has a connection
        const existingConnection = existingConnections.find(conn => {
          const connTargetNodeId = conn.from === sourceNodeId ? conn.to : conn.from
          return connTargetNodeId === nodeId
        })
        
        if (existingConnection) {
          // Update existing connection
          console.log(`Updating existing connection for node: ${nodeId}`)
          if (onConnectionUpdate) {
            onConnectionUpdate({
              from: sourceNodeId,
              to: nodeId,
              amount: nodeAmount,
              note: nodeNote,
              currency: currency, // Use selected currency
              date: nodeDate,
              direction: nodeDirection as "in" | "out",
              originalTxHash: existingConnection.txHash
            })
          }
        } else {
          // Create new connection
          console.log(`Creating new connection for node: ${nodeId}`)
          if (onConnectionCreate) {
            onConnectionCreate({
              from: sourceNodeId,
              to: nodeId,
              amount: nodeAmount,
              note: nodeNote,
              currency: currency, // Use selected currency
              date: nodeDate,
              direction: nodeDirection as "in" | "out"
            })
          }
        }
      })
      
      console.log('=== Connection Creation Complete ===')
      
      // Reset form state
      setSelectedNodes(new Set())
      setNodeDirections({})
      setNodeAmounts({})
      setNodeNotes({})
      setNodeDates({})
      setNodeTimes({})
      setSearchQuery("")
      
      // Close dialog
      onOpenChange(false)
    } catch (error) {
      console.error('Error in handleCreateConnections:', error)
    }
  }

  const availableCurrencies = getPopularCurrencies().map(c => c.code)

  const sourceNode = availableNodes.find(node => node.id === sourceNodeId)

  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen) {
      // Cache the current form state when dialog closes without saving
      const currentFormState = {
        selectedNodes: new Set(selectedNodes),
        nodeDirections: { ...nodeDirections },
        nodeNotes: { ...nodeNotes },
        nodeDates: { ...nodeDates },
        nodeTimes: { ...nodeTimes },
        nodeAmounts: { ...nodeAmounts },
        currency,
        hideTxId,
        rowIds: { ...rowIds }
      }
      setCachedFormState(currentFormState)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent 
        className="max-w-6xl w-[90vw] max-h-[85vh] bg-card border-2 border-border text-foreground shadow-2xl p-0 overflow-hidden ring-4 ring-primary/40 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <DialogHeader className="border-b-2 border-primary/30 p-6 pb-4 flex-shrink-0 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground flex items-center">
                <div className="w-2 h-8 bg-primary rounded-full mr-3"></div>
                <div className="flex items-center">
                  {sourceNode?.logo && (
                    <img 
                      src={sourceNode.logo} 
                      alt={sourceNode.label} 
                      className="w-8 h-8 rounded-full mr-3 border-2 border-border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                  <span>Create Connections from {sourceNode?.label || "Selected Node"}</span>
                </div>
              </DialogTitle>
              <div className="text-sm text-muted-foreground mt-1 ml-5">
                Select target nodes to create connections
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Content - Fixed height container */}
        <div className="flex flex-col flex-1 min-h-0 p-4 pt-0 space-y-3">
          {/* Search and Controls */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search nodes by name, type, or address..."
                className="pl-10 bg-muted border-border text-foreground placeholder-muted-foreground h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>



          {/* Selection Controls */}
          <div className="flex items-center justify-between bg-muted rounded-lg p-3 border border-border flex-shrink-0">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="border-border bg-background text-foreground hover:text-foreground hover:bg-accent"
              >
                {getSelectedCount() === filteredNodes.length ? (
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
                <span className="text-primary font-medium">{getSelectedCount()}</span> of{" "}
                <span className="text-foreground font-medium">{filteredNodes.length}</span> selected
              </span>
              
              {/* Currency Selection */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Currency:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border bg-background text-foreground hover:text-foreground hover:bg-accent"
                    >
                      {(() => {
                        const currencyIcon = getCurrencyIcon(currency)
                        return (
                          <div className="flex items-center space-x-2">
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
                            <span>{currency}</span>
                            <ChevronDown className="h-3 w-3" />
                          </div>
                        )
                      })()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="grid grid-cols-1 gap-1">
                      {getPopularCurrencies().map((curr) => (
                        <Button
                          key={curr.code}
                          variant="ghost"
                          size="sm"
                          className="justify-start h-10"
                          onClick={() => setCurrency(curr.code)}
                        >
                          <img 
                            src={curr.logo} 
                            alt={curr.name}
                            className="w-5 h-5 rounded-full mr-3"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-medium">{curr.code}</span>
                            <span className="text-xs text-muted-foreground">{curr.name}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-1" />
                Showing {filteredNodes.length} of {availableNodes.length - 1} available nodes
              </div>
              {(getSelectedCount() > 0 || isRemovingAllConnections()) && (
                <div className="flex items-center text-green-600">
                  <ArrowRight className="h-4 w-4 mr-1" />
                  {isRemovingAllConnections() ? "Ready to remove" : "Ready to connect"}
                </div>
              )}
            </div>
          </div>

          {/* Node List - Fixed height scrollable area */}
          <div className="flex-1 min-h-0 border border-border rounded-lg bg-muted overflow-hidden flex flex-col flex-shrink-0">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-3 border-b border-border bg-background text-sm font-medium text-foreground flex-shrink-0">
              <div className="col-span-1"></div>
              <div 
                className="col-span-2 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("label")}
              >
                Node Name
                {getSortIcon("label")}
              </div>
              <div 
                className="col-span-1 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("type")}
              >
                Type
                {getSortIcon("type")}
              </div>
              <div 
                className="col-span-3 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("address")}
              >
                Direction & Address
                {getSortIcon("address")}
              </div>
              <div 
                className="col-span-2 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("amount")}
              >
                Amount
                {getSortIcon("amount")}
              </div>
              <div 
                className="col-span-2 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("note")}
              >
                Note
                {getSortIcon("note")}
              </div>
              <div 
                className="col-span-1 flex items-center cursor-pointer hover:text-primary transition-colors"
                onClick={() => handleSort("date")}
              >
                Date/Time
                {getSortIcon("date")}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto">
              <div className="space-y-1 p-1">
                {filteredNodes.map((node) => {
                  // Check if this node is selected (either as nodeId or as part of a display key)
                  const isSelected = Array.from(selectedNodes).some(key => key === node.id || key.startsWith(node.id + '_'))
                  
                  return (
                    <div
                      key={node.id}
                      className={`grid grid-cols-12 gap-4 p-3 rounded-lg border transition-all cursor-pointer items-center ${
                        isSelected
                          ? "bg-primary/20 border-primary"
                          : "bg-background/50 border-border hover:bg-accent/50 hover:border-border"
                      }`}
                      onClick={() => handleNodeToggle(node.id)}
                    >
                    <div className="col-span-1">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleNodeToggle(node.id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center">
                        {node.logo && (
                          <img 
                            src={node.logo} 
                            alt={node.label} 
                            className="w-6 h-6 rounded-full mr-2 border border-border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <div className="font-medium text-foreground text-sm">{node.label}</div>
                      </div>
                    </div>

                    <div className="col-span-1">
                      <Badge variant="outline" className="text-xs">
                        {node.type}
                      </Badge>
                    </div>

                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer ${
                            (nodeDirections[node.id] || nodeDirections[getNodeDisplayKey(node.id)] || "out") === "out" 
                              ? "bg-green-500" 
                              : "bg-red-500"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            const displayKey = getNodeDisplayKey(node.id)
                            const currentDirection = nodeDirections[node.id] || nodeDirections[displayKey] || "out"
                            console.log('Direction toggle clicked:', {
                              nodeId: node.id,
                              displayKey,
                              currentDirection,
                              allDirections: nodeDirections
                            })
                            // Update both the display key and the simple node ID to ensure it works
                            setNodeDirections(prev => ({
                              ...prev,
                              [node.id]: currentDirection === "out" ? "in" : "out",
                              [displayKey]: currentDirection === "out" ? "in" : "out"
                            }))
                          }}
                        >
                          <span 
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              (nodeDirections[node.id] || nodeDirections[getNodeDisplayKey(node.id)] || "out") === "out" ? "translate-x-7" : "translate-x-1"
                            }`}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {(nodeDirections[node.id] || nodeDirections[getNodeDisplayKey(node.id)] || "out") === "out" ? "To" : "From"}
                        </span>
                        <div className="font-mono text-foreground text-sm" title={node.address}>
                          {node.address ? `${node.address.substring(0, 6)}...${node.address.substring(node.address.length - 6)}` : "No address"}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <Input
                        value={nodeAmounts[getNodeDisplayKey(node.id)] || ""}
                        onChange={(e) => {
                          e.stopPropagation()
                          const displayKey = getNodeDisplayKey(node.id)
                          setNodeAmounts(prev => ({
                            ...prev,
                            [displayKey]: e.target.value
                          }))
                        }}
                        placeholder="Amount..."
                        className="bg-background text-xs h-8"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="col-span-2">
                      <Input
                        value={nodeNotes[getNodeDisplayKey(node.id)] || ""}
                        onChange={(e) => {
                          e.stopPropagation()
                          const displayKey = getNodeDisplayKey(node.id)
                          setNodeNotes(prev => ({
                            ...prev,
                            [displayKey]: e.target.value
                          }))
                        }}
                        placeholder="Add note..."
                        className="bg-background text-xs h-8"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="col-span-1">
                      <div className="flex gap-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 justify-start text-left font-normal bg-background text-xs h-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {nodeDates[getNodeDisplayKey(node.id)] ? format(nodeDates[getNodeDisplayKey(node.id)]!, "MM/dd") : "Date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" onClick={(e) => e.stopPropagation()}>
                            <Calendar
                              mode="single"
                              selected={nodeDates[getNodeDisplayKey(node.id)]}
                              onSelect={(date) => {
                                const displayKey = getNodeDisplayKey(node.id)
                                setNodeDates(prev => ({
                                  ...prev,
                                  [displayKey]: date
                                }))
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          value={nodeTimes[getNodeDisplayKey(node.id)] || ""}
                          onChange={(e) => {
                            e.stopPropagation()
                            const displayKey = getNodeDisplayKey(node.id)
                            setNodeTimes(prev => ({
                              ...prev,
                              [displayKey]: e.target.value
                            }))
                          }}
                          className="bg-background text-xs h-8 w-16"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t border-border p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateConnections} 
            disabled={getSelectedCount() === 0 && !isRemovingAllConnections()}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-2"
          >
            {getButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 