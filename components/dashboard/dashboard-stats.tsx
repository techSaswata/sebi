"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface StatCardProps {
  title: string
  value: string
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
  description?: string
  loading?: boolean
}

function StatCard({ title, value, change, changeType, icon: Icon, description, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  const getChangeIcon = () => {
    if (changeType === 'increase') return <ArrowUpRight className="h-3 w-3" />
    if (changeType === 'decrease') return <ArrowDownRight className="h-3 w-3" />
    return null
  }

  const getChangeColor = () => {
    if (changeType === 'increase') return 'text-green-600'
    if (changeType === 'decrease') return 'text-red-600'
    return 'text-muted-foreground'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {change && (
            <div className={`flex items-center space-x-1 text-xs ${getChangeColor()}`}>
              {getChangeIcon()}
              <span>{change}</span>
              {description && <span className="text-muted-foreground">from last month</span>}
            </div>
          )}
          {description && !change && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function DashboardStats() {
  const { data: healthData } = useSWR('/api/health', fetcher)
  const { data: portfolioData } = useSWR('/api/dashboard/stats', fetcher)
  
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const isLoading = !mounted || !healthData

  // Mock data for demonstration
  const stats = [
    {
      title: "Portfolio Value",
      value: portfolioData?.totalValue || "₹2,47,500",
      change: "+12.5%",
      changeType: "increase" as const,
      icon: DollarSign,
      description: "Total portfolio worth"
    },
    {
      title: "Active Bonds",
      value: portfolioData?.activeBonds || "8",
      change: "+2",
      changeType: "increase" as const,
      icon: PieChart,
      description: "Bonds in portfolio"
    },
    {
      title: "Monthly Yield",
      value: portfolioData?.monthlyYield || "₹8,450",
      change: "+5.2%",
      changeType: "increase" as const,
      icon: TrendingUp,
      description: "This month's returns"
    },
    {
      title: "Connected Wallets",
      value: portfolioData?.connectedWallets || "2",
      change: "Verified",
      changeType: "neutral" as const,
      icon: Wallet,
      description: "Linked Solana wallets"
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard
          key={stat.title}
          {...stat}
          loading={isLoading}
        />
      ))}
    </div>
  )
}
