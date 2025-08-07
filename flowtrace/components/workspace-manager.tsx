"use client"

import { useState, useEffect } from "react"
import { 
  Save, 
  FolderOpen, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  FileText,
  Calendar,
  Users,
  Network,
  MapPin,
  X,
  Copy,
  ExternalLink,
  Edit3
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { workspaceManager, type Workspace, type AddressSearchResult } from "@/lib/workspace-manager"
import { formatDateConsistent } from "@/lib/utils"

interface WorkspaceManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoadWorkspace: (workspace: Workspace) => void
  currentState: {
    nodes: any[]
    connections: any[]
    selectedAddress?: string
    selectedNode?: any
    zoom: number
    pan: { x: number; y: number }
    hidePassThrough: boolean
  }
  initialSearchQuery?: string
}

export function WorkspaceManager({ 
  open, 
  onOpenChange, 
  onLoadWorkspace, 
  currentState,
  initialSearchQuery
}: WorkspaceManagerProps) {
  const [activeTab, setActiveTab] = useState("workspaces")
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [addressSearchQuery, setAddressSearchQuery] = useState("")
  const [addressSearchResults, setAddressSearchResults] = useState<AddressSearchResult[]>([])

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null)
  const [editWorkspaceName, setEditWorkspaceName] = useState("")
  const [editWorkspaceDescription, setEditWorkspaceDescription] = useState("")

  // Load workspaces on mount and handle initial search
  useEffect(() => {
    if (open) {
      loadWorkspaces()
      
      // If there's an initial search query, switch to search tab and set the query
      if (initialSearchQuery) {
        setActiveTab("search")
        setAddressSearchQuery(initialSearchQuery)
      }
    }
  }, [open, initialSearchQuery])

  // Search addresses when query changes
  useEffect(() => {
    if (addressSearchQuery.trim()) {
      const results = workspaceManager.searchAddresses(addressSearchQuery)
      setAddressSearchResults(results)
    } else {
      setAddressSearchResults([])
    }
  }, [addressSearchQuery])

  const loadWorkspaces = () => {
    const allWorkspaces = workspaceManager.getAllWorkspaces()
    setWorkspaces(allWorkspaces)
  }



  const handleSaveWorkspace = () => {
    if (!newWorkspaceName.trim()) return

    const workspace = workspaceManager.createWorkspaceFromState(
      newWorkspaceName.trim(),
      newWorkspaceDescription.trim(),
      currentState
    )
    
    workspaceManager.saveWorkspace(workspace)
    loadWorkspaces()
    
    setNewWorkspaceName("")
    setNewWorkspaceDescription("")
    setSaveDialogOpen(false)
  }

  const handleLoadWorkspace = (workspace: Workspace) => {
    try {
      // Validate workspace before loading
      if (!workspace || !workspace.id || !workspace.versions || workspace.versions.length === 0) {
        console.error('Invalid workspace detected:', workspace)
        alert('This workspace appears to be corrupted and cannot be loaded.')
        return
      }
      
      onLoadWorkspace(workspace)
      onOpenChange(false)
    } catch (error) {
      console.error('Error loading workspace:', error)
      alert('Failed to load workspace. Please try again.')
    }
  }

  const handleDeleteWorkspace = (workspaceId: string) => {
    if (confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) {
          workspaceManager.deleteWorkspace(workspaceId)
    loadWorkspaces()
    }
  }

  const handleRenameWorkspace = (workspace: Workspace) => {
    setEditingWorkspace(workspace)
    setEditWorkspaceName(workspace.name)
    setEditWorkspaceDescription(workspace.description || "")
    setRenameDialogOpen(true)
  }

  const handleSaveRename = () => {
    if (!editingWorkspace || !editWorkspaceName.trim()) return

    const updatedWorkspace = {
      ...editingWorkspace,
      name: editWorkspaceName.trim(),
      description: editWorkspaceDescription.trim(),
      updatedAt: new Date().toISOString()
    }

    workspaceManager.saveWorkspace(updatedWorkspace)
    loadWorkspaces()
    
    setRenameDialogOpen(false)
    setEditingWorkspace(null)
    setEditWorkspaceName("")
    setEditWorkspaceDescription("")
  }

  const handleExportWorkspace = (workspaceId: string) => {
    const jsonData = workspaceManager.exportWorkspace(workspaceId)
    if (jsonData) {
      const workspace = workspaces.find(w => w.id === workspaceId)
      const filename = `${workspace?.name || 'workspace'}_${new Date().toISOString().split('T')[0]}.json`
      
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleImportWorkspace = () => {
    if (!importFile) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const jsonData = e.target?.result as string
      const workspace = workspaceManager.importWorkspace(jsonData)
      if (workspace) {
        loadWorkspaces()
        setImportFile(null)
      } else {
        alert("Failed to import workspace. Please check the file format.")
      }
    }
    reader.readAsText(importFile)
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
  }

  const filteredWorkspaces = workspaces.filter(workspace =>
    workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workspace.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Workspace Manager
          </DialogTitle>
          <DialogDescription>
            Manage your saved workspaces, search for addresses, and import/export workspace data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
              <TabsTrigger value="search">Address Search</TabsTrigger>
            </TabsList>

            <TabsContent value="workspaces" className="flex-1 flex flex-col space-y-4">
              {/* Header with actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search workspaces..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSaveDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Current
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('import-file')?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Import
                  </Button>
                </div>
              </div>

              {/* Workspace list */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {filteredWorkspaces.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No workspaces found matching your search." : "No workspaces saved yet."}
                  </div>
                ) : (
                  filteredWorkspaces.map((workspace) => (
                    <Card key={workspace.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{workspace.name}</CardTitle>
                            {workspace.description && (
                              <CardDescription className="mt-1">{workspace.description}</CardDescription>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {workspace.name.startsWith('Quick Save') && (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 bg-orange-50 dark:text-orange-400 dark:border-orange-600 dark:bg-orange-900/20">
                                Quick Save
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {workspace.nodes.length} nodes
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {workspace.connections.length} connections
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                         <div className="flex items-center gap-1">
                               <Calendar className="h-3 w-3" />
                               {new Date(workspace.updatedAt).toLocaleDateString()}
                             </div>
                            <div className="flex items-center gap-1">
                              <Network className="h-3 w-3" />
                              {workspace.nodes.length} entities
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoadWorkspace(workspace)}
                              className="flex items-center gap-1"
                            >
                              <FolderOpen className="h-3 w-3" />
                              Load
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRenameWorkspace(workspace)}
                              className="flex items-center gap-1"
                            >
                              <Edit3 className="h-3 w-3" />
                              Rename
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportWorkspace(workspace.id)}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Export
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteWorkspace(workspace.id)}
                              className="flex items-center gap-1 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="search" className="flex-1 flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for addresses across all workspaces..."
                  value={addressSearchQuery}
                  onChange={(e) => setAddressSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {addressSearchQuery && addressSearchResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No addresses found matching "{addressSearchQuery}"
                  </div>
                ) : addressSearchQuery ? (
                  addressSearchResults.map((result, index) => (
                    <Card key={`${result.workspaceId}-${result.address}-${index}`} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={result.matchType === 'exact' ? 'default' : 'secondary'}>
                                {result.matchType === 'exact' ? 'Exact Match' : 'Partial Match'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                in {result.workspaceName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {result.address}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyAddress(result.address)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {result.nodeData.label} • {result.nodeData.type} • Risk: {result.nodeData.risk}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const workspace = workspaces.find(w => w.id === result.workspaceId)
                              if (workspace) {
                                handleLoadWorkspace(workspace)
                              }
                            }}
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open Workspace
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Enter an address to search across all workspaces
                  </div>
                )}
              </div>
            </TabsContent>


          </Tabs>
        </div>

        {/* Save Workspace Dialog */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Current Workspace</DialogTitle>
              <DialogDescription>
                Save your current investigation as a named workspace to preserve your work and continue later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Workspace Name</label>
                <Input
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                  placeholder="Enter description..."
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveWorkspace} disabled={!newWorkspaceName.trim()}>
                  Save Workspace
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rename Workspace Dialog */}
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Workspace</DialogTitle>
              <DialogDescription>
                Update the name and description of your workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Workspace Name</label>
                <Input
                  value={editWorkspaceName}
                  onChange={(e) => setEditWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  value={editWorkspaceDescription}
                  onChange={(e) => setEditWorkspaceDescription(e.target.value)}
                  placeholder="Enter description..."
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setRenameDialogOpen(false)
                    setEditingWorkspace(null)
                    setEditWorkspaceName("")
                    setEditWorkspaceDescription("")
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveRename} disabled={!editWorkspaceName.trim()}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Hidden file input for import */}
        <input
          id="import-file"
          type="file"
          accept=".json"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              setImportFile(file)
              handleImportWorkspace()
            }
          }}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  )
} 