"use client"

import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BuyModal } from "./buy-modal"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { ApiResponse } from "@/types/api"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface BondDetailResponse {
  bond: any;
}

export function BondDetail({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR<ApiResponse<{ bond: any }>>(
    id ? `/api/bonds/${id}` : null, 
    fetcher,
    { refreshInterval: 30000 }
  )
  
  const bond = data?.success ? (data as any).bond : null

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/bonds" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Bonds
          </Link>
        </Button>
        <div className="text-center py-8">
          <p className="text-red-500">Failed to load bond details. Please try again later.</p>
        </div>
      </div>
    )
  }

  if (isLoading || !bond) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/bonds" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Bonds
          </Link>
        </Button>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Extract bond data with proper type conversion
  const maturity = bond.maturity_date ? new Date(bond.maturity_date).toLocaleDateString() : "—"
  const title = bond.name || bond.isin || String(bond.id)
  const issuer = bond.issuer || "—"
  const rating = bond.credit_rating || "—"
  const ratingAgency = bond.credit_rating_agency || ""
  const coupon = Number(bond.coupon_rate) || 0
  const listedYield = Number(bond.listed_yield) || 0
  const faceValue = Number(bond.face_value) || 0
  const minInvestment = Number(bond.min_investment) || 0
  const sector = bond.sector || "—"
  const frequency = bond.interest_payment_frequency || "—"
  
  // Calculate additional metrics
  const isActive = bond.status === 'active'
  const marketPaused = bond?.market_paused
  const hasMarket = bond?.market_id
  const canTrade = isActive && hasMarket && !marketPaused

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/bonds" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Bonds
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{issuer}</p>
          <p className="text-sm text-muted-foreground">ISIN: {bond.isin}</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <Badge 
            variant={canTrade ? "default" : "secondary"} 
            className="rounded-full"
          >
            {rating} {ratingAgency && `• ${ratingAgency}`}
          </Badge>
          <Badge 
            variant={canTrade ? "default" : "secondary"}
            className={`rounded-full ${canTrade ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            {canTrade ? "Active Trading" : marketPaused ? "Market Paused" : "No Market"}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Listed Yield</p>
            <p className="text-2xl font-semibold text-green-600">
              {listedYield.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Coupon Rate</p>
            <p className="text-2xl font-semibold text-blue-600">
              {coupon.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Maturity Date</p>
            <p className="text-2xl font-semibold">{maturity}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Face Value</p>
            <p className="text-2xl font-semibold">
              ₹{faceValue.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Min Investment</p>
            <p className="text-2xl font-semibold">
              ₹{minInvestment.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Sector</p>
            <p className="text-2xl font-semibold">{sector}</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Bond Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Interest Payment Frequency</p>
              <p className="font-medium">{frequency}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bond Status</p>
              <p className="font-medium capitalize">{bond.status || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Supply</p>
              <p className="font-medium">{Number(bond.total_supply || 0).toLocaleString('en-IN')} tokens</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Decimals</p>
              <p className="font-medium">{bond.decimals || 6}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Actions */}
      <div className="flex gap-3">
        {canTrade ? (
          <BuyModal price={listedYield} bondId={String(bond.id)} />
        ) : (
          <Button disabled>
            {!hasMarket ? "No Market Available" : "Trading Paused"}
          </Button>
        )}
      </div>

      {/* Market Statistics */}
      {bond?.stats_24h && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">24H Statistics</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Trades</p>
                <p className="text-xl font-semibold">{bond.stats_24h.trade_count || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volume</p>
                <p className="text-xl font-semibold">₹{Number(bond.stats_24h.volume || 0).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Min Price</p>
                <p className="text-xl font-semibold">₹{Number(bond.stats_24h.min_price || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Max Price</p>
                <p className="text-xl font-semibold">₹{Number(bond.stats_24h.max_price || 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Trades */}
      {bond?.recent_trades && bond.recent_trades.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
            <div className="space-y-2">
              {bond.recent_trades.slice(0, 5).map((trade: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                      {trade.side?.toUpperCase()}
                    </Badge>
                    <span className="text-sm">{Number(trade.amount || 0).toLocaleString('en-IN')} tokens</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₹{Number(trade.price_scaled || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {trade.created_at ? new Date(trade.created_at).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
