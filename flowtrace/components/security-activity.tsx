"use client"

import { useState } from "react"
import { ExternalLink, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SecurityEvent {
  id: string
  type: "compromise" | "drain" | "suspicious" | "alert"
  message: string
  timeAgo: string
  severity: "high" | "medium" | "low"
}

const mockSecurityEvents: SecurityEvent[] = [
  {
    id: "1",
    type: "compromise",
    message: "Compromise detected",
    timeAgo: "2 hours ago",
    severity: "high"
  },
  {
    id: "2",
    type: "drain",
    message: "Funds drained",
    timeAgo: "6 hours ago",
    severity: "high"
  },
  {
    id: "3",
    type: "suspicious",
    message: "Suspicious activity detected",
    timeAgo: "1 day ago",
    severity: "medium"
  }
]

export function SecurityActivity() {
  const [isVisible, setIsVisible] = useState(true)
  const [dismissedIssues, setDismissedIssues] = useState<string[]>([])

  const activeIssues = mockSecurityEvents.filter(event => !dismissedIssues.includes(event.id))
  const issueCount = activeIssues.length

  const dismissIssue = (issueId: string) => {
    setDismissedIssues(prev => [...prev, issueId])
  }

  if (!isVisible) return null

  return (
    <div className="relative">
      {/* Main Activity Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          Recent Activity
        </h3>
        
        <div className="space-y-3">
          {activeIssues.map((event) => (
            <div key={event.id} className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {event.message}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {event.timeAgo}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View Full Timeline
        </Button>
      </div>

      {/* Issue Badge */}
      {issueCount > 0 && (
        <div className="absolute -bottom-2 -left-2">
          <Badge className="bg-red-500 text-white border-2 border-white dark:border-gray-800 px-3 py-1 rounded-full">
            <span className="mr-2">N {issueCount} Issue{issueCount !== 1 ? 's' : ''}</span>
            <button
              onClick={() => setIsVisible(false)}
              className="ml-1 hover:bg-red-600 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        </div>
      )}
    </div>
  )
} 