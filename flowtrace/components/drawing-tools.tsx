"use client"

import { Palette, Pencil, Square, Circle, Type, MousePointer, Undo, Redo, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DrawingToolsProps {
  activeTool: string
  setActiveTool: (tool: string) => void
  activeColor: string
  setActiveColor: (color: string) => void
  onAddCustomNode?: () => void
}

const tools = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "pen", icon: Pencil, label: "Pen" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "text", icon: Type, label: "Text" },
]

const colors = [
  "#f59e0b", // Orange (primary)
  "#ef4444", // Red
  "#22c55e", // Green
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#f97316", // Orange alt
  "#84cc16", // Lime
]

export function DrawingTools({ activeTool, setActiveTool, activeColor, setActiveColor, onAddCustomNode }: DrawingToolsProps) {
  return (
    <div className="flex items-center space-x-4">
      {/* Drawing Tools */}
      <div className="flex items-center space-x-1 bg-muted rounded-lg p-1 border border-border">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTool(tool.id)}
            className={`h-8 w-8 p-0 ${activeTool === tool.id ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "hover:bg-accent"}`}
            title={tool.label}
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      {/* Edit Actions */}
      <div className="flex items-center space-x-1 bg-muted rounded-lg p-1 border border-border">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent" title="Undo">
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent" title="Redo">
          <Redo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-accent text-destructive"
          title="Delete Selected"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Color Palette */}
      <div className="flex items-center space-x-1 bg-muted rounded-lg p-1 border border-border">
        <Palette className="h-4 w-4 text-muted-foreground mx-2" />
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => setActiveColor(color)}
            className={`w-6 h-6 rounded border-2 ${activeColor === color ? "border-primary" : "border-border"} hover:border-primary/60`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      {/* Custom Node */}
      <div className="flex items-center space-x-1 bg-muted rounded-lg p-1 border border-border">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-3 text-xs hover:bg-accent" 
          title="Add Custom Node"
          onClick={onAddCustomNode}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Node
        </Button>
      </div>


    </div>
  )
}
