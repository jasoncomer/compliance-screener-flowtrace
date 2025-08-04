export interface Workspace {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
  nodes: any[]
  connections: any[]
  selectedAddress?: string
  selectedNode?: any
  zoom: number
  pan: { x: number; y: number }
  hidePassThrough: boolean
  notes: Array<{
    id: string
    userId: string
    userName: string
    content: string
    timestamp: string
  }>
}

export interface AddressSearchResult {
  workspaceId: string
  workspaceName: string
  address: string
  nodeData: any
  matchType: 'exact' | 'partial'
}

class WorkspaceManager {
  private readonly STORAGE_KEY = 'flowtrace_workspaces'
  private readonly ADDRESS_INDEX_KEY = 'flowtrace_address_index'

  // Save workspace to localStorage
  saveWorkspace(workspace: Workspace): void {
    try {
      const workspaces = this.getAllWorkspaces()
      const existingIndex = workspaces.findIndex(w => w.id === workspace.id)
      
      if (existingIndex >= 0) {
        workspaces[existingIndex] = {
          ...workspace,
          updatedAt: new Date().toISOString()
        }
      } else {
        workspaces.push({
          ...workspace,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workspaces))
      this.updateAddressIndex(workspace)
    } catch (error) {
      console.error('Error saving workspace:', error)
      throw new Error('Failed to save workspace')
    }
  }

  // Load workspace by ID
  loadWorkspace(workspaceId: string): Workspace | null {
    try {
      const workspaces = this.getAllWorkspaces()
      return workspaces.find(w => w.id === workspaceId) || null
    } catch (error) {
      console.error('Error loading workspace:', error)
      return null
    }
  }

  // Get all workspaces
  getAllWorkspaces(): Workspace[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error loading workspaces:', error)
      return []
    }
  }

  // Delete workspace
  deleteWorkspace(workspaceId: string): boolean {
    try {
      const workspaces = this.getAllWorkspaces()
      const filtered = workspaces.filter(w => w.id !== workspaceId)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
      this.removeFromAddressIndex(workspaceId)
      return true
    } catch (error) {
      console.error('Error deleting workspace:', error)
      return false
    }
  }

  // Search for addresses across all workspaces
  searchAddresses(query: string): AddressSearchResult[] {
    try {
      const workspaces = this.getAllWorkspaces()
      const results: AddressSearchResult[] = []
      const queryLower = query.toLowerCase()

      workspaces.forEach(workspace => {
        workspace.nodes.forEach(node => {
          if (node.address) {
            const addressLower = node.address.toLowerCase()
            if (addressLower.includes(queryLower)) {
              results.push({
                workspaceId: workspace.id,
                workspaceName: workspace.name,
                address: node.address,
                nodeData: node,
                matchType: addressLower === queryLower ? 'exact' : 'partial'
              })
            }
          }
        })
      })

      // Sort by exact matches first, then by workspace name
      return results.sort((a, b) => {
        if (a.matchType !== b.matchType) {
          return a.matchType === 'exact' ? -1 : 1
        }
        return a.workspaceName.localeCompare(b.workspaceName)
      })
    } catch (error) {
      console.error('Error searching addresses:', error)
      return []
    }
  }

  // Get workspace statistics
  getWorkspaceStats(): {
    totalWorkspaces: number
    totalNodes: number
    totalConnections: number
    totalAddresses: number
  } {
    try {
      const workspaces = this.getAllWorkspaces()
      const totalNodes = workspaces.reduce((sum, w) => sum + w.nodes.length, 0)
      const totalConnections = workspaces.reduce((sum, w) => sum + w.connections.length, 0)
      const totalAddresses = workspaces.reduce((sum, w) => {
        const uniqueAddresses = new Set(w.nodes.map(n => n.address).filter(Boolean))
        return sum + uniqueAddresses.size
      }, 0)

      return {
        totalWorkspaces: workspaces.length,
        totalNodes,
        totalConnections,
        totalAddresses
      }
    } catch (error) {
      console.error('Error getting workspace stats:', error)
      return {
        totalWorkspaces: 0,
        totalNodes: 0,
        totalConnections: 0,
        totalAddresses: 0
      }
    }
  }

  // Export workspace as JSON
  exportWorkspace(workspaceId: string): string | null {
    try {
      const workspace = this.loadWorkspace(workspaceId)
      return workspace ? JSON.stringify(workspace, null, 2) : null
    } catch (error) {
      console.error('Error exporting workspace:', error)
      return null
    }
  }

  // Import workspace from JSON
  importWorkspace(jsonData: string): Workspace | null {
    try {
      const workspace = JSON.parse(jsonData) as Workspace
      if (!workspace.id || !workspace.name || !workspace.nodes) {
        throw new Error('Invalid workspace format')
      }
      
      // Generate new ID to avoid conflicts
      workspace.id = `imported_${Date.now()}`
      workspace.createdAt = new Date().toISOString()
      workspace.updatedAt = new Date().toISOString()
      
      this.saveWorkspace(workspace)
      return workspace
    } catch (error) {
      console.error('Error importing workspace:', error)
      return null
    }
  }

  // Update address index for faster searching
  private updateAddressIndex(workspace: Workspace): void {
    try {
      const index = this.getAddressIndex()
      
      // Remove old entries for this workspace
      Object.keys(index).forEach(address => {
        index[address] = index[address].filter(entry => entry.workspaceId !== workspace.id)
        if (index[address].length === 0) {
          delete index[address]
        }
      })

      // Add new entries
      workspace.nodes.forEach(node => {
        if (node.address) {
          if (!index[node.address]) {
            index[node.address] = []
          }
          index[node.address].push({
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            nodeData: node
          })
        }
      })

      localStorage.setItem(this.ADDRESS_INDEX_KEY, JSON.stringify(index))
    } catch (error) {
      console.error('Error updating address index:', error)
    }
  }

  // Remove workspace from address index
  private removeFromAddressIndex(workspaceId: string): void {
    try {
      const index = this.getAddressIndex()
      
      Object.keys(index).forEach(address => {
        index[address] = index[address].filter(entry => entry.workspaceId !== workspaceId)
        if (index[address].length === 0) {
          delete index[address]
        }
      })

      localStorage.setItem(this.ADDRESS_INDEX_KEY, JSON.stringify(index))
    } catch (error) {
      console.error('Error removing from address index:', error)
    }
  }

  // Get address index
  private getAddressIndex(): Record<string, Array<{ workspaceId: string; workspaceName: string; nodeData: any }>> {
    try {
      const stored = localStorage.getItem(this.ADDRESS_INDEX_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Error loading address index:', error)
      return {}
    }
  }

  // Generate unique workspace ID
  generateWorkspaceId(): string {
    return `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Create new workspace from current state
  createWorkspaceFromState(
    name: string,
    description: string,
    state: {
      nodes: any[]
      connections: any[]
      selectedAddress?: string
      selectedNode?: any
      zoom: number
      pan: { x: number; y: number }
      hidePassThrough: boolean
    }
  ): Workspace {
    return {
      id: this.generateWorkspaceId(),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: state.nodes,
      connections: state.connections,
      selectedAddress: state.selectedAddress,
      selectedNode: state.selectedNode,
      zoom: state.zoom,
      pan: state.pan,
      hidePassThrough: state.hidePassThrough,
      notes: []
    }
  }
}

export const workspaceManager = new WorkspaceManager() 