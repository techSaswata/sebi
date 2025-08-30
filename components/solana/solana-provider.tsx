"use client"

import type React from "react"
import { useMemo } from "react"
import { clusterApiUrl } from "@solana/web3.js"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"

type Props = {
  children: React.ReactNode
}

export function SolanaProvider({ children }: Props) {
  // Use environment variable for RPC endpoint or fallback to devnet
  const endpoint = useMemo(() => {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet")
  }, [])

  // Configure Phantom wallet only - no popup needed
  const wallets = useMemo(() => {
    // Only initialize wallet adapters on client side
    if (typeof window === 'undefined') {
      return []
    }
    
    const walletList = [
      new PhantomWalletAdapter()
    ]
    
    // Log Phantom wallet readiness
    setTimeout(() => {
      console.log('SolanaProvider: Phantom wallet check:', {
        name: walletList[0]?.name,
        readyState: walletList[0]?.readyState,
        available: walletList[0]?.readyState !== 'Unsupported',
        phantomExtension: typeof window !== 'undefined' && 'phantom' in window
      })
    }, 1000)
    
    return walletList
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={(error) => {
          console.error('Phantom wallet connection error:', error.message || error)
          // Don't show error toasts for user cancellation
          if (!error.message?.includes('User rejected')) {
            console.warn('Phantom wallet error details:', error)
          }
        }}
      >
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}
