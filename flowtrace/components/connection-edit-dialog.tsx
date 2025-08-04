"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, AlertTriangle, ArrowRight } from "lucide-react"
import { getPopularCurrencies } from "@/lib/currency-icons"

interface ConnectionRow {
  id: string
  risk: "low" | "medium" | "high"
  amount: string
  currency: string
  date: string
  notes: string
}

interface ConnectionEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection: {
    from: string
    to: string
    txHash: string
    amount: string
    currency: string
    date: string
    note?: string
  } | null
  onSave: (rows: ConnectionRow[], isReversed?: boolean) => void
  onDelete: (txHash: string) => void
}

export function ConnectionEditDialog({ 
  open, 
  onOpenChange, 
  connection, 
  onSave, 
  onDelete 
}: ConnectionEditDialogProps) {
  const [rows, setRows] = useState<ConnectionRow[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isReversed, setIsReversed] = useState(false)
  const [defaultCurrency, setDefaultCurrency] = useState("BTC")

  // Initialize rows when dialog opens
  useEffect(() => {
    if (open && connection) {
      // Convert single connection to row format
      const initialRow: ConnectionRow = {
        id: crypto.randomUUID(),
        risk: "medium", // Default risk level
        amount: connection.amount || "",
        currency: connection.currency || "BTC",
        date: connection.date || new Date().toISOString().split('T')[0],
        notes: connection.note || ""
      }
      setRows([initialRow])
      setDefaultCurrency(connection.currency || "BTC")
      setIsReversed(false)
    } else if (!open) {
      setRows([])
      setShowDeleteConfirm(false)
      setIsReversed(false)
    }
  }, [open, connection])

  const addRow = () => {
    const newRow: ConnectionRow = {
      id: crypto.randomUUID(),
      risk: "medium",
      amount: "",
      currency: defaultCurrency, // Use dynamic default instead of hardcoded BTC
      date: new Date().toISOString().split('T')[0],
      notes: ""
    }
    console.log('Adding new row with currency:', newRow.currency, '(default was:', defaultCurrency, ')')
    setRows(prev => [...prev, newRow])
  }

  const deleteRow = (rowId: string) => {
    setRows(prev => prev.filter(row => row.id !== rowId))
  }

  const updateRow = (rowId: string, field: keyof ConnectionRow, value: string) => {
    setRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ))
    
    // Update default currency when currency field changes
    if (field === 'currency') {
      console.log('Currency changed to:', value, 'for row:', rowId)
      setDefaultCurrency(value)
    }
  }

  const handleSave = () => {
    if (rows.length === 0) {
      // Show confirmation for deleting the entire connection
      setShowDeleteConfirm(true)
      return
    }
    
    // Filter out empty rows and save
    const validRows = rows.filter(row => row.amount.trim() !== "")
    
    console.log('Saving connection with direction reversed:', isReversed)
    console.log('Valid rows:', validRows)
    console.log('First row currency:', validRows[0]?.currency)
    
    // Pass direction information along with rows
    onSave(validRows, isReversed)
    onOpenChange(false)
  }

  const handleDeleteConnection = () => {
    if (connection) {
      onDelete(connection.txHash)
    }
    onOpenChange(false)
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high": return "bg-red-500/20 text-red-700 border-red-500/30"
      case "medium": return "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"
      case "low": return "bg-green-500/20 text-green-700 border-green-500/30"
      default: return "bg-gray-500/20 text-gray-700 border-gray-500/30"
    }
  }

  const availableCurrencies = getPopularCurrencies().map(c => c.code)

  if (!connection) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] bg-card border-2 border-border text-foreground shadow-2xl p-0 overflow-hidden ring-4 ring-primary/40 flex flex-col">
        {/* Header */}
        <DialogHeader className="border-b-2 border-primary/30 p-6 pb-4 flex-shrink-0 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground flex items-center">
                <div className="w-2 h-8 bg-primary rounded-full mr-3"></div>
                <span>Edit Connection Data</span>
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1 ml-5">
                Connection: {isReversed ? connection.to : connection.from} → {isReversed ? connection.from : connection.to}
              </DialogDescription>
            </div>
            <Button
              data-testid="reverse-direction"
              variant="outline"
              size="sm"
              onClick={() => setIsReversed(prev => !prev)}
              className="border-border bg-background text-foreground hover:bg-accent"
            >
              <ArrowRight className={`h-4 w-4 mr-2 transition-transform ${isReversed ? 'rotate-180' : ''}`} />
              Reverse Direction
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 min-h-0 p-6 space-y-4">
          {/* Table */}
          <div className="border border-border rounded-lg bg-muted overflow-hidden flex flex-col flex-1">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 p-4 border-b border-border bg-background text-sm font-medium text-foreground flex-shrink-0">
              <div className="col-span-1">Risk</div>
              <div className="col-span-1">Amount</div>
              <div className="col-span-1">Currency</div>
              <div className="col-span-1">Date</div>
              <div className="col-span-2">Notes</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-auto">
              <div className="space-y-2 p-4">
                {rows.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <div className="text-lg font-medium">No data</div>
                    <div className="text-sm">Add rows to keep this connection</div>
                  </div>
                ) : (
                  rows.map((row) => (
                    <div key={row.id} className="grid grid-cols-7 gap-4 p-3 rounded-lg border border-border bg-background/50 items-center">
                      {/* Risk Level */}
                      <div className="col-span-1">
                        <select
                          value={row.risk}
                          onChange={(e) => updateRow(row.id, 'risk', e.target.value as "low" | "medium" | "high")}
                          className="w-full bg-background border border-border rounded px-2 py-1 text-xs"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      {/* Amount */}
                      <div className="col-span-1">
                        <Input
                          type="number"
                          value={row.amount}
                          onChange={(e) => updateRow(row.id, 'amount', e.target.value)}
                          placeholder="0.0"
                          className="bg-background text-xs h-8"
                        />
                      </div>

                      {/* Currency */}
                      <div className="col-span-1">
                        <select
                          data-testid="currency-select"
                          value={row.currency}
                          onChange={(e) => updateRow(row.id, 'currency', e.target.value)}
                          className="w-full bg-background border border-border rounded px-2 py-1 text-xs"
                        >
                          {availableCurrencies.map(currency => (
                            <option key={currency} value={currency}>{currency}</option>
                          ))}
                        </select>
                      </div>

                      {/* Date */}
                      <div className="col-span-1">
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                          className="bg-background text-xs h-8"
                        />
                      </div>

                      {/* Notes */}
                      <div className="col-span-2">
                        <Input
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                          placeholder="Add notes..."
                          className="bg-background text-xs h-8"
                        />
                      </div>

                      {/* Delete Button */}
                      <div className="col-span-1">
                        <Button
                          data-testid="delete-row"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(row.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Add Row Button */}
          <div className="flex justify-center">
            <Button
              data-testid="add-row"
              variant="outline"
              onClick={addRow}
              className="border-border bg-background text-foreground hover:bg-accent"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </div>

          {/* Warning when no rows */}
          {rows.length === 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <div className="text-sm text-yellow-700 dark:text-yellow-400">
                  <strong>Warning:</strong> Removing all rows will delete this connection. Nodes will remain for reconnection.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0 border-t border-border p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            data-testid="save-button"
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-2"
          >
            {rows.length === 0 ? "Delete Connection" : "Save Changes"}
          </Button>
        </DialogFooter>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Connection?</DialogTitle>
                <DialogDescription>
                  This will remove the connection between the selected nodes. Both nodes will remain in the graph for potential reconnection.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  This will remove the connection between <strong>{connection.from}</strong> and <strong>{connection.to}</strong>. 
                  Both nodes will remain in the graph for potential reconnection.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteConnection}
                >
                  Delete Connection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
} 