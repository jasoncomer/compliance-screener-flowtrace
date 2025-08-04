import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { getPopularCurrencies } from '@/lib/currency-icons'

interface CustomNodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onNodeCreate: (nodeData: {
    label: string
    logo: string
    currencyCode: string
    risk: "low" | "medium" | "high"
    notes?: string
    x: number
    y: number
  }) => void
  position: { x: number; y: number }
  onPlaceMode?: (nodeData: {
    label: string
    logo: string
    currencyCode: string
    risk: "low" | "medium" | "high"
    notes?: string
  }) => void
}

const availableLogos = getPopularCurrencies().map(currency => ({
  value: currency.logo,
  code: currency.code,
  label: `${currency.name} (${currency.code})`
}))

export function CustomNodeDialog({ open, onOpenChange, onNodeCreate, position, onPlaceMode }: CustomNodeDialogProps) {
  const [label, setLabel] = useState('')
  const [selectedLogo, setSelectedLogo] = useState('')
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('')
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium")
  const [notes, setNotes] = useState('')

  const handleCreate = () => {
    if (label.trim() && selectedLogo) {
      onNodeCreate({
        label: label.trim(),
        logo: selectedLogo,
        currencyCode: selectedCurrencyCode,
        risk,
        notes: notes.trim(),
        x: position.x,
        y: position.y,
      })
      setLabel('')
      setSelectedLogo('')
      setSelectedCurrencyCode('')
      setRisk("medium")
      setNotes('')
      onOpenChange(false)
    }
  }

  const handleLogoChange = (logoPath: string) => {
    setSelectedLogo(logoPath)
    const selectedCurrency = availableLogos.find(logo => logo.value === logoPath)
    setSelectedCurrencyCode(selectedCurrency?.code || '')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Custom Node</DialogTitle>
          <DialogDescription>
            Add a new custom node to your network. Fill in the details below to create your node.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Bank of America"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="logo" className="text-right text-sm font-medium">
              Logo
            </label>
            <select 
              value={selectedLogo} 
              onChange={(e) => handleLogoChange(e.target.value)}
              className="col-span-3 text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              <option value="">Select a logo</option>
              {availableLogos.map((logo) => (
                <option key={logo.value} value={logo.value}>
                  {logo.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="risk" className="text-right text-sm font-medium">
              Risk Level
            </label>
            <select 
              value={risk} 
              onChange={(e) => setRisk(e.target.value as "low" | "medium" | "high")}
              className="col-span-3 text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="notes" className="text-right text-sm font-medium">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this node..."
              className="col-span-3 text-sm border rounded px-2 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 resize-none min-h-[60px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {onPlaceMode && (
            <Button 
              onClick={() => {
                onOpenChange(false)
                onPlaceMode({
                  label: label.trim(),
                  logo: selectedLogo,
                  currencyCode: selectedCurrencyCode,
                  risk,
                  notes: notes.trim()
                })
              }}
              disabled={!label.trim() || !selectedLogo}
            >
              Place on Canvas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 