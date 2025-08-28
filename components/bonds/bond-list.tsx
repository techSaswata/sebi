"use client"

import { useState } from "react"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BondCard } from "./bond-card"
import type { BondMarketView, ApiResponse } from "@/types/api"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function BondList() {
  const [filter, setFilter] = useState("")
  const [category, setCategory] = useState("all")
  
  const { data, error, isLoading } = useSWR<ApiResponse<BondMarketView[]>>(
    "/api/bonds", 
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  )
  
  const bonds = data?.success ? data.data : []
  
  // Filter bonds based on search and category
  const filteredBonds = bonds.filter(bond => {
    const matchesFilter = !filter || 
      bond.name.toLowerCase().includes(filter.toLowerCase()) ||
      bond.issuer.toLowerCase().includes(filter.toLowerCase()) ||
      bond.isin?.toLowerCase().includes(filter.toLowerCase())
    
    const matchesCategory = category === "all" || 
      (category === "high_yield" && (bond.listed_yield || 0) > 10) ||
      (category === "high_rated" && ["AAA", "AA+", "AA", "AA-", "A+", "A"].includes(bond.credit_rating || "")) ||
      (category === "short_tenor" && bond.maturity_date && 
        new Date(bond.maturity_date).getTime() - Date.now() < 2 * 365 * 24 * 60 * 60 * 1000)
    
    return matchesFilter && matchesCategory
  })

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load bonds. Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <Input 
          placeholder="Filter by name, issuer, or ISIN..." 
          className="sm:max-w-xs"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="rounded-full">
            <TabsTrigger value="all" className="rounded-full">
              All ({bonds.length})
            </TabsTrigger>
            <TabsTrigger value="high_yield" className="rounded-full">
              High Yield
            </TabsTrigger>
            <TabsTrigger value="high_rated" className="rounded-full">
              High Rated
            </TabsTrigger>
            <TabsTrigger value="short_tenor" className="rounded-full">
              Short Tenor
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredBonds.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {filter ? "No bonds match your search criteria." : "No bonds available."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBonds.map((bond) => (
            <BondCard 
              key={`${bond.bond_id}-${bond.market_id || 'no-market'}`} 
              bond={bond} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
