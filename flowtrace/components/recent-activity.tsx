"use client"

import { useState } from "react"
import { ExternalLink, AlertCircle, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SecurityEvent {
  id: string
  type: "compromise" | "drain" | "suspicious" | "alert" | "transaction"
  message: string
  timeAgo: string
  severity: "high" | "medium" | "low"
  details?: string
}

const mockSecurityEvents: SecurityEvent[] = [
  {
    id: "1",
    type: "compromise",
    message: "Compromise detected",
    timeAgo: "2 hours ago",
    severity: "high",
    details: "Suspicious login attempt from unknown IP"
  },
  {
    id: "2",
    type: "drain",
    message: "Funds drained",
    timeAgo: "6 hours ago",
    severity: "high",
    details: "0.19863498 BTC transferred to suspicious address"
  },
  {
    id: "3",
    type: "suspicious",
    message: "Suspicious activity detected",
    timeAgo: "1 day ago",
    severity: "medium",
    details: "Multiple failed login attempts"
  },
  {
    id: "4",
    type: "transaction",
    message: "Large transaction detected",
    timeAgo: "2 days ago",
    severity: "medium",
    details: "0.5 BTC transferred to mixer service"
  },
  {
    id: "5",
    type: "alert",
    message: "Risk score increased",
    timeAgo: "3 days ago",
    severity: "low",
    details: "Risk score changed from 45 to 85"
  }
]

type FilterType = "all" | "high" | "medium" | "low"

export function RecentActivity() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")

  const filteredEvents = mockSecurityEvents.filter(event => {
    if (activeFilter === "all") return true
    return event.severity === activeFilter
  })

  const getSeverityIcon = (severity: "high" | "medium" | "low") => {
    switch (severity) {
      case "high":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case "medium":
        return <Shield className="w-4 h-4 text-yellow-500" />
      case "low":
        return <Zap className="w-4 h-4 text-blue-500" />
    }
  }

  const getSeverityBadge = (severity: "high" | "medium" | "low") => {
    const colors = {
      high: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      low: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    }
    
    return (
      <Badge className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[severity]}`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h4>
        <Button className="px-3 py-1 text-sm font-medium rounded-lg transition-colors bg-orange-600 text-white hover:bg-orange-700">
          <ExternalLink className="w-4 h-4 mr-2" />
          View Full Timeline
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveFilter("all")}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeFilter === "all"
                ? "text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400"
                : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setActiveFilter("high")}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeFilter === "high"
                ? "text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400"
                : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
            }`}
          >
            High Priority
          </button>
          <button
            onClick={() => setActiveFilter("medium")}
            className={`py-2 px-4 text-sm font-medium transition-colors ${
              activeFilter === "medium"
                ? "text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400"
                : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
            }`}
          >
            Medium Priority
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {filteredEvents.map((event) => (
          <div key={event.id} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex-shrink-0 mt-1">
              {getSeverityIcon(event.severity)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {event.message}
                </p>
                {getSeverityBadge(event.severity)}
              </div>
              {event.details && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {event.details}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {event.timeAgo}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Issue Count Badge */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Badge className="bg-red-500 text-white px-3 py-1 rounded-full text-xs">
            {filteredEvents.length} Active Issue{filteredEvents.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>
    </div>
  )
} 