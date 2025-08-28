import type { Connection } from "@solana/web3.js"
import { getProgramId } from "./config"

export type AnchorProgram = any

export async function loadIdl(): Promise<any | null> {
  try {
    const res = await fetch("/anchor/idl.json", { cache: "no-store" })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getProgram(connection: Connection, wallet: any): Promise<AnchorProgram | null> {
  const programIdStr = getProgramId()
  if (!programIdStr) return null
  const idl = await loadIdl()
  if (!idl) return null

  // dynamic import to avoid SSR issues
  const anchor = await import("@coral-xyz/anchor")
  const { Program, AnchorProvider, BN: _BN } = anchor

  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" })
  // @ts-expect-error idl type unknown here
  const program = new Program(idl, new (await import("@solana/web3.js")).PublicKey(programIdStr), provider)
  return program
}

export async function isAnchorConfigured(): Promise<boolean> {
  const pid = getProgramId()
  if (!pid) return false
  const idl = await loadIdl()
  return Boolean(idl)
}

/**
 * Placeholder wiring for on-chain buy. Requires program-specific accounts from your IDL.
 * Intentionally throws until IDL-specific accounts are provided.
 */
export async function buyOnChain(_args: {
  connection: Connection
  wallet: any
  bondId: string
  quantity: number
  price: number
}): Promise<string> {
  // This must be implemented once we have the IDL + account layout
  throw new Error("Anchor buy is not wired yet. Provide Program ID + IDL to enable on-chain buys.")
}
