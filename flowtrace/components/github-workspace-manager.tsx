"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  getAllWorkspaces, 
  saveVersion, 
  createWorkspace, 
  deleteWorkspace, 
  renameWorkspace, 
  promoteVersion,
  deleteVersion,
  renameVersion,
  updateAutoSaveInterval,
  type Workspace,
  type WorkspaceVersion
} from "@/lib/workspace-utils"
import { 
  Save, 
  Trash2, 
  Edit3, 
  Star, 
  Clock, 
  GitBranch, 
  GitCommit,
  Settings,
  Download,
  Upload,
  Search,
  Plus,
  MoreVertical,
  Eye,
  History,
  ChevronDown
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface GitHubWorkspaceManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentState: {
    nodes: any[]
    edges: any[]
    selectedAddress?: string
    selectedNode?: any
    zoom: number
    pan: { x: number; y: number }
    viewport?: { x: number; y: number; zoom: number }
    hidePassThrough: boolean
    customNodes?: any[]
    nodeStyles?: Record<string, any>
    connectionStyles?: Record<string, any>
    drawingElements?: any[]
    selectedElements?: string[]
    filters?: any
    settings?: any
  }
  onLoadWorkspace: (workspace: Workspace, versionId?: string) => void
  currentWorkspaceId?: string
  currentVersionId?: string
  onWorkspaceCreated?: (workspaceId: string) => void
  onStartNewInvestigation?: (workspaceId: string) => void
  refreshTrigger?: number
  autoSaveManager?: any
}

