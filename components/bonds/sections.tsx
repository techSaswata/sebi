"use client"

import type React from "react"

import useSWR from "swr"
import { Button } from "@/components/ui/button"
import type { AsperoHomeResponse, AsperoWidget, AsperoBond } from "@/lib/aspero"
import { BondCard } from "./bond-card"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function BondsHomeSections() {
  const { data, error, isLoading, mutate } = useSWR<AsperoHomeResponse>("/api/aspero/home", fetcher, {
    revalidateOnFocus: false,
  })

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">Failed to load bonds: {String(error)}</p>
        <Button variant="outline" onClick={() => mutate()}>
          Retry
        </Button>
      </div>
    )
  }
  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading live bonds…</p>
  }

  const widgets = data.widgets || []

  return (
    <div className="space-y-10">
      {widgets.map((w: AsperoWidget, idx: number) => {
        // Newly Added Bonds (BOND_TILES)
        if (w.config?.widget_type === "BOND_TILES" && Array.isArray(w.data)) {
          return (
            <Section key={`tiles-${idx}`} title={w.config?.heading?.title || "Bonds"}>
              <Grid bonds={(w.data as AsperoBond[]) ?? []} />
            </Section>
          )
        }

        // Product Categories -> bonds.data[]
        if (w.config?.widget_type === "PRODUCT_CATEGORIES" && (w as any).data?.bonds?.data) {
          const cats = ((w as any).data.bonds.data || []) as Array<{ name: string; data: AsperoBond[] }>
          return (
            <div key={`cats-${idx}`} className="space-y-8">
              {cats.map((c, i) => (
                <Section key={`cat-${i}`} title={c.name}>
                  <Grid bonds={c.data || []} />
                </Section>
              ))}
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl md:text-2xl font-semibold text-balance">{title}</h2>
      {children}
    </section>
  )
}

function Grid({ bonds }: { bonds: import("@/lib/aspero").AsperoBond[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {bonds.map((b, i) => (
        <BondCard key={`${b.id}-${i}`} bond={b} />
      ))}
    </div>
  )
}
