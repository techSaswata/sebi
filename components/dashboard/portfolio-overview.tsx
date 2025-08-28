"use client"

import { useState } from "react"
import useSWR from "swr"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  TrendingUp, 
  TrendingDown, 
  MoreHorizontal,
  PieChart,
  BarChart3,
  Eye,
  ExternalLink
} from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface PortfolioItem {
  id: string
  name: string
  issuer: string
  value: number
  percentage: number
  yield: number
  maturity: string
  status: 'active' | 'matured' | 'upcoming'
  change: number
}

function PortfolioChart() {
  // Mock data for the chart
  const portfolioDistribution = [
    { name: "Government Bonds", value: 45, color: "bg-blue-500" },
    { name: "Corporate Bonds", value: 30, color: "bg-green-500" },
    { name: "Municipal Bonds", value: 15, color: "bg-purple-500" },
    { name: "High Yield", value: 10, color: "bg-orange-500" }
  ]

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Asset Allocation</h3>
      <div className="space-y-3">
        {portfolioDistribution.map((item) => (
          <div key={item.name} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{item.name}</span>
              <span className="text-muted-foreground">{item.value}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${item.color}`}
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PortfolioTable() {
  const { data, isLoading } = useSWR('/api/portfolio/holdings', fetcher)

  // Mock data
  const holdings: PortfolioItem[] = [
    {
      id: "1",
      name: "HDFC Bank Bond 2025",
      issuer: "HDFC Bank",
      value: 50000,
      percentage: 20.2,
      yield: 7.5,
      maturity: "2025-12-15",
      status: "active",
      change: 2.1
    },
    {
      id: "2", 
      name: "Tata Steel Corporate Bond",
      issuer: "Tata Steel",
      value: 75000,
      percentage: 30.3,
      yield: 8.2,
      maturity: "2026-06-30",
      status: "active",
      change: -1.5
    },
    {
      id: "3",
      name: "Government of India Bond",
      issuer: "Government of India",
      value: 100000,
      percentage: 40.4,
      yield: 6.8,
      maturity: "2027-03-15",
      status: "active", 
      change: 0.8
    },
    {
      id: "4",
      name: "Reliance Industries Bond",
      issuer: "Reliance Industries",
      value: 22500,
      percentage: 9.1,
      yield: 7.9,
      maturity: "2024-09-20",
      status: "upcoming",
      change: 1.2
    }
  ]

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-3 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {holdings.map((holding) => (
        <motion.div
          key={holding.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
              <PieChart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{holding.name}</h4>
              <p className="text-sm text-muted-foreground">{holding.issuer}</p>
            </div>
          </div>
          
          <div className="text-right space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">₹{holding.value.toLocaleString()}</span>
              <Badge
                variant={holding.change >= 0 ? "default" : "destructive"}
                className="text-xs"
              >
                {holding.change >= 0 ? "+" : ""}{holding.change}%
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {holding.yield}% yield • {holding.percentage}% of portfolio
            </div>
          </div>
          
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </motion.div>
      ))}
    </div>
  )
}

export function PortfolioOverview() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>Portfolio Overview</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/portfolio">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full Portfolio
              </Link>
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="holdings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="holdings" className="space-y-4">
            <PortfolioTable />
          </TabsContent>
          
          <TabsContent value="allocation" className="space-y-4">
            <PortfolioChart />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
