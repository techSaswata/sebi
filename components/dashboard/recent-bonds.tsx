"use client"

import useSWR from "swr"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  TrendingUp,
  Clock,
  Star,
  ExternalLink,
  ArrowRight,
  Building,
  Calendar,
  Percent
} from "lucide-react"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Bond {
  id: number
  name: string
  issuer: string
  coupon_rate: number
  maturity_date: string
  min_investment: number
  listed_yield: number
  credit_rating: string
  bond_status: string
  market_paused: boolean
}

function BondCard({ bond }: { bond: Bond }) {
  const isActive = bond.bond_status === 'active' && !bond.market_paused
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/30">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm line-clamp-1">{bond.name}</h3>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Building className="h-3 w-3" />
                <span>{bond.issuer}</span>
              </div>
            </div>
            <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground mb-1">
                <Percent className="h-3 w-3" />
                <span>Yield</span>
              </div>
              <p className="font-semibold text-green-600">{Number(bond.listed_yield).toFixed(2)}%</p>
            </div>
            <div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />
                <span>Coupon</span>
              </div>
              <p className="font-semibold">{Number(bond.coupon_rate).toFixed(2)}%</p>
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Min Investment</span>
              <span className="font-medium">₹{Number(bond.min_investment).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Rating</span>
              <Badge variant="outline" className="text-xs">
                {bond.credit_rating || "Not Rated"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Maturity</span>
              <span className="font-medium">
                {new Date(bond.maturity_date).toLocaleDateString('en-IN', {
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button size="sm" className="flex-1" asChild disabled={!isActive}>
              <Link href={`/bonds/${bond.id}`}>
                <ExternalLink className="h-3 w-3 mr-1" />
                View Details
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function RecentBondsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function RecentBonds() {
  const { data, isLoading, error } = useSWR('/api/bonds?limit=6', fetcher)
  
  const bonds: Bond[] = data?.success ? data.data : []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Latest Bonds</span>
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/bonds">
              View All Bonds
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <RecentBondsLoading />}
        
        {error && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load bonds. Please try again.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        )}
        
        {!isLoading && !error && bonds.length === 0 && (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No bonds available at the moment.</p>
          </div>
        )}
        
        {!isLoading && !error && bonds.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bonds.map((bond) => (
              <BondCard key={bond.id} bond={bond} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
