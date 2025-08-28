"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Plus,
  Search,
  TrendingUp,
  Wallet,
  Settings,
  BarChart3,
  FileText,
  Star,
  ArrowUpRight,
  CreditCard,
  PieChart
} from "lucide-react"
import Link from "next/link"

interface QuickAction {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  variant: "default" | "secondary" | "outline"
  badge?: string
}

const quickActions: QuickAction[] = [
  {
    title: "Browse Bonds",
    description: "Explore available tokenized bonds",
    icon: Search,
    href: "/bonds",
    variant: "default",
    badge: "Popular"
  },
  {
    title: "Portfolio Analytics",
    description: "View detailed portfolio insights",
    icon: BarChart3,
    href: "/portfolio",
    variant: "outline"
  },
  {
    title: "Connect Wallet",
    description: "Link your Solana wallet",
    icon: Wallet,
    href: "/wallets",
    variant: "secondary",
    badge: "Required"
  },
  {
    title: "Market Insights",
    description: "AI-powered market analysis",
    icon: TrendingUp,
    href: "/insights",
    variant: "outline"
  },
  {
    title: "Investment Goals",
    description: "Set and track your targets",
    icon: Star,
    href: "/goals",
    variant: "outline"
  },
  {
    title: "Reports",
    description: "Download portfolio reports",
    icon: FileText,
    href: "/reports",
    variant: "outline"
  }
]

function ActionCard({ action, index }: { action: QuickAction; index: number }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Button
        variant={action.variant}
        className="w-full h-auto p-4 flex flex-col items-start space-y-2 relative overflow-hidden group"
        asChild
      >
        <Link href={action.href}>
          <div className="flex items-center justify-between w-full">
            <action.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
            {action.badge && (
              <Badge variant="secondary" className="text-xs">
                {action.badge}
              </Badge>
            )}
          </div>
          
          <div className="text-left space-y-1 w-full">
            <h3 className="font-semibold text-sm">{action.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {action.description}
            </p>
          </div>
          
          <motion.div
            className="absolute bottom-2 right-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ 
              opacity: isHovered ? 1 : 0,
              x: isHovered ? 0 : -10
            }}
            transition={{ duration: 0.2 }}
          >
            <ArrowUpRight className="h-4 w-4" />
          </motion.div>
        </Link>
      </Button>
    </motion.div>
  )
}

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {quickActions.map((action, index) => (
            <ActionCard key={action.title} action={action} index={index} />
          ))}
        </div>
        
        {/* Featured Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="mt-4 p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20"
        >
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <PieChart className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-sm">Investment Recommendation</h4>
              <p className="text-xs text-muted-foreground">
                Based on your portfolio, consider diversifying with government bonds.
              </p>
              <Button size="sm" variant="outline" className="mt-2 h-7 text-xs">
                View Suggestions
              </Button>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  )
}
