"use client"

import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Wallet } from "lucide-react"
import { toast } from "sonner"

export function RealVsMockTest() {
  const { wallet, publicKey, connected, connecting, select, disconnect, wallets } = useWallet()
  const { connection } = useConnection()
  const [testResults, setTestResults] = useState<{
    isRealPhantom: boolean
    hasRealBalance: boolean
    networkData: any
    suspiciousData: string[]
  } | null>(null)

  const runRealConnectionTest = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect wallet first')
      return
    }

    const results = {
      isRealPhantom: false,
      hasRealBalance: false,
      networkData: null,
      suspiciousData: [] as string[]
    }

    try {
      // Test 1: Real Phantom detection
      results.isRealPhantom = typeof window !== 'undefined' && 
                             window.phantom?.solana?.isPhantom === true

      if (!results.isRealPhantom) {
        results.suspiciousData.push('Phantom extension not detected in window.phantom')
      }

      // Test 2: Real network balance
      const balance = await connection.getBalance(publicKey)
      const slot = await connection.getSlot()
      const blockHash = await connection.getLatestBlockhash()

      results.hasRealBalance = true
      results.networkData = {
        balance: balance,
        currentSlot: slot,
        blockhash: blockHash.blockhash.slice(0, 8) + '...',
        rpcEndpoint: connection.rpcEndpoint
      }

      // Test 3: Suspicious data patterns
      const address = publicKey.toBase58()
      
      if (address.includes('Demo') || address.includes('Mock') || address.includes('Test')) {
        results.suspiciousData.push('Wallet address contains suspicious keywords')
      }
      
      if (balance === 1000000000) { // Exactly 1 SOL in lamports - common mock value
        results.suspiciousData.push('Balance is exactly 1 SOL (common mock value)')
      }
      
      if (slot < 100000) {
        results.suspiciousData.push('Network slot number is suspiciously low')
      }

      // Test 4: Network consistency
      const secondBalance = await connection.getBalance(publicKey)
      if (balance !== secondBalance) {
        results.suspiciousData.push('Balance changed between requests (unusual for devnet)')
      }

    } catch (error) {
      console.error('Real connection test error:', error)
      results.suspiciousData.push(`Network error: ${error}`)
    }

    setTestResults(results)
  }

  const connectRealPhantom = async () => {
    try {
      if (typeof window === 'undefined' || !window.phantom?.solana?.isPhantom) {
        toast.error('❌ Real Phantom extension not found! Please install Phantom.')
        return
      }

      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom')
      if (!phantomWallet) {
        toast.error('❌ Phantom adapter not available')
        return
      }

      console.log('🔗 Connecting to REAL Phantom...')
      await select(phantomWallet.adapter.name)
      toast.success('✅ Real Phantom connection attempted!')
      
    } catch (error: any) {
      console.error('Real Phantom connection error:', error)
      toast.error(`Connection failed: ${error.message}`)
    }
  }

  useEffect(() => {
    if (connected && publicKey) {
      runRealConnectionTest()
    } else {
      setTestResults(null)
    }
  }, [connected, publicKey])

  const isLikelyReal = testResults?.isRealPhantom && 
                     testResults?.hasRealBalance && 
                     testResults?.suspiciousData.length === 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Real vs Mock Detection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Button */}
        {!connected ? (
          <Button onClick={connectRealPhantom} className="w-full" disabled={connecting}>
            {connecting ? 'Connecting...' : 'Connect Real Phantom'}
          </Button>
        ) : (
          <div className="space-y-2">
            <Button onClick={disconnect} variant="outline" className="w-full">
              Disconnect
            </Button>
            <Button onClick={runRealConnectionTest} variant="secondary" className="w-full">
              Re-test Connection
            </Button>
          </div>
        )}

        {/* Test Results */}
        {testResults && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Connection Type</span>
              <Badge variant={isLikelyReal ? "default" : "destructive"}>
                {isLikelyReal ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Real Connection ✅
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Suspicious/Mock ⚠️
                  </>
                )}
              </Badge>
            </div>

            {/* Individual Test Results */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Phantom Extension</span>
                {testResults.isRealPhantom ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span>Network Data</span>
                {testResults.hasRealBalance ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span>Suspicious Patterns</span>
                {testResults.suspiciousData.length === 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>

            {/* Network Data */}
            {testResults.networkData && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-2">Network Data:</p>
                <div className="text-xs space-y-1">
                  <div>Balance: {(testResults.networkData.balance / 1000000000).toFixed(6)} SOL</div>
                  <div>Slot: {testResults.networkData.currentSlot}</div>
                  <div>Latest Block: {testResults.networkData.blockhash}</div>
                  <div>RPC: {testResults.networkData.rpcEndpoint}</div>
                </div>
              </div>
            )}

            {/* Suspicious Data Warnings */}
            {testResults.suspiciousData.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-700">Suspicious Patterns Detected:</p>
                    <ul className="text-xs text-yellow-600 mt-1 space-y-1">
                      {testResults.suspiciousData.map((issue, index) => (
                        <li key={index}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Real Connection Confirmation */}
            {isLikelyReal && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    ✅ This appears to be a real Phantom wallet connection!
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Connection Status */}
        <div className="text-xs text-muted-foreground">
          Status: {connected ? `Connected to ${wallet?.adapter.name}` : 'Not connected'}
          {publicKey && (
            <div className="mt-1 font-mono">{publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
