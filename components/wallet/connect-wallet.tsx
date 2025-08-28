"use client"

import { EnhancedWalletButton } from "./enhanced-wallet-button"

// Wrapper to maintain compatibility with existing usage
export function ConnectWalletButton({
  className = "rounded-full h-9 px-4",
  showBalance = false,
  variant = "default" as const,
  size = "default" as const,
}: {
  className?: string
  showBalance?: boolean
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default" | "lg"
}) {
  return (
    <EnhancedWalletButton 
      className={className}
      showBalance={showBalance}
      variant={variant}
      size={size}
    />
  )
}
