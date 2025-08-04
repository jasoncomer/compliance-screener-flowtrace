// import { workspaceManager } from './workspace-manager' // Disabled old workspace manager

interface AutoSaveState {
  nodes: any[]
  connections: any[]
  selectedAddress?: string
  selectedNode?: any
  zoom: number
  pan: { x: number; y: number }
  hidePassThrough: boolean
  lastSaved: string
}

class AutoSaveManager {
  private readonly AUTO_SAVE_KEY = 'flowtrace_auto_save'
  private readonly AUTO_SAVE_INTERVAL = 30000 // 30 seconds
  private intervalId: NodeJS.Timeout | null = null
  private lastState: AutoSaveState | null = null
  private lastSavedState: AutoSaveState | null = null // Track the last state that was actually saved to a project

  // Start auto-save
  startAutoSave() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }

    this.intervalId = setInterval(() => {
      this.saveCurrentState()
    }, this.AUTO_SAVE_INTERVAL)
  }

  // Stop auto-save
  stopAutoSave() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  // Save current state
  saveCurrentState(state?: Partial<AutoSaveState>) {
    try {
      const currentState: AutoSaveState = {
        nodes: state?.nodes || [],
        connections: state?.connections || [],
        selectedAddress: state?.selectedAddress,
        selectedNode: state?.selectedNode,
        zoom: state?.zoom || 1,
        pan: state?.pan || { x: 0, y: 0 },
        hidePassThrough: state?.hidePassThrough || false,
        lastSaved: new Date().toISOString()
      }

      // Only save if state has changed
      if (this.hasStateChanged(currentState)) {
        localStorage.setItem(this.AUTO_SAVE_KEY, JSON.stringify(currentState))
        this.lastState = currentState
        console.log('Auto-saved workspace state')
      }
    } catch (error) {
      console.error('Error auto-saving workspace state:', error)
    }
  }

  // Load auto-saved state
  loadAutoSavedState(): AutoSaveState | null {
    try {
      const saved = localStorage.getItem(this.AUTO_SAVE_KEY)
      if (saved) {
        const state = JSON.parse(saved) as AutoSaveState
        this.lastState = state
        return state
      }
    } catch (error) {
      console.error('Error loading auto-saved state:', error)
    }
    return null
  }

  // Check if state has changed
  private hasStateChanged(newState: AutoSaveState): boolean {
    if (!this.lastState) return true

    return (
      JSON.stringify(newState.nodes) !== JSON.stringify(this.lastState.nodes) ||
      JSON.stringify(newState.connections) !== JSON.stringify(this.lastState.connections) ||
      newState.selectedAddress !== this.lastState.selectedAddress ||
      newState.zoom !== this.lastState.zoom ||
      JSON.stringify(newState.pan) !== JSON.stringify(this.lastState.pan) ||
      newState.hidePassThrough !== this.lastState.hidePassThrough
    )
  }

  // Clear auto-saved state
  clearAutoSavedState() {
    try {
      localStorage.removeItem(this.AUTO_SAVE_KEY)
      this.lastState = null
      this.lastSavedState = null
    } catch (error) {
      console.error('Error clearing auto-saved state:', error)
    }
  }

  // Get last saved time
  getLastSavedTime(): string | null {
    try {
      const saved = localStorage.getItem(this.AUTO_SAVE_KEY)
      if (saved) {
        const state = JSON.parse(saved) as AutoSaveState
        return state.lastSaved
      }
    } catch (error) {
      console.error('Error getting last saved time:', error)
    }
    return null
  }

  // Mark current state as saved (called after successful save to project)
  markAsSaved(state: Partial<AutoSaveState>) {
    this.lastSavedState = {
      nodes: state?.nodes || [],
      connections: state?.connections || [],
      selectedAddress: state?.selectedAddress,
      selectedNode: state?.selectedNode,
      zoom: state?.zoom || 1,
      pan: state?.pan || { x: 0, y: 0 },
      hidePassThrough: state?.hidePassThrough || false,
      lastSaved: new Date().toISOString()
    }
  }

  // Check if there's unsaved work by comparing current state with last saved state
  hasUnsavedWork(): boolean {
    if (!this.lastState) return false
    if (!this.lastSavedState) return true

    // Compare current state with last saved state
    return (
      JSON.stringify(this.lastState.nodes) !== JSON.stringify(this.lastSavedState.nodes) ||
      JSON.stringify(this.lastState.connections) !== JSON.stringify(this.lastSavedState.connections) ||
      this.lastState.selectedAddress !== this.lastSavedState.selectedAddress ||
      this.lastState.zoom !== this.lastSavedState.zoom ||
      JSON.stringify(this.lastState.pan) !== JSON.stringify(this.lastSavedState.pan) ||
      this.lastState.hidePassThrough !== this.lastSavedState.hidePassThrough
    )
  }
}

export const autoSaveManager = new AutoSaveManager() 