"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  User,
  Settings,
  Eye,
  Clock,
  ExternalLink
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ActivityItem {
  id: string
  type: 'trade' | 'wallet' | 'profile' | 'system'
  action: string
  description: string
  timestamp: Date
  amount?: number
  currency?: string
  status: 'completed' | 'pending' | 'failed'
  metadata?: any
}

// Mock activity data
const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "trade",
    action: "Bond Purchase",
    description: "Purchased HDFC Bank Bond 2025",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    amount: 50000,
    currency: "INR",
    status: "completed"
  },
  {
    id: "2", 
    type: "wallet",
    action: "Wallet Connected",
    description: "Connected Phantom wallet",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    status: "completed"
  },
  {
    id: "3",
    type: "trade",
    action: "Interest Received",
    description: "Quarterly interest from Tata Steel Bond",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    amount: 1875,
    currency: "INR",
    status: "completed"
  },
  {
    id: "4",
    type: "profile",
    action: "Profile Updated",
    description: "Updated investment preferences",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    status: "completed"
  },
  {
    id: "5",
    type: "trade",
    action: "Bond Sold",
    description: "Sold Government Bond (partial)",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    amount: 25000,
    currency: "INR",
    status: "completed"
  },
  {
    id: "6",
    type: "system",
    action: "Security Alert",
    description: "Login from new device detected",
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    status: "completed"
  }
]

function ActivityIcon({ type, action }: { type: string; action: string }) {
  const getIcon = () => {
    switch (type) {
      case 'trade':
        return action.toLowerCase().includes('purchase') || action.toLowerCase().includes('buy')
          ? <ArrowUpRight className="h-4 w-4 text-red-500" />
          : action.toLowerCase().includes('sold') || action.toLowerCase().includes('sell')
          ? <ArrowDownLeft className="h-4 w-4 text-green-500" />
          : <ArrowUpRight className="h-4 w-4 text-blue-500" />
      case 'wallet':
        return <Wallet className="h-4 w-4 text-purple-500" />
      case 'profile':
        return <User className="h-4 w-4 text-orange-500" />
      case 'system':
        return <Settings className="h-4 w-4 text-gray-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
      {getIcon()}
    </div>
  )
}

function ActivityItem({ activity, index }: { activity: ActivityItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <ActivityIcon type={activity.type} action={activity.action} />
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm truncate">{activity.action}</h4>
          <Badge
            variant={
              activity.status === 'completed' ? 'default' :
              activity.status === 'pending' ? 'secondary' : 'destructive'
            }
            className="text-xs"
          >
            {activity.status}
          </Badge>
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2">
          {activity.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(activity.timestamp, { addSuffix: true })}</span>
          </div>
          
          {activity.amount && (
            <span className="font-semibold text-sm">
              {activity.currency === 'INR' ? '₹' : ''}{activity.amount.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function RecentActivity() {
  const [activities] = useState<ActivityItem[]>(mockActivities)
  const [filter, setFilter] = useState<'all' | 'trade' | 'wallet' | 'profile'>('all')

  const filteredActivities = activities.filter(activity => 
    filter === 'all' || activity.type === filter
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Activity</span>
          </CardTitle>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-4 overflow-x-auto">
          {[
            { key: 'all', label: 'All' },
            { key: 'trade', label: 'Trades' },
            { key: 'wallet', label: 'Wallet' },
            { key: 'profile', label: 'Profile' }
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.key as any)}
              className="text-xs whitespace-nowrap"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Activity List */}
        <ScrollArea className="h-80">
          <div className="space-y-1">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No {filter !== 'all' ? filter : ''} activity found
                </p>
              </div>
            ) : (
              filteredActivities.map((activity, index) => (
                <ActivityItem key={activity.id} activity={activity} index={index} />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t">
          <Button variant="outline" className="w-full" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Activity History
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
