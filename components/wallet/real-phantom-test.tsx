"use client"

import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export function RealPhantomTest() {
  const { wallets, wallet, publicKey, connected, connecting, disconnect, select } = useWallet()
  const { connection } = useConnection()
  const [phantomDetected, setPhantomDetected] = useState(false)
  const [realBalance, setRealBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  useEffect(() => {
    // Check if Phantom is actually installed
    const checkPhantom = () => {
      const isPhantomInstalled = typeof window !== 'undefined' && 'phantom' in window && window.phantom?.solana
      console.log('Real Phantom Test - Phantom detection:', {
        windowExists: typeof window !== 'undefined',
        phantomInWindow: typeof window !== 'undefined' && 'phantom' in window,
        phantomSolana: typeof window !== 'undefined' && window.phantom?.solana,
        phantomReady: typeof window !== 'undefined' && window.phantom?.solana?.isPhantom,
        fullCheck: isPhantomInstalled
      })
      setPhantomDetected(!!isPhantomInstalled)
    }
    
    checkPhantom()
    // Also check after a delay in case Phantom loads later
    const timer = setTimeout(checkPhantom, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Fetch real balance from Solana network
  useEffect(() => {
    const fetchRealBalance = async () => {
      if (publicKey && connected) {
        setBalanceLoading(true)
        try {
          console.log('Fetching real balance from Solana network...')
          const balance = await connection.getBalance(publicKey)
          const solBalance = balance / LAMPORTS_PER_SOL
          console.log('Real Solana balance:', solBalance, 'SOL')
          setRealBalance(solBalance)
        } catch (error) {
          console.error('Error fetching real balance:', error)
          setRealBalance(null)
        } finally {
          setBalanceLoading(false)
        }
      } else {
        setRealBalance(null)
      }
    }

    fetchRealBalance()
  }, [publicKey, connected, connection])

  const handleRealConnect = async () => {
    console.log('Real Phantom Test - Attempting connection...')
    
    if (!phantomDetected) {
      alert('Phantom wallet not detected! Please install Phantom browser extension first.')
      return
    }

    try {
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom')
      
      if (!phantomWallet) {
        console.error('Phantom wallet adapter not found')
        alert('Phantom wallet adapter not found')
        return
      }

      console.log('Phantom wallet adapter found:', {
        name: phantomWallet.adapter.name,
        readyState: phantomWallet.adapter.readyState,
        connected: phantomWallet.adapter.connected
      })

      await select(phantomWallet.adapter.name)
      console.log('Phantom connection initiated')
      
    } catch (error: any) {
      console.error('Real connection error:', error)
      alert(`Connection failed: ${error.message}`)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
      console.log('Disconnected from Phantom')
    } catch (error) {
      console.error('Disconnect error:', error)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Real Phantom Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phantom Detection Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <span className="text-sm">Phantom Extension</span>
          <Badge variant={phantomDetected ? "default" : "destructive"}>
            {phantomDetected ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Detected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Not Found
              </>
            )}
          </Badge>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <span className="text-sm">Connection Status</span>
          <Badge variant={connected ? "default" : "secondary"}>
            {connected ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
        </div>

        {/* Wallet Info */}
        {connected && publicKey && (
          <div className="space-y-2">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Wallet Address</p>
              <p className="text-sm font-mono break-all">
                {publicKey.toBase58()}
              </p>
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Real SOL Balance</p>
              <p className="text-sm font-medium">
                {balanceLoading ? (
                  'Loading...'
                ) : realBalance !== null ? (
                  `${realBalance.toFixed(6)} SOL`
                ) : (
                  'Failed to load'
                )}
              </p>
            </div>

            {wallet && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Wallet Type</p>
                <p className="text-sm font-medium">{wallet.adapter.name}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {!connected ? (
            <Button 
              onClick={handleRealConnect} 
              disabled={!phantomDetected || connecting}
              className="w-full"
            >
              {connecting ? 'Connecting...' : 'Connect Real Phantom'}
            </Button>
          ) : (
            <Button 
              onClick={handleDisconnect} 
              variant="outline"
              className="w-full"
            >
              Disconnect
            </Button>
          )}
          
          {!phantomDetected && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium">Phantom Not Detected</p>
                <p>Please install the Phantom browser extension and refresh the page.</p>
              </div>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Debug Info</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify({
              phantomDetected,
              connected,
              connecting,
              publicKey: publicKey?.toBase58(),
              walletName: wallet?.adapter.name,
              totalWallets: wallets.length,
              realBalance,
              balanceLoading
            }, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  )
}

// Add global type for Phantom
declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom: boolean
        connect: () => Promise<{ publicKey: any }>
        disconnect: () => Promise<void>
        on: (event: string, callback: Function) => void
        request: (options: any) => Promise<any>
      }
    }
  }
}
