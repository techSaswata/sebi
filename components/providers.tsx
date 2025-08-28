"use client"

import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { SolanaProvider } from "@/components/solana/solana-provider"
import { SWRRevalidateBridge } from "@/components/events/swr-revalidate-bridge"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/sonner"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <SolanaProvider>
          <SWRRevalidateBridge />
          {children}
          <Toaster />
        </SolanaProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
