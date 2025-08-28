"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  Wallet,
  CheckCircle,
  AlertCircle,
  Plus,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react"
import { ConnectWalletButton } from "@/components/wallet/connect-wallet"
import { EnhancedWalletButton } from "@/components/wallet/enhanced-wallet-button"
import { toast } from "sonner"

interface WalletInfo {
  address: string
  balance: number
  name: string
  type: string
  verified: boolean
  isPrimary: boolean
}

function ConnectedWallet({ wallet }: { wallet: WalletInfo }) {
  const [balanceVisible, setBalanceVisible] = useState(true)
  
  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address)
    toast.success("Address copied to clipboard")
  }

  const shortAddress = `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
    >
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {wallet.type === 'phantom' ? 'P' : wallet.type === 'solflare' ? 'S' : 'W'}
          </AvatarFallback>
        </Avatar>
        
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm">{wallet.name}</span>
            {wallet.isPrimary && (
              <Badge variant="default" className="text-xs">Primary</Badge>
            )}
            {wallet.verified && (
              <CheckCircle className="h-3 w-3 text-green-500" />
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span>{shortAddress}</span>
            <button onClick={copyAddress} className="hover:text-foreground">
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="text-right space-y-1">
        <div className="flex items-center space-x-1">
          <span className="font-semibold text-sm">
            {balanceVisible ? `${wallet.balance.toFixed(4)} SOL` : "••••"}
          </span>
          <button 
            onClick={() => setBalanceVisible(!balanceVisible)}
            className="text-muted-foreground hover:text-foreground"
          >
            {balanceVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </div>
        <div className="text-xs text-muted-foreground">
          ≈ ₹{(wallet.balance * 12000).toLocaleString('en-IN')}
        </div>
      </div>
    </motion.div>
  )
}

export function WalletStatus() {
  const { wallet, connected, publicKey } = useWallet()
  const [connectedWallets, setConnectedWallets] = useState<WalletInfo[]>([])
  const [loading, setLoading] = useState(false)

  // Mock connected wallets for demonstration
  useEffect(() => {
    if (connected && publicKey) {
      const mockWallets: WalletInfo[] = [
        {
          address: publicKey.toBase58(),
          balance: 2.456,
          name: wallet?.adapter.name || "Unknown",
          type: wallet?.adapter.name.toLowerCase() || "unknown",
          verified: true,
          isPrimary: true
        }
      ]
      setConnectedWallets(mockWallets)
    } else {
      setConnectedWallets([])
    }
  }, [connected, publicKey, wallet])

  const totalBalance = connectedWallets.reduce((sum, w) => sum + w.balance, 0)
  const totalBalanceINR = totalBalance * 12000 // Mock SOL to INR rate

  const refreshBalances = () => {
    setLoading(true)
    // Mock refresh
    setTimeout(() => {
      setLoading(false)
      toast.success("Balances refreshed")
    }, 1000)
  }

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Wallet Connection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Wallet className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Connect Your Wallet</h3>
              <p className="text-sm text-muted-foreground">
                Connect your Solana wallet to start trading bonds and manage your portfolio.
              </p>
            </div>
            <EnhancedWalletButton className="w-full" variant="default" />
            <div className="text-xs text-muted-foreground">
              Supports Phantom, Solflare, Torus, and Ledger wallets
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Connected Wallets</span>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshBalances}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Balance */}
        <div className="p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="text-2xl font-bold">{totalBalance.toFixed(4)} SOL</p>
            <p className="text-sm text-muted-foreground">
              ≈ ₹{totalBalanceINR.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Connected Wallets List */}
        <div className="space-y-3">
          {connectedWallets.map((wallet, index) => (
            <ConnectedWallet key={wallet.address} wallet={wallet} />
          ))}
        </div>

        {/* Wallet Health */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Wallet Security</span>
            <span className="font-medium text-green-600">Excellent</span>
          </div>
          <Progress value={95} className="h-2" />
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>All wallets verified and secured</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Add Wallet
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
