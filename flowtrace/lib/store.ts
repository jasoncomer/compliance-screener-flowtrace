import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'

interface Connection {
  from: string
  to: string
  amount: string
  note?: string
  currency: string
  date?: string
  direction: "in" | "out"
  hideTxId?: boolean
  txHash?: string
  id?: string
}

interface Node {
  id: string
  label: string
  type: string
  logo?: string
  address?: string
  position?: { x: number; y: number }
}

interface GraphState {
  nodes: Node[]
  connections: Connection[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  
  // Node actions
  addNode: (node: Node) => void
  updateNode: (id: string, updates: Partial<Node>) => void
  deleteNode: (id: string) => void
  setSelectedNode: (id: string | null) => void
  
  // Connection actions
  addConnection: (connection: Omit<Connection, 'id'>) => void
  updateConnection: (txHash: string, updates: Partial<Connection>) => void
  deleteConnection: (txHash: string) => void
  setSelectedEdge: (id: string | null) => void
  
  // Batch actions
  clearAll: () => void
  loadState: (state: { nodes: Node[]; connections: Connection[] }) => void
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
      nodes: [],
      connections: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      
      // Node actions
      addNode: (node) => set((state) => ({
        nodes: [...state.nodes, { ...node, id: node.id || nanoid() }]
      })),
      
      updateNode: (id, updates) => set((state) => ({
        nodes: state.nodes.map(node => 
          node.id === id ? { ...node, ...updates } : node
        )
      })),
      
      deleteNode: (id) => set((state) => ({
        nodes: state.nodes.filter(node => node.id !== id),
        connections: state.connections.filter(conn => 
          conn.from !== id && conn.to !== id
        )
      })),
      
      setSelectedNode: (id) => set({ selectedNodeId: id }),
      
      // Connection actions
      addConnection: (connection) => set((state) => ({
        connections: [...state.connections, { 
          ...connection, 
          id: nanoid(),
          txHash: connection.txHash || `tx_${nanoid()}`
        }]
      })),
      
      updateConnection: (txHash, updates) => set((state) => ({
        connections: state.connections.map(conn => 
          conn.txHash === txHash ? { ...conn, ...updates } : conn
        )
      })),
      
      deleteConnection: (txHash) => set((state) => ({
        connections: state.connections.filter(conn => conn.txHash !== txHash)
      })),
      
      setSelectedEdge: (id) => set({ selectedEdgeId: id }),
      
      // Batch actions
      clearAll: () => set({ nodes: [], connections: [], selectedNodeId: null, selectedEdgeId: null }),
      
      loadState: (state) => set({ 
        nodes: state.nodes, 
        connections: state.connections 
      })
    }),
    {
      name: 'flowtrace-graph-storage',
      partialize: (state) => ({ 
        nodes: state.nodes, 
        connections: state.connections 
      })
    }
  )
) 