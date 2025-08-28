"use client"

import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  AlertCircle, 
  CheckCircle, 
  Wifi, 
  Wallet,
  RefreshCw,
  Code,
  ExternalLink
} from "lucide-react"

export function WalletDebug() {
  const { connection } = useConnection()
  const { wallet, wallets, connected, connecting, publicKey } = useWallet()
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking')
  const [rpcLatency, setRpcLatency] = useState<number | null>(null)

  // Test RPC connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const startTime = Date.now()
        await connection.getLatestBlockhash()
        const latency = Date.now() - startTime
        setRpcLatency(latency)
        setConnectionStatus('connected')
      } catch (error) {
        console.error('RPC connection failed:', error)
        setConnectionStatus('failed')
      }
    }

    testConnection()
  }, [connection])

  const refreshConnection = () => {
    setConnectionStatus('checking')
    setRpcLatency(null)
    // Re-run connection test
    setTimeout(() => {
      const testConnection = async () => {
        try {
          const startTime = Date.now()
          await connection.getLatestBlockhash()
          const latency = Date.now() - startTime
          setRpcLatency(latency)
          setConnectionStatus('connected')
        } catch (error) {
          console.error('RPC connection failed:', error)
          setConnectionStatus('failed')
        }
      }
      testConnection()
    }, 100)
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-sm">
          <Code className="h-4 w-4" />
          <span>Wallet Debug Info</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* RPC Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className="h-4 w-4" />
            <span className="text-sm">RPC Connection</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'failed' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {connectionStatus === 'connected' ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : connectionStatus === 'failed' ? (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Failed
                </>
              ) : (
                'Checking...'
              )}
            </Badge>
            {rpcLatency && (
              <span className="text-xs text-muted-foreground">{rpcLatency}ms</span>
            )}
          </div>
        </div>

        {/* Wallet Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-4 w-4" />
            <span className="text-sm">Wallet Status</span>
          </div>
          <Badge 
            variant={connected ? 'default' : connecting ? 'secondary' : 'outline'}
            className="text-xs"
          >
            {connected ? 'Connected' : connecting ? 'Connecting...' : 'Not Connected'}
          </Badge>
        </div>

        {/* Available Wallets */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Available Wallets ({wallets.length})</span>
          <div className="grid grid-cols-2 gap-2">
            {wallets.map((walletAdapter) => (
              <div
                key={walletAdapter.adapter.name}
                className="flex items-center space-x-2 p-2 border rounded text-xs"
              >
                <div className="w-4 h-4 bg-muted rounded flex items-center justify-center">
                  {walletAdapter.adapter.name.charAt(0)}
                </div>
                <span className="truncate">{walletAdapter.adapter.name}</span>
                {walletAdapter.adapter.name === wallet?.adapter.name && (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Connected Wallet Details */}
        {connected && publicKey && wallet && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Connected Wallet</span>
            <div className="p-2 bg-muted rounded text-xs space-y-1">
              <div><strong>Name:</strong> {wallet.adapter.name}</div>
              <div><strong>Public Key:</strong> {publicKey.toBase58()}</div>
              <div><strong>Network:</strong> Devnet</div>
            </div>
          </div>
        )}

        {/* Debug Actions */}
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={refreshConnection}
            disabled={connectionStatus === 'checking'}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
            Test RPC
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => window.open('https://status.solana.com', '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Solana Status
          </Button>
        </div>

        {/* Environment Info */}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          <div><strong>RPC:</strong> {process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'Default Devnet'}</div>
          <div><strong>Cluster:</strong> {process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet'}</div>
        </div>
      </CardContent>
    </Card>
  )
}
