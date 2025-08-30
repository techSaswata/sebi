"use client"

import { useState, useEffect, useCallback } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useAuth } from "@/contexts/auth-context"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Wallet, 
  Copy, 
  ExternalLink, 
  LogOut,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react"
import { toast } from "sonner"

// Global Phantom types
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

interface EnhancedWalletButtonProps {
  className?: string
  showBalance?: boolean
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "default" | "lg"
}

export function EnhancedWalletButton({ 
  className = "",
  showBalance = false,
  variant = "default",
  size = "default"
}: EnhancedWalletButtonProps) {
  const { user } = useAuth()
  const { wallets, wallet, publicKey, connected, connecting, disconnecting, disconnect, select } = useWallet()
  const { connection } = useConnection()
  const [balance, setBalance] = useState<number | null>(null)
  const [linking, setLinking] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [balanceLoading, setBalanceLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Real Solana balance fetch from actual network
  const fetchBalance = useCallback(async () => {
    if (publicKey && connected && connection) {
      setBalanceLoading(true)
      try {
        console.log('🔍 Fetching REAL Solana balance from network for:', publicKey.toBase58())
        console.log('🌐 RPC Endpoint:', connection.rpcEndpoint)
        
        const balance = await connection.getBalance(publicKey)
        const solBalance = balance / LAMPORTS_PER_SOL
        
        console.log('💰 REAL balance fetched from Solana network:', {
          lamports: balance,
          sol: solBalance,
          address: publicKey.toBase58(),
          rpc: connection.rpcEndpoint
        })
        
        setBalance(solBalance)
        
        // Also fetch some network info to verify real connection
        try {
          const slot = await connection.getSlot()
          const blockTime = await connection.getBlockTime(slot)
          console.log('📊 Network verification - Real Solana data:', {
            currentSlot: slot,
            blockTime: blockTime ? new Date(blockTime * 1000) : 'N/A'
          })
        } catch (netError) {
          console.warn('⚠️ Network verification failed:', netError)
        }
        
      } catch (error) {
        console.error('❌ Error fetching real balance from Solana network:', error)
        setBalance(null)
        toast.error('Failed to fetch wallet balance from Solana network')
      } finally {
        setBalanceLoading(false)
      }
    } else {
      setBalance(null)
      setBalanceLoading(false)
    }
  }, [publicKey, connected, connection])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Link wallet to user account
  const linkWalletToAccount = useCallback(async () => {
    if (!user || !publicKey || !wallet) return

    setLinking(true)
    try {
      const response = await fetch('/api/wallets/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for Supabase session
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          walletType: wallet.adapter.name.toLowerCase(),
          nickname: `${wallet.adapter.name} Wallet`
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success('Wallet linked to your account!')
      } else {
        toast.error(result.error || 'Failed to link wallet')
      }
    } catch (error) {
      console.error('Error linking wallet:', error)
      toast.error('Failed to link wallet to account')
    } finally {
      setLinking(false)
    }
  }, [user, publicKey, wallet])

  // Auto-link wallet when connected and user is signed in
  useEffect(() => {
    console.log('🔗 Wallet linking check:', {
      connected,
      hasUser: !!user,
      userEmail: user?.email,
      hasPublicKey: !!publicKey,
      hasWallet: !!wallet,
      linking
    })
    
    if (connected && user && publicKey && wallet && !linking) {
      console.log('✅ All conditions met - linking wallet to account...')
      linkWalletToAccount()
    } else if (connected && !user) {
      console.warn('⚠️ Wallet connected but user not signed in - wallet will not be linked to account')
      toast.error('Please sign in to your account first, then connect your wallet')
    }
  }, [connected, user, publicKey, wallet, linking, linkWalletToAccount])

  const handleConnect = useCallback(async () => {
    console.log('EnhancedWalletButton: Starting REAL Phantom connection...')
    console.log('Pre-connection checks:', {
      phantomInWindow: typeof window !== 'undefined' && 'phantom' in window,
      phantomSolana: typeof window !== 'undefined' && window.phantom?.solana,
      isPhantom: typeof window !== 'undefined' && window.phantom?.solana?.isPhantom,
      walletAdaptersFound: wallets.length,
      connected,
      connecting
    })
    
    // First verify Phantom extension is actually installed
    if (typeof window !== 'undefined' && !window.phantom?.solana?.isPhantom) {
      console.error('❌ Real Phantom extension not detected')
      toast.error('Phantom wallet extension not found. Please install Phantom browser extension.')
      return
    }
    
    try {
      // Find Phantom wallet adapter
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom')
      
      if (!phantomWallet) {
        console.error('❌ Phantom wallet adapter not found in wallets list')
        toast.error('Phantom wallet adapter not available')
        return
      }
      
      console.log('✅ Found Phantom wallet adapter:', {
        name: phantomWallet.adapter.name,
        readyState: phantomWallet.adapter.readyState,
        connected: phantomWallet.adapter.connected
      })
      
      // Attempt real connection
      console.log('🔗 Initiating real Phantom connection...')
      await select(phantomWallet.adapter.name)
      
      // Log success with real connection details
      console.log('✅ Real Phantom connection successful!')
      toast.success('✅ Real Phantom wallet connected!')
      
    } catch (error: any) {
      console.error('❌ Real Phantom connection error:', error)
      if (error.message?.includes('User rejected') || error.message?.includes('User denied')) {
        toast.error('Connection cancelled by user')
      } else if (error.message?.includes('Wallet not ready')) {
        toast.error('Phantom wallet not ready. Please unlock your wallet.')
      } else {
        toast.error(`Connection failed: ${error.message}`)
      }
    }
  }, [wallets, select, connected, connecting])

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect()
      toast.success('Wallet disconnected')
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
      toast.error('Failed to disconnect wallet')
    }
  }, [disconnect])

  const copyAddress = useCallback(() => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58())
      toast.success('Address copied to clipboard')
    }
  }, [publicKey])

  const openInExplorer = useCallback(() => {
    if (publicKey) {
      const url = `https://explorer.solana.com/address/${publicKey.toBase58()}?cluster=devnet`
      window.open(url, '_blank')
    }
  }, [publicKey])

  // Prevent hydration errors by only rendering interactive content on client
  if (!mounted) {
    return (
      <Button className={className} disabled variant={variant} size={size}>
        <div className="h-4 w-4 mr-2 bg-muted rounded animate-pulse" />
        Connect Wallet
      </Button>
    )
  }

  // Loading state
  if (connecting || disconnecting) {
    return (
      <Button className={className} disabled variant={variant} size={size}>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {connecting ? 'Connecting...' : 'Disconnecting...'}
      </Button>
    )
  }

  // Connected state
  if (connected && publicKey && wallet) {
    const shortAddress = `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className={className} variant={variant} size={size}>
            <div className="flex items-center space-x-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={`/wallets/${wallet.adapter.name.toLowerCase()}.png`} />
                <AvatarFallback className="text-xs">
                  {wallet.adapter.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span>{shortAddress}</span>
              {showBalance && (
                <Badge variant="secondary" className="text-xs">
                  {balanceLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : balance !== null ? (
                    `${balance.toFixed(3)} SOL`
                  ) : (
                    'Balance: --'
                  )}
                </Badge>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent className="w-64" align="end">
          <DropdownMenuLabel>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={`/wallets/${wallet.adapter.name.toLowerCase()}.png`} />
                  <AvatarFallback className="text-xs">
                    {wallet.adapter.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{wallet.adapter.name}</span>
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              
              <div className="text-xs text-muted-foreground font-mono">
                {publicKey.toBase58()}
              </div>
              
              <div className="flex items-center justify-between">
                {balanceLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading balance...</span>
                  </div>
                ) : balance !== null ? (
                  <>
                    <span className="text-sm font-medium">{balance.toFixed(4)} SOL</span>
                    <span className="text-xs text-muted-foreground">
                      ≈ ₹{(balance * 12000).toLocaleString('en-IN')}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Balance unavailable</span>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
            <Copy className="h-4 w-4 mr-2" />
            Copy Address
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={openInExplorer} className="cursor-pointer">
            <ExternalLink className="h-4 w-4 mr-2" />
            View in Explorer
          </DropdownMenuItem>
          
          {user && (
            <DropdownMenuItem 
              onClick={linkWalletToAccount} 
              disabled={linking}
              className="cursor-pointer"
            >
              {linking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {linking ? 'Linking...' : 'Link to Account'}
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleDisconnect} 
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Not connected state
  return (
    <Button 
      className={className} 
      onClick={handleConnect}
      variant={variant}
      size={size}
    >
      <Wallet className="h-4 w-4 mr-2" />
      Connect Wallet
    </Button>
  )
}
