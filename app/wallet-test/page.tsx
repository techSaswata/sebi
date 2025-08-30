"use client"

import { Header } from "@/components/app-shell/header"
import { WalletDebug } from "@/components/wallet/wallet-debug"
import { WalletClickDebug } from "@/components/wallet/wallet-click-debug"
import { EnhancedWalletButton } from "@/components/wallet/enhanced-wallet-button"
import { SimpleWalletTest } from "@/components/wallet/simple-wallet-test"
import { RealPhantomTest } from "@/components/wallet/real-phantom-test"
import { ConnectionValidator } from "@/components/wallet/connection-validator"
import { RealVsMockTest } from "@/components/wallet/real-vs-mock-test"
import { PhantomTestSummary } from "@/components/wallet/phantom-test-summary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWallet } from "@solana/wallet-adapter-react"
// Removed WalletMultiButtonClientOnly - using direct Phantom connection
import { useAuth } from "@/contexts/auth-context"

export default function WalletTestPage() {
  const { connected, publicKey, wallet } = useWallet()
  const { user } = useAuth()

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <main className="flex-1">
        <div className="container px-4 py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Real Phantom Wallet Test</h1>
            <p className="text-muted-foreground">
              Test actual Phantom wallet connections (not mocking). The top-left component shows real extension detection and Solana network balance.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Real Phantom Test - Primary Component */}
            <RealPhantomTest />
            
            {/* Real vs Mock Test */}
            <RealVsMockTest />
            
            {/* Wallet Connection */}
            <Card>
              <CardHeader>
                <CardTitle>Wallet Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Simple Test Component:</p>
                    <SimpleWalletTest />
                  </div>
                  
                  {connected && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-green-800">Wallet Connected!</span>
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        <div><strong>Wallet:</strong> {wallet?.adapter.name}</div>
                        <div><strong>Address:</strong> {publicKey?.toBase58()}</div>
                        <div><strong>Auth User:</strong> {user ? '✓ Signed In' : '✗ Not Signed In'}</div>
                      </div>
                    </div>
                  )}

                  {!connected && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm text-blue-700">
                        <p><strong>To test wallet connection:</strong></p>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>Install Phantom wallet extension</li>
                          <li>Create or import a wallet</li>
                          <li>Switch to Devnet in wallet settings</li>
                          <li>Click "Connect Wallet" above</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Connection Validator - Main diagnostic tool */}
            <ConnectionValidator />
            
            {/* Enhanced Wallet Component */}
            <Card>
              <CardHeader>
                <CardTitle>Production Wallet Button</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This is the actual wallet button used throughout the app:
                </p>
                <EnhancedWalletButton 
                  className="w-full" 
                  showBalance={true}
                  variant="default"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">            
            {/* Debug Information */}
            <WalletDebug />
            
            {/* Click Debug */}
            <WalletClickDebug />
          </div>

          {/* Comprehensive Testing Guide */}
          <PhantomTestSummary />
        </div>
      </main>
    </div>
  )
}
