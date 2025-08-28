"use client"

import { useEffect, useState } from "react"
import { WalletMultiButton, WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { Button } from "@/components/ui/button"

interface WalletClientOnlyProps {
  className?: string
}

interface WalletModalProviderClientOnlyProps {
  children: React.ReactNode
}

export function WalletMultiButtonClientOnly({ className }: WalletClientOnlyProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading state until mounted on client
  if (!mounted) {
    return (
      <Button className={className} disabled>
        <div className="h-4 w-4 mr-2 bg-muted rounded animate-pulse" />
        Connect Wallet
      </Button>
    )
  }

  // Render actual wallet button only on client
  return <WalletMultiButton className={className} />
}

export function WalletModalProviderClientOnly({ children }: WalletModalProviderClientOnlyProps) {
  // Always render WalletModalProvider to avoid context errors
  // The modal itself will be handled by CSS positioning
  return <WalletModalProvider>{children}</WalletModalProvider>
}
