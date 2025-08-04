"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
// ScrollArea component not available, using div with overflow
import { Copy, RefreshCw, X, AlertTriangle, Info, AlertCircle } from "lucide-react"
import { debugLogger, getDebugSummary } from "@/lib/debug-utils"

interface DebugPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [summary, setSummary] = useState("")

  const refreshMessages = () => {
    setMessages(debugLogger.getRecentMessages(20))
    setSummary(getDebugSummary())
  }

  useEffect(() => {
    if (isOpen) {
      refreshMessages()
      const interval = setInterval(refreshMessages, 2000)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[800px] h-[600px] max-w-[90vw] max-h-[90vh]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">Debug Panel</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(summary)}
              className="h-8"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy Summary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshMessages}
              className="h-8"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Section */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Summary</h3>
            <pre className="text-xs whitespace-pre-wrap">{summary}</pre>
          </div>

          {/* Messages Section */}
          <div>
            <h3 className="text-sm font-medium mb-2">Recent Messages</h3>
            <div className="h-[300px] border rounded-lg p-2 overflow-y-auto">
              <div className="space-y-2">
                {messages.map((msg, index) => (
                  <div key={index} className="flex items-start space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    {getIcon(msg.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge className={`text-xs ${getBadgeColor(msg.type)}`}>
                          {msg.type.toUpperCase()}
                        </Badge>
                        {msg.context && (
                          <Badge variant="outline" className="text-xs">
                            {msg.context}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm font-mono break-all">
                        {msg.message}
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No messages captured yet
                  </div>
                )}
                              </div>
              </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 