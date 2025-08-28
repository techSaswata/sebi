export function getCluster(): "devnet" | "mainnet-beta" {
  const c = (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet") as "devnet" | "mainnet-beta"
  return c
}

export function getProgramId(): string | null {
  return process.env.NEXT_PUBLIC_MARKET_PROGRAM_ID || null
}

export function getUsdcMint(): string | null {
  return process.env.NEXT_PUBLIC_USDC_MINT || null
}
