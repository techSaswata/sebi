"use client"

import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { SolanaProvider } from "@/components/solana/solana-provider"
import { SWRRevalidateBridge } from "@/components/events/swr-revalidate-bridge"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SolanaProvider>
        <SWRRevalidateBridge />
        {children}
      </SolanaProvider>
    </ThemeProvider>
  )
}
