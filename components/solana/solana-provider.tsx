"use client"

import type React from "react"
import { useMemo } from "react"
import { clusterApiUrl } from "@solana/web3.js"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"

// Wallet adapter UI styles (modal + buttons)
import "@solana/wallet-adapter-react-ui/styles.css"

type Props = {
  children: React.ReactNode
}

export function SolanaProvider({ children }: Props) {
  const endpoint = useMemo(() => clusterApiUrl("devnet"), [])
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network: "devnet" })], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
