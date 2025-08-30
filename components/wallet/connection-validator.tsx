"use client"

import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react"

interface ValidationResult {
  extensionDetected: boolean
  adapterAvailable: boolean
  networkConnected: boolean
  realBalance: boolean
  mockingDetected: boolean
}

export function ConnectionValidator() {
  const { wallet, wallets, publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [validation, setValidation] = useState<ValidationResult>({
    extensionDetected: false,
    adapterAvailable: false,
    networkConnected: false,
    realBalance: false,
    mockingDetected: false
  })
  const [testing, setTesting] = useState(false)

  const runValidation = async () => {
    setTesting(true)
    const results: ValidationResult = {
      extensionDetected: false,
      adapterAvailable: false,
      networkConnected: false,
      realBalance: false,
      mockingDetected: false
    }

    try {
      // Test 1: Extension Detection
      results.extensionDetected = typeof window !== 'undefined' && 
                                 window.phantom?.solana?.isPhantom === true

      // Test 2: Adapter Available
      const phantomAdapter = wallets.find(w => w.adapter.name === 'Phantom')
      results.adapterAvailable = !!phantomAdapter && phantomAdapter.adapter.readyState !== 'Unsupported'

      // Test 3: Network Connection
      if (connected && connection) {
        try {
          await connection.getLatestBlockhash()
          results.networkConnected = true
        } catch {
          results.networkConnected = false
        }
      }

      // Test 4: Real Balance (not mocked)
      if (connected && publicKey && connection) {
        try {
          const balance = await connection.getBalance(publicKey)
          const slot = await connection.getSlot()
          
          // If we can fetch balance and slot, it's likely real
          results.realBalance = typeof balance === 'number' && slot > 0
          
          // Mock detection: Check for suspicious patterns
          const addressString = publicKey.toBase58()
          results.mockingDetected = 
            addressString.includes('Demo') || 
            addressString.includes('Mock') || 
            addressString.includes('Fake') ||
            balance === 1000000000 || // Suspicious round number
            slot < 100000 // Suspiciously low slot number
            
        } catch {
          results.realBalance = false
        }
      }

    } catch (error) {
      console.error('Validation error:', error)
    }

    setValidation(results)
    setTesting(false)
  }

  useEffect(() => {
    runValidation()
  }, [connected, publicKey, wallet])

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  }

  const getOverallStatus = () => {
    if (validation.mockingDetected) {
      return { status: 'warning', text: 'Mock Data Detected', color: 'bg-yellow-100 text-yellow-800' }
    }
    
    const realConnection = validation.extensionDetected && 
                          validation.adapterAvailable && 
                          validation.networkConnected && 
                          validation.realBalance

    if (realConnection) {
      return { status: 'success', text: 'Real Connection ✅', color: 'bg-green-100 text-green-800' }
    } else if (connected) {
      return { status: 'warning', text: 'Partial Connection', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { status: 'error', text: 'Not Connected', color: 'bg-red-100 text-red-800' }
    }
  }

  const overallStatus = getOverallStatus()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Connection Validator</span>
          <Button
            onClick={runValidation}
            disabled={testing}
            size="sm"
            variant="outline"
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Retest
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <span className="font-medium">Overall Status</span>
          <Badge className={overallStatus.color}>
            {overallStatus.status === 'warning' && <AlertTriangle className="h-3 w-3 mr-1" />}
            {overallStatus.text}
          </Badge>
        </div>

        {/* Individual Tests */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Phantom Extension Detected</span>
            {getStatusIcon(validation.extensionDetected)}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Wallet Adapter Available</span>
            {getStatusIcon(validation.adapterAvailable)}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Solana Network Connected</span>
            {getStatusIcon(validation.networkConnected)}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Real Balance Data</span>
            {getStatusIcon(validation.realBalance)}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Mock Data Detected</span>
            {validation.mockingDetected ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>

        {/* Recommendations */}
        {!validation.extensionDetected && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>❌ Phantom extension not found!</strong><br/>
              Install the Phantom browser extension and refresh the page.
            </p>
          </div>
        )}

        {validation.mockingDetected && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              <strong>⚠️ Mock data detected!</strong><br/>
              This appears to be a simulated connection, not a real Phantom wallet.
            </p>
          </div>
        )}

        {validation.extensionDetected && !validation.networkConnected && connected && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              <strong>⚠️ Network connection issue!</strong><br/>
              Wallet is connected but unable to reach Solana network.
            </p>
          </div>
        )}

        {/* Debug Info */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Debug Details</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify({
              validation,
              walletInfo: {
                connected,
                walletName: wallet?.adapter.name,
                publicKey: publicKey?.toBase58(),
                rpcEndpoint: connection.rpcEndpoint
              }
            }, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  )
}
