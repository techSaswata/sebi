"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
// Removed useWalletModal - using direct Phantom connection
import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"

export function SimpleWalletTest() {
  const { wallets, connected, publicKey, wallet, disconnect, select } = useWallet()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleConnect = async () => {
    console.log("SimpleWalletTest: Connecting to Phantom...")
    try {
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom')
      if (phantomWallet) {
        await select(phantomWallet.adapter.name)
      } else {
        console.error('Phantom wallet not found')
      }
    } catch (error) {
      console.error('Error connecting to Phantom:', error)
    }
  }

  const handleDisconnect = async () => {
    console.log("SimpleWalletTest: Disconnecting...")
    await disconnect()
  }

  if (!mounted) {
    return (
      <div className="space-y-4">
        <Button className="w-full" disabled>
          <div className="mr-2 h-4 w-4 bg-muted rounded animate-pulse" />
          Connect Wallet (Simple Test)
        </Button>
        <p className="text-sm text-muted-foreground">
          Loading wallet connection...
        </p>
      </div>
    )
  }

  if (connected && publicKey) {
    return (
      <div className="space-y-4">
        <div className="p-4 border rounded-lg bg-green-50">
          <h3 className="font-semibold text-green-800">Wallet Connected!</h3>
          <p className="text-sm text-green-700">
            <strong>Wallet:</strong> {wallet?.adapter.name}
          </p>
          <p className="text-sm text-green-700 font-mono">
            <strong>Address:</strong> {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
          </p>
        </div>
        <Button onClick={handleDisconnect} variant="outline">
          Disconnect Wallet
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleConnect} className="w-full">
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet (Simple Test)
      </Button>
      <p className="text-sm text-muted-foreground">
        This is a simplified wallet connection test.
      </p>
    </div>
  )
}
