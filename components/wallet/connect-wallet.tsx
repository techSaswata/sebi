"use client"
import { useState, useEffect } from "react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { Button } from "@/components/ui/button"

// Optional wrapper to control sizing/shape to match template buttons
export function ConnectWalletButton({
  className = "rounded-full h-9 px-4",
}: {
  className?: string
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button className={className} disabled>
        Connect Wallet
      </Button>
    )
  }

  return <WalletMultiButton className={className} />
}
