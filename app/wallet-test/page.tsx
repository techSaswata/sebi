"use client"

import { Header } from "@/components/app-shell/header"
import { WalletDebug } from "@/components/wallet/wallet-debug"
import { WalletClickDebug } from "@/components/wallet/wallet-click-debug"
import { EnhancedWalletButton } from "@/components/wallet/enhanced-wallet-button"
import { SimpleWalletTest } from "@/components/wallet/simple-wallet-test"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButtonClientOnly } from "@/components/wallet/wallet-client-only"
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
            <h1 className="text-3xl font-bold tracking-tight">Wallet Connection Test</h1>
            <p className="text-muted-foreground">
              Test and debug Solana wallet connectivity
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Wallet Connection */}
            <Card>
              <CardHeader>
                <CardTitle>Wallet Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Enhanced Wallet Button:</p>
                    <EnhancedWalletButton 
                      className="w-full" 
                      showBalance={true}
                      variant="default"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Standard Wallet Button (for comparison):</p>
                    <WalletMultiButtonClientOnly className="w-full" />
                  </div>

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
                          <li>Install Phantom or Solflare wallet extension</li>
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

            {/* Debug Information */}
            <WalletDebug />
            
            {/* Click Debug */}
            <WalletClickDebug />
          </div>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Common Issues:</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Wallet not detected:</strong> Make sure you have a Solana wallet extension installed (Phantom, Solflare, etc.)</li>
                    <li><strong>Connection redirects to wallet site:</strong> The wallet extension may not be properly installed or enabled</li>
                    <li><strong>Wrong network:</strong> Ensure your wallet is set to Devnet, not Mainnet</li>
                    <li><strong>RPC errors:</strong> The Solana devnet may be experiencing issues</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Installation Links:</h3>
                  <ul className="space-y-1 text-blue-600">
                    <li><a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="hover:underline">• Phantom Wallet</a></li>
                    <li><a href="https://solflare.com/" target="_blank" rel="noopener noreferrer" className="hover:underline">• Solflare Wallet</a></li>
                    <li><a href="https://glow.app/" target="_blank" rel="noopener noreferrer" className="hover:underline">• Glow Wallet</a></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
