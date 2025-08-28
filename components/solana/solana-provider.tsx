"use client"

import type React from "react"
import { useMemo } from "react"
import { clusterApiUrl } from "@solana/web3.js"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProviderClientOnly } from "@/components/wallet/wallet-client-only"
import { ModalCenteringFix } from "@/components/wallet/modal-centering-fix"
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter
} from "@solana/wallet-adapter-wallets"

// Isolated wallet adapter styles (doesn't affect core UI)
import "../../styles/wallet-adapter.css"

type Props = {
  children: React.ReactNode
}

export function SolanaProvider({ children }: Props) {
  // Use environment variable for RPC endpoint or fallback to devnet
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet")
  }, [])

  // Configure multiple wallet adapters - only on client side
  const wallets = useMemo(() => {
    // Only initialize wallet adapters on client side
    if (typeof window === 'undefined') {
      return []
    }
    
    const walletList = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter()
    ]
    
    // Log wallet readiness after allowing time for extensions to load
    setTimeout(() => {
      console.log('SolanaProvider: Wallet readiness check:', walletList.map(w => ({
        name: w.name,
        readyState: w.readyState,
        publicKey: w.publicKey?.toBase58(),
        available: w.readyState !== 'Unsupported'
      })))
      
      // Also check for wallet extensions in window object
      console.log('Browser wallet extensions detected:', {
        phantom: typeof window !== 'undefined' && 'phantom' in window,
        solflare: typeof window !== 'undefined' && 'solflare' in window,
        solana: typeof window !== 'undefined' && 'solana' in window,
      })
    }, 2000) // Increased delay to allow more time for extensions
    
    return walletList
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={(error) => {
          console.error('Wallet connection error:', error.message || error)
          // Don't show error toasts for user cancellation
          if (!error.message?.includes('User rejected')) {
            console.warn('Wallet error details:', error)
          }
        }}
      >
        <WalletModalProviderClientOnly>
          <ModalCenteringFix />
          {children}
        </WalletModalProviderClientOnly>
      </WalletProvider>
    </ConnectionProvider>
  )
}
