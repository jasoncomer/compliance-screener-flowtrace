import { v4 as uuid } from 'uuid'
import * as diff from 'json-diff'
import { openDB, DBSchema, IDBPDatabase } from 'idb'

// Database schema for IndexedDB
interface WorkspaceDB extends DBSchema {
  workspaces: {
    key: string
    value: Workspace
  }
  versions: {
    key: string
    value: WorkspaceVersion
    indexes: { 'by-workspace': string }
  }
}

export interface WorkspaceVersion {
  id: string
  name: string
  description?: string
  timestamp: string
  graphState: {
    viewport: { x: number; y: number; zoom: number }  // Graph position (pan/zoom)
    nodes: any[]
    edges: any[]
    selectedAddress?: string
    selectedNode?: any
    hidePassThrough: boolean
    customNodes: any[]
    nodeStyles: Record<string, any>
    connectionStyles: Record<string, any>
    // Additional state for complete persistence
    drawingElements?: any[]  // Drawing tools state
    selectedElements?: string[]  // Selected nodes/edges
    filters?: any  // Active filters
    settings?: any  // User preferences
  }
  saveType: 'auto' | 'quick' | 'manual'
  diff: string
}

export interface Workspace {
  id: string
  name: string
  description?: string
  masterVersionId: string | null
  versions: WorkspaceVersion[]
  autoSaveInterval: number
  createdAt: string
  updatedAt: string
}

// Database instance
let db: IDBPDatabase<WorkspaceDB> | null = null

// Initialize database
const initDB = async () => {
  if (db) return db
  
  db = await openDB<WorkspaceDB>('flowtrace-workspaces', 1, {
    upgrade(db) {
      // Create workspaces store
      const workspaceStore = db.createObjectStore('workspaces', { keyPath: 'id' })
      
      // Create versions store with workspace index
      const versionStore = db.createObjectStore('versions', { keyPath: 'id' })
      versionStore.createIndex('by-workspace', 'workspaceId')
    }
  })
  
  return db
}