export function GitHubWorkspaceManager({
  open,
  onOpenChange,
  currentState,
  onLoadWorkspace,
  currentWorkspaceId,
  currentVersionId,
  onWorkspaceCreated,
  onStartNewInvestigation,
  refreshTrigger,
  autoSaveManager
}: GitHubWorkspaceManagerProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<WorkspaceVersion | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("")
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null)
  const [editWorkspaceName, setEditWorkspaceName] = useState("")
  const [editWorkspaceDescription, setEditWorkspaceDescription] = useState("")
  const [autoSaveInterval, setAutoSaveInterval] = useState(5)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set())
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewVersion, setPreviewVersion] = useState<{ workspace: Workspace, version: WorkspaceVersion } | null>(null)

  useEffect(() => {
    if (open) {
      loadWorkspaces()
      // Clear any selected workspace when opening to ensure fresh state
      setSelectedWorkspace(null)
      setSelectedVersion(null)
    }
  }, [open])

  // Remove any auto-selection of workspace/version after refresh
  // useEffect(() => {
  //   if (selectedWorkspace && selectedWorkspace.versions.length > 0) {
  //     setSelectedVersion(selectedWorkspace.versions[0])
  //     setDropdownOpen(false)
  //   }
  // }, [selectedWorkspace])

  useEffect(() => {
    loadWorkspaces()
  }, [refreshTrigger])

  const loadWorkspaces = async () => {
    try {
      const allWorkspaces = await getAllWorkspaces()
      console.log('Loading projects:', allWorkspaces.length, 'projects found')
      setWorkspaces(allWorkspaces)
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const filteredWorkspaces = (workspaces || []).filter(workspace =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workspace.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSaveWorkspace = async () => {
    if (!newWorkspaceName.trim()) return

    let workspaceId: string

    if (currentWorkspaceId) {
      // If there's a current project, create a new version in it
      const version = await saveVersion(
        currentWorkspaceId,
        currentState,
        'manual',
        newWorkspaceName.trim(),
        newWorkspaceDescription.trim()
      )
      workspaceId = currentWorkspaceId
      console.log('Created new version in existing project:', version.id)
    } else {
      // Create a new project
      const workspace = await createWorkspace(
        currentState,
        newWorkspaceName.trim(),
        newWorkspaceDescription.trim()
      )
      workspaceId = workspace.id
      console.log('Created new project:', workspaceId)
    }
    
    await loadWorkspaces()
    setNewWorkspaceName("")
    setNewWorkspaceDescription("")
    setSaveDialogOpen(false)
    
    // Don't reload the project - just update the current project ID
    // The current state should remain visible
    if (!currentWorkspaceId) {
      // Only update the project ID if we created a new project
      // This allows the parent component to track the current project
      if (onWorkspaceCreated) {
        onWorkspaceCreated(workspaceId)
      }
      console.log('New project created, current state preserved')
    }
  }

  const handleLoadWorkspace = (workspace: Workspace, versionId?: string) => {
    // Check if there are unsaved changes
    const hasUnsavedChanges = autoSaveManager.hasUnsavedWork()
    
    if (hasUnsavedChanges) {
      const confirmed = confirm(
        "You have unsaved changes. Opening a different version will lose your current work.\n\n" +
        "Do you want to continue?"
      )
      if (!confirmed) {
        return
      }
    }
    
    onLoadWorkspace(workspace, versionId)
    onOpenChange(false)
  }

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      await deleteWorkspace(workspaceId)
      await loadWorkspaces()
    }
  }

  const handleRenameWorkspace = (workspace: Workspace) => {
    setEditingWorkspace(workspace)
    setEditWorkspaceName(workspace.name)
    setEditWorkspaceDescription(workspace.description || "")
    setRenameDialogOpen(true)
  }

  const handleSaveRename = async () => {
    if (!editingWorkspace || !editWorkspaceName.trim()) return

    await renameWorkspace(editingWorkspace.id, editWorkspaceName.trim(), editWorkspaceDescription.trim())
    await loadWorkspaces()
    
    setRenameDialogOpen(false)
    setEditingWorkspace(null)
    setEditWorkspaceName("")
    setEditWorkspaceDescription("")
  }

  const handlePromoteVersion = async (workspaceId: string, versionId: string) => {
    const confirmed = confirm(
      "This will promote this version to be the new master version.\n\n" +
      "The current master will be demoted to a regular version.\n\n" +
      "Do you want to continue?"
    )
    
    if (confirmed) {
      await promoteVersion(workspaceId, versionId)
      await loadWorkspaces()
    }
  }

  const handleDeleteVersion = async (workspaceId: string, versionId: string) => {
    if (confirm("Are you sure you want to delete this version? This action cannot be undone.")) {
      await deleteVersion(workspaceId, versionId)
      await loadWorkspaces()
    }
  }

  const handleRenameVersion = async (workspaceId: string, versionId: string, newName: string) => {
    await renameVersion(workspaceId, versionId, newName)
    await loadWorkspaces()
  }

  const handleUpdateAutoSaveInterval = async (workspaceId: string, minutes: number) => {
    await updateAutoSaveInterval(workspaceId, minutes)
    await loadWorkspaces()
  }

  const handleStartNewInvestigation = async (workspaceId: string) => {
    // Close the workspace manager
    onOpenChange(false)
    
    // Call the callback to start new investigation
    if (onStartNewInvestigation) {
      onStartNewInvestigation(workspaceId)
    }
  }

  const handlePreviewVersion = (workspace: Workspace, version: WorkspaceVersion) => {
    setPreviewVersion({ workspace, version })
    setPreviewModalOpen(true)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const getSaveTypeIcon = (saveType: string) => {
    switch (saveType) {
      case 'auto': return <Clock className="h-4 w-4" />
      case 'quick': return <Save className="h-4 w-4" />
      case 'manual': return <GitCommit className="h-4 w-4" />
      default: return <Save className="h-4 w-4" />
    }
  }

  const getSaveTypeColor = (saveType: string) => {
    switch (saveType) {
      case 'auto': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'quick': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'manual': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Project Manager
            </DialogTitle>
            <DialogDescription>
              Manage your investigation projects and versions with GitHub-like versioning.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col space-y-4 h-full">
            {/* Header with search and new button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={async () => {
                if (currentWorkspaceId) {
                  // If there's a current project, prompt the user
                  const confirmed = confirm(
                    `You're currently working on a project. Would you like to:\n\n` +
                    `• Save a new version in the current project\n` +
                    `• Create a completely new project\n\n` +
                    `Click OK to save a new version, or Cancel to create a new project.`
                  )
                  
                  if (confirmed) {
                    // Save new version in current project
                    try {
                      const timestamp = new Date().toLocaleString()
                      const versionName = `Version ${timestamp}`
                      
                      await saveVersion(currentWorkspaceId, currentState, 'manual', versionName, 'Quick save')
                      await loadWorkspaces()
                      console.log('Successfully saved new version in current project')
                    } catch (error) {
                      console.error('Error saving version:', error)
                      alert('Error saving version. Please try again.')
                    }
                  } else {
                    // Create new project
                    setSaveDialogOpen(true)
                  }
                } else {
                  // No current project, create new one
                  setSaveDialogOpen(true)
                }
              }}>
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>

            {/* Workspaces List */}
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {filteredWorkspaces.map((workspace) => {
                const masterVersion = workspace.versions.find(v => v.id === workspace.masterVersionId) || workspace.versions[0]
                const isExpanded = expandedWorkspaces.has(workspace.id)
                
                return (
                  <div key={workspace.id} className="space-y-1">
                    {/* Main Workspace Row */}
                    <Card 
                      className="cursor-pointer transition-colors hover:bg-accent/50 border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10"
                      onClick={() => handleLoadWorkspace(workspace, 'master')}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm flex items-center gap-2 font-bold text-primary">
                              {workspace.name}
                              {masterVersion && (
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              )}
                              <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-600 dark:bg-green-900/20">
                                Master
                              </Badge>
                              {currentVersionId === 'master' && currentWorkspaceId === workspace.id && (
                                <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:bg-blue-900/20">
                                  Working
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {workspace.description || 'No description'}
                            </CardDescription>
                            {masterVersion && (
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`text-xs ${getSaveTypeColor(masterVersion.saveType)}`}>
                                  {getSaveTypeIcon(masterVersion.saveType)}
                                  {masterVersion.saveType}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(masterVersion.timestamp)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedWorkspaces(prev => {
                                  const newSet = new Set(prev)
                                  if (newSet.has(workspace.id)) {
                                    newSet.delete(workspace.id)
                                  } else {
                                    newSet.add(workspace.id)
                                  }
                                  return newSet
                                })
                              }}
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleStartNewInvestigation(workspace.id)}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Start New Investigation
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRenameWorkspace(workspace)}>
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteWorkspace(workspace.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{workspace.versions.length} versions</span>
                          <span>Updated {formatTimestamp(workspace.updatedAt)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Expanded Versions */}
                    {isExpanded && (
                      <div className="ml-4 space-y-1 max-h-48 overflow-y-auto">
                        {workspace.versions
                          .filter(version => version.id !== workspace.masterVersionId) // Exclude master version
                          .map((version, index) => (
                          <Card 
                            key={version.id}
                            className="cursor-pointer transition-colors hover:bg-accent/30 border border-muted/50 bg-muted/20"
                            onClick={() => handleLoadWorkspace(workspace, version.id)}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                                    {version.name}
                                    {currentVersionId && version.id === currentVersionId && (
                                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:bg-blue-900/20">
                                        Working
                                      </Badge>
                                    )}
                                  </CardTitle>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={`text-xs ${getSaveTypeColor(version.saveType)}`}>
                                      {getSaveTypeIcon(version.saveType)}
                                      {version.saveType}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatTimestamp(version.timestamp)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreviewVersion(workspace, version)}
                                    className="h-8 w-8 p-0"
                                    title="Preview Version"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleLoadWorkspace(workspace, version.id)}
                                    className="h-8 px-2 text-xs"
                                    title="Open Version"
                                  >
                                    Open
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePromoteVersion(workspace.id, version.id)}
                                    className="h-8 w-8 p-0"
                                    title="Promote to Master"
                                  >
                                    <Star className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteVersion(workspace.id, version.id)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    title="Delete Version"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-xs text-muted-foreground">
                                {version.diff}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentWorkspaceId ? 'Save New Version' : 'Create New Project'}</DialogTitle>
            <DialogDescription>
              {currentWorkspaceId 
                ? 'Save your current state as a new version in the current project.'
                : 'Create a new project to save your current investigation.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-workspace-name">
                {currentWorkspaceId ? 'Version Name' : 'Project Name'} *
              </Label>
              <Input
                id="new-workspace-name"
                value={newWorkspaceName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewWorkspaceName(e.target.value)}
                placeholder={currentWorkspaceId ? "Enter version name..." : "Enter project name..."}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-workspace-description">
                {currentWorkspaceId ? 'Version Description' : 'Description'}
              </Label>
              <Textarea
                id="new-workspace-description"
                value={newWorkspaceDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewWorkspaceDescription(e.target.value)}
                placeholder={currentWorkspaceId ? "Describe this version..." : "Describe your investigation..."}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWorkspace} disabled={!newWorkspaceName.trim()}>
              {currentWorkspaceId ? 'Save Version' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Update the name and description of this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-workspace-name">Project Name *</Label>
              <Input
                id="edit-workspace-name"
                value={editWorkspaceName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditWorkspaceName(e.target.value)}
                placeholder="Enter project name..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-workspace-description">Description</Label>
              <Textarea
                id="edit-workspace-description"
                value={editWorkspaceDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditWorkspaceDescription(e.target.value)}
                placeholder="Describe your investigation..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRename} disabled={!editWorkspaceName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewModalOpen && previewVersion && (
        <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Preview Version: {previewVersion.version.name}
              </DialogTitle>
              <DialogDescription>
                View the state of this version.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col space-y-4 h-full">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Version: {previewVersion.version.name}</span>
                <span>Updated: {formatTimestamp(previewVersion.version.timestamp)}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Version Details</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nodes:</span>
                          <span>{previewVersion.version.graphState.nodes.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Connections:</span>
                          <span>{previewVersion.version.graphState.edges.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Save Type:</span>
                          <span className="capitalize">{previewVersion.version.saveType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Description:</span>
                          <span>{previewVersion.version.description || 'No description'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Viewport</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Zoom:</span>
                          <span>{previewVersion.version.graphState.viewport.zoom.toFixed(2)}x</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Position:</span>
                          <span>X: {previewVersion.version.graphState.viewport.x.toFixed(0)}, Y: {previewVersion.version.graphState.viewport.y.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Changes</h4>
                    <p className="text-sm text-muted-foreground">{previewVersion.version.diff}</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewModalOpen(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    handleLoadWorkspace(previewVersion.workspace, previewVersion.version.id)
                    setPreviewModalOpen(false)
                  }}
                >
                  Open Version
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
} 