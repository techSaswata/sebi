"use client"

import { useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
// Removed useWalletModal - using direct Phantom connection
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function WalletClickDebug() {
  const { wallets, wallet, connected, connecting, publicKey, select } = useWallet()
  const { connection } = useConnection()

  useEffect(() => {
    console.log('WalletClickDebug: Wallet state changed:', {
      connected,
      connecting,
      walletName: wallet?.adapter.name,
      publicKey: publicKey?.toBase58(),
      totalWallets: wallets.length,
    })
  }, [connected, connecting, wallet, publicKey, wallets.length])

  const testPhantomDirect = async () => {
    console.log('Direct Phantom test...')
    try {
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom')
      if (phantomWallet) {
        console.log('Found Phantom wallet:', phantomWallet.adapter.readyState)
        await select(phantomWallet.adapter.name)
        console.log('Selected Phantom wallet')
      } else {
        console.log('Phantom wallet not found in wallets list')
      }
    } catch (error) {
      console.error('Direct Phantom connection error:', error)
    }
  }

  const testDirectConnect = async () => {
    console.log('Testing direct Phantom connection...')
    try {
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom')
      if (phantomWallet) {
        await select(phantomWallet.adapter.name)
      } else {
        console.log('Phantom wallet not found')
      }
    } catch (error) {
      console.error('Direct connection error:', error)
    }
  }

  const checkWalletExtensions = () => {
    console.log('Checking wallet extensions:')
    console.log('- window.phantom:', typeof window !== 'undefined' && 'phantom' in window)
    console.log('- window.solflare:', typeof window !== 'undefined' && 'solflare' in window)
    console.log('- window.solana:', typeof window !== 'undefined' && 'solana' in window)
    
    if (typeof window !== 'undefined' && window.phantom?.solana) {
      console.log('- Phantom detected:', window.phantom.solana.isPhantom)
    }
  }

  useEffect(() => {
    // Check wallet extensions on mount
    checkWalletExtensions()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet Click Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={testDirectConnect} variant="outline" size="sm">
            Test Direct Connect
          </Button>
          <Button onClick={testPhantomDirect} variant="outline" size="sm">
            Phantom Direct
          </Button>
          <Button onClick={checkWalletExtensions} variant="outline" size="sm">
            Check Extensions
          </Button>
          <Button 
            onClick={() => console.log('Current state:', { wallets, connected })} 
            variant="outline" 
            size="sm"
          >
            Log State
          </Button>
        </div>

        <div className="text-xs space-y-1">
          <div><strong>Connected:</strong> {connected ? 'Yes' : 'No'}</div>
          <div><strong>Connecting:</strong> {connecting ? 'Yes' : 'No'}</div>
          <div><strong>Direct Connect:</strong> Phantom Only</div>
          <div><strong>Wallets Found:</strong> {wallets.length}</div>
          <div><strong>Current Wallet:</strong> {wallet?.adapter.name || 'None'}</div>
          {publicKey && (
            <div><strong>Public Key:</strong> {publicKey.toBase58().slice(0, 8)}...</div>
          )}
        </div>

        <div className="text-xs">
          <strong>Available Wallets:</strong>
          <ul className="mt-1 space-y-1">
            {wallets.map((w, i) => (
              <li key={i} className="pl-2">
                • {w.adapter.name} ({w.adapter.readyState})
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