// Get all workspaces from IndexedDB
export const getAllWorkspaces = async (): Promise<Workspace[]> => {
  const database = await initDB()
  const workspaces = await database.getAll('workspaces')
  
  // Filter out invalid workspaces and clean up the database
  const validWorkspaces = workspaces.filter(workspace => {
    if (!workspace || !workspace.id || !workspace.versions || workspace.versions.length === 0) {
      console.warn('Found invalid workspace, will be cleaned up:', workspace?.id)
      return false
    }
    return true
  })
  
  // If we found invalid workspaces, clean them up
  if (validWorkspaces.length < workspaces.length) {
    console.log(`Cleaning up ${workspaces.length - validWorkspaces.length} invalid workspaces`)
    for (const workspace of workspaces) {
      if (!validWorkspaces.includes(workspace)) {
        try {
          await deleteWorkspaceFromDB(workspace.id)
        } catch (error) {
          console.error('Failed to clean up invalid workspace:', workspace.id, error)
        }
      }
    }
  }
  
  return validWorkspaces.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

// Get workspace by ID
export const getWorkspace = async (workspaceId: string): Promise<Workspace | null> => {
  const database = await initDB()
  return await database.get('workspaces', workspaceId) || null
}

// Create new workspace
export const createWorkspace = async (
  graphState: any,
  name: string,
  description: string = ''
): Promise<Workspace> => {
  const workspaceId = uuid()
  
  // Deep serialize full state to prevent resets on load
  const serializedState = {
    viewport: { 
      x: graphState.pan?.x || 0, 
      y: graphState.pan?.y || 0, 
      zoom: graphState.zoom || 1 
    },
    nodes: graphState.nodes.map((node: any) => ({
      ...node,
      position: { ...node.position },
      data: { ...node.data }, // Colors, labels, risks, logos, notes, etc.
      style: { ...node.style } // Background, border, etc.
    })),
    edges: graphState.edges.map((edge: any) => ({
      ...edge,
      style: { ...edge.style }, // Stroke, width, animation
      data: { ...edge.data } // Rows, metadata
    })),
    selectedAddress: graphState.selectedAddress,
    selectedNode: graphState.selectedNode,
    hidePassThrough: graphState.hidePassThrough,
    customNodes: graphState.customNodes || [],
    nodeStyles: graphState.nodeStyles || {},
    connectionStyles: graphState.connectionStyles || {},
    drawingElements: graphState.drawingElements || [],
    selectedElements: graphState.selectedElements || [],
    filters: graphState.filters || {},
    settings: graphState.settings || {}
  }

  const masterVersion: WorkspaceVersion = {
    id: uuid(),
    name: 'Master',
    description,
    timestamp: new Date().toISOString(),
    graphState: serializedState,
    saveType: 'manual',
    diff: 'Initial version'
  }

  const workspace: Workspace = {
    id: workspaceId,
    name,
    description,
    masterVersionId: masterVersion.id,
    versions: [masterVersion],
    autoSaveInterval: 5 * 60 * 1000, // 5 minutes default
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  // Save to IndexedDB
  await saveWorkspaceToDB(workspace)
  
  return workspace
}

// Update master version (for quick saves) - works like Git: first save creates master, subsequent saves work on branch
export const updateMasterVersion = async (
  workspaceId: string,
  graphState: any,
  saveType: 'auto' | 'quick' | 'manual' = 'quick'
): Promise<WorkspaceVersion | null> => {
  const workspace = await getWorkspace(workspaceId)
  if (!workspace) {
    throw new Error('Workspace not found')
  }

  // Deep serialize full state to prevent resets on load
  const serializedState = {
    viewport: { 
      x: graphState.pan?.x || 0, 
      y: graphState.pan?.y || 0, 
      zoom: graphState.zoom || 1 
    },
    nodes: graphState.nodes.map((node: any) => ({
      ...node,
      position: { ...node.position },
      data: { ...node.data }, // Colors, labels, risks, logos, notes, etc.
      style: { ...node.style } // Background, border, etc.
    })),
    edges: graphState.edges.map((edge: any) => ({
      ...edge,
      style: { ...edge.style }, // Stroke, width, animation
      data: { ...edge.data } // Rows, metadata
    })),
    selectedAddress: graphState.selectedAddress,
    selectedNode: graphState.selectedNode,
    hidePassThrough: graphState.hidePassThrough,
    customNodes: graphState.customNodes || [],
    nodeStyles: graphState.nodeStyles || {},
    connectionStyles: graphState.connectionStyles || {},
    drawingElements: graphState.drawingElements || [],
    selectedElements: graphState.selectedElements || [],
    filters: graphState.filters || {},
    settings: graphState.settings || {}
  }

  // If no master version exists, create one (first save)
  if (!workspace.masterVersionId) {
    const newVersion: WorkspaceVersion = {
      id: uuid(),
      name: workspace.name, // Use project name for master version
      timestamp: new Date().toISOString(),
      graphState: serializedState,
      description: 'Initial master version',
      saveType,
      diff: 'Initial save'
    }

    // Add as master version
    workspace.versions.unshift(newVersion)
    workspace.masterVersionId = newVersion.id
    workspace.updatedAt = new Date().toISOString()
    
    // Save to IndexedDB
    await saveWorkspaceToDB(workspace)
    return newVersion
  }

  // For subsequent saves, create a new version and make it the master
  const timestamp = new Date().toLocaleString()
  const versionName = `Version ${timestamp}`
  
  // If there's an existing master version, demote it to a regular version
  if (workspace.masterVersionId) {
    const oldMasterIndex = workspace.versions.findIndex(v => v.id === workspace.masterVersionId)
    if (oldMasterIndex !== -1) {
      // Demote the old master by changing its name to its timestamp
      const oldMaster = workspace.versions[oldMasterIndex]
      const oldMasterTimestamp = new Date(oldMaster.timestamp).toLocaleString()
      const newName = `Version ${oldMasterTimestamp}`
      
      console.log('Demoting old master:', oldMaster.name, 'to:', newName)
      
      workspace.versions[oldMasterIndex] = {
        ...oldMaster,
        name: newName
      }
    }
  }
  
  const newVersion: WorkspaceVersion = {
    id: uuid(),
    name: workspace.name, // Use project name for the new master
    timestamp: new Date().toISOString(),
    graphState: serializedState,
    description: 'Quick save',
    saveType,
    diff: 'Quick save update'
  }

  console.log('Creating new master version:', newVersion.name)

  // Add as new master version at the top
  workspace.versions.unshift(newVersion)
  workspace.masterVersionId = newVersion.id // Set as new master
  workspace.updatedAt = new Date().toISOString()

  console.log('Updated workspace versions:', workspace.versions.map(v => ({ name: v.name, id: v.id, isMaster: v.id === workspace.masterVersionId })))

  // Save to IndexedDB
  await saveWorkspaceToDB(workspace)
  
  return newVersion
}

// Save new version to workspace
export const saveVersion = async (
  workspaceId: string,
  graphState: any,
  saveType: 'auto' | 'quick' | 'manual',
  name: string = '',
  description: string = ''
): Promise<WorkspaceVersion> => {
  const workspace = await getWorkspace(workspaceId)
  if (!workspace) {
    throw new Error('Workspace not found')
  }

  const previousMaster = workspace.versions.find((v: any) => v.id === workspace.masterVersionId)

  // Deep serialize full state to prevent resets on load
  const serializedState = {
    viewport: { 
      x: graphState.pan?.x || 0, 
      y: graphState.pan?.y || 0, 
      zoom: graphState.zoom || 1 
    },
    nodes: graphState.nodes.map((node: any) => ({
      ...node,
      position: { ...node.position },
      data: { ...node.data }, // Colors, labels, risks, logos, notes, etc.
      style: { ...node.style } // Background, border, etc.
    })),
    edges: graphState.edges.map((edge: any) => ({
      ...edge,
      style: { ...edge.style }, // Stroke, width, animation
      data: { ...edge.data } // Rows, metadata
    })),
    selectedAddress: graphState.selectedAddress,
    selectedNode: graphState.selectedNode,
    hidePassThrough: graphState.hidePassThrough,
    customNodes: graphState.customNodes || [],
    nodeStyles: graphState.nodeStyles || {},
    connectionStyles: graphState.connectionStyles || {},
    drawingElements: graphState.drawingElements || [],
    selectedElements: graphState.selectedElements || [],
    filters: graphState.filters || {},
    settings: graphState.settings || {}
  }

  const newVersion: WorkspaceVersion = {
    id: uuid(),
    name: name || workspace.name, // Inherit workspace name for Master
    timestamp: new Date().toISOString(),
    graphState: serializedState,
    description,
    saveType,
    diff: generateUserFriendlyDiff(previousMaster?.graphState, serializedState),
  }

  // Demote previous master if exists
  if (workspace.masterVersionId) {
    const oldIndex = workspace.versions.findIndex(v => v.id === workspace.masterVersionId)
    if (oldIndex !== -1) {
      workspace.versions[oldIndex].name = `Version ${new Date(workspace.versions[oldIndex].timestamp).toLocaleString()}`
    }
  }

  // Add new version at the beginning (most recent first)
  workspace.versions.unshift(newVersion)
  workspace.masterVersionId = newVersion.id
  workspace.updatedAt = new Date().toISOString()

  // Save to IndexedDB
  await saveWorkspaceToDB(workspace)
  
  return newVersion
}

// Load specific version
export const loadVersion = async (
  workspaceId: string,
  versionId: string,
  setNodes: (nodes: any[]) => void,
  setEdges: (edges: any[]) => void,
  setSelectedAddress?: (address: string) => void,
  setSelectedNode?: (node: any) => void,
  setZoom?: (zoom: number) => void,
  setPan?: (pan: { x: number; y: number }) => void,
  setHidePassThrough?: (hide: boolean) => void,
  setViewport?: (viewport: { x: number; y: number; zoom: number }) => void
): Promise<boolean> => {
  try {
    const workspace = await getWorkspace(workspaceId)
    if (!workspace) {
      console.error('Workspace not found:', workspaceId)
      // Clean up the invalid workspace reference
      try {
        await deleteWorkspaceFromDB(workspaceId)
        console.log('Cleaned up invalid workspace reference:', workspaceId)
      } catch (cleanupError) {
        console.error('Failed to clean up invalid workspace:', workspaceId, cleanupError)
      }
      return false
    }

  // Determine which version to load
  let targetId = versionId
  if (versionId === 'master' || !versionId) {
    // If 'master' is specified or no version ID, load the master version
    targetId = workspace.masterVersionId || workspace.versions[0]?.id
  }
  
  const version = workspace.versions.find(v => v.id === targetId)
  
  if (!version) {
    console.error('Version not found:', targetId)
    return false
  }

  console.log('Loading version:', version.name, 'with', version.graphState.nodes.length, 'nodes')

  // Exact restore - no resets
  setNodes(version.graphState.nodes)
  setEdges(version.graphState.edges)
  
  if (setSelectedAddress && version.graphState.selectedAddress) {
    setSelectedAddress(version.graphState.selectedAddress)
  }
  
  if (setSelectedNode && version.graphState.selectedNode) {
    setSelectedNode(version.graphState.selectedNode)
  }
  
  if (setZoom && version.graphState.viewport) {
    setZoom(version.graphState.viewport.zoom)
  }
  
  if (setPan && version.graphState.viewport) {
    setPan({ x: version.graphState.viewport.x, y: version.graphState.viewport.y })
  }
  
  if (setViewport && version.graphState.viewport) {
    setViewport(version.graphState.viewport)
  }
  
  if (setHidePassThrough !== undefined) {
    setHidePassThrough(version.graphState.hidePassThrough)
  }

  return true
  } catch (error) {
    console.error('Error loading workspace version:', error)
    return false
  }
}

// Promote version to master
export const promoteVersion = async (workspaceId: string, versionId: string): Promise<boolean> => {
  const workspace = await getWorkspace(workspaceId)
  if (!workspace) return false

  const versionIndex = workspace.versions.findIndex((v: any) => v.id === versionId)
  if (versionIndex === -1) return false

  // Demote current master
  if (workspace.masterVersionId) {
    const currentMasterIndex = workspace.versions.findIndex((v: any) => v.id === workspace.masterVersionId)
    if (currentMasterIndex !== -1) {
      workspace.versions[currentMasterIndex].name = `Version ${new Date(workspace.versions[currentMasterIndex].timestamp).toLocaleString()}`
    }
  }

  // Promote selected version
  workspace.versions[versionIndex].name = 'Master'
  workspace.masterVersionId = versionId
  workspace.updatedAt = new Date().toISOString()

  // Save to IndexedDB
  await saveWorkspaceToDB(workspace)
  
  return true
}

// Delete version
export const deleteVersion = async (workspaceId: string, versionId: string): Promise<boolean> => {
  const workspace = await getWorkspace(workspaceId)
  if (!workspace) return false

  const versionIndex = workspace.versions.findIndex((v: any) => v.id === versionId)
  if (versionIndex === -1) return false

  // Don't allow deleting the only version
  if (workspace.versions.length === 1) return false

  // If deleting master, promote the next version
  if (workspace.masterVersionId === versionId) {
    const nextVersion = workspace.versions.find((v: any) => v.id !== versionId)
    if (nextVersion) {
      nextVersion.name = 'Master'
      workspace.masterVersionId = nextVersion.id
    }
  }

  // Remove version
  workspace.versions.splice(versionIndex, 1)
  workspace.updatedAt = new Date().toISOString()

  // Save to IndexedDB
  await saveWorkspaceToDB(workspace)
  
  return true
}

// Delete workspace
export const deleteWorkspace = async (workspaceId: string): Promise<boolean> => {
  const workspace = await getWorkspace(workspaceId)
  if (!workspace) return false

  // Delete from IndexedDB
  await deleteWorkspaceFromDB(workspaceId)
  
  return true
}

// Rename workspace
export const renameWorkspace = async (workspaceId: string, name: string, description: string): Promise<boolean> => {
  const workspace = await getWorkspace(workspaceId)
  if (!workspace) return false

  workspace.name = name
  workspace.description = description
  workspace.updatedAt = new Date().toISOString()

  // Save to IndexedDB
  await saveWorkspaceToDB(workspace)
  
  return true
}

// Rename version
export const renameVersion = async (workspaceId: string, versionId: string, name: string): Promise<boolean> => {
  const workspace = await getWorkspace(workspaceId)
  if (!workspace) return false

  const version = workspace.versions.find((v: any) => v.id === versionId)
  if (!version) return false

  version.name = name
  workspace.updatedAt = new Date().toISOString()

  // Save to IndexedDB
  await saveWorkspaceToDB(workspace)
  
  return true
}

// Update auto-save interval
export const updateAutoSaveInterval = async (workspaceId: string, minutes: number): Promise<boolean> => {
  const workspace = await getWorkspace(workspaceId)
  if (!workspace) return false

  workspace.autoSaveInterval = minutes * 60 * 1000
  workspace.updatedAt = new Date().toISOString()

  // Save to IndexedDB
  await saveWorkspaceToDB(workspace)
  
  return true
}

// Generate user-friendly diff descriptions
const generateUserFriendlyDiff = (oldState: any, newState: any): string => {
  if (!oldState) return 'Initial version'
  
  const changes: string[] = []
  
  // Check for node changes
  const oldNodes = oldState.nodes || []
  const newNodes = newState.nodes || []
  
  // Count added/removed nodes
  const oldNodeIds = new Set(oldNodes.map((n: any) => n.id))
  const newNodeIds = new Set(newNodes.map((n: any) => n.id))
  
  const addedNodes = newNodes.filter((n: any) => !oldNodeIds.has(n.id))
  const removedNodes = oldNodes.filter((n: any) => !newNodeIds.has(n.id))
  
  if (addedNodes.length > 0) {
    if (addedNodes.length === 1) {
      const node = addedNodes[0]
      const label = node.data?.label || node.id
      changes.push(`Added node '${label}'`)
    } else {
      changes.push(`Added ${addedNodes.length} nodes`)
    }
  }
  
  if (removedNodes.length > 0) {
    if (removedNodes.length === 1) {
      const node = removedNodes[0]
      const label = node.data?.label || node.id
      changes.push(`Removed node '${label}'`)
    } else {
      changes.push(`Removed ${removedNodes.length} nodes`)
    }
  }
  
  // Check for edge changes
  const oldEdges = oldState.edges || []
  const newEdges = newState.edges || []
  
  const oldEdgeIds = new Set(oldEdges.map((e: any) => e.id))
  const newEdgeIds = new Set(newEdges.map((e: any) => e.id))
  
  const addedEdges = newEdges.filter((e: any) => !oldEdgeIds.has(e.id))
  const removedEdges = oldEdges.filter((e: any) => !newEdgeIds.has(e.id))
  
  if (addedEdges.length > 0) {
    changes.push(`Added ${addedEdges.length} connections`)
  }
  
  if (removedEdges.length > 0) {
    changes.push(`Removed ${removedEdges.length} connections`)
  }
  
  // Check for viewport changes
  if (oldState.viewport && newState.viewport) {
    const oldZoom = oldState.viewport.zoom
    const newZoom = newState.viewport.zoom
    if (Math.abs(oldZoom - newZoom) > 0.1) {
      changes.push(`Changed zoom from ${oldZoom.toFixed(1)}x to ${newZoom.toFixed(1)}x`)
    }
  }
  
  // Check for settings changes
  if (oldState.hidePassThrough !== newState.hidePassThrough) {
    changes.push(newState.hidePassThrough ? 'Hidden pass-through nodes' : 'Showed pass-through nodes')
  }
  
  return changes.length > 0 ? changes.join(', ') : 'Minor updates'
}

// Save workspace to IndexedDB
const saveWorkspaceToDB = async (workspace: Workspace) => {
  console.log('Saving workspace to DB:', workspace.name, 'with', workspace.versions.length, 'versions')
  console.log('Master version ID:', workspace.masterVersionId)
  console.log('Version names:', workspace.versions.map(v => ({ name: v.name, id: v.id, isMaster: v.id === workspace.masterVersionId })))
  
  const database = await initDB()
  await database.put('workspaces', workspace)
  
  // Save all versions
  for (const version of workspace.versions) {
    console.log('Saving version to DB:', version.name, version.id)
    await database.put('versions', {
      ...version,
      workspaceId: workspace.id
    } as any)
  }
  
  console.log('Workspace saved successfully to DB')
}

// Delete workspace from IndexedDB
const deleteWorkspaceFromDB = async (workspaceId: string) => {
  const database = await initDB()
  await database.delete('workspaces', workspaceId)
  
  // Delete all versions for this workspace
  const versions = await database.getAllFromIndex('versions', 'by-workspace', workspaceId)
  for (const version of versions) {
    await database.delete('versions', version.id)
  }
}

// Migration function to convert old data to new format
export const migrateOldData = async (): Promise<void> => {
  try {
    // Check if migration has already been done
    const migrationKey = 'flowtrace_migration_complete'
    if (localStorage.getItem(migrationKey)) {
      return
    }

    console.log('Starting data migration...')

    // Migrate old workspaces
    const oldWorkspacesKey = 'flowtrace_workspaces'
    const oldWorkspacesData = localStorage.getItem(oldWorkspacesKey)
    
    if (oldWorkspacesData) {
      const oldWorkspaces = JSON.parse(oldWorkspacesData)
      
      // Ensure oldWorkspaces is an array
      if (!Array.isArray(oldWorkspaces)) {
        console.log('Old workspaces data is not an array, skipping migration')
        return
      }
      
      for (const oldWorkspace of oldWorkspaces) {
        // Convert old workspace format to new format
        const newWorkspace = await createWorkspace(
          {
            nodes: oldWorkspace.nodes || [],
            edges: oldWorkspace.connections || [],
            selectedAddress: oldWorkspace.selectedAddress,
            selectedNode: oldWorkspace.selectedNode,
            zoom: oldWorkspace.zoom || 1,
            pan: oldWorkspace.pan || { x: 0, y: 0 },
            hidePassThrough: oldWorkspace.hidePassThrough || false
          },
          oldWorkspace.name || `Investigation ${new Date().toLocaleDateString()}`,
          oldWorkspace.description || 'Migrated from previous version'
        )
        
        console.log(`Migrated workspace: ${newWorkspace.name}`)
      }
      
      // Remove old data
      localStorage.removeItem(oldWorkspacesKey)
    }

    // Migrate auto-save data
    const oldAutoSaveKey = 'flowtrace_auto_save'
    const oldAutoSaveData = localStorage.getItem(oldAutoSaveKey)
    
    if (oldAutoSaveData) {
      const autoSaveState = JSON.parse(oldAutoSaveData)
      
      const newWorkspace = await createWorkspace(
        {
          nodes: autoSaveState.nodes || [],
          edges: autoSaveState.connections || [],
          selectedAddress: autoSaveState.selectedAddress,
          selectedNode: autoSaveState.selectedNode,
          zoom: autoSaveState.zoom || 1,
          pan: autoSaveState.pan || { x: 0, y: 0 },
          hidePassThrough: autoSaveState.hidePassThrough || false
        },
        'Recovered Investigation',
        'Auto-saved work recovered from previous session'
      )
      
      console.log(`Migrated auto-save data to workspace: ${newWorkspace.name}`)
      
      // Remove old data
      localStorage.removeItem(oldAutoSaveKey)
    }

    // Mark migration as complete
    localStorage.setItem(migrationKey, 'true')
    console.log('Data migration completed successfully')
    
  } catch (error) {
    console.error('Error during data migration:', error)
  }
}

// Clean up invalid workspaces
export const cleanupInvalidWorkspaces = async (): Promise<void> => {
  console.log('Cleaning up invalid workspaces...')
  
  try {
    const workspaces = await getAllWorkspaces()
    console.log(`Found ${workspaces.length} valid workspaces after cleanup`)
  } catch (error) {
    console.error('Error during workspace cleanup:', error)
  }
} 