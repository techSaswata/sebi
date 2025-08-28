"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/app-shell/header"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { PortfolioOverview } from "@/components/dashboard/portfolio-overview"
import { RecentBonds } from "@/components/dashboard/recent-bonds"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { WalletStatus } from "@/components/dashboard/wallet-status"
import { UserWelcome } from "@/components/dashboard/user-welcome"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { MarketInsights } from "@/components/dashboard/market-insights"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (!mounted || loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <Header />
        <main className="flex-1">
          <div className="container px-4 py-8 space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container px-4 py-8 space-y-8">
          {/* Welcome Section */}
          <UserWelcome user={user} />

          {/* Key Stats */}
          <DashboardStats />

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-8 space-y-6">
              {/* Portfolio Overview */}
              <PortfolioOverview />
              
              {/* Recent Bonds */}
              <RecentBonds />
              
              {/* Market Insights */}
              <MarketInsights />
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Quick Actions */}
              <QuickActions />
              
              {/* Wallet Status */}
              <WalletStatus />
              
              {/* Recent Activity */}
              <RecentActivity />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
