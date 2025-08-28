"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react"
import type { BondMarketView } from "@/types/api"

export function BondCard({ bond }: { bond: BondMarketView }) {
  const maturity = bond.maturity_date ? new Date(bond.maturity_date).toLocaleDateString() : "—"
  const title = bond.name || bond.issuer || "Unknown Bond"
  const rating = "—" // Remove bond.credit_rating as it doesn't exist on BondMarketView
  const coupon = Number(bond.coupon_rate) || 0
  const ytm = Number(bond.listed_yield) || 0
  const minInvestment = Number(bond.min_investment) || Number(bond.face_value) || 0
  const currentPrice = bond.price_per_token_scaled ? (bond.price_per_token_scaled / 1000000) : null
  const isActive = bond.bond_status === 'active' && bond.market_paused === false

  return (
    <Card className={`h-full overflow-hidden border-border/40 bg-gradient-to-b from-background to-muted/10 ${!isActive ? 'opacity-60' : ''}`}>
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-pretty line-clamp-2">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{bond.issuer}</p>
          </div>
          <div className="flex flex-col items-end gap-1 ml-2">
            <Badge variant="secondary" className="rounded-full">
              {rating}
            </Badge>
            {!isActive && (
              <Badge variant="outline" className="text-xs">
                {bond.market_paused === true ? 'Paused' : bond.market_paused === null ? 'No Market' : 'Inactive'}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div>
            <p className="text-muted-foreground">Coupon Rate</p>
            <p className="font-medium">{coupon.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Maturity</p>
            <p className="font-medium">{maturity}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Listed Yield</p>
            <p className="font-medium flex items-center gap-1">
              {ytm.toFixed(2)}%
              {ytm > coupon ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : ytm < coupon ? (
                <TrendingDown className="w-3 h-3 text-red-500" />
              ) : null}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Min Investment</p>
            <p className="font-medium">
              ₹{minInvestment.toLocaleString('en-IN')}
            </p>
          </div>
          {currentPrice && (
            <>
              <div>
                <p className="text-muted-foreground">Current Price</p>
                <p className="font-medium">₹{currentPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Liquidity</p>
                <p className="font-medium">
                  {bond.liquidity_bond ? `${bond.liquidity_bond} units` : 'Limited'}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-auto pt-5 flex gap-2">
          <Link href={`/bonds/${bond.bond_id}`} className="w-full">
            <Button 
              className="w-full rounded-full" 
              disabled={!isActive}
              variant={isActive ? "default" : "secondary"}
            >
              {isActive ? "View & Trade" : "View Details"}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
