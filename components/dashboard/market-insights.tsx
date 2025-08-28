"use client"

import { useState } from "react"
import useSWR from "swr"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp,
  TrendingDown,
  Brain,
  Target,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface MarketInsight {
  id: string
  type: 'recommendation' | 'alert' | 'trend' | 'opportunity'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  category: string
  actionable: boolean
}

interface MarketTrend {
  name: string
  value: number
  change: number
  changeType: 'up' | 'down' | 'stable'
}

// Mock data
const mockInsights: MarketInsight[] = [
  {
    id: "1",
    type: "recommendation",
    title: "Consider Government Bonds",
    description: "Based on your risk profile, government bonds could balance your portfolio with 15% allocation.",
    confidence: 87,
    impact: "medium",
    category: "Portfolio Optimization",
    actionable: true
  },
  {
    id: "2",
    type: "alert",
    title: "Interest Rate Outlook",
    description: "RBI may cut rates by 25bps in next quarter. Consider locking in current yields for long-term bonds.",
    confidence: 72,
    impact: "high",
    category: "Market Analysis",
    actionable: true
  },
  {
    id: "3",
    type: "opportunity",
    title: "Corporate Bond Spread Tightening",
    description: "AAA-rated corporate bonds showing attractive spreads over government securities.",
    confidence: 91,
    impact: "medium",
    category: "Investment Opportunity",
    actionable: true
  },
  {
    id: "4",
    type: "trend",
    title: "ESG Bond Momentum",
    description: "Sustainable and green bonds gaining traction with 23% YoY growth in issuances.",
    confidence: 95,
    impact: "low",
    category: "Market Trend",
    actionable: false
  }
]

const mockTrends: MarketTrend[] = [
  { name: "10Y G-Sec Yield", value: 7.25, change: -0.15, changeType: "down" },
  { name: "AAA Corporate", value: 8.10, change: 0.05, changeType: "up" },
  { name: "Credit Spreads", value: 85, change: -12, changeType: "down" },
  { name: "Bond Volumes", value: 15420, change: 8.5, changeType: "up" }
]

function InsightCard({ insight, index }: { insight: MarketInsight; index: number }) {
  const getIcon = () => {
    switch (insight.type) {
      case 'recommendation':
        return <Target className="h-4 w-4" />
      case 'alert':
        return <AlertTriangle className="h-4 w-4" />
      case 'opportunity':
        return <Lightbulb className="h-4 w-4" />
      case 'trend':
        return <TrendingUp className="h-4 w-4" />
      default:
        return <Brain className="h-4 w-4" />
    }
  }

  const getColorScheme = () => {
    switch (insight.type) {
      case 'recommendation':
        return 'border-blue-200 bg-blue-50/50 text-blue-700'
      case 'alert':
        return 'border-orange-200 bg-orange-50/50 text-orange-700'
      case 'opportunity':
        return 'border-green-200 bg-green-50/50 text-green-700'
      case 'trend':
        return 'border-purple-200 bg-purple-50/50 text-purple-700'
      default:
        return 'border-gray-200 bg-gray-50/50 text-gray-700'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={`p-4 rounded-lg border ${getColorScheme()}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <Badge variant="outline" className="text-xs capitalize">
            {insight.type}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium">{insight.confidence}%</span>
          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-current transition-all"
              style={{ width: `${insight.confidence}%` }}
            />
          </div>
        </div>
      </div>
      
      <h3 className="font-semibold text-sm mb-2">{insight.title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        {insight.description}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            {insight.category}
          </Badge>
          <Badge 
            variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {insight.impact} impact
          </Badge>
        </div>
        
        {insight.actionable && (
          <Button size="sm" variant="outline" className="h-6 text-xs">
            Act on This
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </motion.div>
  )
}

function MarketTrends() {
  return (
    <div className="space-y-4">
      {mockTrends.map((trend, index) => (
        <motion.div
          key={trend.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="flex items-center justify-between p-3 border rounded-lg"
        >
          <div className="space-y-1">
            <h4 className="font-medium text-sm">{trend.name}</h4>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold">{trend.value}%</span>
              <div className={`flex items-center space-x-1 text-xs ${
                trend.changeType === 'up' ? 'text-green-600' : 
                trend.changeType === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend.changeType === 'up' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : trend.changeType === 'down' ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <Activity className="h-3 w-3" />
                )}
                <span>{Math.abs(trend.change)}%</span>
              </div>
            </div>
          </div>
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      ))}
    </div>
  )
}

export function MarketInsights() {
  const { data, isLoading } = useSWR('/api/ai/insights', fetcher)
  const [insights] = useState<MarketInsight[]>(mockInsights)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>AI Market Insights</span>
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Powered by AI
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="trends">Market Trends</TabsTrigger>
          </TabsList>
          
          <TabsContent value="insights" className="space-y-4">
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <InsightCard key={insight.id} insight={insight} index={index} />
              ))}
            </div>
            
            <Button variant="outline" className="w-full" size="sm">
              <Brain className="h-4 w-4 mr-2" />
              Generate More Insights
            </Button>
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-4">
            <MarketTrends />
            
            <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
              <div className="text-center space-y-2">
                <PieChart className="h-6 w-6 mx-auto text-muted-foreground" />
                <h4 className="font-medium text-sm">Market Summary</h4>
                <p className="text-xs text-muted-foreground">
                  Bond markets showing mixed signals with government yields declining while corporate spreads widen.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
