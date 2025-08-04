"use client"

import { useState, useEffect } from "react"
import { Save, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { autoSaveManager } from "@/lib/auto-save"
// import { workspaceManager } from "@/lib/workspace-manager" // Disabled old workspace manager

interface SaveStatusProps {
  currentState: {
    nodes: any[]
    connections: any[]
    selectedAddress?: string
    selectedNode?: any
    zoom: number
    pan: { x: number; y: number }
    hidePassThrough: boolean
  }
  onSaveWorkspace: () => void
  currentWorkspaceId?: string
  onQuickSave?: (workspaceId: string, state: any) => Promise<void>
  onOpenWorkspaceManager?: () => void
}

export function SaveStatus({ currentState, onSaveWorkspace, currentWorkspaceId, onQuickSave, onOpenWorkspaceManager }: SaveStatusProps) {
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Load initial save status
    const savedTime = autoSaveManager.getLastSavedTime()
    setLastSaved(savedTime)

    // Start auto-save
    autoSaveManager.startAutoSave()

    // Set up interval to check save status
    const interval = setInterval(() => {
      const currentSavedTime = autoSaveManager.getLastSavedTime()
      setLastSaved(currentSavedTime)
      
      // Check if there are unsaved changes
      const hasChanges = autoSaveManager.hasUnsavedWork()
      setHasUnsavedChanges(hasChanges)
    }, 5000) // Check every 5 seconds

    return () => {
      clearInterval(interval)
      autoSaveManager.stopAutoSave()
    }
  }, [])

  // Auto-save current state when it changes
  useEffect(() => {
    autoSaveManager.saveCurrentState(currentState)
  }, [currentState])

  const handleQuickSave = async () => {
    console.log('Quick save button clicked')
    console.log('Current workspace ID:', currentWorkspaceId)
    console.log('onQuickSave function exists:', !!onQuickSave)
    
    setIsSaving(true)
    try {
      if (currentWorkspaceId && onQuickSave) {
        console.log('Attempting quick save...')
        // Quick save to current project
        await onQuickSave(currentWorkspaceId, currentState)
        console.log('Quick save completed successfully')
        setLastSaved(new Date().toISOString())
        setHasUnsavedChanges(false)
        
        // Mark current state as saved in auto-save manager
        autoSaveManager.markAsSaved(currentState)
        console.log('State marked as saved in auto-save manager')
      } else {
        console.log('No current workspace or onQuickSave function, opening save dialog')
        // No current project, open save dialog
        onSaveWorkspace()
      }
    } catch (error) {
      console.error('Error saving project:', error)
      alert(`Error saving: ${error}`)
    } finally {
      setIsSaving(false)
    }
  }

  const formatLastSaved = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex items-center gap-2">
      {/* Save Status Indicator */}
      <div className="flex items-center gap-1">
        {hasUnsavedChanges ? (
          <AlertCircle className="h-4 w-4 text-orange-500" />
        ) : lastSaved ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <Clock className="h-4 w-4 text-gray-400" />
        )}
        
        <span className="text-xs text-muted-foreground">
          {hasUnsavedChanges 
            ? 'Unsaved changes'
            : lastSaved 
              ? `Saved ${formatLastSaved(lastSaved)}`
              : 'Not saved'
          }
        </span>
      </div>

      {/* Quick Save Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleQuickSave}
        disabled={isSaving}
        className="h-7 px-2 text-xs"
        title={!currentWorkspaceId ? "Load a workspace first to save changes" : "Update the current working version"}
      >
        <Save className="h-3 w-3 mr-1" />
        {isSaving ? 'Saving...' : !currentWorkspaceId ? 'No Workspace' : 'Update Working'}
      </Button>

      {/* Save to Workspace Button */}
      <Button
        variant="default"
        size="sm"
        onClick={onOpenWorkspaceManager || onSaveWorkspace}
        disabled={isSaving}
        className="h-7 px-2 text-xs"
      >
        <Save className="h-3 w-3 mr-1" />
        {isSaving ? 'Saving...' : 'New Version'}
      </Button>
    </div>
  )
} 